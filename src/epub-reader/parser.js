import { DOMParser } from '@xmldom/xmldom'
import { unzipSync } from 'fflate'

const archiveLimits = {
  inputBytes: 120 * 1024 * 1024,
  entryBytes: 48 * 1024 * 1024,
  totalBytes: 256 * 1024 * 1024,
  entries: 10_000,
}

const commonXmlEntities = {
  nbsp: '\u00a0',
  ndash: '\u2013',
  mdash: '\u2014',
  hellip: '\u2026',
  lsquo: '\u2018',
  rsquo: '\u2019',
  ldquo: '\u201c',
  rdquo: '\u201d',
  copy: '\u00a9',
  reg: '\u00ae',
  trade: '\u2122',
}

function bytesOf(input) {
  if (input instanceof Uint8Array) return input
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  throw new TypeError('The EPUB data must be an ArrayBuffer or byte array.')
}

function validateArchivePath(path) {
  if (
    typeof path !== 'string'
    || !path
    || path.startsWith('/')
    || path.includes('\\')
    || /^[a-z][a-z\d+.-]*:/i.test(path)
  ) {
    throw new Error(`The EPUB archive contains an unsafe path: ${JSON.stringify(path)}.`)
  }
  const normalized = path.replace(/\/+$/, '')
  if (normalized.split('/').some((part) => !part || part === '..' || part === '.' || /[\u0000-\u001f]/.test(part))) {
    throw new Error('The EPUB archive contains an unsafe path.')
  }
  return normalized
}

function decodePathSegment(segment) {
  let decoded
  try {
    decoded = decodeURIComponent(segment)
  } catch {
    throw new Error('The EPUB contains an invalid resource path.')
  }
  if (!decoded || decoded === '.' || /[\\/\u0000-\u001f]/.test(decoded)) {
    throw new Error('The EPUB contains an unsafe resource path.')
  }
  return decoded
}

