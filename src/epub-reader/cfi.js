function splitCfiParts(value) {
  const parts = []
  let depth = 0
  let escaped = false
  let start = 0
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (escaped) {
      escaped = false
    } else if (character === '^') {
      escaped = true
    } else if (character === '[') {
      depth += 1
    } else if (character === ']') {
      depth = Math.max(0, depth - 1)
    } else if (character === ',' && depth === 0) {
      parts.push(value.slice(start, index))
      start = index + 1
    }
  }
  parts.push(value.slice(start))
  return parts
}

function splitSteps(path) {
  const terminalParts = path.split(':')
  const rawSteps = terminalParts[0].split('/').filter(Boolean)
  const steps = rawSteps.map((value) => {
    const match = value.match(/^(\d+)(?:\[([^\]]*)\])?/)
    if (!match) return null
    const numeric = Number(match[1])
    return {
      index: numeric % 2 === 0 ? numeric / 2 - 1 : (numeric - 1) / 2,
      type: numeric % 2 === 0 ? 'element' : 'text',
      id: match[2] || null,
    }
  }).filter(Boolean)
  const offsetText = terminalParts[1]?.split('[')[0]
  return {
    steps,
    offset: offsetText === undefined || !/^\d+$/.test(offsetText) ? null : Number(offsetText),
  }
}

function joinPath(base, relative) {
  if (!relative) return base
  if (relative.startsWith('/')) return `${base}${relative}`
  if (relative.startsWith(':')) return `${base}${relative}`
  return `${base}/${relative}`
}

function parseInnerCfi(cfi) {
  if (typeof cfi !== 'string' || !cfi.startsWith('epubcfi(') || !cfi.endsWith(')')) return null
  const inner = cfi.slice(8, -1)
  const bangIndex = inner.indexOf('!')
  if (bangIndex < 0) return null
  const packagePart = inner.slice(0, bangIndex)
  const packageSteps = splitSteps(packagePart).steps
  const spineStep = packageSteps[1]
  if (!spineStep || spineStep.type !== 'element') return null
  const contentParts = splitCfiParts(inner.slice(bangIndex + 1))
  if (contentParts.length === 3) {
    const basePath = contentParts[0]
    const start = splitSteps(joinPath(basePath, contentParts[1]))
    const end = splitSteps(joinPath(basePath, contentParts[2]))
    return {
      spineIndex: spineStep.index,
      start,
      end,
      range: true,
    }
  }
  const point = splitSteps(contentParts[0])
  return {
    spineIndex: spineStep.index,
    start: point,
    end: point,
    range: false,
  }
}

function comparePoints(first, second) {
  const length = Math.max(first.steps.length, second.steps.length)
  for (let index = 0; index < length; index += 1) {
    if (!first.steps[index]) return -1
    if (!second.steps[index]) return 1
    if (first.steps[index].index !== second.steps[index].index) {
      return first.steps[index].index < second.steps[index].index ? -1 : 1
    }
    if (first.steps[index].type !== second.steps[index].type) {
      return first.steps[index].type === 'element' ? -1 : 1
    }
  }
  const firstOffset = first.offset ?? 0
  const secondOffset = second.offset ?? 0
  return firstOffset === secondOffset ? 0 : firstOffset < secondOffset ? -1 : 1
}

function pathForNode(node, offset) {
  const steps = []
  let current = node
  while (current?.parentNode && current.parentNode.nodeType !== 9) {
    const parent = current.parentNode
    if (current.nodeType === 1) {
      const children = Array.from(parent.childNodes || []).filter((child) => child.nodeType === 1)
      const index = children.indexOf(current)
      if (index < 0) return null
      steps.unshift({ type: 'element', index, id: current.getAttribute?.('id') || null })
    } else if (current.nodeType === 3) {
      const children = Array.from(parent.childNodes || []).filter((child) => child.nodeType === 3)
      const index = children.indexOf(current)
      if (index < 0) return null
      steps.unshift({ type: 'text', index, id: null })
    } else {
      return null
    }
    current = parent
  }
  if (offset !== null && offset !== undefined && steps[steps.length - 1]?.type !== 'text') {
    steps.push({ type: 'text', index: 0, id: null })
  }
  return { steps, offset: offset ?? null }
}

function serializeSteps(steps) {
  return steps.map((step) => {
    const position = step.type === 'element' ? (step.index + 1) * 2 : (step.index * 2) + 1
    return `/${position}${step.id ? `[${step.id.replace(/([,\[\]\(\);=])/g, '^$1')}]` : ''}`
  }).join('')
}

function serializePoint(point) {
  return `${serializeSteps(point.steps)}${point.offset === null ? '' : `:${point.offset}`}`
}

