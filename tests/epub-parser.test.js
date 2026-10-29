import test from 'node:test'
import assert from 'node:assert/strict'
import { strToU8, zipSync } from 'fflate'
import { createEpub } from '../src/epub.js'
import { parseEpub, resolveEpubResourcePath } from '../src/epub-reader/parser.js'

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
  await first.load()

  assert.match(first.document.documentElement.textContent, /A first passage/)
  assert.equal(second.document, null)
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
