import ePub from 'epubjs'
import {
  createIcons,
  AlignLeft,
  ArrowLeft,
  BookOpen,
  BookPlus,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Library,
  ListPlus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide'
import { streamOpenRouter } from './ai.js'
import { createEpub } from './epub.js'
import './style.css'

const iconSet = {
  AlignLeft,
  ArrowLeft,
  BookOpen,
  BookPlus,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Library,
  ListPlus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  X,
}

const readerPreferenceDefaults = { fontSize: 100, font: 'serif', lineHeight: 1.75, theme: 'paper' }
const readerFonts = {
  serif: 'Georgia, serif',
  soft: 'Palatino Linotype, Book Antiqua, Palatino, serif',
  sans: 'Arial, Helvetica, sans-serif',
  garamond: 'Garamond, Georgia, serif',
  bookman: 'Bookman Old Style, Georgia, serif',
  verdana: 'Verdana, Geneva, sans-serif',
  trebuchet: 'Trebuchet MS, sans-serif',
}
const readerThemes = {
  paper: { background: '#fbfaf6', color: '#292e2a', screen: '#f4f5f0', toolbar: '#fbfcf8', border: '#e8e7dc' },
  light: { background: '#ffffff', color: '#27313a', screen: '#f1f4f6', toolbar: '#fbfcfd', border: '#d9e0e5' },
  warm: { background: '#2e271f', color: '#f2e5d2', screen: '#251f18', toolbar: '#30271f', border: '#4a3d30', dark: true },
  sage: { background: '#1d2b23', color: '#e0eee3', screen: '#17231c', toolbar: '#1f2d25', border: '#394b3d', dark: true },
  night: { background: '#202724', color: '#e4e9e1', screen: '#1a201d', toolbar: '#202724', border: '#39433d', dark: true },
  dark: { background: '#111318', color: '#edf0f5', screen: '#101216', toolbar: '#171a20', border: '#353a43', dark: true },
  rose: { background: '#32202a', color: '#f1e5eb', screen: '#281a22', toolbar: '#35232d', border: '#573a49', dark: true },
  sky: { background: '#172b38', color: '#e2eff5', screen: '#13222c', toolbar: '#1a303d', border: '#385362', dark: true },
  lavender: { background: '#282338', color: '#eee8f5', screen: '#211d2e', toolbar: '#2d2740', border: '#463d5b', dark: true },
  slate: { background: '#e7ebea', color: '#303938', screen: '#eff2f1', toolbar: '#fafbfa', border: '#d9e0de' },
  mint: { background: '#dcf3e5', color: '#263e31', screen: '#eaf6ee', toolbar: '#f8fcf9', border: '#c5dfcd' },
  lemon: { background: '#fff2bd', color: '#473b1c', screen: '#fbf5db', toolbar: '#fffaf0', border: '#e8dca9' },
  berry: { background: '#f2d8e9', color: '#45283d', screen: '#f6e8f1', toolbar: '#fff9fc', border: '#e1c3d7' },
  coral: { background: '#f9ded3', color: '#4a302a', screen: '#faeee9', toolbar: '#fffaf8', border: '#e8cbc0' },
}

function loadReaderPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('leaf-reader-preferences') || '{}')
    const preferences = saved && typeof saved === 'object' ? saved : {}
    const size = Number(preferences.fontSize)
    const lineHeight = Number(preferences.lineHeight)
    return {
      fontSize: Number.isFinite(size) ? Math.min(160, Math.max(80, size)) : readerPreferenceDefaults.fontSize,
      font: Object.hasOwn(readerFonts, preferences.font) ? preferences.font : readerPreferenceDefaults.font,
      lineHeight: [1.5, 1.75, 2].includes(lineHeight) ? lineHeight : readerPreferenceDefaults.lineHeight,
      theme: Object.hasOwn(readerThemes, preferences.theme) ? preferences.theme : readerPreferenceDefaults.theme,
    }
  } catch {
    return { ...readerPreferenceDefaults }
  }
}

const app = document.querySelector('#app')
const database = openDatabase()
const openRouterKeyStorageKey = 'leaf-openrouter-api-key'
const openRouterModelStorageKey = 'leaf-openrouter-model'
function createWriterState() {
  return {
    busy: false,
    draftId: null,
    savedBookId: null,
    loadedBookId: null,
    stage: 'outline',
    wizardStep: 1,
    outline: [],
    outlinePrompt: '',
    chapters: [],
    currentChapter: 0,
    suggestedTitle: '',
    cover: null,
    coverUrl: '',
  }
}

const state = {
  books: [],
  drafts: [],
  progress: [],
  bookmarks: [],
  active: null,
  readerPreferences: loadReaderPreferences(),
  query: '',
  writer: createWriterState(),
}
let saveTimer
let writerAutosaveTimer

