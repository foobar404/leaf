import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeStylesheet } from '../src/epub-reader/renderer.js'

test('scopes body styles to the rendered chapter and rejects remote CSS assets', () => {
  const styles = sanitizeStylesheet(`
    body { font-family: Georgia, serif; color: #333; background-image: url(https://example.com/image.png); }
    p { margin-bottom: 1em; }
    @import url(https://example.com/book.css);
  `, '[data-epub-renderer="reader-test"]')

  assert.match(styles, /\[data-epub-renderer="reader-test"\] \.epub-book-content\{font-family:Georgia, serif;color:#333\}/)
  assert.match(styles, /\[data-epub-renderer="reader-test"\] \.epub-book-content p\{margin-bottom:1em\}/)
  assert.doesNotMatch(styles, /url\(|@import|\.epub-book-content body/)
})
