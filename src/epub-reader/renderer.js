import { cfiSectionIndex, createCfi, createCfiRangeFromPoints, resolveCfi } from './cfi.js'
import { resolveEpubResourcePath } from './parser.js'

const allowedElements = new Set([
  'a', 'abbr', 'address', 'article', 'aside', 'b', 'blockquote', 'br', 'caption', 'cite', 'code', 'dd', 'del',
  'details', 'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'hr', 'i', 'img', 'ins', 'kbd', 'li', 'main', 'mark', 'ol', 'p', 'pre', 'q', 'rp', 'rt', 'ruby', 's',
  'samp', 'section', 'small', 'span', 'strong', 'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot',
  'th', 'thead', 'time', 'tr', 'u', 'ul', 'var',
])

const droppedElements = new Set([
  'audio', 'button', 'canvas', 'embed', 'form', 'iframe', 'input', 'link', 'math', 'meta', 'object',
  'script', 'select', 'source', 'style', 'svg', 'textarea', 'video',
])

const svgNamespace = 'http://www.w3.org/2000/svg'
const xlinkNamespace = 'http://www.w3.org/1999/xlink'
const safeSvgElements = new Set([
  'circle', 'clippath', 'defs', 'desc', 'ellipse', 'g', 'image', 'line', 'lineargradient', 'mask',
  'path', 'polygon', 'polyline', 'radialgradient', 'rect', 'stop', 'svg', 'text', 'title', 'tspan', 'use',
])
const safeSvgAttributes = new Set([
  'alignment-baseline', 'clip-path', 'cx', 'cy', 'd', 'fill', 'fill-opacity', 'fill-rule',
  'gradienttransform', 'gradientunits', 'height', 'id', 'mask', 'offset', 'opacity', 'points',
  'preserveaspectratio', 'r', 'rx', 'ry', 'spreadmethod', 'stop-color', 'stop-opacity', 'stroke',
  'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit',
  'stroke-opacity', 'stroke-width', 'transform', 'viewbox', 'width', 'x', 'x1', 'x2', 'y', 'y1', 'y2',
])

const allowedCssProperties = new Set([
  'background-color', 'border', 'border-bottom', 'border-bottom-color', 'border-bottom-style', 'border-bottom-width',
  'border-color', 'border-left', 'border-left-color', 'border-left-style', 'border-left-width', 'border-radius',
  'border-right', 'border-right-color', 'border-right-style', 'border-right-width', 'border-style', 'border-top',
  'border-top-color', 'border-top-style', 'border-top-width', 'border-width', 'color', 'display', 'font',
  'font-family', 'font-size', 'font-style', 'font-variant', 'font-weight', 'height', 'letter-spacing', 'line-height',
  'list-style-type', 'margin', 'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'max-height',
  'max-width', 'min-height', 'min-width', 'padding', 'padding-bottom', 'padding-left', 'padding-right',
  'padding-top', 'text-align', 'text-decoration', 'text-indent', 'text-transform', 'vertical-align',
  'white-space', 'width', 'word-break', 'word-spacing', 'overflow-wrap',
])

