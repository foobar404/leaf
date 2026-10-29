import test from 'node:test'
import assert from 'node:assert/strict'
import { DOMParser } from '@xmldom/xmldom'
import { createCfi, createCfiRangeFromPoints, EpubCFI, resolveCfi } from '../src/epub-reader/cfi.js'

const xmlParser = new DOMParser()
const section = {
  id: 'chapter1',
  spineIndex: 0,
  document: xmlParser.parseFromString('<html><head/><body><p>First line</p><p>Second line</p></body></html>', 'application/xml'),
}

test('creates standard point CFIs with reading-order paths', () => {
  const text = section.document.getElementsByTagName('p')[1].firstChild
  const cfi = createCfi({}, section, text, 4)
  assert.match(cfi, /^epubcfi\(\/6\/2\[chapter1\]!/)
  assert.equal(new EpubCFI().compare(cfi, 'epubcfi(/6/2[chapter1]!/4/4/1:4)'), 0)
})

test('creates and collapses CFI ranges without changing their start position', () => {
  const firstText = section.document.getElementsByTagName('p')[0].firstChild
  const secondText = section.document.getElementsByTagName('p')[1].firstChild
  const range = createCfiRangeFromPoints({}, section, firstText, 2, secondText, 5)
  const cfi = new EpubCFI(range)
  assert.match(range, /^epubcfi\(\/6\/2\[chapter1\]!/)
  assert.equal(cfi.compare(range, cfi.collapse(true).toString()), 0)
})

test('compares legacy CFI range starts in document order', () => {
  const comparer = new EpubCFI()
  const earlier = 'epubcfi(/6/2[chapter1]!/4/2/1:2,/1:1,/1:4)'
  const later = 'epubcfi(/6/2[chapter1]!/4/4/1:1)'
  assert.equal(comparer.compare(earlier, later), -1)
  assert.equal(comparer.compare(later, earlier), 1)
})

test('does not resolve a CFI for a lazy section that is not loaded', () => {
  const book = { spine: { spineItems: [{ spineIndex: 0, document: null }] } }

  assert.equal(resolveCfi(book, 'epubcfi(/6/2[chapter1]!/4/2/1:2)'), null)
})
