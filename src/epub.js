import { strToU8, zipSync } from 'fflate'
import { createUuid } from './id.js'

function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  })[character])
}

function splitChapters(manuscript) {
  const chapters = []
  let current = { title: '', blocks: [] }
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length) current.blocks.push({ type: 'p', text: paragraph.join(' ') })
    paragraph = []
  }

  for (const line of manuscript.replace(/\r/g, '').split('\n')) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      const level = heading[1].length
      const text = heading[2].trim()
      if (level === 1 && !current.title && !current.blocks.length && !chapters.length) continue
      if (level <= 2) {
        if (current.title || current.blocks.length) chapters.push(current)
        current = { title: text, blocks: [] }
      } else {
        current.blocks.push({ type: 'h2', text })
      }
    } else if (line.trim()) {
      paragraph.push(line.trim())
    } else {
      flushParagraph()
    }
  }
  flushParagraph()
  if (current.title || current.blocks.length || !chapters.length) chapters.push(current)

  return chapters.map((chapter, index) => ({
    title: chapter.title || `Chapter ${index + 1}`,
    blocks: chapter.blocks,
  }))
}

function splitChapterContent(content) {
  const blocks = []
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'p', text: paragraph.join('\n') })
    paragraph = []
  }

  for (const line of String(content || '').replace(/\r\n?/g, '\n').split('\n')) {
    const heading = line.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      flushParagraph()
      blocks.push({ type: 'h2', text: heading[2] })
    } else if (line.trim()) {
      paragraph.push(line)
    } else {
      flushParagraph()
    }
  }
  flushParagraph()
  return blocks
}

export function createEpub({ title, author, manuscript = '', chapters: sourceChapters, cover = null }) {
  const safeTitle = escapeXml(title || 'Untitled')
  const safeAuthor = escapeXml(author || 'Leaf reader')
  const chapters = Array.isArray(sourceChapters)
    ? sourceChapters.map((chapter, index) => ({
      title: String(chapter.title || `Chapter ${index + 1}`),
      blocks: splitChapterContent(chapter.content),
    }))
    : splitChapters(manuscript)
  const coverMediaType = cover?.mediaType === 'image/png' || cover?.mediaType === 'image/jpeg' ? cover.mediaType : null
  const coverFileName = coverMediaType === 'image/png' ? 'cover.png' : 'cover.jpg'
  const coverBytes = coverMediaType && cover?.data ? (cover.data instanceof Uint8Array ? cover.data : new Uint8Array(cover.data)) : null
  const identifier = `urn:uuid:${createUuid()}`
  const chapterFiles = chapters.map((chapter, index) => {
    const fileName = `chapter-${String(index + 1).padStart(2, '0')}.xhtml`
    const body = chapter.blocks.map((block) => `<${block.type}>${escapeXml(block.text).replace(/\n/g, '<br />')}</${block.type}>`).join('\n')
    return {
      fileName,
      title: chapter.title,
      content: `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
  <head><title>${escapeXml(chapter.title)}</title><link rel="stylesheet" type="text/css" href="styles.css" /></head>
  <body><section epub:type="chapter"><h1>${escapeXml(chapter.title)}</h1>${body}</section></body>
</html>`,
    }
  })
  const navItems = chapterFiles.map((chapter, index) => `<li><a href="${chapter.fileName}">${escapeXml(chapter.title)}</a></li>`).join('\n')
  const manifest = chapterFiles.map((chapter, index) => `<item id="chapter-${index + 1}" href="${chapter.fileName}" media-type="application/xhtml+xml" />`).join('\n')
  const coverManifest = coverBytes ? `<item id="cover-image" href="images/${coverFileName}" media-type="${coverMediaType}" properties="cover-image" />` : ''
  const spine = chapterFiles.map((chapter, index) => `<itemref idref="chapter-${index + 1}" />`).join('\n')
  const files = {
    mimetype: [strToU8('application/epub+zip'), { level: 0 }],
    'META-INF/container.xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="EPUB/package.opf" media-type="application/oebps-package+xml" /></rootfiles></container>`),
    'EPUB/package.opf': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book-id" xml:lang="en">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book-id">${identifier}</dc:identifier><dc:title>${safeTitle}</dc:title><dc:creator>${safeAuthor}</dc:creator><dc:language>en</dc:language>${coverBytes ? '<meta name="cover" content="cover-image" />' : ''}<meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')}</meta></metadata>
    <manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav" /><item id="styles" href="styles.css" media-type="text/css" />${coverManifest}${manifest}</manifest>
  <spine>${spine}</spine>
</package>`),
    'EPUB/nav.xhtml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en"><head><title>Contents</title></head><body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>${navItems}</ol></nav></body></html>`),
    'EPUB/styles.css': strToU8('body { font-family: Georgia, serif; line-height: 1.7; margin: 5%; } h1 { font-size: 1.5em; font-weight: normal; } p { margin: 0 0 1em; }'),
  }

  if (coverBytes) files[`EPUB/images/${coverFileName}`] = coverBytes
  for (const chapter of chapterFiles) files[`EPUB/${chapter.fileName}`] = strToU8(chapter.content)

  const bytes = zipSync(files, { level: 6 })
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
}