app.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <a class="brand" href="#library" aria-label="Leaf home">
        <span class="brand__mark"><i data-lucide="book-open"></i></span>
        <span class="brand__word">leaf<span>.</span></span>
      </a>
      <div class="sidebar__label">YOUR SPACE</div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        <button class="sidebar-nav__item sidebar-nav__item--active" type="button" id="library-nav" title="My library">
          <i data-lucide="library"></i><span>My library</span><span class="nav-count" id="nav-count">0</span>
        </button>
        <button class="sidebar-nav__item" type="button" id="writer-nav" title="AI writing room">
          <i data-lucide="sparkles"></i><span>AI writing room</span>
        </button>
      </nav>
    </aside>

    <main class="main-area">
      <section class="library-screen" id="library-screen">
        <header class="topbar">
          <div class="topbar__tools">
            <label class="search-box"><i data-lucide="search"></i><input id="search-input" type="search" placeholder="Find a book" aria-label="Find a book" /></label>
            <button class="button button--primary" type="button" id="upload-button"><i data-lucide="plus"></i><span>Add a book</span></button>
          </div>
        </header>

        <div class="library-content">
          <section class="continue-section" id="continue-section" aria-label="Continue reading"></section>

          <section class="shelf-section writer-draft-section" id="writer-draft-section" aria-labelledby="writer-drafts-title" hidden>
            <div class="section-heading"><div><h2 id="writer-drafts-title">Unfinished drafts</h2><span class="section-count" id="writer-draft-count"></span></div><span class="section-heading__rule"></span></div>
            <div class="writer-drafts" id="writer-drafts"></div>
          </section>

          <section class="shelf-section" aria-labelledby="shelf-title">
            <div class="section-heading"><div><h2 id="shelf-title">On your shelf</h2><span class="section-count" id="book-count">0 books</span></div><span class="section-heading__rule"></span></div>
            <div class="book-grid" id="book-grid"></div>
            <div class="empty-state" id="empty-state" hidden>
              <span class="empty-state__icon"><i data-lucide="book-plus"></i></span>
              <h3>Your next favorite is waiting.</h3>
              <p>Add an EPUB to make this shelf yours.</p>
              <button class="button button--outline" type="button" id="empty-upload"><i data-lucide="plus"></i><span>Choose an EPUB</span></button>
            </div>
            <div class="no-results" id="no-results" hidden>No books or drafts match that search.</div>
          </section>
          <footer class="library-footer"><span>LEAF READING ROOM</span><span>Good things take a chapter.</span></footer>
        </div>
      </section>

      <section class="writer-screen" id="writer-screen" hidden>
        <div class="writer-content">
          <div class="writer-heading">
            <div><h1>AI book writer</h1><p class="writer-autosave-status" id="writer-autosave-status" role="status" aria-live="polite">Unfinished drafts save automatically in this browser.</p></div>
            <button class="button button--outline" type="button" id="writer-new-draft" title="Save the current work and start another draft">New draft</button>
          </div>
          <section class="writer-library-loader" aria-labelledby="writer-library-loader-title">
            <div class="writer-library-loader__copy">
              <h2 id="writer-library-loader-title">Edit a book from your library</h2>
              <p>Load any saved or uploaded EPUB into the chapter editor. Saving creates a separate draft, so the original stays untouched.</p>
            </div>
            <label class="writer-field" for="writer-library-book">Book from your library
              <select id="writer-library-book"><option value="">Choose a book...</option></select>
            </label>
            <button class="button button--outline" type="button" id="load-library-book" disabled><i data-lucide="book-open"></i><span>Load into editor</span></button>
          </section>
          <div class="writer-wizard">
            <ol class="writer-progress" aria-label="AI writing walkthrough">
              <li data-wizard-indicator="1"><span>01</span><span>AI fields</span></li>
              <li data-wizard-indicator="2"><span>02</span><span>Prompt</span></li>
              <li data-wizard-indicator="3"><span>03</span><span>Chapters</span></li>
              <li data-wizard-indicator="4"><span>04</span><span>Draft</span></li>
              <li data-wizard-indicator="5"><span>05</span><span>Save</span></li>
            </ol>

            <section class="writer-wizard-panel" data-wizard-panel="1" aria-labelledby="wizard-connection-title">
              <div class="writer-step">01 <span>AI FIELDS</span></div>
              <h2 id="wizard-connection-title">Connect your AI</h2>
              <p class="writer-panel-copy">Choose the model that will suggest chapters and help write your book.</p>
              <div class="writer-wizard-fields">
                <label class="writer-field" for="openrouter-key">OpenRouter API key
                  <span class="secret-input"><input id="openrouter-key" type="password" placeholder="sk-or-v1-..." autocomplete="new-password" spellcheck="false" /><button class="icon-button" type="button" id="toggle-key" aria-label="Show API key" title="Show API key"><i data-lucide="eye"></i></button></span>
                </label>
                <p class="writer-help">Saved locally in this browser and sent directly to OpenRouter. Avoid saving it on shared devices.</p>
                <label class="writer-field" for="openrouter-model">Model
                  <select id="openrouter-model" required>
                    <option value="deepseek/deepseek-v4.1-flash">1 · DeepSeek V4.1 Flash</option>
                    <option value="stepfun/step-5-preview">2 · Step 5 Preview</option>
                    <option value="z-ai/glm-5.3-flash">3 · GLM 5.3 Flash</option>
                    <option value="xiaomi/mimo-v2.6-flash">4 · MiMo-V2.6-Flash</option>
                    <option value="tencent/hy4-preview">5 · Hy4 Preview</option>
                    <option value="nvidia/nemotron-3-ultra-550b-a55b:free">6 · Nemotron 3 Ultra (free)</option>
                    <option value="openai/gpt-6-luna">7 · GPT-6 Luna</option>
                    <option value="anthropic/claude-opus-5.5">8 · Claude Opus 5.5</option>
                    <option value="deepseek/deepseek-v4-flash-0731">9 · DeepSeek V4 Flash</option>
                    <option value="z-ai/glm-5.3">10 · GLM 5.3</option>
                  </select>
                </label>
              </div>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="2" aria-labelledby="wizard-prompt-title" hidden>
              <div class="writer-step">02 <span>BOOK PROMPT</span></div>
              <h2 id="wizard-prompt-title">What would you like to read?</h2>
              <p class="writer-panel-copy">Describe the book you have in mind. The AI will use it to shape the chapter suggestions.</p>
              <div class="writer-wizard-fields">
                <label class="writer-field" for="book-topic">Book idea
                  <textarea id="book-topic" rows="5" placeholder="A botanist inherits a greenhouse that grows memories..." required></textarea>
                </label>
                <label class="writer-field" for="page-count">Pages
                  <input id="page-count" type="number" min="1" max="30" value="8" required />
                </label>
                <p class="writer-help">About 200 words per page. Length varies by model.</p>
                <button class="button button--primary writer-generate" type="button" id="generate-button"><i data-lucide="list-plus"></i><span>Suggest chapters</span></button>
              </div>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="3" aria-labelledby="wizard-outline-title" hidden>
              <div class="writer-step">03 <span>CHAPTER SUGGESTIONS</span></div>
              <h2 id="wizard-outline-title">Shape the chapter suggestions</h2>
              <p class="writer-panel-copy">Ask the AI for changes or edit, reorder, and remove titles yourself.</p>
              <label class="writer-field" for="outline-revision-request">How should the AI change these suggestions?
                <textarea id="outline-revision-request" rows="2" spellcheck="true" placeholder="Make the middle chapters build more suspense..."></textarea>
              </label>
              <button class="button button--outline outline-revise" type="button" id="revise-outline"><i data-lucide="sparkles"></i><span>Revise suggestions with AI</span></button>
              <label class="writer-field" for="chapter-outline">Chapter titles, one per line
                <textarea id="chapter-outline" rows="8" spellcheck="true" placeholder="AI-suggested chapter titles will appear here."></textarea>
              </label>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="4" aria-labelledby="manuscript-title" hidden>
              <div class="writer-step">04 <span>CHAPTER TEXT</span></div>
              <div class="manuscript-heading">
                <div><h2 id="manuscript-title">Adjust your chapter text</h2><p id="draft-stats">Your chapter suggestions are ready.</p></div>
              </div>
              <section class="chapter-workflow" id="chapter-workflow" aria-label="Chapter drafting">
                <div class="chapter-navigation">
                  <button class="icon-button" type="button" id="chapter-previous" aria-label="Previous chapter" title="Previous chapter"><i data-lucide="chevron-left"></i></button>
                  <span id="chapter-position">Chapter 1 of 1</span>
                  <button class="icon-button" type="button" id="chapter-next" aria-label="Next chapter" title="Next chapter"><i data-lucide="chevron-right"></i></button>
                  <label class="auto-fill-toggle" for="auto-fill-chapters" title="After you click Generate, write the remaining chapters in sequence.">
                    <input id="auto-fill-chapters" type="checkbox" />
                    <span>Auto Fill</span>
                  </label>
                  <button class="button button--primary" type="button" id="generate-chapter"><i data-lucide="sparkles"></i><span>Generate chapter</span></button>
                </div>
              </section>
              <label class="writer-field chapter-prompt-field" for="chapter-prompt">Chapter prompt (used for this chapter only)
                <textarea id="chapter-prompt" rows="2" placeholder="Guide generation or regeneration, e.g. build tension, sharpen the dialogue, or preserve a key moment."></textarea>
              </label>
              <textarea class="manuscript-editor" id="manuscript-editor" placeholder="Generate or write the chapter here." spellcheck="true" aria-label="Editable chapter text"></textarea>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="5" aria-labelledby="wizard-details-title" hidden>
              <div class="writer-step">05 <span>BOOK DETAILS</span></div>
              <h2 id="wizard-details-title">Get your book ready</h2>
              <p class="writer-panel-copy">Choose how your book will appear on your shelf, then save it to your library.</p>
              <div class="manuscript-meta">
                <label class="writer-field" for="book-title">Title<input id="book-title" type="text" placeholder="Filled from the suggestions" /></label>
                <label class="writer-field" for="book-author">Author<input id="book-author" type="text" placeholder="Your name or pen name" /></label>
              </div>
              <div class="cover-upload">
                <label class="writer-field" for="cover-input">Custom cover<input id="cover-input" type="file" accept="image/png,image/jpeg" /></label>
                <img id="cover-preview" alt="Custom book cover preview" hidden />
                <button class="icon-button" type="button" id="remove-cover" aria-label="Remove custom cover" title="Remove custom cover" hidden><i data-lucide="x"></i></button>
              </div>
              <button class="button button--primary writer-save" type="button" id="save-draft" disabled><i data-lucide="save"></i><span>Save to library</span></button>
            </section>

            <p class="writer-status" id="writer-status" role="status" aria-live="polite">Enter your key to save it in this browser.</p>
            <div class="writer-wizard-nav">
              <button class="button button--outline" type="button" id="wizard-back" disabled>Back</button>
              <span id="wizard-step-count" aria-live="polite">Step 1 of 5</span>
              <button class="button button--primary" type="button" id="wizard-next" disabled><span>Continue</span></button>
            </div>
          </div>
        </div>
      </section>

      <section class="reader-screen" id="reader-screen" hidden>
        <header class="reader-toolbar">
          <button class="icon-button" type="button" id="back-button" aria-label="Back to library" title="Back to library"><i data-lucide="arrow-left"></i></button>
          <div class="reader-book-title"><span class="reader-book-title__label">NOW READING</span><b id="reader-title">Book title</b></div>
          <div class="reader-tools">
            <button class="icon-button" type="button" id="toc-button" aria-label="Table of contents" title="Table of contents"><i data-lucide="align-left"></i></button>
            <button class="icon-button" type="button" id="bookmarks-button" aria-label="Saved bookmarks" title="Saved bookmarks" aria-expanded="false" aria-controls="bookmark-panel"><i data-lucide="bookmark-check"></i></button>
            <span class="toolbar-divider"></span>
            <button class="icon-button" type="button" id="reader-settings-button" aria-label="Reading settings" title="Reading settings" aria-expanded="false" aria-controls="reader-settings"><i data-lucide="sliders-horizontal"></i></button>
          </div>
        </header>
        <aside class="reader-settings" id="reader-settings" aria-label="Reading settings" hidden>
          <div class="reader-settings__header"><h2>Reading settings</h2><div><button class="reader-settings__reset" type="button" id="reset-reader-settings"><i data-lucide="rotate-ccw"></i><span>Reset</span></button><button class="icon-button" type="button" id="close-reader-settings" aria-label="Close reading settings"><i data-lucide="x"></i></button></div></div>
          <label class="reader-setting" for="reader-font-size"><span>Text size <output id="reader-font-size-value">100%</output></span><input id="reader-font-size" type="range" min="80" max="160" step="5" value="100" /></label>
          <label class="reader-setting" for="reader-font-family"><span>Typeface</span><select id="reader-font-family"><option value="serif">Georgia</option><option value="soft">Palatino</option><option value="garamond">Garamond</option><option value="bookman">Bookman</option><option value="sans">Arial</option><option value="verdana">Verdana</option><option value="trebuchet">Trebuchet</option></select></label>
          <label class="reader-setting" for="reader-line-height"><span>Line spacing</span><select id="reader-line-height"><option value="1.5">Compact</option><option value="1.75" selected>Relaxed</option><option value="2">Open</option></select></label>
          <fieldset class="reader-theme-picker"><legend>Page color</legend><div class="reader-theme-options">
            <button class="reader-theme-option" type="button" data-reader-theme="paper" aria-pressed="true"><span class="reader-theme-option__swatch"></span><span>Paper</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="light" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Light</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="warm" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Warm</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="sage" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Sage</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="night" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Night</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="dark" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Dark</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="rose" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Rose</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="sky" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Sky</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="lavender" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Lavender</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="slate" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Slate</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="mint" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Mint</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="lemon" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Lemon</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="berry" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Berry</span></button>
            <button class="reader-theme-option" type="button" data-reader-theme="coral" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Coral</span></button>
          </div></fieldset>
        </aside>
        <div class="reader-layout">
          <aside class="toc-panel" id="toc-panel" hidden><div class="toc-panel__head"><h2>Contents</h2><button class="icon-button" type="button" id="toc-close" aria-label="Close contents"><i data-lucide="x"></i></button></div><nav id="chapter-list" class="chapter-list"></nav></aside>
          <aside class="toc-panel bookmark-panel" id="bookmark-panel" hidden><div class="toc-panel__head"><h2>Bookmarks</h2><button class="icon-button" type="button" id="bookmark-close" aria-label="Close bookmarks"><i data-lucide="x"></i></button></div><button class="button button--outline bookmark-current-action" type="button" id="bookmark-current" aria-label="Bookmark this page" title="Bookmark this page" aria-pressed="false">Bookmark this page</button><nav id="bookmark-list" class="chapter-list" aria-label="Saved bookmarks"></nav></aside>
          <div class="reader-main">
            <div class="reader-stage">
              <div class="epub-frame" id="epub-frame" aria-label="Book text"></div>
            </div>
            <footer class="reader-footer"><span id="chapter-label">A quiet moment</span><div class="reading-progress"><span class="reading-progress__fill" id="progress-fill"></span></div><span id="progress-label">0%</span></footer>
          </div>
        </div>
      </section>
    </main>
    <input id="epub-input" type="file" accept=".epub,application/epub+zip" hidden />
    <div class="drop-overlay" id="drop-overlay" hidden><div><i data-lucide="book-plus"></i><b>Drop your book here</b><span>EPUB files only</span></div></div>
    <div class="toast" id="toast" role="status" aria-live="polite"></div>
  </div>
