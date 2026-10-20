export async function streamOpenRouter({ apiKey, model, messages, maxTokens, onUpdate }) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-OpenRouter-Title': 'Leaf',
    },
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
    const text = event.choices?.[0]?.delta?.content
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