export function resolveEpubResourcePath(basePath, reference) {
  if (typeof reference !== 'string' || !reference.trim()) throw new Error('The EPUB contains an empty resource path.')
  if (reference.includes('\\')) throw new Error('The EPUB contains an unsafe resource path.')
  const withoutSuffix = reference.split(/[?#]/, 1)[0]
  if (!withoutSuffix || withoutSuffix.startsWith('/') || withoutSuffix.startsWith('\\') || /^[a-z][a-z\d+.-]*:/i.test(withoutSuffix)) {
    throw new Error('The EPUB contains a non-local resource path.')
  }

  const segments = basePath ? basePath.split('/').slice(0, -1) : []
  for (const encodedSegment of withoutSuffix.replace(/\\/g, '/').split('/')) {
    if (!encodedSegment || encodedSegment === '.') continue
    const segment = decodePathSegment(encodedSegment)
    if (segment === '..') {
      if (!segments.length) throw new Error('The EPUB resource path escapes the archive root.')
      segments.pop()
    } else {
      segments.push(segment)
    }
  }
  if (!segments.length) throw new Error('The EPUB contains an invalid resource path.')
  return segments.join('/')
}

function removeDoctype(source) {
  const start = source.search(/<!DOCTYPE\b/i)
  if (start < 0) return source
  let bracketDepth = 0
  let quote = ''
  for (let index = start; index < source.length; index += 1) {
    const character = source[index]
    if (quote) {
      if (character === quote) quote = ''
    } else if (character === '"' || character === "'") {
      quote = character
    } else if (character === '[') {
      bracketDepth += 1
    } else if (character === ']') {
      bracketDepth = Math.max(0, bracketDepth - 1)
    } else if (character === '>' && bracketDepth === 0) {
      return `${source.slice(0, start)}${source.slice(index + 1)}`
    }
  }
  throw new Error('The EPUB contains an incomplete document type declaration.')
}

function decodeCommonEntities(source) {
  return source.replace(/&([a-z][a-z\d]+);/gi, (entity, name) => commonXmlEntities[name] ?? entity)
}

function parseXml(bytes, description) {
  const source = decodeText(bytes)
  const safeSource = decodeCommonEntities(removeDoctype(source))
  const errors = []
  const document = new DOMParser({
    errorHandler: {
      warning: () => {},
      error: (message) => errors.push(message),
      fatalError: (message) => errors.push(message),
    },
  }).parseFromString(safeSource, 'application/xml')
  if (errors.length || !document.documentElement || document.getElementsByTagName('parsererror').length) {
    throw new Error(`Could not parse ${description} in this EPUB.`)
  }
  return document
}

function descendantsByLocalName(node, name) {
  return Array.from(node.getElementsByTagName('*')).filter((element) => element.localName === name)
}

function directChildrenByLocalName(node, name) {
  return Array.from(node.childNodes || []).filter((element) => element.nodeType === 1 && (name === '*' || element.localName === name))
}

function firstDescendantByLocalName(node, name) {
  return descendantsByLocalName(node, name)[0] || null
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function decodeText(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes)
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes)
  return new TextDecoder('utf-8').decode(bytes)
}

function parseNavigationDocument(document, opfPath, pathToSection) {
  const findHref = (anchor) => {
    const href = anchor?.getAttribute('href')
    if (!href) return null
    try {
      const path = resolveEpubResourcePath(opfPath, href)
      if (!pathToSection.has(path)) return null
      const fragment = href.includes('#') ? href.slice(href.indexOf('#')) : ''
      return `${path}${fragment}`
    } catch {
      return null
    }
  }

  const parseList = (list) => directChildrenByLocalName(list, 'li')
    .map((item) => {
      const children = directChildrenByLocalName(item, '*')
      const anchor = children.find((child) => child.localName === 'a')
      const labelNode = anchor || children.find((child) => child.localName === 'span')
      const nested = children.find((child) => child.localName === 'ol' || child.localName === 'ul')
      const href = findHref(anchor)
      return {
        label: normalizeText(labelNode?.textContent) || 'Untitled chapter',
        href,
        subitems: nested ? parseList(nested) : [],
      }
    })
    .filter((item) => item.href || item.subitems.length)

  const nav = descendantsByLocalName(document, 'nav').find((element) => {
    const type = Array.from(element.attributes || []).find((attribute) => attribute.localName === 'type')
    return type?.value.split(/\s+/).includes('toc')
  }) || firstDescendantByLocalName(document, 'nav')

  if (nav) {
    const list = directChildrenByLocalName(nav, '*').find((child) => child.localName === 'ol' || child.localName === 'ul')
    if (list) return parseList(list)
  }

  const navMap = firstDescendantByLocalName(document, 'navMap')
  if (!navMap) return []
  const parseNcxPoints = (parent) => directChildrenByLocalName(parent, 'navPoint').map((point) => {
    const label = normalizeText(firstDescendantByLocalName(point, 'navLabel')?.textContent)
    const content = firstDescendantByLocalName(point, 'content')
    const href = findHref({ getAttribute: (name) => content?.getAttribute(name === 'href' ? 'src' : name) })
    return {
      label: label || 'Untitled chapter',
      href,
      subitems: parseNcxPoints(point),
    }
  }).filter((item) => item.href || item.subitems.length)
  const toc = parseNcxPoints(navMap)
  return toc
}

export function flattenEpubNavigation(items, level = 0) {
  return (items || []).flatMap((item) => [
    { ...item, level },
    ...flattenEpubNavigation(item.subitems, level + 1),
  ])
}

export function epubChapterNavigationItems(items, spine) {
  return flattenEpubNavigation(items).filter((item) => item.href && spine.get(item.href))
}

export function epubSectionNavigationOwners(spineItems, navigationItems, spine) {
  if (!navigationItems.length) {
    return new Map(spineItems.map((section, index) => [section.index, index]))
  }

  const linkedEntries = navigationItems
    .map((item, index) => ({
      entryIndex: index,
      level: item.level || 0,
      sectionIndex: item.href ? spine.get(item.href)?.index : null,
    }))
    .filter((entry) => Number.isInteger(entry.sectionIndex))
    .sort((first, second) => first.sectionIndex - second.sectionIndex
      || first.level - second.level
      || first.entryIndex - second.entryIndex)

  return new Map(spineItems.map((section) => {
    let owner = linkedEntries[0]
    for (const entry of linkedEntries) {
      if (entry.sectionIndex > section.index) break
      owner = entry
    }
    return [section.index, owner?.entryIndex ?? 0]
  }))
}

function findCoverPath(packageDocument, manifestItems) {
  const coverImage = manifestItems.find((item) => item.properties.split(/\s+/).includes('cover-image'))
  if (coverImage) return coverImage.path

  const legacyCoverId = descendantsByLocalName(packageDocument, 'meta')
    .find((meta) => meta.getAttribute('name') === 'cover')
    ?.getAttribute('content')
  return manifestItems.find((item) => item.id === legacyCoverId)?.path || null
}

export function parseEpub(input, { lazySections = false } = {}) {
  const inputBytes = bytesOf(input)
  if (!inputBytes.byteLength || inputBytes.byteLength > archiveLimits.inputBytes) {
    throw new Error('This EPUB is empty or larger than the supported file size.')
  }

  let entryCount = 0
  let totalUncompressedBytes = 0
  const archivePaths = new Set()
  const archive = unzipSync(inputBytes, {
    filter: (entry) => {
      entryCount += 1
      if (entryCount > archiveLimits.entries) throw new Error('The EPUB contains too many archive entries.')
      const path = validateArchivePath(entry.name)
      if (archivePaths.has(path)) throw new Error('The EPUB contains duplicate archive paths.')
      archivePaths.add(path)
      if (entry.compression !== 0 && entry.compression !== 8) {
        throw new Error(`The EPUB uses an unsupported compression method for "${path}".`)
      }
      if (entry.originalSize > archiveLimits.entryBytes) throw new Error(`The EPUB entry "${path}" is too large.`)
      totalUncompressedBytes += entry.originalSize
      if (totalUncompressedBytes > archiveLimits.totalBytes) throw new Error('The EPUB expands beyond the supported archive size.')
      return !entry.name.endsWith('/')
    },
  })

  const normalizedArchive = new Map()
  for (const [path, bytes] of Object.entries(archive)) {
    const normalizedPath = validateArchivePath(path)
    if (normalizedArchive.has(normalizedPath)) throw new Error('The EPUB contains duplicate archive paths.')
    normalizedArchive.set(normalizedPath, bytes)
  }

  const containerBytes = normalizedArchive.get('META-INF/container.xml')
  if (!containerBytes) throw new Error('This EPUB is missing its container metadata.')
  const container = parseXml(containerBytes, 'the EPUB container')
  const rootfile = firstDescendantByLocalName(container, 'rootfile')
  const packagePath = rootfile?.getAttribute('full-path')
  if (!packagePath) throw new Error('The EPUB container does not identify a package document.')
  const resolvedPackagePath = resolveEpubResourcePath('', packagePath)
  const packageBytes = normalizedArchive.get(resolvedPackagePath)
  if (!packageBytes) throw new Error('The EPUB package document could not be found.')
  const packageDocument = parseXml(packageBytes, 'the EPUB package')

  const metadataElement = firstDescendantByLocalName(packageDocument, 'metadata')
  if (!metadataElement) throw new Error('The EPUB package is missing its metadata.')
  const metadata = {}
  for (const key of ['title', 'creator', 'description', 'language', 'identifier', 'publisher']) {
    const node = descendantsByLocalName(metadataElement, key)[0]
    if (node) metadata[key] = normalizeText(node.textContent)
  }

  const manifestElement = firstDescendantByLocalName(packageDocument, 'manifest')
  const spineElement = firstDescendantByLocalName(packageDocument, 'spine')
  if (!manifestElement || !spineElement) throw new Error('The EPUB package is missing its manifest or reading order.')

  const manifestItems = directChildrenByLocalName(manifestElement, 'item').map((item) => {
    const id = item.getAttribute('id') || ''
    const href = item.getAttribute('href') || ''
    const mediaType = item.getAttribute('media-type') || ''
    let path = null
    try {
      path = resolveEpubResourcePath(resolvedPackagePath, href)
    } catch {}
    return {
      id,
      href,
      mediaType,
      properties: item.getAttribute('properties') || '',
      path,
    }
  }).filter((item) => item.id && item.path && normalizedArchive.has(item.path))
  const manifestById = new Map(manifestItems.map((item) => [item.id, item]))
  const assets = new Map()
  for (const item of manifestItems) {
    if (item.mediaType && item.mediaType !== 'application/xhtml+xml' && item.mediaType !== 'text/html' && item.mediaType !== 'text/css') {
      assets.set(item.path, { data: normalizedArchive.get(item.path), mediaType: item.mediaType })
    }
  }

  const sections = directChildrenByLocalName(spineElement, 'itemref')
    .map((itemref, index) => {
      const manifestItem = manifestById.get(itemref.getAttribute('idref'))
      if (!manifestItem || !['application/xhtml+xml', 'text/html'].includes(manifestItem.mediaType)) return null
      const section = {
        id: manifestItem.id,
        spineIndex: index,
        href: manifestItem.path,
        mediaType: manifestItem.mediaType,
        document: null,
        load: null,
      }
      let documentLoad = null
      section.load = () => {
        if (section.document) return Promise.resolve(section.document)
        if (!documentLoad) {
          documentLoad = Promise.resolve()
            .then(() => parseXml(normalizedArchive.get(manifestItem.path), `chapter ${index + 1}`))
            .then((document) => {
              section.document = document
              return document
            })
            .catch((error) => {
              documentLoad = null
              throw error
            })
        }
        return documentLoad
      }
      if (lazySections) return section
      try {
        section.document = parseXml(normalizedArchive.get(manifestItem.path), `chapter ${index + 1}`)
        return section
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .map((section, index) => Object.assign(section, { index }))

  if (!sections.length) throw new Error('This EPUB has no readable chapters.')

  const pathToSection = new Map(sections.map((section) => [section.href, section]))
  const navItem = manifestItems.find((item) => item.properties.split(/\s+/).includes('nav'))
    || manifestItems.find((item) => item.mediaType === 'application/x-dtbncx+xml')
  let toc = []
  if (navItem) {
    try {
      const navigationDocument = parseXml(normalizedArchive.get(navItem.path), 'the table of contents')
      toc = parseNavigationDocument(navigationDocument, navItem.path, pathToSection)
    } catch {}
  }

  const coverPath = findCoverPath(packageDocument, manifestItems)
  const cover = coverPath && assets.has(coverPath) ? assets.get(coverPath) : null
  const stylesheetPaths = manifestItems
    .filter((item) => item.mediaType === 'text/css')
    .map((item) => item.path)
  const stylesheets = stylesheetPaths
    .filter((path) => normalizedArchive.has(path))
    .map((path) => ({ path, source: decodeText(normalizedArchive.get(path)) }))
  const stylesheetByPath = new Map(stylesheets.map((stylesheet) => [stylesheet.path, stylesheet]))

  return {
    metadata,
    sections,
    toc,
    assets,
    stylesheets,
    stylesheetByPath,
    cover,
    loaded: {
      metadata: Promise.resolve(metadata),
      navigation: Promise.resolve({ toc }),
    },
    ready: Promise.resolve(),
    spine: {
      spineItems: sections,
      get(href) {
        if (typeof href !== 'string') return null
        const pathReference = href.split('#')[0].split('?')[0]
        if (pathToSection.has(pathReference)) return pathToSection.get(pathReference)
        let path
        try {
          path = resolveEpubResourcePath(resolvedPackagePath, href)
        } catch {
          path = pathReference
        }
        return pathToSection.get(path) || null
      },
    },
    warnings: sections.length < directChildrenByLocalName(spineElement, 'itemref').length
      ? ['Some unsupported or malformed EPUB chapters were skipped.']
      : [],
    destroy() {
      normalizedArchive.clear()
      pathToSection.clear()
      sections.length = 0
      toc.length = 0
      assets.clear()
      stylesheets.length = 0
      stylesheetByPath.clear()
      this.cover = null
    },
  }
}