`

const $ = (selector) => document.querySelector(selector)
const icons = () => createIcons({ icons: iconSet, attrs: { 'stroke-width': 1.7 } })
icons()

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('leaf-library', 3)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function storeRequest(storeName, mode, action) {
  const db = await database
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const request = action(transaction.objectStore(storeName))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadLibrary() {
  try {
    ;[state.books, state.drafts, state.progress, state.bookmarks] = await Promise.all([
      storeRequest('books', 'readonly', (store) => store.getAll()),
      storeRequest('drafts', 'readonly', (store) => store.getAll()),
      storeRequest('progress', 'readonly', (store) => store.getAll()),
      storeRequest('bookmarks', 'readonly', (store) => store.getAll()),
    ])
    renderLibrary()
  } catch (error) {
    showToast('Could not open your library in this browser.')
    console.error(error)
  }
}

const progressFor = (id) => state.progress.find((item) => item.id === id)
const coverColors = ['#bd6a50', '#607a69', '#d1a15d', '#536777', '#96705d', '#87916b']
const bookCoverUrls = new Map()
const bookCoverLoads = new Set()

function coverMarkup(book, index) {
  const color = coverColors[index % coverColors.length]
  const initials = (book.title || 'Book').trim().slice(0, 1).toUpperCase()
  return `<span class="book-cover" style="--cover-color:${color}" aria-hidden="true"><span class="book-cover__ornament">${initials}</span><span class="book-cover__title">${escapeHtml(book.title || 'Untitled')}</span><span class="book-cover__author">${escapeHtml(book.author || 'Unknown author')}</span><span class="book-cover__spine"></span><img class="book-cover__image" data-book-cover="${escapeHtml(book.id)}" alt="" hidden></span>`
}

function showBookCover(image, url) {
  image.src = url
  image.hidden = false
  if (image.classList.contains('continue-card__cover-image')) image.previousElementSibling.hidden = true
}

async function loadBookCover(record) {
  if (bookCoverLoads.has(record.id)) return
  bookCoverLoads.add(record.id)
  let book
  try {
    book = ePub(record.data)
    await book.ready
    const coverUrl = await book.coverUrl()
    if (!coverUrl) return
    const response = await fetch(coverUrl)
    if (!response.ok) return
    const imageUrl = URL.createObjectURL(await response.blob())
    if (!state.books.some((item) => item.id === record.id)) {
      URL.revokeObjectURL(imageUrl)
      return
    }
    bookCoverUrls.set(record.id, imageUrl)
    document.querySelectorAll('[data-book-cover]').forEach((image) => {
      if (image.dataset.bookCover === record.id) showBookCover(image, imageUrl)
    })
  } catch {
  } finally {
    bookCoverLoads.delete(record.id)
    book?.destroy()
  }
}

function loadRenderedBookCovers() {
  document.querySelectorAll('[data-book-cover]').forEach((image) => {
    const record = state.books.find((book) => book.id === image.dataset.bookCover)
    if (!record) return
    const cachedUrl = bookCoverUrls.get(record.id)
    if (cachedUrl) showBookCover(image, cachedUrl)
    else loadBookCover(record)
  })
}

function releaseBookCover(id) {
  const url = bookCoverUrls.get(id)
  if (url) URL.revokeObjectURL(url)
  bookCoverUrls.delete(id)
}

function renderWriterDrafts() {
  const query = state.query.trim().toLocaleLowerCase()
  const drafts = [...state.drafts]
    .sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
    .filter((draft) => String(draft.title || 'Untitled draft').toLocaleLowerCase().includes(query))
  $('#writer-draft-count').textContent = `${drafts.length} ${drafts.length === 1 ? 'draft' : 'drafts'}`
  $('#writer-draft-section').hidden = drafts.length === 0
  const resumeDisabled = state.writer.busy ? 'disabled' : ''
  $('#writer-drafts').innerHTML = drafts.map((draft) => {
    const chapterCount = Number(draft.chapterCount) || 0
    const wordCount = Number(draft.wordCount) || 0
    const updatedAt = Number(draft.updatedAt)
    const updated = Number.isFinite(updatedAt) ? new Date(updatedAt).toLocaleString() : ''
    return `<article class="writer-draft-card">
      <div class="writer-draft-card__meta"><b>${escapeHtml(draft.title || 'Untitled draft')}</b><span>${chapterCount} ${chapterCount === 1 ? 'chapter' : 'chapters'} · ${wordCount.toLocaleString()} words${updated ? ` · Updated ${escapeHtml(updated)}` : ''}</span></div>
      <div class="writer-draft-card__actions">
        <button class="button button--outline" type="button" data-resume-draft="${escapeHtml(draft.id)}" ${resumeDisabled}>Resume</button>
        <button class="icon-button" type="button" data-delete-draft="${escapeHtml(draft.id)}" aria-label="Delete draft ${escapeHtml(draft.title || 'Untitled draft')}" title="Delete draft"><i data-lucide="trash-2"></i></button>
      </div>
    </article>`
  }).join('')
  return drafts.length
}

function renderLibrary() {
  const query = state.query.trim().toLocaleLowerCase()
  const visibleBooks = state.books.filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(query))
  const recent = [...state.books].sort((a, b) => (progressFor(b.id)?.lastOpenedAt || 0) - (progressFor(a.id)?.lastOpenedAt || 0))[0]
  const recentProgress = recent && progressFor(recent.id)
  const recentIndex = Math.max(0, state.books.indexOf(recent))
  $('#nav-count').textContent = state.books.length
  $('#book-count').textContent = `${state.books.length} ${state.books.length === 1 ? 'book' : 'books'}`
  const recentPercent = Math.round(Math.max(0, Math.min(100, Number(recentProgress?.percentage) || 0)))
  $('#continue-section').innerHTML = recentProgress
    ? `<button class="continue-card" type="button" data-open="${recent.id}" aria-label="Continue reading ${escapeHtml(recent.title)}"><span class="continue-card__cover" style="--cover-color:${coverColors[recentIndex % coverColors.length]}" aria-hidden="true"><span class="continue-card__cover-fallback">${escapeHtml((recent.title || 'B').trim().slice(0, 1).toUpperCase())}</span><img class="continue-card__cover-image" data-book-cover="${escapeHtml(recent.id)}" alt="" hidden></span><span class="continue-card__copy"><span class="continue-card__label">CONTINUE READING</span><b>${escapeHtml(recent.title)}</b></span><span class="continue-card__progress"><span>${recentPercent}% read</span><span class="continue-card__track"><span style="width:${recentPercent}%"></span></span></span><span class="continue-card__cta"><i data-lucide="chevron-right"></i></span></button>`
    : ''
  $('#book-grid').innerHTML = visibleBooks.map((book) => {
    const progress = progressFor(book.id)
    const index = state.books.indexOf(book)
    return `<article class="book-card"><button class="book-card__open" type="button" data-open="${book.id}" aria-label="Read ${escapeHtml(book.title)}">${coverMarkup(book, index)}<span class="book-card__meta"><b>${escapeHtml(book.title)}</b><span>${escapeHtml(book.author || 'Unknown author')}</span>${progress ? `<span class="book-card__read">${progress.percentage || 0}% read</span>` : ''}</span></button><button class="book-card__remove" type="button" data-remove="${book.id}" aria-label="Remove ${escapeHtml(book.title)}" title="Remove book"><i data-lucide="trash-2"></i></button></article>`
  }).join('')
  loadRenderedBookCovers()
  const visibleDraftCount = renderWriterDrafts()
  $('#empty-state').hidden = state.books.length > 0 || state.drafts.length > 0
  $('#no-results').hidden = (!state.books.length && !state.drafts.length) || visibleBooks.length > 0 || visibleDraftCount > 0
  icons()
  renderWriterLibraryOptions()
}

function renderWriterLibraryOptions() {
  const select = $('#writer-library-book')
  const button = $('#load-library-book')
  if (!select || !button) return

  const selectedId = select.value
  const books = [...state.books].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
  select.innerHTML = `<option value="">${books.length ? 'Choose a book...' : 'Your library is empty'}</option>${books.map((book) => {
    const title = String(book.title || 'Untitled')
    const author = String(book.author || book.fileName || 'Unknown author')
    return `<option value="${escapeHtml(book.id)}">${escapeHtml(title)} — ${escapeHtml(author)}</option>`
  }).join('')}`
  if (books.some((book) => book.id === selectedId)) select.value = selectedId
  select.disabled = !books.length || state.writer.busy
  button.disabled = state.writer.busy || !select.value
}

const ignoredEpubTags = new Set(['HEAD', 'SCRIPT', 'STYLE', 'TITLE', 'NAV', 'NOSCRIPT', 'SVG'])
const blockEpubTags = new Set(['ADDRESS', 'ARTICLE', 'BLOCKQUOTE', 'DD', 'DIV', 'DT', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'P', 'PRE', 'SECTION', 'TR'])

function epubTagName(node) {
  return String(node.localName || node.nodeName || '').split(':').pop().toUpperCase()
}

function normalizeEpubText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function findFirstEpubHeading(node) {
  if (!node || node.nodeType !== 1) return null
  const tag = epubTagName(node)
  if (ignoredEpubTags.has(tag)) return null
  if (/^H[1-6]$/.test(tag)) return node
  for (const child of Array.from(node.childNodes || [])) {
    const heading = findFirstEpubHeading(child)
    if (heading) return heading
  }
  return null
}

function textFromEpubNode(node, excludedNode = null) {
  if (!node || node === excludedNode) return ''
  if (node.nodeType === 3 || node.nodeType === 4) return node.nodeValue || ''
  if (node.nodeType !== 1) return ''
  const tag = epubTagName(node)
  if (ignoredEpubTags.has(tag)) return ''
  if (tag === 'BR') return '\n'
  const text = Array.from(node.childNodes || [])
    .map((child) => textFromEpubNode(child, excludedNode))
    .join('')
  return blockEpubTags.has(tag) && text.trim() ? `${text.trim()}\n\n` : text
}

function extractEpubChapter(section, navigationTitle, chapterNumber) {
  const root = section.document?.documentElement || section.contents
  if (!root) return null

  const heading = findFirstEpubHeading(root)
  const headingTitle = normalizeEpubText(heading?.textContent)
  const title = normalizeEpubText(navigationTitle) || headingTitle || `Chapter ${chapterNumber}`
  const excludedHeading = headingTitle.toLocaleLowerCase() === title.toLocaleLowerCase() ? heading : null
  const content = textFromEpubNode(root, excludedHeading)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t\r\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return content ? { title, content } : null
}

function epubNavigationTitles(items, book, titles = new Map()) {
  for (const item of items || []) {
    const section = item.href ? book.spine.get(item.href) : null
    const title = normalizeEpubText(item.label)
    if (section && title && !titles.has(section.index)) titles.set(section.index, title)
    epubNavigationTitles(item.subitems, book, titles)
  }
  return titles
}

async function readEpubChapters(data) {
  const book = ePub(data)
  try {
    await book.ready
    const [metadata, navigation] = await Promise.all([book.loaded.metadata, book.loaded.navigation])
    const allSections = book.spine.spineItems || []
    const linearSections = allSections.filter((section) => section.linear)
    const sections = linearSections.length ? linearSections : allSections
    const navigationTitles = epubNavigationTitles(navigation?.toc, book)
    const chapters = []

    for (const section of sections) {
      await section.load(book.load.bind(book))
      const chapter = extractEpubChapter(section, navigationTitles.get(section.index), chapters.length + 1)
      if (chapter) chapters.push(chapter)
    }

    return { chapters, metadata }
  } finally {
    book.destroy()
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

function showToast(message) {
  const toast = $('#toast')
  toast.textContent = message
  toast.classList.add('toast--visible')
  clearTimeout(showToast.timer)
  showToast.timer = setTimeout(() => toast.classList.remove('toast--visible'), 3200)
}

function setActiveNavigation(view) {
  $('#library-nav').classList.toggle('sidebar-nav__item--active', view === 'library')
  $('#writer-nav').classList.toggle('sidebar-nav__item--active', view === 'writer')
}

function showLibrary() {
  if (state.active) closeReader()
  flushWriterAutosave().catch((error) => {
    reportWriterAutosaveError(error)
    showToast('Could not save your unfinished draft. Keep the writing room open and try again.')
  })
  $('#writer-screen').hidden = true
  $('#library-screen').hidden = false
  setActiveNavigation('library')
  renderLibrary()
}

function showWriter() {
  if (state.active) closeReader()
  $('#library-screen').hidden = true
  $('#reader-screen').hidden = true
  $('#writer-screen').hidden = false
  setActiveNavigation('writer')
  renderWriterLibraryOptions()
  updateWriterControls()
}

function outlinePromptSignature() {
  return JSON.stringify([$('#book-topic').value.trim(), Number($('#page-count').value), $('#openrouter-model').value])
}

function canContinueWriterStep(step) {
  if (step === 1) return Boolean($('#openrouter-key').value.trim() && $('#openrouter-model').value)
  if (step === 2) return Boolean(state.writer.outline.length && state.writer.outlinePrompt === outlinePromptSignature())
  if (step === 3) return parseOutline($('#chapter-outline').value).length > 0
  if (step === 4) return state.writer.chapters.some((chapter) => chapter.content.trim())
  return false
}

function renderWriterStep() {
  const step = state.writer.wizardStep
  const busy = state.writer.busy
  document.querySelectorAll('[data-wizard-panel]').forEach((panel) => {
    panel.hidden = Number(panel.dataset.wizardPanel) !== step
  })
  document.querySelectorAll('[data-wizard-indicator]').forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.wizardIndicator)
    indicator.classList.toggle('is-current', indicatorStep === step)
    indicator.classList.toggle('is-complete', indicatorStep < step)
    if (indicatorStep === step) indicator.setAttribute('aria-current', 'step')
    else indicator.removeAttribute('aria-current')
  })
  $('#wizard-step-count').textContent = `Step ${step} of 5`
  $('#wizard-back').disabled = busy || step === 1
  $('#wizard-next').hidden = step === 5
  $('#wizard-next').disabled = busy || !canContinueWriterStep(step)
  $('#wizard-next').querySelector('span').textContent = ({
    1: 'Continue',
    2: 'Review suggestions',
    3: 'Draft chapters',
    4: 'Book details',
  })[step] || 'Continue'
}

function updateWriterControls() {
  const manuscript = state.writer.chapters.map((chapter) => chapter.content).join('\n')
  const title = $('#book-title').value.trim()
  const busy = state.writer.busy
  const words = manuscript ? manuscript.split(/\s+/).length : 0
  $('#draft-stats').textContent = words
    ? `${state.writer.chapters.filter((chapter) => chapter.content.trim()).length} of ${state.writer.chapters.length} chapters · ${words.toLocaleString()} words`
    : state.writer.outline.length ? `${state.writer.outline.length} AI-suggested chapters` : 'Your book idea will guide the chapter suggestions.'
  $('#generate-button').disabled = busy
  $('#generate-button').querySelector('span').textContent = state.writer.outline.length ? 'Regenerate suggestions' : 'Suggest chapters'
  $('#revise-outline').disabled = busy || !$('#outline-revision-request').value.trim() || !parseOutline($('#chapter-outline').value).length
  const activeChapter = state.writer.chapters[state.writer.currentChapter]
  $('#generate-chapter').disabled = busy || state.writer.stage !== 'chapters' || !activeChapter
  $('#auto-fill-chapters').disabled = busy
  $('#chapter-previous').disabled = busy || state.writer.currentChapter === 0
  $('#chapter-next').disabled = busy || state.writer.currentChapter >= state.writer.chapters.length - 1 || !activeChapter?.content.trim()
  $('#save-draft').disabled = busy || !state.writer.chapters.some((chapter) => chapter.content.trim()) || !title
  $('#save-draft').querySelector('span').textContent = state.writer.savedBookId ? 'Update saved book' : 'Save to library'
  $('#manuscript-editor').readOnly = busy || state.writer.stage !== 'chapters'
  $('#chapter-prompt').readOnly = busy || state.writer.stage !== 'chapters'
  $('#chapter-workflow').hidden = state.writer.stage !== 'chapters'
  $('#writer-library-book').disabled = busy || !state.books.length
  $('#load-library-book').disabled = busy || !$('#writer-library-book').value
  $('#writer-new-draft').disabled = busy
  renderWriterStep()
}

function continueWriterWorkflow() {
  const step = state.writer.wizardStep
  if (state.writer.busy || !canContinueWriterStep(step)) return
  if (step === 3) {
    const titles = parseOutline($('#chapter-outline').value)
    const previousChapters = state.writer.chapters
    const previousOutline = previousChapters.map((chapter) => chapter.title)
    const outlineChanged = titles.join('\n') !== previousOutline.join('\n')
    const reusedChapters = new Set()
    state.writer.outline = titles
    state.writer.chapters = titles.map((title, index) => {
      const existing = previousChapters.find((chapter) => chapter.title === title && !reusedChapters.has(chapter))
        || (!titles.includes(previousChapters[index]?.title) ? previousChapters[index] : null)
      if (existing) reusedChapters.add(existing)
      return { title, content: existing?.content || '', prompt: existing?.prompt || '' }
    })
    state.writer.currentChapter = Math.min(state.writer.currentChapter, state.writer.chapters.length - 1)
    state.writer.stage = 'chapters'
    if (outlineChanged) {
      state.writer.savedBookId = null
    }
    state.writer.wizardStep = 4
    renderCurrentChapter()
    setWriterStatus('Chapter suggestions are set. Generate or edit the chapter text, then continue to your book details.')
    return
  }
  state.writer.wizardStep += 1
  updateWriterControls()
  scheduleWriterAutosave()
}

function returnToPreviousWriterStep() {
  if (state.writer.busy || state.writer.wizardStep === 1) return
  state.writer.wizardStep -= 1
  updateWriterControls()
  scheduleWriterAutosave()
}

function setWriterStatus(message, type = '') {
  const status = $('#writer-status')
  status.textContent = message
  status.className = `writer-status${type ? ` writer-status--${type}` : ''}`
}

function setWriterAutosaveStatus(message, type = '') {
  const status = $('#writer-autosave-status')
  status.textContent = message
  status.className = `writer-autosave-status${type ? ` writer-autosave-status--${type}` : ''}`
}

function writerDraftHasContent() {
  return Boolean(
    state.writer.draftId
    || state.writer.savedBookId
    || state.writer.loadedBookId
    || state.writer.outline.length
    || state.writer.cover
    || $('#book-title').value.trim()
    || $('#book-author').value.trim()
    || $('#book-topic').value.trim()
    || $('#chapter-outline').value.trim()
    || $('#outline-revision-request').value.trim()
    || state.writer.chapters.some((chapter) => chapter.content.trim() || String(chapter.prompt || '').trim()),
  )
}

function createWriterDraftRecord() {
  const chapters = state.writer.chapters.map((chapter) => ({
    title: String(chapter.title || ''),
    content: String(chapter.content || ''),
    prompt: String(chapter.prompt || ''),
  }))
  const manuscript = chapters.map((chapter) => chapter.content).filter(Boolean).join(' ')
  const topicTitle = $('#book-topic').value.trim().split(/\r?\n/)[0]
  const title = $('#book-title').value.trim() || state.writer.suggestedTitle || topicTitle || 'Untitled draft'

  return {
    id: state.writer.draftId || crypto.randomUUID(),
    title: title.slice(0, 100),
    updatedAt: Date.now(),
    chapterCount: Math.max(chapters.length, state.writer.outline.length, parseOutline($('#chapter-outline').value).length),
    wordCount: manuscript.trim().split(/\s+/).filter(Boolean).length,
    writer: {
      savedBookId: state.writer.savedBookId,
      loadedBookId: state.writer.loadedBookId,
      stage: state.writer.stage,
      wizardStep: state.writer.wizardStep,
      outline: [...state.writer.outline],
      outlinePrompt: state.writer.outlinePrompt,
      chapters,
      currentChapter: state.writer.currentChapter,
      suggestedTitle: state.writer.suggestedTitle,
      cover: state.writer.cover,
    },
    fields: {
      topic: $('#book-topic').value,
      pageCount: Number($('#page-count').value),
      chapterOutline: $('#chapter-outline').value,
      outlineRevisionRequest: $('#outline-revision-request').value,
      bookTitle: $('#book-title').value,
      bookAuthor: $('#book-author').value,
      autoFill: $('#auto-fill-chapters').checked,
    },
  }
}

async function persistWriterDraft() {
  if (!writerDraftHasContent()) return
  if (!state.writer.draftId) state.writer.draftId = crypto.randomUUID()
  const draft = createWriterDraftRecord()
  await storeRequest('drafts', 'readwrite', (store) => store.put(draft))
  const existingIndex = state.drafts.findIndex((item) => item.id === draft.id)
  if (existingIndex >= 0) state.drafts[existingIndex] = draft
  else state.drafts.push(draft)
  setWriterAutosaveStatus(`Draft saved locally at ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`)
  if (!$('#library-screen').hidden) renderLibrary()
}

function reportWriterAutosaveError(error) {
  console.error('Could not autosave the unfinished book.', error)
  setWriterAutosaveStatus('Autosave failed. Keep this page open and try again.', 'error')
}

function scheduleWriterAutosave() {
  clearTimeout(writerAutosaveTimer)
  if (!writerDraftHasContent()) {
    setWriterAutosaveStatus('Unfinished drafts save automatically in this browser.')
    return
  }
  setWriterAutosaveStatus('Saving draft...')
  writerAutosaveTimer = setTimeout(() => {
    writerAutosaveTimer = null
    persistWriterDraft().catch(reportWriterAutosaveError)
  }, 650)
}

async function flushWriterAutosave() {
  clearTimeout(writerAutosaveTimer)
  writerAutosaveTimer = null
  if (writerDraftHasContent()) await persistWriterDraft()
}

function resumeWriterDraft(draft) {
  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  const savedWriter = draft.writer || {}
  const fields = draft.fields || {}
  const chapters = Array.isArray(savedWriter.chapters)
    ? savedWriter.chapters
      .filter((chapter) => chapter && typeof chapter === 'object')
      .map((chapter, index) => ({
        title: String(chapter.title || `Chapter ${index + 1}`),
        content: String(chapter.content || ''),
        prompt: String(chapter.prompt || ''),
      }))
    : []
  const savedStep = Number(savedWriter.wizardStep)
  const wizardStep = Number.isInteger(savedStep) && savedStep >= 1 && savedStep <= 5 ? savedStep : 1
  const savedChapter = Number(savedWriter.currentChapter)

  state.writer = {
    ...createWriterState(),
    draftId: draft.id,
    savedBookId: state.books.some((book) => book.id === savedWriter.savedBookId) ? savedWriter.savedBookId : null,
    loadedBookId: savedWriter.loadedBookId || null,
    stage: savedWriter.stage === 'chapters' && chapters.length ? 'chapters' : 'outline',
    wizardStep: chapters.length || wizardStep < 4 ? wizardStep : 3,
    outline: Array.isArray(savedWriter.outline) ? savedWriter.outline.map((title) => String(title)) : [],
    outlinePrompt: String(savedWriter.outlinePrompt || ''),
    chapters,
    currentChapter: Number.isInteger(savedChapter) ? Math.min(Math.max(0, savedChapter), Math.max(0, chapters.length - 1)) : 0,
    suggestedTitle: String(savedWriter.suggestedTitle || ''),
    cover: savedWriter.cover || null,
  }

  const pageCount = Number(fields.pageCount)
  $('#book-topic').value = String(fields.topic || '')
  $('#page-count').value = String(Number.isFinite(pageCount) && pageCount >= 1 && pageCount <= 30 ? pageCount : 8)
  $('#chapter-outline').value = typeof fields.chapterOutline === 'string'
    ? fields.chapterOutline
    : state.writer.outline.map((title, index) => `${index + 1}. ${title}`).join('\n')
  $('#outline-revision-request').value = String(fields.outlineRevisionRequest || '')
  $('#book-title').value = String(fields.bookTitle || '')
  $('#book-author').value = String(fields.bookAuthor || '')
  $('#auto-fill-chapters').checked = Boolean(fields.autoFill)
  $('#cover-input').value = ''
  $('#cover-preview').removeAttribute('src')
  $('#cover-preview').hidden = true
  $('#remove-cover').hidden = true

  if (state.writer.cover?.data && state.writer.cover.mediaType) {
    state.writer.coverUrl = URL.createObjectURL(new Blob([state.writer.cover.data], { type: state.writer.cover.mediaType }))
    $('#cover-preview').src = state.writer.coverUrl
    $('#cover-preview').hidden = false
    $('#remove-cover').hidden = false
  }

  if (chapters.length) renderCurrentChapter()
  else {
    $('#manuscript-title').textContent = 'Adjust your chapter text'
    $('#chapter-position').textContent = 'Chapter 1 of 1'
    $('#chapter-prompt').value = ''
    $('#manuscript-editor').value = ''
  }
  showWriter()
  setWriterStatus(`Resumed "${draft.title || 'Untitled draft'}".`)
  const updatedAt = Number(draft.updatedAt)
  setWriterAutosaveStatus(Number.isFinite(updatedAt)
    ? `Draft saved locally ${new Date(updatedAt).toLocaleString()}. Changes save automatically.`
    : 'Draft resumed. Changes save automatically in this browser.')
}

async function startNewWriterDraft() {
  if (state.writer.busy) return
  try {
    await flushWriterAutosave()
  } catch (error) {
    reportWriterAutosaveError(error)
    showToast('Could not save the current draft. It is still open.')
    return
  }

  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  state.writer = createWriterState()
  $('#book-topic').value = ''
  $('#page-count').value = '8'
  $('#chapter-outline').value = ''
  $('#outline-revision-request').value = ''
  $('#book-title').value = ''
  $('#book-author').value = ''
  $('#auto-fill-chapters').checked = false
  $('#cover-input').value = ''
  $('#cover-preview').removeAttribute('src')
  $('#cover-preview').hidden = true
  $('#remove-cover').hidden = true
  $('#manuscript-title').textContent = 'Adjust your chapter text'
  $('#chapter-position').textContent = 'Chapter 1 of 1'
  $('#chapter-prompt').value = ''
  $('#manuscript-editor').value = ''
  showWriter()
  setWriterStatus('Start with a book idea or load a book from your library.')
  setWriterAutosaveStatus('Unfinished drafts save automatically in this browser.')
}

function setWriterBusy(busy, mode = '') {
  state.writer.busy = busy
  updateWriterControls()
  $('#generate-button').querySelector('span').textContent = busy && mode === 'outline'
    ? 'Suggesting chapters...'
    : state.writer.outline.length ? 'Regenerate suggestions' : 'Suggest chapters'
  $('#revise-outline').querySelector('span').textContent = busy && mode === 'outline-revision' ? 'Revising suggestions...' : 'Revise suggestions with AI'
  const chapter = state.writer.chapters[state.writer.currentChapter]
  $('#generate-chapter').querySelector('span').textContent = busy && mode === 'chapter' ? 'Writing chapter...' : chapter?.content.trim() ? 'Regenerate chapter' : 'Generate chapter'
  $('#writer-screen').classList.toggle('writer-screen--busy', busy)
}

function parseOutline(text) {
  return String(text).split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !/^title\s*:/i.test(line))
    .map((line) => line.replace(/^(?:[-*]\s*|\d+\s*[.)]\s*|chapter\s+\d+\s*[:.-]?\s*)/i, '').replace(/^[#`*_\s]+|[#`*_\s]+$/g, '').trim())
    .filter(Boolean)
}

