import test from 'node:test'
import assert from 'node:assert/strict'
import { strToU8, zipSync } from 'fflate'
import { createEpub } from '../src/epub.js'
import {
  epubChapterNavigationItems,
  epubSectionNavigationOwners,
  flattenEpubNavigation,
  parseEpub,
  resolveEpubResourcePath,
} from '../src/epub-reader/parser.js'

test('parses Leaf-generated EPUB metadata, reading order, and navigation', () => {
  const data = createEpub({
    title: 'The Field Notes',
    author: 'A. Reader',
    chapters: [
      { title: 'First', content: 'A first passage.' },
      { title: 'Second', content: 'A second passage.' },
    ],
  })
  const book = parseEpub(data)

  assert.equal(book.metadata.title, 'The Field Notes')
  assert.equal(book.metadata.creator, 'A. Reader')
  assert.equal(book.spine.spineItems.length, 2)
  assert.deepEqual(book.toc.map((item) => item.label), ['First', 'Second'])
  assert.equal(book.spine.get(book.toc[1].href).index, 1)
  assert.match(book.spine.spineItems[0].document.documentElement.textContent, /A first passage/)
})

test('loads chapter documents on demand when lazy section parsing is enabled', async () => {
  const data = createEpub({
    title: 'The Field Notes',
    chapters: [
      { title: 'First', content: 'A first passage.' },
      { title: 'Second', content: 'A second passage.' },
    ],
  })
  const book = parseEpub(data, { lazySections: true })
  const [first, second] = book.spine.spineItems

  assert.equal(first.document, null)
  assert.equal(second.document, null)
  await Promise.all([first.load(), second.load()])

  assert.match(first.document.documentElement.textContent, /A first passage/)
  assert.match(second.document.documentElement.textContent, /A second passage/)
})

test('preserves chapter images and their alt text when creating an EPUB', () => {
  const imageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3])
  const data = createEpub({
    title: 'Illustrated Notes',
    chapters: [{
      title: 'An Image',
      content: 'Before image. After image.',
      images: [{
        data: imageData,
        mediaType: 'image/png',
        alt: 'A small map',
        position: 13,
        positionRatio: 13 / 'Before image. After image.'.length,
      }],
    }],
  })
  const book = parseEpub(data)
  const section = book.spine.spineItems[0]
  const image = section.document.getElementsByTagName('img')[0]
  const imagePath = resolveEpubResourcePath(section.href, image.getAttribute('src'))

  assert.equal(image.getAttribute('alt'), 'A small map')
  assert.deepEqual([...book.assets.get(imagePath).data], [...imageData])
  assert.match(section.document.documentElement.textContent, /Before image\.\s*After image\./)
})

test('flattens the EPUB navigation tree in the same order used by the contents list', () => {
  const flattened = flattenEpubNavigation([
    {
      label: 'Part One',
      href: 'part-one.xhtml',
      subitems: [
        { label: 'First Chapter', href: 'chapter-one.xhtml', subitems: [] },
        { label: 'Second Chapter', href: 'chapter-two.xhtml', subitems: [] },
      ],
    },
  ])

  assert.deepEqual(flattened.map(({ label, level }) => [label, level]), [
    ['Part One', 0],
    ['First Chapter', 1],
    ['Second Chapter', 1],
  ])
})

test('omits non-linking TOC labels and links outside the EPUB spine from chapter imports', () => {
  const chapters = epubChapterNavigationItems([
    {
      label: 'Part One',
      href: null,
      subitems: [
        { label: 'First Chapter', href: 'chapter-one.xhtml', subitems: [] },
        { label: 'Unavailable Chapter', href: 'missing.xhtml', subitems: [] },
      ],
    },
  ], {
    get: (href) => href === 'chapter-one.xhtml' ? { index: 0 } : null,
  })

  assert.deepEqual(chapters.map(({ label, level }) => [label, level]), [['First Chapter', 1]])
})

test('assigns every spine section to its nearest table-of-contents chapter', () => {
  const spineItems = Array.from({ length: 5 }, (_, index) => ({ index }))
  const sections = new Map([
    ['chapter-two.xhtml', { index: 1 }],
    ['chapter-four.xhtml', { index: 3 }],
  ])
  const navigationItems = [
    { href: 'chapter-two.xhtml', level: 0 },
    { href: 'chapter-four.xhtml', level: 0 },
  ]
  const owners = epubSectionNavigationOwners(spineItems, navigationItems, {
    get: (href) => sections.get(href) || null,
  })

  assert.deepEqual([...owners], [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1]])
})

test('resolves safe relative paths and rejects paths outside the archive', () => {
  assert.equal(resolveEpubResourcePath('EPUB/Text/chapter.xhtml', '../Styles/book.css'), 'EPUB/Styles/book.css')
  assert.equal(resolveEpubResourcePath('EPUB/package.opf', 'Text%20Files/chapter.xhtml'), 'EPUB/Text Files/chapter.xhtml')
  assert.throws(() => resolveEpubResourcePath('EPUB/package.opf', '../../secret.txt'), /escapes the archive root/)
  assert.throws(() => resolveEpubResourcePath('EPUB/package.opf', 'https://example.com/book.css'), /non-local/)
})

test('rejects unsafe ZIP entry paths before extracting content', () => {
  const maliciousArchive = zipSync({ '../outside.txt': strToU8('not an EPUB') })
  assert.throws(() => parseEpub(maliciousArchive), /unsafe path/)
})

test('rejects EPUB packages missing their container document', () => {
  const invalidArchive = zipSync({ 'EPUB/package.opf': strToU8('<package />') })
  assert.throws(() => parseEpub(invalidArchive), /missing its container/)
})