const safeColorValue = /^(?:#[\da-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%]+\))$/i
const safeCssValueChars = /^[\w\s#.,'"%()+/-]+$/
const safeClassOrId = /^[\p{L}\p{N}_:-][\p{L}\p{N}_.:-]{0,127}$/u
const safeImageTypes = new Set(['image/avif', 'image/gif', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'])
let renditionId = 0

function isSafeCssValue(property, value) {
  const normalized = value.trim().replace(/\s*!important\s*$/i, '')
  if (
    !normalized
    || normalized.length > 200
    || /(?:url|expression|var|attr|env|javascript|@import|behavior|binding)/i.test(normalized)
    || /[{}<>\\;]/.test(normalized)
    || !safeCssValueChars.test(normalized)
  ) return null

  if (property === 'color' || property === 'background-color' || property.endsWith('-color')) {
    return safeColorValue.test(normalized) ? normalized : null
  }
  if (property === 'display') {
    return ['block', 'inline', 'inline-block', 'list-item', 'table', 'table-cell', 'table-row'].includes(normalized.toLowerCase())
      ? normalized
      : null
  }
  return normalized
}

function parseCssDeclarations(source) {
  const declarations = []
  for (const raw of source.split(';')) {
    const separator = raw.indexOf(':')
    if (separator <= 0) continue
    const property = raw.slice(0, separator).trim().toLowerCase()
    if (!allowedCssProperties.has(property)) continue
    const value = isSafeCssValue(property, raw.slice(separator + 1))
    if (value) declarations.push(`${property}:${value}`)
  }
  return declarations.join(';')
}

function isSafeSelector(selector) {
  const normalized = selector.trim()
  if (!normalized || normalized.length > 180 || /[,:*+~>\[\]()]/.test(normalized)) return false
  const parts = normalized.split(/\s+/)
  return parts.every((part) => (
    /^(?:[a-z][\w-]*)?(?:[.#][\w-]+)+$/i.test(part)
    || /^[a-z][\w-]*$/i.test(part)
  ))
}

export function sanitizeStylesheet(source, scope) {
  const rules = String(source || '').replace(/\/\*[\s\S]*?\*\//g, '').match(/([^{}]+)\{([^{}]*)\}/g) || []
  const output = []
  for (const rule of rules) {
    const separator = rule.indexOf('{')
    const selectors = rule.slice(0, separator).trim().split(',')
    const declarations = parseCssDeclarations(rule.slice(separator + 1, -1))
    if (!declarations) continue
    for (const selector of selectors) {
      if (!isSafeSelector(selector)) continue
      if (['html', 'body'].includes(selector.trim().toLowerCase())) {
        output.push(`${scope} .epub-book-content{${declarations}}`)
        continue
      }
      const scopedSelector = selector.trim().split(/\s+/).join(' ')
      output.push(`${scope} .epub-book-content ${scopedSelector}{${declarations}}`)
    }
  }
  return output.join('\n')
}

function safeAttribute(element, attribute) {
  const name = attribute.name.toLowerCase()
  const value = attribute.value
  if (name.startsWith('on') || name === 'style' || name === 'srcset' || name === 'srcdoc') return false
  if (['id', 'name'].includes(name)) {
    if (safeClassOrId.test(value)) element.setAttribute(name, value)
    return true
  }
  if (name === 'class') {
    const classes = value.split(/\s+/).filter((className) => safeClassOrId.test(className))
    if (classes.length) element.setAttribute('class', classes.join(' '))
    return true
  }
  if (['title', 'lang', 'dir', 'alt', 'colspan', 'rowspan', 'start', 'open', 'reversed', 'datetime', 'cite', 'width', 'height'].includes(name)) {
    if (['width', 'height', 'colspan', 'rowspan', 'start'].includes(name) && !/^\d{1,5}$/.test(value)) return true
    if (name === 'dir' && !['ltr', 'rtl', 'auto'].includes(value.toLowerCase())) return true
    element.setAttribute(name, value.slice(0, 1000))
    return true
  }
  return false
}

function applySafeInlineStyle(element, source) {
  const declarations = parseCssDeclarations(source)
  if (declarations) element.setAttribute('style', declarations)
}

function bodyForSection(section) {
  const body = Array.from(section.document.getElementsByTagName('*')).find((element) => element.localName === 'body')
  return body || section.document.documentElement
}

function appendSanitizedNode(sourceNode, targetParent, section, mappings, rendition, warnings) {
  const targetDocument = targetParent.ownerDocument
  if (sourceNode.nodeType === 3) {
    const text = targetDocument.createTextNode(sourceNode.nodeValue || '')
    targetParent.append(text)
    mappings.sourceToRendered.set(sourceNode, text)
    mappings.renderedToSource.set(text, sourceNode)
    return
  }
  if (sourceNode.nodeType !== 1) return

  const name = sourceNode.localName?.toLowerCase()
  if (!name) return
  if (name === 'svg' && sourceNode.namespaceURI === svgNamespace) {
    appendSanitizedSvgNode(sourceNode, targetParent, section, mappings, rendition, warnings)
    return
  }
  if (droppedElements.has(name)) {
    if (!['link', 'style'].includes(name)) {
      warnings.add(name === 'script' ? 'EPUB scripts were removed.' : 'Some unsupported EPUB content was skipped.')
    }
    return
  }

  if (name === 'link') return

  if (!allowedElements.has(name)) {
    warnings.add('Some unsupported EPUB content was skipped.')
    for (const child of Array.from(sourceNode.childNodes || [])) {
      appendSanitizedNode(child, targetParent, section, mappings, rendition, warnings)
    }
    return
  }

  const element = targetDocument.createElement(name)
  targetParent.append(element)
  mappings.sourceToRendered.set(sourceNode, element)
  mappings.renderedToSource.set(element, sourceNode)
  for (const attribute of Array.from(sourceNode.attributes || [])) {
    const attrName = attribute.name.toLowerCase()
    if (attrName === 'style') {
      applySafeInlineStyle(element, attribute.value)
    } else if (attrName === 'href' && name === 'a') {
      setSafeLink(element, attribute.value, section, rendition)
    } else if (attrName === 'src' && name === 'img') {
      setSafeImage(element, attribute.value, section, rendition)
    } else {
      safeAttribute(element, attribute)
    }
  }

  if (name === 'img') {
    element.loading = 'lazy'
    if (!element.hasAttribute('src')) {
      element.alt = element.alt || 'Unsupported image'
      element.classList.add('epub-image-unavailable')
    }
    return
  }

  for (const child of Array.from(sourceNode.childNodes || [])) {
    appendSanitizedNode(child, element, section, mappings, rendition, warnings)
  }
}

function appendSanitizedSvgNode(sourceNode, targetParent, section, mappings, rendition, warnings) {
  if (sourceNode.nodeType === 3) {
    targetParent.append(targetParent.ownerDocument.createTextNode(sourceNode.nodeValue || ''))
    return
  }
  if (sourceNode.nodeType !== 1) return
  if (sourceNode.namespaceURI !== svgNamespace) {
    warnings.add('Some unsupported EPUB content was skipped.')
    return
  }

  const name = sourceNode.localName?.toLowerCase()
  if (!name || !safeSvgElements.has(name)) {
    warnings.add('Some unsupported EPUB content was skipped.')
    return
  }

  const element = targetParent.ownerDocument.createElementNS(svgNamespace, sourceNode.localName)
  targetParent.append(element)
  mappings.sourceToRendered.set(sourceNode, element)
  mappings.renderedToSource.set(element, sourceNode)

  for (const attribute of Array.from(sourceNode.attributes || [])) {
    const attributeName = attribute.localName.toLowerCase()
    const value = attribute.value.trim()
    if (attributeName === 'href') {
      let safeHref = null
      if (name === 'image') {
        safeHref = safeImageUrl(value, section, rendition)
      } else if (value.startsWith('#') && safeClassOrId.test(value.slice(1))) {
        safeHref = value
      }
      if (safeHref) {
        if (attribute.namespaceURI === xlinkNamespace) {
          element.setAttributeNS(xlinkNamespace, 'xlink:href', safeHref)
        } else {
          element.setAttribute('href', safeHref)
        }
      }
      continue
    }
    if (attributeName === 'style') {
      applySafeInlineStyle(element, value)
      continue
    }
    const hasSafeLocalUrl = /url\s*\(/i.test(value) && /^url\(\s*#[\w:.-]+\s*\)$/i.test(value)
    if (
      safeSvgAttributes.has(attributeName)
      && !/(?:javascript|data:|https?:|file:|blob:)/i.test(value)
      && (!/url\s*\(/i.test(value) || hasSafeLocalUrl)
      && /^[\w\s#.,'"%()+/-]{0,8192}$/.test(value)
    ) {
      element.setAttribute(attribute.name, value)
    }
  }

  for (const child of Array.from(sourceNode.childNodes || [])) {
    appendSanitizedSvgNode(child, element, section, mappings, rendition, warnings)
  }
}

function setSafeLink(element, reference, section, rendition) {
  const href = String(reference || '').trim()
  if (!href || /^(?:javascript|data|file|blob|vbscript):/i.test(href) || href.startsWith('//')) return
  if (href.startsWith('#')) {
    element.href = '#'
    element.dataset.epubHref = `${section.href}${href}`
    return
  }
  if (/^https?:\/\//i.test(href) || /^mailto:/i.test(href)) {
    try {
      const url = new URL(href)
      if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:') {
        element.href = url.href
        element.target = '_blank'
        element.rel = 'noopener noreferrer'
      }
    } catch {}
    return
  }
  try {
    const path = resolveEpubResourcePath(section.href, href)
    const fragment = href.includes('#') ? href.slice(href.indexOf('#')) : ''
    const target = `${path}${fragment}`
    if (rendition.book.spine.get(target)) {
      element.href = '#'
      element.dataset.epubHref = target
    }
  } catch {}
}

function setSafeImage(element, reference, section, rendition) {
  const url = safeImageUrl(reference, section, rendition)
  if (url) element.src = url
}

function safeImageUrl(reference, section, rendition) {
  const href = String(reference || '').trim()
  if (!href || href.startsWith('#') || href.startsWith('//') || /^[a-z][a-z\d+.-]*:/i.test(href)) return null
  try {
    const path = resolveEpubResourcePath(section.href, href)
    const asset = rendition.book.assets.get(path)
    if (!asset || !safeImageTypes.has(asset.mediaType)) return null
    return rendition.objectUrl(path, asset)
  } catch {
    return null
  }
}

function sectionStyles(section, book, scope) {
  const sources = []
  const links = Array.from(section.document.getElementsByTagName('*'))
    .filter((element) => element.localName === 'link' && /(?:^|\s)stylesheet(?:\s|$)/i.test(element.getAttribute('rel') || ''))
  for (const link of links) {
    try {
      const path = resolveEpubResourcePath(section.href, link.getAttribute('href'))
      const stylesheet = book.stylesheetByPath.get(path)
      if (stylesheet) sources.push(sanitizeStylesheet(stylesheet.source, scope))
    } catch {}
  }
  for (const style of Array.from(section.document.getElementsByTagName('*')).filter((element) => element.localName === 'style')) {
    sources.push(sanitizeStylesheet(style.textContent, scope))
  }
  return sources.filter(Boolean).join('\n')
}

function rangeForNode(node, offset) {
  const range = document.createRange()
  range.setStart(node, Math.min(offset, node.nodeType === 3 ? node.textContent.length : node.childNodes.length))
  range.collapse(true)
  return range
}

function pointAtEdge(viewport, edge) {
  const bounds = viewport.getBoundingClientRect()
  const start = edge === 'start'
  const top = start ? bounds.top + 10 : bounds.bottom - 10
  const bottom = start ? bounds.bottom - 10 : bounds.top + 10
  const left = start ? bounds.left + 12 : bounds.right - 12
  const right = start ? bounds.right - 12 : bounds.left + 12
  const yStep = start ? 8 : -8
  const xStep = start ? 8 : -8
  for (let y = top; start ? y <= bottom : y >= bottom; y += yStep) {
    for (let x = left; start ? x <= right : x >= right; x += xStep) {
      let position
      if (document.caretPositionFromPoint) {
        const caret = document.caretPositionFromPoint(x, y)
        if (caret) position = { node: caret.offsetNode, offset: caret.offset }
      } else if (document.caretRangeFromPoint) {
        const caret = document.caretRangeFromPoint(x, y)
        if (caret) position = { node: caret.startContainer, offset: caret.startOffset }
      }
      if (position && viewport.contains(position.node) && position.node.nodeType === 3) return position
    }
  }
  return null
}

function normalizedLocation(section, cfi, page, total, percentage) {
  return {
    index: section.index,
    href: section.href,
    cfi,
    displayed: { page: page + 1, total },
    percentage,
  }
}

export function createRendition(book, container) {
  return new IframeFreeRendition(book, container)
}

class IframeFreeRendition {
  constructor(book, container) {
    this.book = book
    this.container = container
    this.listeners = new Map()
    this.annotationsByCfi = new Map()
    this.objectUrls = new Map()
    this.sourceToRendered = new WeakMap()
    this.renderedToSource = new WeakMap()
    this.warnings = new Set(book.warnings || [])
    this.activeSection = null
    this.article = null
    this.pageIndex = 0
    this.pageWidth = 0
    this.pageHeight = 0
    this.totalPages = 1
    this.current = null
    this.cfiPageByValue = new Map()
    this.cfiPageAware = true
    this.destroyed = false
    this.displayRequest = 0
    this.displayPending = false
    this.renditionIndex = ++renditionId
    this.scope = `[data-epub-renderer="reader-${this.renditionIndex}"]`
    this.userThemeRules = ''
    this.viewport = document.createElement('div')
    this.viewport.className = 'epub-reader__viewport'
    this.container.dataset.epubRenderer = `reader-${this.renditionIndex}`
    this.container.replaceChildren(this.viewport)
    this.styleElement = document.createElement('style')
    this.container.append(this.styleElement)
    this.highlightLayer = document.createElement('div')
    this.highlightLayer.className = 'epub-reader__highlights'
    this.viewport.append(this.highlightLayer)
    this.setStylesheet = document.createElement('style')
    this.container.append(this.setStylesheet)
    this.themes = {
      default: (styles) => this.applyTheme(styles),
      fontSize: (fontSize) => this.applyFontSize(fontSize),
    }
    this.annotations = {
      highlight: (cfiRange, data, callback, className = 'leaf-reader-highlight', styles = {}) => {
        this.annotationsByCfi.set(cfiRange, { className, styles, data })
        this.renderHighlights()
      },
      remove: (cfiRange) => {
        this.annotationsByCfi.delete(cfiRange)
        this.renderHighlights()
      },
    }
    this.selectionHandler = () => this.handleSelection()
    this.linkHandler = (event) => {
      const link = event.target.closest?.('a')
      if (!link || !this.container.contains(link)) return
      event.preventDefault()
    }
    this.contextMenuHandler = (event) => {
      const selection = document.getSelection()
      const selectedBookText = selection
        && !selection.isCollapsed
        && selection.toString().trim()
        && this.article?.contains(selection.anchorNode)
        && this.article.contains(selection.focusNode)
      if (selectedBookText || this.article?.contains(event.target)) {
        event.preventDefault()
      }
    }
    this.container.addEventListener('pointerup', this.selectionHandler)
    this.container.addEventListener('click', this.linkHandler)
    document.addEventListener('contextmenu', this.contextMenuHandler, true)
    document.addEventListener('selectionchange', this.selectionHandler)
    this.resizeObserver = typeof ResizeObserver === 'function'
      ? new ResizeObserver(() => this.resize())
      : null
    this.resizeObserver?.observe(this.container)
    this.applyTheme({})
    this.resize()
  }

  on(eventName, listener) {
    const listeners = this.listeners.get(eventName) || new Set()
    listeners.add(listener)
    this.listeners.set(eventName, listeners)
    return this
  }

  emit(eventName, ...args) {
    for (const listener of this.listeners.get(eventName) || []) listener(...args)
  }

  async display(target, { pageNumber = null, lastPage = false } = {}) {
    if (this.destroyed) throw new Error('The EPUB reader has been closed.')
    const request = ++this.displayRequest
    this.displayPending = true
    try {
      const previousWarnings = new Set(this.warnings)
      const currentCfi = typeof target === 'string' && target.startsWith('epubcfi(') ? target : null
      const spineIndex = currentCfi ? cfiSectionIndex(currentCfi) : null
      let section = null
      let fragment = ''
      if (spineIndex !== null) {
        section = this.book.spine.spineItems.find((item) => item.spineIndex === spineIndex)
      } else if (typeof target === 'number') {
        section = this.book.spine.spineItems[target] || null
      } else if (typeof target === 'string' && target) {
        try {
          fragment = target.includes('#') ? decodeURIComponent(target.slice(target.indexOf('#') + 1)) : ''
        } catch {
          throw new Error('The EPUB chapter link contains an invalid anchor.')
        }
        section = this.book.spine.get(target)
      } else {
        section = this.book.spine.spineItems[0] || null
      }
      if (!section) throw new Error('The requested EPUB chapter could not be found.')

      await section.load()
      if (this.destroyed || request !== this.displayRequest) return this.current
      this.viewport.style.visibility = 'hidden'
      if (section !== this.activeSection) {
        this.pageIndex = 0
        this.renderSection(section)
      }
      this.pageIndex = 0
      this.showPage()
      await this.layout()
      if (this.destroyed || request !== this.displayRequest) return this.current
      if (lastPage) {
        this.pageIndex = this.totalPages - 1
      } else if (Number.isInteger(pageNumber) && pageNumber > 0) {
        this.pageIndex = Math.min(this.totalPages - 1, pageNumber - 1)
      } else if (currentCfi) {
        const renderedRange = resolveCfi(this.book, currentCfi, this.sourceToRendered)
        if (renderedRange) this.pageIndex = this.pageForRange(renderedRange)
      } else if (fragment) {
        const targetElement = Array.from(this.article.querySelectorAll('[id]')).find((element) => element.id === fragment)
        if (targetElement) this.pageIndex = this.pageForElement(targetElement)
      }
      this.showPage()
      for (const warning of this.warnings) {
        if (!previousWarnings.has(warning)) this.emit('warning', warning)
      }
    } finally {
      if (request === this.displayRequest) {
        this.displayPending = false
        if (!this.destroyed) this.viewport.style.visibility = ''
      }
    }
    if (this.destroyed || request !== this.displayRequest) return this.current
    this.updateLocation()
    return this.current
  }

  async displayPage(sectionIndex, pageNumber) {
    const section = this.book.spine.spineItems[sectionIndex]
    if (!section || !Number.isInteger(pageNumber) || pageNumber < 1) {
      throw new Error('The saved EPUB page is invalid.')
    }
    return this.display(sectionIndex, { pageNumber })
  }

  renderSection(section) {
    this.activeSection = section
    this.cfiPageByValue.clear()
    this.cfiPageAware = true
    this.sourceToRendered = new WeakMap()
    this.renderedToSource = new WeakMap()
    const article = document.createElement('article')
    article.className = 'epub-book-content'
    article.setAttribute('lang', this.book.metadata.language || 'en')
    const sourceRoot = section.document.documentElement
    const sourceBody = bodyForSection(section)
    this.sourceToRendered.set(sourceRoot, article)
    this.renderedToSource.set(article, sourceRoot)
    if (sourceBody !== sourceRoot) this.sourceToRendered.set(sourceBody, article)
    const mappings = { sourceToRendered: this.sourceToRendered, renderedToSource: this.renderedToSource }
    for (const child of Array.from(sourceBody.childNodes || [])) {
      appendSanitizedNode(child, article, section, mappings, this, this.warnings)
    }
    this.article = article
    this.viewport.replaceChildren(this.highlightLayer, article)
    this.styleElement.textContent = sectionStyles(section, this.book, this.scope)
    this.applyThemeRules()
    this.showPage()
  }

  async layout() {
    if (!this.article) return
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    this.pageWidth = Math.max(1, this.viewport.clientWidth)
    this.pageHeight = Math.max(1, this.viewport.clientHeight)
    this.article.style.width = `${this.pageWidth}px`
    this.article.style.height = `${this.pageHeight}px`
    const articleStyle = getComputedStyle(this.article)
    const horizontalPadding = parseFloat(articleStyle.paddingLeft) + parseFloat(articleStyle.paddingRight)
    const verticalPadding = parseFloat(articleStyle.paddingTop) + parseFloat(articleStyle.paddingBottom)
    this.article.style.setProperty('--epub-page-content-height', `${Math.max(1, this.pageHeight - verticalPadding)}px`)
    this.article.style.columnWidth = `${Math.max(1, this.pageWidth - horizontalPadding)}px`
    this.article.style.columnGap = `${horizontalPadding}px`
    this.article.style.columnFill = 'auto'
    this.totalPages = Math.max(1, Math.ceil(this.article.scrollWidth / this.pageWidth))
    this.pageIndex = Math.min(this.pageIndex, this.totalPages - 1)
  }

  async resize() {
    if (!this.activeSection || this.destroyed || this.displayPending || this.viewport.style.visibility === 'hidden') return
    const section = this.activeSection
    const displayRequest = this.displayRequest
    await this.layout()
    if (
      this.destroyed
      || this.activeSection !== section
      || this.displayRequest !== displayRequest
      || this.displayPending
      || this.viewport.style.visibility === 'hidden'
    ) return
    this.showPage()
    const currentCfi = this.current?.start?.cfi
    if (currentCfi && this.cfiPageAware) {
      const currentRange = resolveCfi(this.book, currentCfi, this.sourceToRendered)
      if (currentRange) this.pageIndex = this.pageForRange(currentRange)
    }
    this.showPage()
    this.updateLocation()
  }

  pageForRange(range) {
    const rect = range.getBoundingClientRect()
    const viewportBounds = this.viewport.getBoundingClientRect()
    if (!rect.width && !rect.height) return this.pageIndex
    return Math.max(0, Math.min(this.totalPages - 1, Math.floor((rect.left - viewportBounds.left + this.pageIndex * this.pageWidth) / this.pageWidth)))
  }

  pageForElement(element) {
    const rect = element.getBoundingClientRect()
    const viewportBounds = this.viewport.getBoundingClientRect()
    return Math.max(0, Math.min(this.totalPages - 1, Math.floor((rect.left - viewportBounds.left + this.pageIndex * this.pageWidth) / this.pageWidth)))
  }

  showPage() {
    if (!this.article) return
    this.article.style.transform = `translateX(${-this.pageIndex * this.pageWidth}px)`
    this.renderHighlights()
  }

  locationPoint(edge) {
    const caret = pointAtEdge(this.viewport, edge)
    if (caret) {
      const sourceNode = this.renderedToSource.get(caret.node)
      if (sourceNode) return createCfi(this.book, this.activeSection, sourceNode, caret.offset)
    }
    const sourceRoot = this.activeSection.document.documentElement
    return createCfi(this.book, this.activeSection, sourceRoot)
  }

  updateLocation() {
    if (!this.activeSection) return
    const pageStart = this.locationPoint('start')
    const pageEnd = this.locationPoint('end')
    const fraction = Math.min(1, Math.max(0, (this.pageIndex + 1) / Math.max(this.totalPages, 1)))
    const sectionFraction = (this.activeSection.index + fraction) / this.book.spine.spineItems.length
    this.current = {
      start: normalizedLocation(this.activeSection, pageStart, this.pageIndex, this.totalPages, sectionFraction),
      end: normalizedLocation(this.activeSection, pageEnd, this.pageIndex, this.totalPages, sectionFraction),
      atEnd: this.activeSection.index === this.book.spine.spineItems.length - 1 && this.pageIndex === this.totalPages - 1,
      percentage: sectionFraction,
    }
    const previousPage = this.cfiPageByValue.get(pageStart)
    if (previousPage !== undefined && previousPage !== this.pageIndex && this.cfiPageAware) {
      this.cfiPageAware = false
    }
    this.cfiPageByValue.set(pageStart, this.pageIndex)
    this.emit('relocated', this.current)
    this.renderHighlights()
  }

  currentLocation() {
    return this.current
  }

  async next() {
    if (!this.activeSection) return
    if (this.pageIndex + 1 < this.totalPages) {
      this.pageIndex += 1
      this.showPage()
      this.updateLocation()
      return
    }
    const nextSection = this.book.spine.spineItems[this.activeSection.index + 1]
    if (nextSection) await this.display(nextSection.index)
  }

  async prev() {
    if (!this.activeSection) return
    if (this.pageIndex > 0) {
      this.pageIndex -= 1
      this.showPage()
      this.updateLocation()
      return
    }
    const previousSection = this.book.spine.spineItems[this.activeSection.index - 1]
    if (previousSection) {
      await this.display(previousSection.index, { lastPage: true })
    }
  }

  getRange(cfi) {
    return resolveCfi(this.book, cfi, this.sourceToRendered)
  }

  getContents() {
    if (!this.activeSection || !this.article) return []
    return [{
      sectionIndex: this.activeSection.index,
      document: {
        body: this.article,
        documentElement: this.article,
        defaultView: null,
        createRange: () => document.createRange(),
        getSelection: () => document.getSelection(),
      },
      range: (cfi) => this.getRange(cfi),
    }]
  }

  handleSelection() {
    if (!this.article || !this.container.contains(document.getSelection()?.anchorNode)) return
    const selection = document.getSelection()
    if (!selection || selection.isCollapsed || !selection.toString().trim()) return
    const range = selection.getRangeAt(0)
    const sourceStart = this.renderedToSource.get(range.startContainer)
    const sourceEnd = this.renderedToSource.get(range.endContainer)
    if (!sourceStart || !sourceEnd) return
    let cfiRange
    try {
      cfiRange = createCfiRangeFromPoints(
        this.book,
        this.activeSection,
        sourceStart,
        range.startOffset,
        sourceEnd,
        range.endOffset,
      )
    } catch {
      return
    }
    this.emit('selected', cfiRange, this.getContents()[0])
  }

  renderHighlights() {
    if (!this.highlightLayer || !this.article) return
    this.highlightLayer.replaceChildren()
    const viewportBounds = this.viewport.getBoundingClientRect()
    for (const [cfiRange, annotation] of this.annotationsByCfi) {
      if (cfiSectionIndex(cfiRange) !== this.activeSection.spineIndex) continue
      const range = this.getRange(cfiRange)
      if (!range) continue
      for (const rect of Array.from(range.getClientRects())) {
        if (rect.right <= viewportBounds.left || rect.left >= viewportBounds.right || rect.bottom <= viewportBounds.top || rect.top >= viewportBounds.bottom) continue
        const highlight = document.createElement('span')
        highlight.className = `epub-reader__highlight ${annotation.className}`
        highlight.style.left = `${rect.left - viewportBounds.left}px`
        highlight.style.top = `${rect.top - viewportBounds.top}px`
        highlight.style.width = `${rect.width}px`
        highlight.style.height = `${rect.height}px`
        highlight.style.backgroundColor = annotation.styles.fill || '#f4d78f'
        highlight.style.opacity = annotation.styles['fill-opacity'] || '0.42'
        this.highlightLayer.append(highlight)
      }
    }
  }

  objectUrl(path, asset) {
    if (!this.objectUrls.has(path)) {
      const url = URL.createObjectURL(new Blob([asset.data], { type: asset.mediaType }))
      this.objectUrls.set(path, url)
    }
    return this.objectUrls.get(path)
  }

  applyTheme(styles) {
    this.themeStyles = styles
    this.applyThemeRules()
  }

  applyFontSize(fontSize) {
    this.themeStyles = this.themeStyles || {}
    this.themeStyles.body = { ...(this.themeStyles.body || {}), 'font-size': fontSize }
    this.applyThemeRules()
  }

  applyThemeRules() {
    const body = this.themeStyles?.body || {}
    const declarations = []
    const descendantDeclarations = []
    const inheritedProperties = new Set([
      'color', 'font-family', 'font-size', 'font-weight', 'line-height', 'touch-action', 'user-select',
      '-webkit-touch-callout', '-webkit-user-select',
    ])
    for (const [property, value] of Object.entries(body)) {
      const safeProperty = property.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
      const safeValue = String(value).replace(/\s*!important\s*$/i, '').trim()
      if (!/^[a-z-]+$/.test(safeProperty) || /[;{}<>]/.test(safeValue)) continue
      const declaration = `${safeProperty}:${safeValue} !important`
      declarations.push(declaration)
      if (inheritedProperties.has(safeProperty)) {
        descendantDeclarations.push(['font-size', 'font-weight'].includes(safeProperty)
          ? `${safeProperty}:inherit !important`
          : declaration)
      }
    }
    this.userThemeRules = declarations.length
      ? `${this.scope} .epub-book-content{${declarations.join(';')}}${descendantDeclarations.length ? `\n${this.scope} .epub-book-content *{${descendantDeclarations.join(';')}}` : ''}`
      : ''
    this.setStylesheet.textContent = `
      ${this.userThemeRules}
      ${this.scope} .epub-reader__viewport{position:relative;width:100%;height:100%;overflow:hidden}
      ${this.scope} .epub-book-content{box-sizing:border-box;padding:8px 4%;margin:0;transform-origin:top left;column-fill:auto;overflow:visible}
      ${this.scope} .epub-book-content img{display:block !important;margin-left:auto !important;margin-right:auto !important;max-width:100%;max-height:var(--epub-page-content-height);object-fit:contain;break-inside:avoid}
      ${this.scope} .epub-reader__highlights{position:absolute;inset:0;z-index:2;pointer-events:none}
      ${this.scope} .epub-reader__highlight{position:absolute;display:block;pointer-events:none;border-radius:2px}
      ${this.scope} .epub-image-unavailable{min-width:32px;min-height:24px}
    `
  }

  getRangeForSelection(cfi) {
    return this.getRange(cfi)
  }

  destroy() {
    this.destroyed = true
    this.displayRequest += 1
    this.displayPending = false
    this.resizeObserver?.disconnect()
    this.container.removeEventListener('pointerup', this.selectionHandler)
    this.container.removeEventListener('click', this.linkHandler)
    document.removeEventListener('contextmenu', this.contextMenuHandler, true)
    document.removeEventListener('selectionchange', this.selectionHandler)
    for (const url of this.objectUrls.values()) URL.revokeObjectURL(url)
    this.objectUrls.clear()
    this.container.replaceChildren()
    delete this.container.dataset.epubRenderer
    this.listeners.clear()
    this.annotationsByCfi.clear()
  }
}