function renderCurrentChapter() {
  const chapter = state.writer.chapters[state.writer.currentChapter]
  if (!chapter) return
  $('#manuscript-title').textContent = chapter.title
  $('#manuscript-editor').value = chapter.content
  $('#chapter-prompt').value = chapter.prompt || ''
  $('#chapter-position').textContent = `Chapter ${state.writer.currentChapter + 1} of ${state.writer.chapters.length}`
  $('#chapter-previous').disabled = state.writer.busy || state.writer.currentChapter === 0
  $('#chapter-next').disabled = state.writer.busy || state.writer.currentChapter >= state.writer.chapters.length - 1 || !chapter.content.trim()
  $('#generate-chapter').querySelector('span').textContent = chapter.content.trim() ? 'Regenerate chapter' : 'Generate chapter'
  updateWriterControls()
  scheduleWriterAutosave()
}

async function loadLibraryBookIntoWriter() {
  const record = state.books.find((book) => book.id === $('#writer-library-book').value)
  if (!record) {
    setWriterStatus('Choose a book from your library first.', 'error')
    return
  }

  setWriterBusy(true, 'load-book')
  setWriterStatus(`Loading "${record.title || 'Untitled'}" into the chapter editor...`)
  try {
    const { chapters, metadata } = await readEpubChapters(record.data)
    if (!chapters.length) throw new Error('No readable chapter text was found in that EPUB.')

    const title = normalizeEpubText(metadata.title) || record.title || 'Untitled'
    const author = normalizeEpubText(metadata.creator) || record.author || ''
    const wordCount = chapters.reduce((total, chapter) => total + chapter.content.split(/\s+/).filter(Boolean).length, 0)
    if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
    state.writer.cover = null
    state.writer.coverUrl = ''
    $('#cover-input').value = ''
    $('#cover-preview').removeAttribute('src')
    $('#cover-preview').hidden = true
    $('#remove-cover').hidden = true
    state.writer.loadedBookId = record.id
    state.writer.savedBookId = null
    state.writer.stage = 'chapters'
    state.writer.outline = chapters.map((chapter) => chapter.title)
    state.writer.outlinePrompt = ''
    state.writer.chapters = chapters
    state.writer.currentChapter = 0
    state.writer.suggestedTitle = title
    $('#book-title').value = title
    $('#book-author').value = author
    $('#book-topic').value = `Preserve the existing story, characters, setting, and voice of "${title}". Revise the selected chapter using its existing text as the source.`
    $('#page-count').value = String(Math.max(1, Math.min(30, Math.ceil(wordCount / 200))))
    $('#chapter-outline').value = chapters.map((chapter, index) => `${index + 1}. ${chapter.title}`).join('\n')
    $('#outline-revision-request').value = ''
    $('#auto-fill-chapters').checked = false
    state.writer.outlinePrompt = outlinePromptSignature()
    state.writer.wizardStep = 4
    renderCurrentChapter()
    setWriterStatus(`Loaded "${title}" into the editor. The original remains in your library; saving creates a separate edited copy.`)
  } catch (error) {
    console.error('Could not load the selected book into the AI editor.', error)
    setWriterStatus(error.message || 'Could not load that book into the editor.', 'error')
  } finally {
    setWriterBusy(false)
  }
}