function serializeCfi(spineIndex, spineId, path, start = null, end = null) {
  const packagePath = `/6/${(spineIndex + 1) * 2}${spineId ? `[${spineId}]` : ''}`
  if (!start || !end || (start.steps.length === end.steps.length && start.steps.every((step, index) => (
    step.index === end.steps[index].index && step.type === end.steps[index].type && start.offset === end.offset
  )))) {
    return `epubcfi(${packagePath}!${serializePoint(path)})`
  }
  let commonLength = 0
  while (
    commonLength < start.steps.length
    && commonLength < end.steps.length
    && start.steps[commonLength].index === end.steps[commonLength].index
    && start.steps[commonLength].type === end.steps[commonLength].type
    && start.steps[commonLength].id === end.steps[commonLength].id
  ) commonLength += 1
  const base = serializeSteps(start.steps.slice(0, commonLength))
  const startTail = serializePoint({ ...start, steps: start.steps.slice(commonLength) })
  const endTail = serializePoint({ ...end, steps: end.steps.slice(commonLength) })
  return `epubcfi(${packagePath}!${base},${startTail},${endTail})`
}

function resolvePoint(point, sourceDocument) {
  let node = sourceDocument.documentElement
  for (const step of point.steps) {
    if (!node) return null
    if (step.type === 'element') {
      const idNode = step.id
        ? Array.from(sourceDocument.getElementsByTagName('*')).find((element) => element.getAttribute('id') === step.id)
        : null
      let isDescendant = false
      for (let ancestor = idNode; ancestor; ancestor = ancestor.parentNode) {
        if (ancestor === node) {
          isDescendant = true
          break
        }
      }
      node = idNode && isDescendant
        ? idNode
        : Array.from(node.childNodes || []).filter((child) => child.nodeType === 1)[step.index] || null
    } else {
      node = Array.from(node.childNodes || []).filter((child) => child.nodeType === 3)[step.index] || null
    }
  }
  if (!node) return null
  const offset = Math.min(point.offset ?? 0, node.nodeType === 3 ? node.textContent.length : node.childNodes.length)
  return { node, offset }
}

export class EpubCFI {
  constructor(value) {
    this.value = value || ''
    this.parsed = parseInnerCfi(this.value)
  }

  collapse(toStart = false) {
    if (!this.parsed?.range) return this
    const point = toStart ? this.parsed.start : this.parsed.end
    const packagePath = `/6/${(this.parsed.spineIndex + 1) * 2}`
    this.value = `epubcfi(${packagePath}!${serializePoint(point)})`
    this.parsed = parseInnerCfi(this.value)
    return this
  }

  toString() {
    return this.value
  }

  compare(firstCfi, secondCfi) {
    const first = parseInnerCfi(firstCfi)
    const second = parseInnerCfi(secondCfi)
    if (!first || !second) throw new Error('The saved EPUB location is invalid.')
    if (first.spineIndex !== second.spineIndex) return first.spineIndex < second.spineIndex ? -1 : 1
    return comparePoints(first.range ? first.start : first.start, second.range ? second.start : second.start)
  }
}

export function createCfi(book, section, node, offset = null) {
  const path = pathForNode(node, offset)
  if (!path) throw new Error('Could not create an EPUB location for this selection.')
  return serializeCfi(section.spineIndex, section.id, path)
}

export function createCfiRange(book, section, range) {
  return createCfiRangeFromPoints(
    book,
    section,
    range.startContainer,
    range.startOffset,
    range.endContainer,
    range.endOffset,
  )
}

export function createCfiRangeFromPoints(book, section, startNode, startOffset, endNode, endOffset) {
  const start = pathForNode(startNode, startOffset)
  const end = pathForNode(endNode, endOffset)
  if (!start || !end) throw new Error('Could not create an EPUB location for this selection.')
  if (
    start.offset === end.offset
    && start.steps.length === end.steps.length
    && start.steps.every((step, index) => step.type === end.steps[index].type && step.index === end.steps[index].index)
  ) return serializeCfi(section.spineIndex, section.id, start)
  return serializeCfi(section.spineIndex, section.id, null, start, end)
}

export function resolveCfi(book, cfi, sourceToRendered = null) {
  const parsed = parseInnerCfi(cfi)
  if (!parsed) return null
  const section = book.spine.spineItems.find((item) => item.spineIndex === parsed.spineIndex)
  if (!section?.document) return null
  const resolveEndpoint = (point) => {
    const sourcePoint = resolvePoint(point, section.document)
    if (!sourcePoint) return null
    const renderedNode = sourceToRendered ? sourceToRendered.get(sourcePoint.node) : sourcePoint.node
    if (!renderedNode) return null
    const renderedRange = document.createRange()
    renderedRange.setStart(renderedNode, Math.min(sourcePoint.offset, renderedNode.nodeType === 3 ? renderedNode.textContent.length : renderedNode.childNodes.length))
    renderedRange.collapse(true)
    return renderedRange
  }
  const start = resolveEndpoint(parsed.start)
  const end = resolveEndpoint(parsed.end)
  if (!start || !end) return null
  if (!parsed.range) return start
  const range = document.createRange()
  range.setStart(start.startContainer, start.startOffset)
  range.setEnd(end.startContainer, end.startOffset)
  return range
}

export function cfiSectionIndex(cfi) {
  return parseInnerCfi(cfi)?.spineIndex ?? null
}
