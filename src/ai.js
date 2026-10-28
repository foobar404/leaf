class OpenRouterOutputLimitError extends Error {
  constructor(partial) {
    super('The selected model stopped at its output limit before completing this text. Try a model with a larger output limit.')
    this.name = 'OpenRouterOutputLimitError'
    this.partial = partial
  }
}

export async function streamOpenRouter({ apiKey, model, messages, maxTokens, onUpdate = () => {}, continueOnLength = false, signal }) {
  let requestMessages = messages
  const completedParts = []
  let continuationCount = 0

  while (true) {
    try {
      const result = await streamOpenRouterRequest({
        apiKey,
        model,
        messages: requestMessages,
        maxTokens,
        signal,
        onUpdate: (text) => onUpdate([...completedParts, text].join('')),
      })
      completedParts.push(result)
      return completedParts.join('').trim()
    } catch (error) {
      if (
        !(error instanceof OpenRouterOutputLimitError)
        || !continueOnLength
        || continuationCount >= 3
        || !error.partial.trim()
      ) {
        throw error
      }

      completedParts.push(error.partial)
      requestMessages = [
        ...requestMessages,
        { role: 'assistant', content: error.partial },
        {
          role: 'user',
          content: 'Continue the requested chapter prose exactly where the previous response stopped. Do not repeat or summarize any text already written. Follow the original length and style instructions, and return only the continuation.',
        },
      ]
      continuationCount += 1
      onUpdate(completedParts.join(''))
    }
  }
}

async function streamOpenRouterRequest({ apiKey, model, messages, maxTokens, onUpdate, signal }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-OpenRouter-Title': 'Leaf',
    },
    signal,
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, stream: true }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(error?.error?.message || `OpenRouter returned ${response.status}.`)
  }

  if (!response.body) throw new Error('This browser cannot stream the OpenRouter response.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let manuscript = ''
  let complete = false
  let finishReason = ''

  const readLine = (line) => {
    const trimmed = line.trim()
    if (!trimmed.startsWith('data:')) return false
    const data = trimmed.slice(5).trim()
    if (!data) return false
    if (data === '[DONE]') return true

    let event
    try {
      event = JSON.parse(data)
    } catch {
      return false
    }
    const choice = event.choices?.[0]
    if (typeof choice?.finish_reason === 'string') finishReason = choice.finish_reason
    const text = choice?.delta?.content
    if (typeof text === 'string') {
      manuscript += text
      onUpdate(manuscript)
    }
    return false
  }

  try {
    while (!complete) {
      const { value, done } = await reader.read()
      buffer += decoder.decode(value, { stream: !done })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (readLine(line)) {
          complete = true
          break
        }
      }
      if (done) {
        if (buffer) readLine(buffer)
        complete = true
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (finishReason === 'length' || finishReason === 'max_tokens') {
    throw new OpenRouterOutputLimitError(manuscript)
  }
  if (!manuscript.trim()) throw new Error('The selected model returned an empty draft.')
  return manuscript.trim()
}

export async function generateOpenRouterImage({ apiKey, prompt, inputReferences = [], signal }) {
  const response = await fetch('https://openrouter.ai/api/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-OpenRouter-Title': 'Leaf',
    },
    signal,
    body: JSON.stringify({
      model: 'black-forest-labs/flux-3-image-klein',
      prompt,
      resolution: '1K',
      aspect_ratio: '2:3',
      n: 1,
      ...(inputReferences.length
        ? {
          input_references: inputReferences.map((url) => ({
            type: 'image_url',
            image_url: { url },
          })),
        }
        : {}),
    }),
  })

  const result = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(result?.error?.message || `OpenRouter returned ${response.status}.`)
  }

  const image = result?.data?.[0]
  if (typeof image?.b64_json !== 'string' || !image.b64_json) {
    throw new Error('OpenRouter returned no cover image.')
  }
  if (!['image/png', 'image/jpeg'].includes(image.media_type)) {
    throw new Error('OpenRouter returned an unsupported cover image format.')
  }

  let binary
  try {
    binary = atob(image.b64_json)
  } catch {
    throw new Error('OpenRouter returned invalid image data.')
  }
  const data = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    data[index] = binary.charCodeAt(index)
  }

  return {
    data,
    mediaType: image.media_type,
    dataUrl: `data:${image.media_type};base64,${image.b64_json}`,
  }
}

function waitForOpenRouterRetry(delayMs, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason || new DOMException('The request was aborted.', 'AbortError'))
      return
    }

    let timeout
    const onAbort = () => {
      clearTimeout(timeout)
      signal?.removeEventListener('abort', onAbort)
      reject(signal?.reason || new DOMException('The request was aborted.', 'AbortError'))
    }
    timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, delayMs)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export async function synthesizeOpenRouterSpeech({ apiKey, input, voice, signal, maxRetries = 1 }) {
  const requestSpeechAudio = () => fetch('https://openrouter.ai/api/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-OpenRouter-Title': 'Leaf',
    },
    signal,
    body: JSON.stringify({
      model: 'google/gemini-3.8-flash-lite-tts',
      input,
      voice,
      response_format: 'pcm',
    }),
  })

  const retryLimit = Number.isInteger(maxRetries) ? Math.max(0, maxRetries) : 1
  let pcm
  for (let attempt = 0; attempt <= retryLimit; attempt += 1) {
    let response
    try {
      response = await requestSpeechAudio()
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError' || attempt === retryLimit) throw error
      await waitForOpenRouterRetry(1000 * (2 ** attempt), signal)
      continue
    }

    if (!response.ok) {
      const error = await response.json().catch(() => null)
      const retryable = response.status === 429 || response.status >= 500
      if (retryable && attempt < retryLimit) {
        await waitForOpenRouterRetry(1000 * (2 ** attempt), signal)
        continue
      }
      throw new Error(error?.error?.message || `OpenRouter returned ${response.status}.`)
    }

    try {
      pcm = await response.arrayBuffer()
    } catch (error) {
      if (signal?.aborted || error?.name === 'AbortError' || attempt === retryLimit) throw error
      await waitForOpenRouterRetry(1000 * (2 ** attempt), signal)
      continue
    }
    if (pcm.byteLength) break
    if (attempt === retryLimit) break
    await waitForOpenRouterRetry(1000 * (2 ** attempt), signal)
  }

  if (!pcm.byteLength) throw new Error('OpenRouter returned an empty speech audio response.')
  if (pcm.byteLength > 0xffffffff - 36) throw new Error('OpenRouter returned speech audio that is too large to play.')

  const header = new ArrayBuffer(44)
  const view = new DataView(header)
  const writeText = (offset, value) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + pcm.byteLength, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, 24000, true)
  view.setUint32(28, 48000, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, pcm.byteLength, true)
  return new Blob([header, pcm], { type: 'audio/wav' })
}