async function selectCover(file) {
  if (!file) return
  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    setWriterStatus('Choose a PNG or JPEG cover image.', 'error')
    return
  }
  const previewUrl = URL.createObjectURL(file)
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
    state.writer.cover = { data, mediaType: file.type }
    state.writer.coverUrl = previewUrl
    $('#cover-preview').src = previewUrl
    $('#cover-preview').hidden = false
    $('#remove-cover').hidden = false
    setWriterStatus('Custom cover ready to include in the EPUB.')
    scheduleWriterAutosave()
  } catch (error) {
    URL.revokeObjectURL(previewUrl)
    setWriterStatus(error.message || 'The cover image could not be read.', 'error')
  }
}

function chapterTargetWordCount(chapter) {
  const existingWordCount = chapter.content.trim().split(/\s+/).filter(Boolean).length
  if (state.writer.loadedBookId && existingWordCount) return existingWordCount
  return Math.max(100, Math.ceil(Number($('#page-count').value) * 200 / Math.max(1, state.writer.chapters.length)))
}

function writerMessages(kind) {
  const topic = $('#book-topic').value.trim()
  const pages = Number($('#page-count').value)
  const system = 'You are a thoughtful, skilled book author. Follow the requested format exactly. Do not add commentary about the task.'
  const chapter = state.writer.chapters[state.writer.currentChapter]
  const outline = state.writer.chapters.map((item, index) => `${index + 1}. ${item.title}`).join('\n')
  const chapterPrompt = kind === 'chapter' ? String(chapter?.prompt || '').trim() : ''
  const chapterPromptInstruction = chapterPrompt ? `Chapter-specific guidance:\n${chapterPrompt}\n\n` : ''
  const existingDraft = kind === 'chapter' && state.writer.loadedBookId ? chapter?.content.trim() || '' : ''
  const draftForPrompt = existingDraft.length > 16000
    ? `${existingDraft.slice(0, 16000)}\n\n[Draft excerpt truncated to fit the editing context.]`
    : existingDraft
  const targetWords = kind === 'chapter' ? chapterTargetWordCount(chapter) : 0
  const priorChapters = state.writer.chapters.slice(0, state.writer.currentChapter)
    .filter((item) => item.content.trim())
    .map((item) => `## ${item.title}\n${item.content}`)
    .join('\n\n').slice(-12000)
  const currentSuggestions = parseOutline($('#chapter-outline').value)
  const instruction = kind === 'outline'
    ? `Suggest a coherent sequence of chapters tailored to this book idea, not a generic outline:\n${topic}\n\nAim for about ${pages} reading pages. Return a suggested title as "Title: ..." on the first line, followed by ${Math.min(8, Math.max(2, Math.ceil(pages / 2)))} chapter titles, one per line, numbered. Do not include descriptions or prose.`
    : kind === 'outline-revision'
      ? `Revise these chapter suggestions to follow the request while staying true to the book idea:\n${topic}\n\nCurrent chapter suggestions:\n${currentSuggestions.map((title, index) => `${index + 1}. ${title}`).join('\n')}\n\nRequested changes:\n${$('#outline-revision-request').value.trim()}\n\nKeep the existing number of chapters unless the request suggests otherwise. Return only the revised chapter titles, one per line, numbered. Do not include a book title, descriptions, or prose.`
      : existingDraft
        ? `Revise only the existing prose for Chapter ${state.writer.currentChapter + 1}, "${chapter.title}", using the book idea and approved chapter plan. Preserve the established characters, plot, setting, and voice.\n\nThe book is about:\n${topic}\n\n${chapterPromptInstruction}Approved chapter plan:\n${outline}\n\n${priorChapters ? `Previously written chapters for continuity:\n${priorChapters}\n\n` : ''}Existing chapter draft:\n${draftForPrompt}\n\nTarget about ${targetWords} words. Return only the revised prose. Do not repeat the chapter title or add notes.`
        : `Write only the prose for Chapter ${state.writer.currentChapter + 1}, "${chapter.title}". The book is about:\n${topic}\n\n${chapterPromptInstruction}Approved chapter plan:\n${outline}\n\n${priorChapters ? `Previously written chapters for continuity:\n${priorChapters}\n\n` : ''}Target about ${targetWords} words. Do not repeat the chapter title or add notes.`
  return [
    { role: 'system', content: system },
    { role: 'user', content: instruction },
  ]
}

async function requestDraft(kind) {
  if (kind === 'chapter') return requestChapterDrafts()
  const apiKey = $('#openrouter-key').value.trim()
  const model = $('#openrouter-model').value
  const topic = $('#book-topic').value.trim()
  const pages = Number($('#page-count').value)

  if (!apiKey) {
    setWriterStatus('Add your OpenRouter API key to begin.', 'error')
    $('#openrouter-key').focus()
    return
  }
  if (!model || !topic || pages < 1 || pages > 30) {
    setWriterStatus('Enter a book idea and a length from 1 to 30 pages.', 'error')
    return
  }
  state.writer.stage = 'outline'
  setWriterBusy(true, 'outline')
  setWriterStatus('Finding the shape of your book...')
  try {
    const result = await streamOpenRouter({
      apiKey,
      model,
      messages: writerMessages('outline'),
      maxTokens: 1000,
      onUpdate: updateWriterControls,
    })
    const titles = parseOutline(result)
    if (!titles.length) throw new Error('No chapter suggestions came back. Try again.')
    state.writer.outline = titles
    state.writer.outlinePrompt = outlinePromptSignature()
    state.writer.suggestedTitle = result.match(/^title\s*:\s*(.+)$/im)?.[1]?.trim() || ''
    $('#chapter-outline').value = titles.map((title, index) => `${index + 1}. ${title}`).join('\n')
    if (state.writer.suggestedTitle) $('#book-title').value = state.writer.suggestedTitle
    else if (!$('#book-title').value.trim()) $('#book-title').value = topic.slice(0, 72)
    state.writer.wizardStep = 3
    updateWriterControls()
    scheduleWriterAutosave()
    setWriterStatus(`AI suggested ${titles.length} chapters from your book idea. Adjust the list before drafting.`)
  } catch (error) {
    setWriterStatus(error.message || 'The request could not be completed.', 'error')
  } finally {
    setWriterBusy(false)
  }
}

async function requestChapterDrafts() {
  const apiKey = $('#openrouter-key').value.trim()
  const model = $('#openrouter-model').value
  const topic = $('#book-topic').value.trim()
  const pages = Number($('#page-count').value)
  const editor = $('#manuscript-editor')
  const startIndex = state.writer.currentChapter
  const autoFill = $('#auto-fill-chapters').checked
  const chapterIndexes = autoFill
    ? state.writer.chapters
      .map((chapter, index) => ({ chapter, index }))
      .filter(({ chapter, index }) => index >= startIndex && (index === startIndex || !chapter.content.trim()))
      .map(({ index }) => index)
    : [startIndex]
  const skipped = Math.max(0, state.writer.chapters.length - startIndex - chapterIndexes.length)

  if (!apiKey) {
    setWriterStatus('Add your OpenRouter API key to begin.', 'error')
    $('#openrouter-key').focus()
    return
  }
  if (!model || !topic || pages < 1 || pages > 30) {
    setWriterStatus('Enter a book idea and a length from 1 to 30 pages.', 'error')
    return
  }
  if (!chapterIndexes.length || !state.writer.chapters[startIndex]) return

  setWriterBusy(true, 'chapter')
  let written = 0
  try {
    for (const chapterIndex of chapterIndexes) {
      state.writer.currentChapter = chapterIndex
      const chapter = state.writer.chapters[chapterIndex]
      const previous = chapter.content
      editor.value = previous
      $('#chapter-prompt').value = chapter.prompt || ''
      $('#chapter-position').textContent = `Chapter ${chapterIndex + 1} of ${state.writer.chapters.length}`
      updateWriterControls()
      scheduleWriterAutosave()
      setWriterStatus(autoFill
        ? `Writing chapter ${chapterIndex + 1} of ${state.writer.chapters.length}...`
        : 'Finding the first line...')
      const chapterWordCount = chapterTargetWordCount(chapter)
      const result = await streamOpenRouter({
        apiKey,
        model,
        messages: writerMessages('chapter'),
        maxTokens: Math.min(10000, Math.max(700, chapterWordCount * 2)),
        onUpdate: (text) => {
          chapter.content = text
          editor.value = text
          updateWriterControls()
          scheduleWriterAutosave()
        },
      })
      chapter.content = result
      editor.value = result
      written += 1
      renderCurrentChapter()
    }
    setWriterStatus(autoFill
      ? `Auto fill complete. Wrote ${written} chapter${written === 1 ? '' : 's'}${skipped ? ` and left ${skipped} existing chapter${skipped === 1 ? '' : 's'} unchanged` : ''}.`
      : 'Chapter ready. Review it or move to the next chapter.')
  } catch (error) {
    editor.value = state.writer.chapters[state.writer.currentChapter]?.content || ''
    setWriterStatus(error.message || 'The chapter could not be generated.', 'error')
  } finally {
    setWriterBusy(false)
  }
}

async function reviseOutline() {
  const request = $('#outline-revision-request').value.trim()
  const apiKey = $('#openrouter-key').value.trim()
  const model = $('#openrouter-model').value
  const topic = $('#book-topic').value.trim()
  const pages = Number($('#page-count').value)
  const editor = $('#chapter-outline')
  const previous = editor.value

  if (!request) {
    setWriterStatus('Describe how you want the chapter suggestions changed.', 'error')
    $('#outline-revision-request').focus()
    return
  }
  if (!apiKey || !model || !topic || pages < 1 || pages > 30) {
    setWriterStatus('Check your AI connection and book prompt before revising the suggestions.', 'error')
    return
  }

  setWriterBusy(true, 'outline-revision')
  setWriterStatus('Revising the chapter suggestions...')
  try {
    const result = await streamOpenRouter({
      apiKey,
      model,
      messages: writerMessages('outline-revision'),
      maxTokens: 1000,
      onUpdate: (text) => {
        editor.value = text
        updateWriterControls()
        scheduleWriterAutosave()
      },
    })
    const titles = parseOutline(result)
    if (!titles.length) throw new Error('No revised chapter suggestions came back. Try again.')
    state.writer.outline = titles
    state.writer.outlinePrompt = outlinePromptSignature()
    editor.value = titles.map((title, index) => `${index + 1}. ${title}`).join('\n')
    $('#outline-revision-request').value = ''
    scheduleWriterAutosave()
    setWriterStatus(`AI revised the chapter suggestions. You can edit the titles before drafting.`)
  } catch (error) {
    editor.value = previous
    setWriterStatus(error.message || 'The chapter suggestions could not be revised.', 'error')
  } finally {
    setWriterBusy(false)
  }
}

async function saveDraft() {
  clearTimeout(writerAutosaveTimer)
  writerAutosaveTimer = null
  const title = $('#book-title').value.trim()
  const author = $('#book-author').value.trim() || 'Leaf reader'
  const manuscript = `# ${title}\n\n${state.writer.chapters
    .filter((chapter) => chapter.content.trim())
    .map((chapter) => `## ${chapter.title}\n\n${chapter.content.trim()}`)
    .join('\n\n')}`
  if (!title || !manuscript) return

  const id = state.writer.savedBookId || crypto.randomUUID()
  const existing = state.books.find((book) => book.id === id)
  const data = createEpub({ title, author, manuscript, cover: state.writer.cover })
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leaf-book'}.epub`
  const record = { id, title, author, fileName, data, addedAt: existing?.addedAt || Date.now(), source: 'ai' }
  await storeRequest('books', 'readwrite', (store) => store.put(record))
  if (existing) {
    await storeRequest('progress', 'readwrite', (store) => store.delete(id))
    state.progress = state.progress.filter((item) => item.id !== id)
    state.books = state.books.map((book) => book.id === id ? record : book)
  } else {
    state.books.push(record)
  }
  state.writer.savedBookId = id
  let autosavedDraftRemoved = true
  if (state.writer.draftId) {
    const draftId = state.writer.draftId
    try {
      await storeRequest('drafts', 'readwrite', (store) => store.delete(draftId))
      state.drafts = state.drafts.filter((draft) => draft.id !== draftId)
      state.writer.draftId = null
    } catch (error) {
      autosavedDraftRemoved = false
      console.error('The book was saved, but its unfinished draft could not be removed.', error)
      try {
        await persistWriterDraft()
      } catch (draftError) {
        console.error('Could not update the unfinished draft after saving the book.', draftError)
      }
      setWriterAutosaveStatus('Book saved, but its unfinished draft could not be cleared.', 'error')
    }
  }
  updateWriterControls()
  renderLibrary()
  if (autosavedDraftRemoved) setWriterAutosaveStatus('Book saved to your library.')
  setWriterStatus('Saved to your library. Keep revising here to update this book.')
  showToast(existing ? 'Your saved book has been updated.' : 'Your book is on the shelf.')
}

async function importFile(file) {
  if (!file || !file.name.toLowerCase().endsWith('.epub')) {
    showToast('Choose an EPUB file to add it to Leaf.')
    return
  }
  const input = $('#epub-input')
  try {
    const data = await file.arrayBuffer()
    const book = ePub(data)
    await book.ready
    const metadata = await book.loaded.metadata
    const record = {
      id: crypto.randomUUID(),
      title: metadata.title || file.name.replace(/\.epub$/i, ''),
      author: metadata.creator || '',
      fileName: file.name,
      data,
      addedAt: Date.now(),
    }
    await storeRequest('books', 'readwrite', (store) => store.add(record))
    await book.destroy()
    state.books.push(record)
    renderLibrary()
    openBook(record.id)
  } catch (error) {
    showToast('That EPUB could not be opened. Try another file.')
    console.error(error)
  } finally {
    input.value = ''
  }
}

async function openBook(id) {
  const record = state.books.find((book) => book.id === id)
  if (!record) return
  if (state.active) {
    state.active.rendition.destroy()
    state.active.book.destroy()
  }
  const book = ePub(record.data)
  await book.ready
  book.spine.hooks.content.register((document) => {
    document.querySelectorAll('script').forEach((script) => script.remove())
  })
  const rendition = book.renderTo('epub-frame', {
    width: '100%',
    height: '100%',
    spread: 'none',
    flow: 'paginated',
    allowScriptedContent: false,
  })
  state.active = { book, rendition, record }
  const pageDocuments = new WeakSet()
  const readerFrame = $('#epub-frame')
  rendition.on('rendered', (_section, view) => {
    const pageDocument = view.contents?.document
    const pageFrame = view.iframe
    if (!pageDocument || !pageFrame) {
      console.warn('[Leaf page-turn] Rendered view has no page document or iframe.')
      return
    }
    if (pageDocuments.has(pageDocument)) return
    pageDocuments.add(pageDocument)
    console.log('[Leaf page-turn] Handler attached.', {
      section: view.section?.index,
      readerWidth: readerFrame.clientWidth,
      iframeWidth: pageFrame.clientWidth,
      contentWidth: pageDocument.defaultView?.innerWidth,
    })
    pageDocument.addEventListener('click', (event) => {
      const readerBounds = readerFrame.getBoundingClientRect()
      const iframeBounds = pageFrame.getBoundingClientRect()
      const coordinateScale = pageFrame.clientWidth ? iframeBounds.width / pageFrame.clientWidth : 1
      const clickX = iframeBounds.left + event.clientX * coordinateScale - readerBounds.left
      const pageWidth = readerBounds.width
      console.log('[Leaf page-turn] Click received.', {
        button: event.button,
        clientX: event.clientX,
        clickX,
        readerWidth: pageWidth,
        iframeWidth: pageFrame.clientWidth,
      })
      if (event.button !== 0) return
      if (!(pageWidth > 0)) {
        console.warn('[Leaf page-turn] Cannot determine reader width.')
        return
      }

      const direction = clickX < pageWidth / 2 ? 'prev' : 'next'
      const before = rendition.currentLocation()
      console.log('[Leaf page-turn] Requesting navigation.', {
        direction,
        before: before?.start?.cfi,
      })
      const navigation = direction === 'prev' ? rendition.prev() : rendition.next()
      navigation.then(() => {
        const after = rendition.currentLocation()
        console.log('[Leaf page-turn] Navigation completed.', {
          direction,
          after: after?.start?.cfi,
        })
      }).catch((error) => console.error('[Leaf page-turn] Navigation failed.', error))
    })
  })
  $('#reader-title').textContent = record.title
  app.querySelector('.app-shell').classList.add('app-shell--reading')
  $('#library-screen').hidden = true
  $('#writer-screen').hidden = true
  $('#reader-screen').hidden = false
  $('#toc-panel').hidden = true
  $('#bookmark-panel').hidden = true
  $('#bookmarks-button').setAttribute('aria-expanded', 'false')
  setReaderSettingsOpen(false)
  applyReaderTheme()
  const saved = progressFor(id)
  await rendition.display(saved?.cfi || undefined)
  rendition.on('relocated', (location) => {
    console.log('[Leaf page-turn] Location changed.', {
      start: location?.start?.cfi,
      end: location?.end?.cfi,
    })
    updateReadingPosition(location)
  })
  const navigation = await book.loaded.navigation
  renderToc(navigation.toc || [])
  icons()
  book.locations.generate(1000).then(() => {
    if (state.active?.record.id === id) updateReadingPosition(rendition.currentLocation())
  }).catch(() => {})
}

function renderToc(items, depth = 0) {
  const flattened = []
  const visit = (entries, level) => entries.forEach((entry) => {
    flattened.push({ ...entry, level })
    if (entry.subitems?.length) visit(entry.subitems, level + 1)
  })
  visit(items, depth)
  $('#chapter-list').innerHTML = flattened.map((item) => `<button class="chapter-link" type="button" data-href="${escapeHtml(item.href)}" style="--depth:${item.level}">${escapeHtml(item.label || 'Untitled chapter')}</button>`).join('') || '<p class="toc-empty">No chapter list in this book.</p>'
}

function renderBookmarks() {
  if (!state.active) return
  const records = state.bookmarks
    .filter((bookmark) => bookmark.bookId === state.active.record.id)
    .sort((first, second) => second.createdAt - first.createdAt)
  $('#bookmark-list').innerHTML = records.map((bookmark) => `
    <div class="bookmark-item">
      <button class="chapter-link bookmark-link" type="button" data-bookmark-cfi="${escapeHtml(bookmark.cfi)}">
        <span>${escapeHtml(bookmark.chapter || 'Reading')}</span><small>${bookmark.percentage}%</small>
      </button>
      <button class="icon-button bookmark-remove" type="button" data-bookmark-remove="${escapeHtml(bookmark.id)}" aria-label="Remove bookmark" title="Remove bookmark"><i data-lucide="x"></i></button>
    </div>`).join('') || '<p class="toc-empty">No bookmarks in this book yet.</p>'
  icons()
  syncBookmarkButton(state.active.rendition.currentLocation()?.start?.cfi)
}

function syncBookmarkButton(cfi) {
  const isBookmarked = Boolean(state.active && state.bookmarks.some((bookmark) => bookmark.bookId === state.active.record.id && bookmark.cfi === cfi))
  const button = $('#bookmark-current')
  button.textContent = isBookmarked ? 'Remove bookmark from this page' : 'Bookmark this page'
  button.title = button.textContent
  button.setAttribute('aria-label', button.textContent)
  button.setAttribute('aria-pressed', String(isBookmarked))
}

async function toggleBookmark() {
  if (!state.active) return
  const location = state.active.rendition.currentLocation()
  const cfi = location?.start?.cfi
  if (!cfi) return
  const existing = state.bookmarks.find((bookmark) => bookmark.bookId === state.active.record.id && bookmark.cfi === cfi)
  if (existing) {
    await storeRequest('bookmarks', 'readwrite', (store) => store.delete(existing.id))
    state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== existing.id)
    showToast('Bookmark removed.')
  } else {
    const bookmark = {
      id: crypto.randomUUID(),
      bookId: state.active.record.id,
      cfi,
      chapter: $('#chapter-label').textContent,
      percentage: Number($('#progress-label').textContent.replace('%', '')) || 0,
      createdAt: Date.now(),
    }
    await storeRequest('bookmarks', 'readwrite', (store) => store.put(bookmark))
    state.bookmarks.push(bookmark)
    showToast('Page bookmarked.')
  }
  renderBookmarks()
}

function updateReadingPosition(location) {
  if (!state.active || !location?.start) return
  const { book, record } = state.active
  const progressCfi = location.end?.cfi || location.start.cfi
  const fraction = book.locations.length()
    ? book.locations.percentageFromCfi(progressCfi)
    : location.end?.percentage ?? location.start.percentage
  const percentage = Math.max(0, Math.min(100, Math.round((fraction || 0) * 100)))
  $('#progress-fill').style.width = `${percentage}%`
  $('#progress-label').textContent = `${percentage}%`
  $('#chapter-label').textContent = location.start.href?.split('#')[0]?.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Reading'
  syncBookmarkButton(location.start.cfi)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    const progress = { id: record.id, cfi: location.start.cfi, percentage, lastOpenedAt: Date.now() }
    try {
      await storeRequest('progress', 'readwrite', (store) => store.put(progress))
      const existing = state.progress.findIndex((item) => item.id === record.id)
      if (existing === -1) state.progress.push(progress)
      else state.progress[existing] = progress
    } catch (error) {
      console.error(error)
    }
  }, 450)
}

function persistReaderPreferences() {
  try {
    localStorage.setItem('leaf-reader-preferences', JSON.stringify(state.readerPreferences))
  } catch {}
}

function setReaderPreference(name, value) {
  state.readerPreferences[name] = value
  persistReaderPreferences()
  applyReaderTheme()
}

function setReaderSettingsOpen(open) {
  $('#reader-settings').hidden = !open
  $('#reader-settings-button').setAttribute('aria-expanded', String(open))
}

function applyReaderTheme() {
  const preferences = state.readerPreferences
  const colors = readerThemes[preferences.theme]
  $('#reader-font-size').value = preferences.fontSize
  $('#reader-font-size-value').textContent = `${preferences.fontSize}%`
  $('#reader-font-family').value = preferences.font
  $('#reader-line-height').value = String(preferences.lineHeight)
  document.querySelectorAll('[data-reader-theme]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.readerTheme === preferences.theme))
  })
  const screen = $('#reader-screen')
  screen.dataset.theme = preferences.theme
  screen.style.setProperty('--reader-app-background', colors.screen)
  screen.style.setProperty('--reader-toolbar-background', colors.toolbar)
  screen.style.setProperty('--reader-paper-background', colors.background)
  screen.style.setProperty('--reader-frame-border', colors.border)
  screen.dataset.themeMode = colors.dark ? 'dark' : 'light'
  if (!state.active) return
  state.active.rendition.themes.default({
    body: {
      'font-family': `${readerFonts[preferences.font]} !important`,
      'font-size': `${preferences.fontSize}% !important`,
      'line-height': `${preferences.lineHeight} !important`,
      color: `${colors.color} !important`,
      background: `${colors.background} !important`,
      padding: '16px 4% !important',
      'user-select': 'none !important',
      '-webkit-user-select': 'none !important',
      '-webkit-touch-callout': 'none !important',
    },
  })
  state.active.rendition.themes.fontSize(`${preferences.fontSize}%`)
}

function closeReader() {
  if (state.active) {
    state.active.rendition.destroy()
    state.active.book.destroy()
    state.active = null
  }
  app.querySelector('.app-shell').classList.remove('app-shell--reading')
  $('#reader-screen').hidden = true
  $('#library-screen').hidden = false
  setActiveNavigation('library')
  renderLibrary()
}

$('#library-nav').addEventListener('click', showLibrary)
$('#writer-nav').addEventListener('click', showWriter)
$('#writer-new-draft').addEventListener('click', () => {
  startNewWriterDraft().catch((error) => {
    reportWriterAutosaveError(error)
    showToast('Could not start a new draft.')
  })
})
$('#writer-library-book').addEventListener('change', updateWriterControls)
$('#load-library-book').addEventListener('click', () => loadLibraryBookIntoWriter())
$('#wizard-back').addEventListener('click', returnToPreviousWriterStep)
$('#wizard-next').addEventListener('click', continueWriterWorkflow)
$('#generate-button').addEventListener('click', () => requestDraft('outline'))
$('#revise-outline').addEventListener('click', () => reviseOutline())
$('#generate-chapter').addEventListener('click', () => requestDraft('chapter'))
$('#save-draft').addEventListener('click', async () => {
  try {
    await saveDraft()
  } catch (error) {
    setWriterStatus(error.message || 'The book could not be saved.', 'error')
    scheduleWriterAutosave()
  }
})
$('#toggle-key').addEventListener('click', (event) => {
  const input = $('#openrouter-key')
  const visible = input.type === 'password'
  input.type = visible ? 'text' : 'password'
  event.currentTarget.setAttribute('aria-label', visible ? 'Hide API key' : 'Show API key')
  event.currentTarget.title = visible ? 'Hide API key' : 'Show API key'
  event.currentTarget.innerHTML = `<i data-lucide="${visible ? 'eye-off' : 'eye'}"></i>`
  icons()
})
try {
  const savedKey = localStorage.getItem(openRouterKeyStorageKey)
  if (savedKey) {
    $('#openrouter-key').value = savedKey
    setWriterStatus('Saved API key loaded from this browser.')
  }
} catch (error) {
  console.error('Could not load the OpenRouter API key from local storage.', error)
  setWriterStatus('Could not access browser storage for your API key. Enter it again to continue.', 'error')
}
try {
  const savedModel = localStorage.getItem(openRouterModelStorageKey)
  const modelExists = [...$('#openrouter-model').options].some((option) => option.value === savedModel)
  if (savedModel && modelExists) $('#openrouter-model').value = savedModel
  else if (savedModel) localStorage.removeItem(openRouterModelStorageKey)
} catch (error) {
  console.error('Could not load the selected AI model from local storage.', error)
  setWriterStatus('Could not restore the saved AI model in this browser.', 'error')
}
$('#openrouter-key').addEventListener('input', () => {
  try {
    const key = $('#openrouter-key').value.trim()
    if (key) localStorage.setItem(openRouterKeyStorageKey, key)
    else localStorage.removeItem(openRouterKeyStorageKey)
    setWriterStatus(key ? 'API key saved in this browser.' : 'Saved API key removed from this browser.')
  } catch (error) {
    console.error('Could not save the OpenRouter API key to local storage.', error)
    setWriterStatus('Could not save the API key in this browser.', 'error')
  }
  updateWriterControls()
})
const refreshWriterPrompt = () => {
  if (state.writer.outline.length) {
    const matches = state.writer.outlinePrompt === outlinePromptSignature()
    setWriterStatus(matches
      ? 'Chapter suggestions match your current prompt and AI model.'
      : 'Your prompt or AI model changed. Regenerate chapter suggestions before continuing.')
  }
  updateWriterControls()
  scheduleWriterAutosave()
}
$('#openrouter-model').addEventListener('change', () => {
  refreshWriterPrompt()
  try {
    localStorage.setItem(openRouterModelStorageKey, $('#openrouter-model').value)
  } catch (error) {
    console.error('Could not save the selected AI model to local storage.', error)
    setWriterStatus('Could not save the selected AI model in this browser.', 'error')
  }
})
$('#book-topic').addEventListener('input', refreshWriterPrompt)
$('#page-count').addEventListener('input', refreshWriterPrompt)
$('#outline-revision-request').addEventListener('input', () => {
  updateWriterControls()
  scheduleWriterAutosave()
})
$('#chapter-outline').addEventListener('input', () => {
  updateWriterControls()
  scheduleWriterAutosave()
})
$('#manuscript-editor').addEventListener('input', () => {
  const chapter = state.writer.chapters[state.writer.currentChapter]
  if (chapter) chapter.content = $('#manuscript-editor').value
  updateWriterControls()
  scheduleWriterAutosave()
})
$('#chapter-prompt').addEventListener('input', () => {
  const chapter = state.writer.chapters[state.writer.currentChapter]
  if (chapter) chapter.prompt = $('#chapter-prompt').value
  scheduleWriterAutosave()
})
$('#chapter-previous').addEventListener('click', () => {
  if (state.writer.currentChapter === 0) return
  state.writer.currentChapter -= 1
  renderCurrentChapter()
})
$('#chapter-next').addEventListener('click', () => {
  if (state.writer.currentChapter >= state.writer.chapters.length - 1) return
  state.writer.currentChapter += 1
  renderCurrentChapter()
})
$('#book-title').addEventListener('input', () => {
  updateWriterControls()
  scheduleWriterAutosave()
})
$('#book-author').addEventListener('input', scheduleWriterAutosave)
$('#auto-fill-chapters').addEventListener('change', scheduleWriterAutosave)
$('#cover-input').addEventListener('change', (event) => selectCover(event.target.files[0]))
$('#remove-cover').addEventListener('click', () => {
  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  state.writer.cover = null
  state.writer.coverUrl = ''
  $('#cover-input').value = ''
  $('#cover-preview').removeAttribute('src')
  $('#cover-preview').hidden = true
  $('#remove-cover').hidden = true
  scheduleWriterAutosave()
})
$('#upload-button').addEventListener('click', () => $('#epub-input').click())
$('#empty-upload').addEventListener('click', () => $('#epub-input').click())
$('#epub-input').addEventListener('change', (event) => importFile(event.target.files[0]))
$('#search-input').addEventListener('input', (event) => {
  state.query = event.target.value
  renderLibrary()
})
$('#book-grid').addEventListener('click', async (event) => {
  const remove = event.target.closest('[data-remove]')
  if (remove) {
    const id = remove.dataset.remove
    const book = state.books.find((item) => item.id === id)
    if (!book || !window.confirm(`Remove “${book.title}” from your library?`)) return
    await Promise.all([
      storeRequest('books', 'readwrite', (store) => store.delete(id)),
      storeRequest('progress', 'readwrite', (store) => store.delete(id)),
      ...state.bookmarks.filter((bookmark) => bookmark.bookId === id)
        .map((bookmark) => storeRequest('bookmarks', 'readwrite', (store) => store.delete(bookmark.id))),
    ])
    releaseBookCover(id)
    state.books = state.books.filter((item) => item.id !== id)
    state.progress = state.progress.filter((item) => item.id !== id)
    state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.bookId !== id)
    renderLibrary()
    return
  }
  const open = event.target.closest('[data-open]')
  if (open) openBook(open.dataset.open)
})
$('#writer-drafts').addEventListener('click', async (event) => {
  const remove = event.target.closest('[data-delete-draft]')
  if (remove) {
    const id = remove.dataset.deleteDraft
    const draft = state.drafts.find((item) => item.id === id)
    if (!draft || !window.confirm(`Delete unfinished draft "${draft.title || 'Untitled draft'}"?`)) return
    if (state.writer.busy && state.writer.draftId === id) {
      showToast('Wait for the current chapter generation to finish before deleting this draft.')
      return
    }
    if (state.writer.draftId === id) {
      clearTimeout(writerAutosaveTimer)
      writerAutosaveTimer = null
    }
    try {
      await storeRequest('drafts', 'readwrite', (store) => store.delete(id))
    } catch (error) {
      console.error('Could not delete the unfinished draft.', error)
      if (state.writer.draftId === id) scheduleWriterAutosave()
      showToast('Could not delete this draft.')
      return
    }
    state.drafts = state.drafts.filter((item) => item.id !== id)
    if (state.writer.draftId === id) {
      state.writer.draftId = null
      setWriterAutosaveStatus('Draft deleted. Continued edits will create a new autosaved draft.')
    }
    renderLibrary()
    showToast('Draft deleted.')
    return
  }

  const resume = event.target.closest('[data-resume-draft]')
  if (!resume) return
  const id = resume.dataset.resumeDraft
  if (state.writer.busy) {
    showToast('Wait for the current chapter generation to finish before resuming another draft.')
    return
  }
  try {
    await flushWriterAutosave()
    const draft = state.drafts.find((item) => item.id === id)
    if (draft) resumeWriterDraft(draft)
  } catch (error) {
    reportWriterAutosaveError(error)
    showToast('Could not save the current draft before resuming another.')
  }
})
$('#continue-section').addEventListener('click', (event) => {
  const button = event.target.closest('[data-open]')
  if (button) openBook(button.dataset.open)
})
$('#back-button').addEventListener('click', closeReader)
$('#toc-button').addEventListener('click', () => {
  $('#toc-panel').hidden = !$('#toc-panel').hidden
  $('#bookmark-panel').hidden = true
  $('#bookmarks-button').setAttribute('aria-expanded', 'false')
})
$('#toc-close').addEventListener('click', () => { $('#toc-panel').hidden = true })
$('#bookmark-current').addEventListener('click', () => toggleBookmark().catch(() => showToast('Could not save this bookmark.')))
$('#bookmarks-button').addEventListener('click', () => {
  const open = $('#bookmark-panel').hidden
  $('#bookmark-panel').hidden = !open
  $('#toc-panel').hidden = true
  $('#bookmarks-button').setAttribute('aria-expanded', String(open))
  if (open) renderBookmarks()
})
$('#bookmark-close').addEventListener('click', () => {
  $('#bookmark-panel').hidden = true
  $('#bookmarks-button').setAttribute('aria-expanded', 'false')
})
$('#bookmark-list').addEventListener('click', async (event) => {
  const remove = event.target.closest('[data-bookmark-remove]')
  if (remove) {
    const { bookmarkRemove: id } = remove.dataset
    await storeRequest('bookmarks', 'readwrite', (store) => store.delete(id))
    state.bookmarks = state.bookmarks.filter((bookmark) => bookmark.id !== id)
    renderBookmarks()
    return
  }
  const bookmark = event.target.closest('[data-bookmark-cfi]')
  if (bookmark && state.active) {
    $('#bookmark-panel').hidden = true
    $('#bookmarks-button').setAttribute('aria-expanded', 'false')
    await state.active.rendition.display(bookmark.dataset.bookmarkCfi)
  }
})
$('#reader-settings-button').addEventListener('click', () => setReaderSettingsOpen($('#reader-settings').hidden))
$('#close-reader-settings').addEventListener('click', () => setReaderSettingsOpen(false))
$('#reset-reader-settings').addEventListener('click', () => {
  state.readerPreferences = { ...readerPreferenceDefaults }
  persistReaderPreferences()
  applyReaderTheme()
})
$('#reader-font-size').addEventListener('input', (event) => setReaderPreference('fontSize', Number(event.target.value)))
$('#reader-font-family').addEventListener('change', (event) => setReaderPreference('font', event.target.value))
$('#reader-line-height').addEventListener('change', (event) => setReaderPreference('lineHeight', Number(event.target.value)))
$('#reader-settings').addEventListener('click', (event) => {
  const theme = event.target.closest('[data-reader-theme]')
  if (theme) setReaderPreference('theme', theme.dataset.readerTheme)
})
document.addEventListener('pointerdown', (event) => {
  const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement
  if (!target) return

  if (!$('#reader-settings').hidden && !target.closest('#reader-settings, #reader-settings-button')) {
    setReaderSettingsOpen(false)
  }
  if (!$('#toc-panel').hidden && !target.closest('#toc-panel, #toc-button')) {
    $('#toc-panel').hidden = true
  }
  if (!$('#bookmark-panel').hidden && !target.closest('#bookmark-panel, #bookmarks-button')) {
    $('#bookmark-panel').hidden = true
    $('#bookmarks-button').setAttribute('aria-expanded', 'false')
  }
})
$('#chapter-list').addEventListener('click', (event) => {
  const chapter = event.target.closest('[data-href]')
  if (!chapter || !state.active) return
  const rendition = state.active.rendition
  $('#toc-panel').hidden = true
  rendition.display(chapter.dataset.href).catch((error) => {
    showToast('That chapter could not be opened.')
    console.error(error)
  })
})
document.addEventListener('keydown', (event) => {
  if (!state.active) return
  if (event.key !== 'Escape') return
  if (!$('#reader-settings').hidden) setReaderSettingsOpen(false)
  else closeReader()
})

let dragDepth = 0
document.addEventListener('dragenter', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  dragDepth += 1
  $('#drop-overlay').hidden = false
})
document.addEventListener('dragover', (event) => event.preventDefault())
document.addEventListener('dragleave', (event) => {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) $('#drop-overlay').hidden = true
})
document.addEventListener('drop', (event) => {
  event.preventDefault()
  dragDepth = 0
  $('#drop-overlay').hidden = true
  if (event.dataTransfer.files.length) importFile(event.dataTransfer.files[0])
})

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushWriterAutosave().catch((error) => console.error('Could not autosave before the page became hidden.', error))
  }
})
window.addEventListener('pagehide', () => {
  flushWriterAutosave().catch((error) => console.error('Could not autosave before leaving the page.', error))
})

loadLibrary()
updateWriterControls()

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}service-worker.js`).catch((error) => {
      console.error('Could not register the Leaf service worker.', error)
      showToast('Offline support could not be enabled.')
    })
  })
}