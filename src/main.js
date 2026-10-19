import ePub from 'epubjs'
import {
  createIcons,
  AlignLeft,
  BookOpen,
  BookPlus,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Library,
  ListPlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide'
import { generateOpenRouterImage, streamOpenRouter } from './ai.js'
import { createEpub } from './epub.js'
import { createUuid } from './id.js'
import './style.css'

const iconSet = {
  AlignLeft,
  BookOpen,
  BookPlus,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  Library,
  ListPlus,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  X,
}

const readerPreferenceDefaults = { fontSize: 100, font: 'serif', lineHeight: 1.75, theme: 'paper-white' }
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
  'paper-white': { background: '#FAF9F6', color: '#242424' },
  'warm-ivory': { background: '#FFF8E7', color: '#2E281F' },
  'classic-parchment': { background: '#F4E8D2', color: '#332B20' },
  'vintage-sepia': { background: '#EAD8B5', color: '#382B1E' },
  'oat-milk': { background: '#EEE4D3', color: '#302C27' },
  'cloud-gray': { background: '#F1F3F5', color: '#262A30' },
  'warm-gray': { background: '#E7E2DC', color: '#2D2925' },
  'peach-bloom': { background: '#FBE4D5', color: '#422B24' },
  'rose-blush': { background: '#F6E1E7', color: '#3D2930' },
  'lavender-mist': { background: '#EEE7F8', color: '#2F2940' },
  'powder-blue': { background: '#E6F1F8', color: '#22313B' },
  'mint-leaf': { background: '#E3F2E8', color: '#23342B' },
  'sage-garden': { background: '#DEE8DC', color: '#283328' },
  'lemon-cream': { background: '#FAF3CE', color: '#38311B' },
  'terracotta-paper': { background: '#F2DDD3', color: '#462D25' },
  'soft-charcoal': { background: '#1E2024', color: '#E9E6DF', dark: true },
  'true-night': { background: '#121212', color: '#EAE7E2', dark: true },
  'midnight-navy': { background: '#172235', color: '#E5ECF6', dark: true },
  'forest-night': { background: '#1B2A24', color: '#E4EEE6', dark: true },
  'midnight-plum': { background: '#2B202F', color: '#F2E8F4', dark: true },
}
const legacyReaderThemeAliases = {
  paper: 'paper-white',
  light: 'cloud-gray',
  warm: 'soft-charcoal',
  sage: 'midnight-plum',
  night: 'soft-charcoal',
  dark: 'true-night',
  rose: 'midnight-plum',
  sky: 'midnight-navy',
  lavender: 'midnight-plum',
  slate: 'warm-gray',
  mint: 'oat-milk',
  lemon: 'lemon-cream',
  berry: 'rose-blush',
  coral: 'terracotta-paper',
}

function loadReaderPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem('leaf-reader-preferences') || '{}')
    const preferences = saved && typeof saved === 'object' ? saved : {}
    const size = Number(preferences.fontSize)
    const lineHeight = Number(preferences.lineHeight)
    return {
      fontSize: Number.isFinite(size) ? Math.min(160, Math.max(100, size)) : readerPreferenceDefaults.fontSize,
      font: Object.hasOwn(readerFonts, preferences.font) ? preferences.font : readerPreferenceDefaults.font,
      lineHeight: [1.5, 1.75, 2].includes(lineHeight) ? lineHeight : readerPreferenceDefaults.lineHeight,
      theme: Object.hasOwn(readerThemes, preferences.theme)
        ? preferences.theme
        : Object.hasOwn(legacyReaderThemeAliases, preferences.theme)
          ? legacyReaderThemeAliases[preferences.theme]
          : readerPreferenceDefaults.theme,
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
let writerAutosaveTimer = null
let readerUiTimer = null
const writerAutosaveTasks = new Set()

app.innerHTML = `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar__label">YOUR SPACE</div>
      <div class="mobile-page-title" id="mobile-page-title">Library</div>
      <nav class="sidebar-nav" aria-label="Main navigation">
        <button class="sidebar-nav__item sidebar-nav__item--active" type="button" id="library-nav" title="My library">
          <i data-lucide="library"></i><span>My library</span><span class="nav-count" id="nav-count">0</span>
        </button>
        <button class="sidebar-nav__item" type="button" id="writer-nav" title="AI writing room">
          <i data-lucide="sparkles"></i><span>AI writing room</span>
        </button>
        <button class="sidebar-nav__item sidebar-nav__add" type="button" id="upload-button" aria-label="Add a book" title="Add a book">
          <i data-lucide="plus"></i><span>Add a book</span>
        </button>
      </nav>
    </aside>

    <main class="main-area">
      <section class="library-screen" id="library-screen">
        <header class="topbar">
          <div class="topbar__tools">
            <label class="search-box"><i data-lucide="search"></i><input id="search-input" type="search" placeholder="Find a book" aria-label="Find a book" /></label>
          </div>
        </header>

        <div class="library-content">
          <section class="shelf-section" aria-labelledby="shelf-title">
            <div class="section-heading"><div><h2 id="shelf-title">On your shelf</h2><span class="section-count" id="book-count">0 books</span></div><span class="section-heading__rule"></span></div>
            <div class="book-grid" id="book-grid"></div>
            <div class="empty-state" id="empty-state" hidden>
              <span class="empty-state__icon"><i data-lucide="book-plus"></i></span>
              <h3>Your next favorite is waiting.</h3>
              <p>Add an EPUB to make this shelf yours.</p>
              <button class="button button--outline" type="button" id="empty-upload"><i data-lucide="plus"></i><span>Choose an EPUB</span></button>
            </div>
            <div class="no-results" id="no-results" hidden>No books match that search.</div>
          </section>
        </div>
      </section>

      <section class="writer-screen" id="writer-screen" hidden>
        <div class="writer-content">
          <section class="writer-library-loader" id="writer-library-loader" aria-labelledby="writer-library-loader-title">
            <div class="writer-library-loader__copy">
              <h2 id="writer-library-loader-title">Edit a book from your library</h2>
              <p>Load a saved book or resume an unfinished draft in the chapter editor.</p>
            </div>
            <label class="writer-field" for="writer-library-book">Book or draft
              <select id="writer-library-book"><option value="">Choose a book or draft...</option></select>
            </label>
            <div class="writer-library-loader__actions">
              <button class="button button--outline" type="button" id="load-library-book" disabled><i data-lucide="book-open"></i><span>Load into editor</span></button>
              <button class="icon-button" type="button" id="delete-writer-draft" aria-label="Delete selected draft" title="Delete selected draft" hidden><i data-lucide="trash-2"></i></button>
            </div>
          </section>
          <p class="writer-autosave-status" id="writer-autosave-status" role="status" aria-live="polite">Unfinished drafts save automatically in this browser.</p>
          <div class="writer-wizard">
            <ol class="writer-progress" aria-label="AI writing walkthrough">
              <li data-wizard-indicator="1"><span>01</span><span>AI fields</span></li>
              <li data-wizard-indicator="2" hidden><span>02</span><span>Prompt</span></li>
              <li data-wizard-indicator="3" hidden><span>03</span><span>Chapters</span></li>
              <li data-wizard-indicator="4" hidden><span>04</span><span>Draft</span></li>
              <li data-wizard-indicator="5" hidden><span>05</span><span>Save</span></li>
            </ol>

            <section class="writer-wizard-panel" data-wizard-panel="1" aria-labelledby="wizard-connection-title">
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
              <h2 id="wizard-prompt-title">What would you like to read?</h2>
              <p class="writer-panel-copy">Describe the book you have in mind. The AI will use it to shape the chapter suggestions.</p>
              <div class="writer-wizard-fields">
                <label class="writer-field" for="book-topic">Book idea
                  <textarea id="book-topic" rows="5" placeholder="A botanist inherits a greenhouse that grows memories..." required></textarea>
                </label>
                <label class="writer-field" for="page-count">Pages
                  <input id="page-count" type="number" min="1" value="8" required />
                </label>
                <p class="writer-help">About 200 words per page. Length varies by model.</p>
                <button class="button button--primary writer-generate" type="button" id="generate-button"><i data-lucide="list-plus"></i><span>Suggest chapters</span></button>
              </div>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="3" aria-labelledby="wizard-outline-title" hidden>
              <h2 id="wizard-outline-title">Shape the chapter suggestions</h2>
              <label class="writer-field" for="outline-revision-request">How should the AI change these suggestions?
              <textarea id="outline-revision-request" rows="2" spellcheck="true" placeholder="Make the middle chapters build more suspense..."></textarea>
              </label>
              <button class="button button--outline outline-revise" type="button" id="revise-outline"><i data-lucide="sparkles"></i><span>Revise suggestions with AI</span></button>
              <label class="writer-field" for="chapter-outline">Chapter titles, one per line
                <textarea id="chapter-outline" rows="8" spellcheck="true" placeholder="AI-suggested chapter titles will appear here."></textarea>
              </label>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="4" aria-labelledby="manuscript-title" hidden>
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
              <h2 id="wizard-details-title">Get your book ready</h2>
              <div class="manuscript-meta">
                <label class="writer-field" for="book-title">Title<input id="book-title" type="text" placeholder="Filled from the suggestions" /></label>
                <label class="writer-field" for="book-author">Author<input id="book-author" type="text" placeholder="Your name or pen name" /></label>
              </div>
              <div class="cover-card">
                <div class="cover-card__artwork">
                  <div class="cover-card__placeholder" id="cover-placeholder">
                    <i data-lucide="image"></i>
                    <span>Cover preview</span>
                    <small>Portrait works best</small>
                  </div>
                  <img id="cover-preview" alt="Custom book cover preview" hidden />
                  <div class="cover-title-overlay" id="cover-title-overlay" hidden></div>
                </div>
                <div class="cover-card__content">
                  <div class="cover-card__heading">
                    <span class="cover-card__eyebrow">OPTIONAL BOOK ART</span>
                    <h3>Custom cover</h3>
                    <p>Upload artwork or create an AI cover with your book title included.</p>
                  </div>
                  <div class="cover-card__actions">
                    <label class="button button--outline cover-card__upload" for="cover-input">
                      <i data-lucide="upload"></i><span>Upload image</span>
                      <input id="cover-input" class="cover-card__file" type="file" accept="image/png,image/jpeg" aria-label="Upload a PNG or JPEG cover image" />
                    </label>
                    <button class="button button--primary" type="button" id="generate-cover"><i data-lucide="sparkles"></i><span>Generate with AI</span></button>
                  </div>
                  <p class="cover-card__note">PNG or JPEG · AI generation uses your OpenRouter key; provider charges may apply.</p>
                  <button class="cover-card__remove" type="button" id="remove-cover" hidden><i data-lucide="x"></i><span>Remove cover</span></button>
                </div>
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
          <button class="icon-button reader-back-button" type="button" id="back-button" aria-label="Back to library" title="Back to library"><i data-lucide="chevron-left"></i></button>
          <div class="reader-book-title"><b id="reader-title">Book title</b><span class="reader-book-title__author" id="reader-author"></span></div>
          <div class="reader-tools">
            <button class="icon-button" type="button" id="toc-button" aria-label="Table of contents" title="Table of contents"><i data-lucide="align-left"></i></button>
            <button class="icon-button" type="button" id="bookmarks-button" aria-label="Saved bookmarks" title="Saved bookmarks" aria-expanded="false" aria-controls="bookmark-panel"><i data-lucide="bookmark-check"></i></button>
            <button class="icon-button" type="button" id="reader-settings-button" aria-label="Reading settings" title="Reading settings" aria-expanded="false" aria-controls="reader-settings"><i data-lucide="sliders-horizontal"></i></button>
          </div>
        </header>
        <aside class="reader-settings" id="reader-settings" aria-label="Reading settings" hidden>
          <div class="reader-settings__header"><h2>Reading settings</h2><div><button class="reader-settings__reset" type="button" id="reset-reader-settings"><i data-lucide="rotate-ccw"></i><span>Reset</span></button><button class="icon-button" type="button" id="close-reader-settings" aria-label="Close reading settings"><i data-lucide="x"></i></button></div></div>
          <label class="reader-setting" for="reader-font-size"><span>Text size <output id="reader-font-size-value">100%</output></span><input id="reader-font-size" type="range" min="100" max="160" step="5" value="100" /></label>
          <label class="reader-setting" for="reader-font-family"><span>Typeface</span><select id="reader-font-family"><option value="serif">Georgia</option><option value="soft">Palatino</option><option value="garamond">Garamond</option><option value="bookman">Bookman</option><option value="sans">Arial</option><option value="verdana">Verdana</option><option value="trebuchet">Trebuchet</option></select></label>
          <label class="reader-setting" for="reader-line-height"><span>Line spacing</span><select id="reader-line-height"><option value="1.5">Compact</option><option value="1.75" selected>Relaxed</option><option value="2">Open</option></select></label>
          <div class="reader-font-preview" id="reader-font-preview">
            <span class="reader-font-preview__label">Preview</span>
            <p id="reader-font-preview-text">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <fieldset class="reader-theme-picker"><legend>Page color</legend><div class="reader-theme-options">
            <div class="reader-theme-category"><span class="reader-theme-category__label">Light &amp; paper themes</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="paper-white" style="--reader-theme-background:#FAF9F6" aria-pressed="true"><span class="reader-theme-option__swatch"></span><span>Paper White</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="warm-ivory" style="--reader-theme-background:#FFF8E7" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Warm Ivory</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="classic-parchment" style="--reader-theme-background:#F4E8D2" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Classic Parchment</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="vintage-sepia" style="--reader-theme-background:#EAD8B5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Vintage Sepia</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="oat-milk" style="--reader-theme-background:#EEE4D3" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Oat Milk</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="cloud-gray" style="--reader-theme-background:#F1F3F5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Cloud Gray</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="warm-gray" style="--reader-theme-background:#E7E2DC" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Warm Gray</span></button>
            </div></div>
            <div class="reader-theme-category"><span class="reader-theme-category__label">Soft &amp; colorful themes</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="peach-bloom" style="--reader-theme-background:#FBE4D5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Peach Bloom</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="rose-blush" style="--reader-theme-background:#F6E1E7" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Rose Blush</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="lavender-mist" style="--reader-theme-background:#EEE7F8" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Lavender Mist</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="powder-blue" style="--reader-theme-background:#E6F1F8" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Powder Blue</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="mint-leaf" style="--reader-theme-background:#E3F2E8" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Mint Leaf</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="sage-garden" style="--reader-theme-background:#DEE8DC" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Sage Garden</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="lemon-cream" style="--reader-theme-background:#FAF3CE" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Lemon Cream</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="terracotta-paper" style="--reader-theme-background:#F2DDD3" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Terracotta Paper</span></button>
            </div></div>
            <div class="reader-theme-category"><span class="reader-theme-category__label">Dark &amp; immersive themes</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="soft-charcoal" style="--reader-theme-background:#1E2024" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Soft Charcoal</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="true-night" style="--reader-theme-background:#121212" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>True Night</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="midnight-navy" style="--reader-theme-background:#172235" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Midnight Navy</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="forest-night" style="--reader-theme-background:#1B2A24" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Forest Night</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="midnight-plum" style="--reader-theme-background:#2B202F" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Midnight Plum</span></button>
            </div></div>
          </div></fieldset>
        </aside>
        <div class="reader-layout">
          <aside class="toc-panel" id="toc-panel" hidden><div class="toc-panel__head"><h2>Contents</h2><button class="icon-button" type="button" id="toc-close" aria-label="Close contents"><i data-lucide="x"></i></button></div><nav id="chapter-list" class="chapter-list"></nav></aside>
          <aside class="toc-panel bookmark-panel" id="bookmark-panel" hidden><div class="toc-panel__head"><h2>Bookmarks</h2><button class="icon-button" type="button" id="bookmark-close" aria-label="Close bookmarks"><i data-lucide="x"></i></button></div><button class="icon-button bookmark-current-action" type="button" id="bookmark-current" aria-label="Bookmark this page" title="Bookmark this page" aria-pressed="false"><i data-lucide="bookmark"></i></button><nav id="bookmark-list" class="chapter-list" aria-label="Saved bookmarks"></nav></aside>
          <div class="reader-main">
            <div class="reader-stage">
              <div class="epub-frame" id="epub-frame" aria-label="Book text"></div>
              <button class="reader-tap-zone reader-tap-zone--prev" type="button" id="reader-prev-zone" aria-label="Previous page"></button>
              <button class="reader-tap-zone reader-tap-zone--next" type="button" id="reader-next-zone" aria-label="Next page"></button>
            </div>
            <footer class="reader-footer"><button class="icon-button reader-page-button" type="button" id="reader-prev-page" aria-label="Previous page" title="Previous page"><i data-lucide="chevron-left"></i></button><span id="chapter-label">A quiet moment</span><div class="reading-progress-group"><div class="reading-progress"><span class="reading-progress__fill" id="progress-fill"></span></div><div class="reading-progress-meta"><span id="page-count-label" aria-label="Page count unavailable" title="Page count unavailable">— / —</span><span id="progress-label">—%</span></div></div><button class="icon-button reader-page-button" type="button" id="reader-next-page" aria-label="Next page" title="Next page"><i data-lucide="chevron-right"></i></button></footer>
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
const coverColors = ['#a94f43', '#5a4558', '#3f5266', '#9b704f', '#694550', '#566174']
const bookCoverUrls = new Map()
const bookCoverLoads = new Set()

function coverMarkup(book, index) {
  const color = coverColors[index % coverColors.length]
  return `<span class="book-cover" style="--cover-color:${color}" aria-hidden="true"><img class="book-cover__image" data-book-cover="${escapeHtml(book.id)}" alt="" hidden></span>`
}

function showBookCover(image, url) {
  image.src = url
  image.hidden = false
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

function downloadBook(record) {
  const filename = String(record.fileName || `${record.title || 'book'}.epub`)
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
    .replace(/\.epub$/i, '')
    .trim() || 'book'
  const url = URL.createObjectURL(new Blob([record.data], { type: 'application/epub+zip' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.epub`
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function renderLibrary() {
  const query = state.query.trim().toLocaleLowerCase()
  const visibleBooks = state.books
    .filter((book) => `${book.title} ${book.author}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => (progressFor(b.id)?.lastOpenedAt || b.addedAt || 0) - (progressFor(a.id)?.lastOpenedAt || a.addedAt || 0))
  $('#nav-count').textContent = state.books.length
  $('#book-count').textContent = `${state.books.length} ${state.books.length === 1 ? 'book' : 'books'}`
  $('#book-grid').innerHTML = visibleBooks.map((book) => {
    const progress = progressFor(book.id)
    const index = state.books.indexOf(book)
    return `<article class="book-card">
      <div class="book-card__artwork">
        <button class="book-card__open" type="button" data-open="${escapeHtml(book.id)}" aria-label="Read ${escapeHtml(book.title)}">
          ${coverMarkup(book, index)}
        </button>
        <div class="book-card__actions" role="group" aria-label="Actions for ${escapeHtml(book.title)}">
          <button class="book-card__action book-card__download" type="button" data-download="${escapeHtml(book.id)}" aria-label="Download ${escapeHtml(book.title)} as EPUB" title="Download EPUB"><i data-lucide="download"></i></button>
          <button class="book-card__action book-card__remove" type="button" data-remove="${escapeHtml(book.id)}" aria-label="Remove ${escapeHtml(book.title)}" title="Remove book"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="book-card__meta"><span>${escapeHtml(book.author || 'Unknown author')}</span>${progress ? `<span class="book-card__read">${progress.percentage || 0}%</span>` : ''}</div>
    </article>`
  }).join('')
  loadRenderedBookCovers()
  $('#empty-state').hidden = state.books.length > 0
  $('#no-results').hidden = !state.books.length || visibleBooks.length > 0
  icons()
  renderWriterLibraryOptions()
}

function renderWriterLibraryOptions() {
  const select = $('#writer-library-book')
  const button = $('#load-library-book')
  const deleteButton = $('#delete-writer-draft')
  if (!select || !button || !deleteButton) return

  const selectedValue = select.value
  const books = [...state.books].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
  const drafts = [...state.drafts].sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')))
  const bookOptions = books.map((book) => {
    const title = String(book.title || 'Untitled')
    const author = String(book.author || book.fileName || 'Unknown author')
    return `<option value="book:${escapeHtml(book.id)}">${escapeHtml(title)} — ${escapeHtml(author)}</option>`
  }).join('')
  const draftOptions = drafts.map((draft) => `<option value="draft:${escapeHtml(draft.id)}">${escapeHtml(draft.title || 'Untitled draft')}</option>`).join('')
  const options = [
    bookOptions ? `<optgroup label="Books">${bookOptions}</optgroup>` : '',
    draftOptions ? `<optgroup label="Unfinished drafts">${draftOptions}</optgroup>` : '',
  ].join('')
  select.innerHTML = `<option value="">${options ? 'Choose a book or draft...' : 'No books or drafts available'}</option>${options}`
  const availableValues = [
    ...books.map((book) => `book:${book.id}`),
    ...drafts.map((draft) => `draft:${draft.id}`),
  ]
  if (availableValues.includes(selectedValue)) select.value = selectedValue
  select.disabled = !availableValues.length || state.writer.busy
  button.disabled = state.writer.busy || !select.value
  button.querySelector('span').textContent = select.value.startsWith('draft:') ? 'Resume draft' : 'Load into editor'
  deleteButton.hidden = !select.value.startsWith('draft:')
  deleteButton.disabled = state.writer.busy && select.value === `draft:${state.writer.draftId}`
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

    let cover = null
    let coverError = null
    try {
      cover = await readEpubCover(book)
    } catch (error) {
      coverError = error
    }
    return { chapters, metadata, cover, coverError }
  } finally {
    book.destroy()
  }
}

async function readEpubCover(book) {
  const coverUrl = await book.coverUrl()
  if (!coverUrl) return null
  const response = await fetch(coverUrl)
  if (!response.ok) throw new Error(`The existing cover could not be read (${response.status}).`)
  const blob = await response.blob()
  if (!['image/png', 'image/jpeg'].includes(blob.type)) {
    throw new Error(`The existing cover format "${blob.type || 'unknown'}" is not supported for editing.`)
  }
  return { data: new Uint8Array(await blob.arrayBuffer()), mediaType: blob.type }
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
  $('#mobile-page-title').textContent = view === 'writer' ? 'AI Writer' : 'Library'
}

function showLibrary({ flushDraft = true } = {}) {
  if (state.active) closeReader()
  if (flushDraft) {
    flushWriterAutosave().catch((error) => {
      reportWriterAutosaveError(error)
      showToast('Could not save your unfinished draft. Keep the writing room open and try again.')
    })
  }
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

function isValidPageCount(pageCount) {
  return Number.isSafeInteger(pageCount) && pageCount >= 1
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
  $('#writer-library-loader').hidden = step !== 1
  document.querySelectorAll('[data-wizard-panel]').forEach((panel) => {
    panel.hidden = Number(panel.dataset.wizardPanel) !== step
  })
  document.querySelectorAll('[data-wizard-indicator]').forEach((indicator) => {
    const indicatorStep = Number(indicator.dataset.wizardIndicator)
    indicator.hidden = indicatorStep !== step
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
  $('#generate-cover').disabled = busy
  $('#manuscript-editor').readOnly = busy || state.writer.stage !== 'chapters'
  $('#chapter-prompt').readOnly = busy || state.writer.stage !== 'chapters'
  $('#chapter-workflow').hidden = state.writer.stage !== 'chapters'
  $('#writer-library-book').disabled = busy || (!state.books.length && !state.drafts.length)
  $('#load-library-book').disabled = busy || !$('#writer-library-book').value
  $('#load-library-book').querySelector('span').textContent = $('#writer-library-book').value.startsWith('draft:') ? 'Resume draft' : 'Load into editor'
  const selectedWriterItem = $('#writer-library-book').value
  const selectedDraft = selectedWriterItem.startsWith('draft:')
  $('#delete-writer-draft').hidden = !selectedDraft
  $('#delete-writer-draft').disabled = busy && selectedWriterItem === `draft:${state.writer.draftId}`
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
    id: state.writer.draftId || createUuid(),
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
  if (!state.writer.draftId) state.writer.draftId = createUuid()
  const draft = createWriterDraftRecord()
  await storeRequest('drafts', 'readwrite', (store) => store.put(draft))
  const existingIndex = state.drafts.findIndex((item) => item.id === draft.id)
  if (existingIndex >= 0) state.drafts[existingIndex] = draft
  else state.drafts.push(draft)
  renderWriterLibraryOptions()
  setWriterAutosaveStatus(`Draft saved locally at ${new Date(draft.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`)
  if (!$('#library-screen').hidden) renderLibrary()
}

function reportWriterAutosaveError(error) {
  console.error('Could not autosave the unfinished book.', error)
  setWriterAutosaveStatus('Autosave failed. Keep this page open and try again.', 'error')
}

function trackWriterAutosave(task) {
  writerAutosaveTasks.add(task)
  task.then(
    () => writerAutosaveTasks.delete(task),
    (error) => {
      writerAutosaveTasks.delete(task)
      reportWriterAutosaveError(error)
    },
  )
  return task
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
    trackWriterAutosave(persistWriterDraft())
  }, 650)
}

async function flushWriterAutosave() {
  const hasPendingAutosave = writerAutosaveTimer !== null
  clearTimeout(writerAutosaveTimer)
  writerAutosaveTimer = null
  await Promise.all([...writerAutosaveTasks])
  if (hasPendingAutosave && writerDraftHasContent()) {
    await trackWriterAutosave(persistWriterDraft())
  }
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
  $('#page-count').value = String(isValidPageCount(pageCount) ? pageCount : 8)
  $('#chapter-outline').value = typeof fields.chapterOutline === 'string'
    ? fields.chapterOutline
    : state.writer.outline.map((title, index) => `${index + 1}. ${title}`).join('\n')
  $('#outline-revision-request').value = String(fields.outlineRevisionRequest || '')
  $('#book-title').value = String(fields.bookTitle || '')
  $('#book-author').value = String(fields.bookAuthor || '')
  $('#auto-fill-chapters').checked = Boolean(fields.autoFill)
  $('#cover-input').value = ''
  $('#cover-title-overlay').hidden = true
  $('#cover-placeholder').hidden = false
  $('#cover-preview').removeAttribute('src')
  $('#cover-preview').hidden = true
  $('#remove-cover').hidden = true

  if (state.writer.cover?.data && state.writer.cover.mediaType) {
    state.writer.coverUrl = URL.createObjectURL(new Blob([state.writer.cover.data], { type: state.writer.cover.mediaType }))
    $('#cover-preview').src = state.writer.coverUrl
    $('#cover-preview').hidden = false
    $('#cover-placeholder').hidden = true
    $('#remove-cover').hidden = false
  }
  updateCoverTitleOverlay()

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

function setWriterBusy(busy, mode = '') {
  state.writer.busy = busy
  updateWriterControls()
  $('#generate-button').querySelector('span').textContent = busy && mode === 'outline'
    ? 'Suggesting chapters...'
    : state.writer.outline.length ? 'Regenerate suggestions' : 'Suggest chapters'
  $('#revise-outline').querySelector('span').textContent = busy && mode === 'outline-revision' ? 'Revising suggestions...' : 'Revise suggestions with AI'
  const chapter = state.writer.chapters[state.writer.currentChapter]
  $('#generate-chapter').querySelector('span').textContent = busy && mode === 'chapter' ? 'Writing chapter...' : chapter?.content.trim() ? 'Regenerate chapter' : 'Generate chapter'
  $('#generate-cover').querySelector('span').textContent = busy && mode === 'cover' ? 'Generating cover...' : 'Generate with AI'
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

async function loadSelectedWriterItem() {
  const selection = $('#writer-library-book').value
  const separatorIndex = selection.indexOf(':')
  if (state.writer.busy) return
  if (!selection || separatorIndex < 0) {
    setWriterStatus('Choose a book or draft first.', 'error')
    return
  }

  try {
    await flushWriterAutosave()
  } catch (error) {
    reportWriterAutosaveError(error)
    showToast('Could not save the current draft before loading another.')
    return
  }

  const itemType = selection.slice(0, separatorIndex)
  const itemId = selection.slice(separatorIndex + 1)
  if (itemType === 'draft') {
    const draft = state.drafts.find((item) => item.id === itemId)
    if (!draft) {
      renderWriterLibraryOptions()
      setWriterStatus('That unfinished draft is no longer available.', 'error')
      return
    }
    resumeWriterDraft(draft)
    return
  }
  if (itemType === 'book') {
    await loadLibraryBookIntoWriter(itemId)
    return
  }
  setWriterStatus('Choose a valid book or draft.', 'error')
}

async function deleteSelectedWriterDraft() {
  const selection = $('#writer-library-book').value
  if (!selection.startsWith('draft:')) return

  const draftId = selection.slice('draft:'.length)
  const draft = state.drafts.find((item) => item.id === draftId)
  if (!draft) {
    renderWriterLibraryOptions()
    setWriterStatus('That unfinished draft is no longer available.', 'error')
    return
  }
  if (state.writer.busy && state.writer.draftId === draftId) return
  if (!window.confirm(`Delete the unfinished draft “${draft.title || 'Untitled draft'}”?`)) return

  if (state.writer.draftId === draftId) {
    clearTimeout(writerAutosaveTimer)
    writerAutosaveTimer = null
  }
  try {
    await storeRequest('drafts', 'readwrite', (store) => store.delete(draftId))
  } catch (error) {
    console.error('Could not delete the unfinished draft.', error)
    if (state.writer.draftId === draftId) scheduleWriterAutosave()
    showToast('Could not delete that draft.')
    return
  }

  state.drafts = state.drafts.filter((item) => item.id !== draftId)
  if (state.writer.draftId === draftId) {
    state.writer.draftId = null
    setWriterAutosaveStatus('Draft deleted. Continued edits will create a new autosaved draft.')
  }
  renderWriterLibraryOptions()
  showToast('Draft deleted.')
}

async function loadLibraryBookIntoWriter(recordId) {
  const record = state.books.find((book) => book.id === recordId)
  if (!record) {
    setWriterStatus('Choose a book from your library first.', 'error')
    return
  }

  setWriterBusy(true, 'load-book')
  setWriterStatus(`Loading "${record.title || 'Untitled'}" into the chapter editor...`)
  try {
    const { chapters, metadata, cover, coverError } = await readEpubChapters(record.data)
    if (!chapters.length) throw new Error('No readable chapter text was found in that EPUB.')

    const title = normalizeEpubText(metadata.title) || record.title || 'Untitled'
    const author = normalizeEpubText(metadata.creator) || record.author || ''
    const wordCount = chapters.reduce((total, chapter) => total + chapter.content.split(/\s+/).filter(Boolean).length, 0)
    if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
    state.writer.cover = null
    state.writer.coverUrl = ''
    $('#cover-input').value = ''
    $('#cover-placeholder').hidden = false
    $('#cover-preview').removeAttribute('src')
    $('#cover-preview').hidden = true
    $('#remove-cover').hidden = true
    $('#cover-title-overlay').hidden = true
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
    $('#page-count').value = String(Math.max(1, Math.ceil(wordCount / 200)))
    $('#chapter-outline').value = chapters.map((chapter, index) => `${index + 1}. ${chapter.title}`).join('\n')
    $('#outline-revision-request').value = ''
    $('#auto-fill-chapters').checked = false
    state.writer.outlinePrompt = outlinePromptSignature()
    state.writer.wizardStep = 4
    if (record.coverOriginal?.data && record.coverOriginal.mediaType) {
      setWriterCover(record.coverOriginal.data, record.coverOriginal.mediaType, 'ai')
    } else if (cover) {
      setWriterCover(cover.data, cover.mediaType, 'existing')
    }
    renderCurrentChapter()
    if (coverError) {
      console.error('Could not load the selected book cover into the AI editor.', coverError)
      setWriterStatus(`Loaded "${title}" into the editor, but its existing cover could not be displayed.`)
    } else {
      setWriterStatus(`Loaded "${title}" into the editor. The original remains in your library; saving creates a separate edited copy.`)
    }
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
  try {
    const data = new Uint8Array(await file.arrayBuffer())
    setWriterCover(data, file.type)
    setWriterStatus('Custom cover ready to include in the EPUB.')
  } catch (error) {
    setWriterStatus(error.message || 'The cover image could not be read.', 'error')
  }
}

function setWriterCover(data, mediaType, source = 'upload') {
  const coverData = data instanceof Uint8Array ? data : new Uint8Array(data)
  const previewUrl = URL.createObjectURL(new Blob([coverData], { type: mediaType }))
  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  state.writer.cover = { data: coverData, mediaType, source }
  state.writer.coverUrl = previewUrl
  $('#cover-preview').src = previewUrl
  $('#cover-preview').hidden = false
  $('#cover-placeholder').hidden = true
  $('#remove-cover').hidden = false
  updateCoverTitleOverlay()
  scheduleWriterAutosave()
}

function updateCoverTitleOverlay() {
  const overlay = $('#cover-title-overlay')
  const title = $('#book-title').value.trim()
  const showTitle = state.writer.cover?.source === 'ai' && Boolean(title)
  overlay.textContent = showTitle ? title : ''
  overlay.hidden = !showTitle
}

async function createTitledCover(cover, title) {
  if (cover?.source !== 'ai' || !title.trim()) return cover

  const imageUrl = URL.createObjectURL(new Blob([cover.data], { type: cover.mediaType }))
  const image = new Image()
  try {
    await new Promise((resolve, reject) => {
      image.onload = resolve
      image.onerror = () => reject(new Error('Could not prepare the AI cover for its title.'))
      image.src = imageUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not prepare the AI cover for its title.')
    context.drawImage(image, 0, 0)

    const titleWidth = canvas.width * 0.84
    let fontSize = Math.max(18, Math.round(canvas.width * 0.075))
    let lines = []
    while (fontSize >= 14) {
      context.font = `600 ${fontSize}px Georgia, serif`
      lines = []
      for (const word of title.trim().split(/\s+/)) {
        const currentLine = lines[lines.length - 1]
        const candidate = currentLine ? `${currentLine} ${word}` : word
        if (currentLine && context.measureText(candidate).width > titleWidth) lines.push(word)
        else if (currentLine) lines[lines.length - 1] = candidate
        else lines.push(word)
      }
      if (lines.length * fontSize * 1.15 <= canvas.height * 0.34) break
      fontSize -= 2
    }

    const gradient = context.createLinearGradient(0, canvas.height * 0.55, 0, canvas.height)
    gradient.addColorStop(0, 'rgba(10, 16, 13, 0)')
    gradient.addColorStop(0.35, 'rgba(10, 16, 13, 0.32)')
    gradient.addColorStop(1, 'rgba(10, 16, 13, 0.82)')
    context.fillStyle = gradient
    context.fillRect(0, canvas.height * 0.55, canvas.width, canvas.height * 0.45)
    context.font = `600 ${fontSize}px Georgia, serif`
    context.textAlign = 'center'
    context.textBaseline = 'alphabetic'
    context.fillStyle = '#fffdf7'
    context.shadowColor = 'rgba(0, 0, 0, 0.45)'
    context.shadowBlur = fontSize * 0.12
    const lineHeight = fontSize * 1.15
    const firstLineY = canvas.height * 0.92 - (lines.length - 1) * lineHeight
    lines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, firstLineY + index * lineHeight, titleWidth)
    })

    const output = await new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not export the titled AI cover.'))
      }, 'image/png')
    })
    return { data: new Uint8Array(await output.arrayBuffer()), mediaType: 'image/png' }
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

async function generateWriterCover() {
  const apiKey = $('#openrouter-key').value.trim()
  const title = $('#book-title').value.trim()
  const author = $('#book-author').value.trim()
  const topic = $('#book-topic').value.trim()
  if (!apiKey) {
    setWriterStatus('Add your OpenRouter API key to generate a cover.', 'error')
    $('#openrouter-key').focus()
    return
  }
  if (!title) {
    setWriterStatus('Add a book title before generating its cover.', 'error')
    $('#book-title').focus()
    return
  }

  const chapterTitles = state.writer.chapters.map((chapter) => chapter.title).filter(Boolean).join('; ')
  const prompt = `Create an original, polished photographic front-cover image for a book titled "${title}"${author ? ` by ${author}` : ''}. Use this book idea and mood as visual inspiration: ${topic || chapterTitles || title}. ${chapterTitles ? `Chapter themes: ${chapterTitles}.` : ''} Make it a striking portrait composition with a clear focal subject that remains legible as a small thumbnail. No text, lettering, typography, logos, borders, or book mockups.`

  setWriterBusy(true, 'cover')
  setWriterStatus('Generating a cover with FLUX 3 Image Klein...')
  try {
    const cover = await generateOpenRouterImage({ apiKey, prompt })
    setWriterCover(cover.data, cover.mediaType, 'ai')
    setWriterStatus('AI cover generated. Save the book to include it in your EPUB.')
  } catch (error) {
    console.error('Could not generate an AI cover.', error)
    setWriterStatus(error instanceof Error ? error.message : 'Could not generate an AI cover.', 'error')
  } finally {
    setWriterBusy(false)
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
  if (!model || !topic || !isValidPageCount(pages)) {
    setWriterStatus('Enter a book idea and a positive whole-number page count.', 'error')
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
  if (!model || !topic || !isValidPageCount(pages)) {
    setWriterStatus('Enter a book idea and a positive whole-number page count.', 'error')
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
  if (!apiKey || !model || !topic || !isValidPageCount(pages)) {
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
  await Promise.all([...writerAutosaveTasks].map((task) => task.catch(() => {})))
  const title = $('#book-title').value.trim()
  const author = $('#book-author').value.trim() || 'Leaf reader'
  const manuscript = `# ${title}\n\n${state.writer.chapters
    .filter((chapter) => chapter.content.trim())
    .map((chapter) => `## ${chapter.title}\n\n${chapter.content.trim()}`)
    .join('\n\n')}`
  if (!title || !manuscript) return

  const id = state.writer.savedBookId || createUuid()
  const existing = state.books.find((book) => book.id === id)
  const cover = await createTitledCover(state.writer.cover, title)
  const data = createEpub({ title, author, manuscript, cover })
  const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leaf-book'}.epub`
  const record = {
    id,
    title,
    author,
    fileName,
    data,
    addedAt: existing?.addedAt || Date.now(),
    source: 'ai',
    ...(state.writer.cover?.source === 'ai'
      ? { coverOriginal: { data: state.writer.cover.data, mediaType: state.writer.cover.mediaType } }
      : {}),
  }
  await storeRequest('books', 'readwrite', (store) => store.put(record))
  if (existing) {
    await storeRequest('progress', 'readwrite', (store) => store.delete(id))
    state.progress = state.progress.filter((item) => item.id !== id)
    state.books = state.books.map((book) => book.id === id ? record : book)
  } else {
    state.books.push(record)
  }
  state.writer.savedBookId = id
  state.writer.wizardStep = 1
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
      id: createUuid(),
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
    const reason = error instanceof Error ? error.message : String(error)
    showToast(reason ? `Could not import EPUB: ${reason}` : 'That EPUB could not be opened. Try another file.')
    console.error(error)
  } finally {
    input.value = ''
  }
}

function turnActivePage(direction) {
  const rendition = state.active?.rendition
  if (!rendition) return
  const navigation = direction === 'prev' ? rendition.prev() : rendition.next()
  navigation.catch((error) => console.error('[Leaf page-turn] Navigation failed.', error))
}

function cancelBookPageCount(active) {
  active.pageCountToken += 1
  clearTimeout(active.pageCountTimer)
  active.pageCountObserver?.disconnect()
  if (active.pageCountResizeHandler) window.removeEventListener('resize', active.pageCountResizeHandler)
}

function requestBookPageCount() {
  const active = state.active
  if (!active || $('#reader-screen').hidden) return
  active.pageCountToken += 1
  const token = active.pageCountToken
  clearTimeout(active.pageCountTimer)
  active.pageCountOffsets = null
  active.pageCountTotal = null
  $('#page-count-label').textContent = '— / —'
  $('#page-count-label').setAttribute('aria-label', 'Counting pages in this book')
  $('#page-count-label').title = 'Counting pages in this book'
  active.pageCountTimer = setTimeout(() => {
    active.pageCountQueue = active.pageCountQueue.then(() => measureBookPageCount(active, token)).catch((error) => {
      if (state.active === active && active.pageCountToken === token) {
        $('#page-count-label').textContent = '— / —'
        $('#page-count-label').setAttribute('aria-label', 'Book page count unavailable')
        $('#page-count-label').title = 'Book page count unavailable'
      }
      console.error('Could not count pages in the EPUB.', error)
    })
  }, 300)
}

async function measureBookPageCount(active, token) {
  if (state.active !== active || active.pageCountToken !== token) return
  const readerFrame = $('#epub-frame')
  const width = readerFrame.clientWidth
  const height = readerFrame.clientHeight
  if (width < 1 || height < 1) return

  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  Object.assign(container.style, {
    position: 'fixed',
    left: '-100000px',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    overflow: 'hidden',
    visibility: 'hidden',
    pointerEvents: 'none',
  })
  document.body.append(container)

  let measurementBook
  try {
    measurementBook = ePub(active.record.data)
    await measurementBook.ready
    measurementBook.spine.hooks.content.register((document) => {
      document.querySelectorAll('script').forEach((script) => script.remove())
    })
    const measurementRendition = measurementBook.renderTo(container, {
      width,
      height,
      spread: 'none',
      flow: 'paginated',
      allowScriptedContent: false,
    })
    applyRenditionReaderTheme(measurementRendition, state.readerPreferences)
    const sections = measurementBook.spine.spineItems.filter((section) => section.href)
    if (!sections.length) throw new Error('The EPUB contains no readable sections.')

    const pageOffsets = new Array(measurementBook.spine.spineItems.length)
    let totalPages = 0
    for (const section of sections) {
      if (state.active !== active || active.pageCountToken !== token) return
      await measurementRendition.display(section.index)
      const location = await measurementRendition.currentLocation()
      const pages = Number(location?.start?.displayed?.total)
      if (location?.start?.index !== section.index || !Number.isInteger(pages) || pages < 1) {
        throw new Error(`Could not determine the page count for EPUB section ${section.href}.`)
      }
      pageOffsets[section.index] = totalPages
      totalPages += pages
      await new Promise((resolve) => setTimeout(resolve, 0))
    }

    if (state.active !== active || active.pageCountToken !== token) return
    active.pageCountOffsets = pageOffsets
    active.pageCountTotal = totalPages
    updateReadingPosition(await active.rendition.currentLocation())
  } finally {
    try {
      measurementBook?.destroy()
    } finally {
      container.remove()
    }
  }
}

async function openBook(id) {
  const record = state.books.find((book) => book.id === id)
  if (!record) return
  clearReaderUiTimer()
  if (state.active) {
    cancelBookPageCount(state.active)
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
  state.active = {
    book,
    rendition,
    record,
    pageCountOffsets: null,
    pageCountTotal: null,
    pageCountToken: 0,
    pageCountTimer: null,
    pageCountQueue: Promise.resolve(),
    pageCountObserver: null,
    pageCountResizeHandler: null,
  }
  const pageDocuments = new WeakSet()
  const readerFrame = $('#epub-frame')
  const turnPage = (direction) => {
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
  }
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
    let touchStart = null
    let suppressedTouchClick = null
    pageDocument.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) {
        touchStart = null
        return
      }
      const touch = event.touches[0]
      touchStart = { x: touch.clientX, y: touch.clientY }
    }, { capture: true, passive: true })
    pageDocument.addEventListener('touchmove', (event) => {
      if (!touchStart) return
      if (event.touches.length !== 1) {
        touchStart = null
        return
      }
      const touch = event.touches[0]
      const deltaX = touch.clientX - touchStart.x
      const deltaY = touch.clientY - touchStart.y
      if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
        event.preventDefault()
      }
    }, { capture: true, passive: false })
    pageDocument.addEventListener('touchend', (event) => {
      if (!touchStart) return
      const start = touchStart
      touchStart = null
      const touch = event.changedTouches[0]
      if (!touch) return
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      const swipeThreshold = Math.max(32, readerFrame.clientWidth * 0.08)
      let direction
      if (Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX < 0 ? 'next' : 'prev'
      } else if (Math.abs(deltaX) <= 12 && Math.abs(deltaY) <= 12) {
        const readerBounds = readerFrame.getBoundingClientRect()
        const iframeBounds = pageFrame.getBoundingClientRect()
        const coordinateScale = pageFrame.clientWidth ? iframeBounds.width / pageFrame.clientWidth : 1
        const tapX = iframeBounds.left + touch.clientX * coordinateScale - readerBounds.left
        direction = tapX < readerBounds.width / 2 ? 'prev' : 'next'
      }
      if (!direction) return
      suppressedTouchClick = { x: touch.clientX, y: touch.clientY, expiresAt: Date.now() + 500 }
      turnPage(direction)
    }, { capture: true, passive: true })
    pageDocument.addEventListener('touchcancel', () => {
      touchStart = null
    }, { capture: true, passive: true })
    pageDocument.addEventListener('click', (event) => {
      if (suppressedTouchClick) {
        const { x, y, expiresAt } = suppressedTouchClick
        suppressedTouchClick = null
        if (Date.now() < expiresAt && Math.abs(event.clientX - x) < 32 && Math.abs(event.clientY - y) < 32) return
      }
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
      turnPage(direction)
    })
  })
  $('#reader-title').textContent = record.title
  $('#reader-author').textContent = record.author || ''
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
  if (typeof ResizeObserver === 'function') {
    const pageCountObserver = new ResizeObserver(requestBookPageCount)
    pageCountObserver.observe(readerFrame)
    state.active.pageCountObserver = pageCountObserver
  } else {
    state.active.pageCountResizeHandler = requestBookPageCount
    window.addEventListener('resize', requestBookPageCount)
  }
  requestBookPageCount()
  showReaderUi()
  book.locations.generate(1000).then(() => {
    if (state.active?.record.id === id) updateReadingPosition(rendition.currentLocation())
  }).catch((error) => {
    console.error('Could not generate EPUB reading locations.', error)
  })
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
        <span>${escapeHtml(bookmark.chapter || 'Reading')}</span><small>${Number.isFinite(bookmark.percentage) ? `${bookmark.percentage}%` : '—%'}</small>
      </button>
      <button class="icon-button bookmark-remove" type="button" data-bookmark-remove="${escapeHtml(bookmark.id)}" aria-label="Remove bookmark" title="Remove bookmark"><i data-lucide="x"></i></button>
    </div>`).join('') || '<p class="toc-empty">No bookmarks in this book yet.</p>'
  icons()
  syncBookmarkButton(state.active.rendition.currentLocation()?.start?.cfi)
}

function syncBookmarkButton(cfi) {
  const isBookmarked = Boolean(state.active && state.bookmarks.some((bookmark) => bookmark.bookId === state.active.record.id && bookmark.cfi === cfi))
  const button = $('#bookmark-current')
  const label = isBookmarked ? 'Remove bookmark from this page' : 'Bookmark this page'
  button.title = label
  button.setAttribute('aria-label', label)
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
    const percentage = Number.parseFloat($('#progress-label').textContent)
    const bookmark = {
      id: createUuid(),
      bookId: state.active.record.id,
      cfi,
      chapter: $('#chapter-label').textContent,
      percentage: Number.isFinite(percentage) ? percentage : null,
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
  const displayed = location.start.displayed
  const pageCount = $('#page-count-label')
  const page = Number(displayed?.page)
  const pageOffset = state.active.pageCountOffsets?.[location.start.index]
  const totalPages = state.active.pageCountTotal
  let bookPage = null
  if (Number.isInteger(page) && page > 0 && Number.isInteger(pageOffset) && Number.isInteger(totalPages) && totalPages > 0) {
    bookPage = pageOffset + page
    pageCount.textContent = `${bookPage} / ${totalPages}`
    pageCount.setAttribute('aria-label', `Book page ${bookPage} of ${totalPages}`)
    pageCount.title = `Book page ${bookPage} of ${totalPages}`
  } else {
    pageCount.textContent = '— / —'
    if (totalPages !== null) {
      pageCount.setAttribute('aria-label', 'Book page count unavailable')
      pageCount.title = 'Book page count unavailable'
    }
  }
  const fraction = bookPage !== null
    ? bookPage / totalPages
    : book.locations.length()
      ? book.locations.percentageFromCfi(location.start.cfi)
      : location.start.percentage
  const precisionBase = Number.isInteger(totalPages) && totalPages > 0 ? totalPages : book.locations.length()
  const percentageDigits = Math.max(0, Math.ceil(Math.log10(precisionBase / 100)))
  const percentage = Number.isFinite(fraction)
    ? Number((Math.max(0, Math.min(1, fraction)) * 100).toFixed(percentageDigits))
    : null
  $('#progress-fill').style.width = `${percentage ?? 0}%`
  $('#progress-label').textContent = percentage === null ? '—%' : `${percentage.toFixed(percentageDigits)}%`
  $('#chapter-label').textContent = location.start.href?.split('#')[0]?.split('/').pop()?.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Reading'
  syncBookmarkButton(location.start.cfi)
  clearTimeout(saveTimer)
  if (percentage === null) return
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
  if (['fontSize', 'font', 'lineHeight'].includes(name)) requestBookPageCount()
}

function setReaderSettingsOpen(open) {
  $('#reader-settings').hidden = !open
  $('#reader-settings-button').setAttribute('aria-expanded', String(open))
  if (open) {
    clearTimeout(readerUiTimer)
    readerUiTimer = null
    $('#reader-screen').classList.remove('reader-screen--ui-hidden')
  } else {
    scheduleReaderUiHide()
  }
}

function applyReaderTheme() {
  const preferences = state.readerPreferences
  const colors = readerThemes[preferences.theme]
  $('#reader-font-size').value = preferences.fontSize
  $('#reader-font-size-value').textContent = `${preferences.fontSize}%`
  $('#reader-font-family').value = preferences.font
  $('#reader-line-height').value = String(preferences.lineHeight)
  const preview = $('#reader-font-preview')
  const previewText = $('#reader-font-preview-text')
  preview.style.setProperty('--reader-preview-background', colors.background)
  preview.style.setProperty('--reader-preview-color', colors.color)
  previewText.style.fontFamily = readerFonts[preferences.font]
  previewText.style.fontSize = `${preferences.fontSize}%`
  previewText.style.lineHeight = String(preferences.lineHeight)
  document.querySelectorAll('[data-reader-theme]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.readerTheme === preferences.theme))
  })
  const screen = $('#reader-screen')
  screen.dataset.theme = preferences.theme
  screen.style.setProperty('--reader-app-background', colors.background)
  screen.style.setProperty('--reader-toolbar-background', colors.background)
  screen.style.setProperty('--reader-paper-background', colors.background)
  screen.style.setProperty('--reader-frame-border', colors.background)
  screen.dataset.themeMode = colors.dark ? 'dark' : 'light'
  if (!state.active) return
  applyRenditionReaderTheme(state.active.rendition, preferences)
}

function applyRenditionReaderTheme(rendition, preferences) {
  const colors = readerThemes[preferences.theme]
  rendition.themes.default({
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
      'touch-action': 'pan-y !important',
    },
  })
  rendition.themes.fontSize(`${preferences.fontSize}%`)
}

function closeReader() {
  clearReaderUiTimer()
  if (state.active) {
    cancelBookPageCount(state.active)
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

function showReaderUi() {
  const screen = $('#reader-screen')
  if (!state.active || screen.hidden) return
  screen.classList.remove('reader-screen--ui-hidden')
  scheduleReaderUiHide()
}

function readerNavigationPanelOpen() {
  return !$('#reader-settings').hidden || !$('#toc-panel').hidden || !$('#bookmark-panel').hidden
}

function scheduleReaderUiHide() {
  clearTimeout(readerUiTimer)
  readerUiTimer = null
  if (!state.active || $('#reader-screen').hidden || readerNavigationPanelOpen()) return
  readerUiTimer = setTimeout(hideReaderUi, 3000)
}

function hideReaderUi() {
  readerUiTimer = null
  const screen = $('#reader-screen')
  if (!state.active || screen.hidden || readerNavigationPanelOpen()) return
  $('#toc-panel').hidden = true
  $('#bookmark-panel').hidden = true
  $('#bookmarks-button').setAttribute('aria-expanded', 'false')
  screen.classList.add('reader-screen--ui-hidden')
}

function clearReaderUiTimer() {
  clearTimeout(readerUiTimer)
  readerUiTimer = null
  $('#reader-screen').classList.remove('reader-screen--ui-hidden')
}

$('#library-nav').addEventListener('click', showLibrary)
$('#writer-nav').addEventListener('click', showWriter)
$('#writer-library-book').addEventListener('change', updateWriterControls)
$('#load-library-book').addEventListener('click', () => loadSelectedWriterItem())
$('#delete-writer-draft').addEventListener('click', () => deleteSelectedWriterDraft())
$('#wizard-back').addEventListener('click', returnToPreviousWriterStep)
$('#wizard-next').addEventListener('click', continueWriterWorkflow)
$('#generate-button').addEventListener('click', () => requestDraft('outline'))
$('#revise-outline').addEventListener('click', () => reviseOutline())
$('#generate-chapter').addEventListener('click', () => requestDraft('chapter'))
$('#save-draft').addEventListener('click', async () => {
  try {
    await saveDraft()
    showLibrary({ flushDraft: false })
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
  updateCoverTitleOverlay()
  scheduleWriterAutosave()
})
$('#book-author').addEventListener('input', scheduleWriterAutosave)
$('#auto-fill-chapters').addEventListener('change', scheduleWriterAutosave)
$('#cover-input').addEventListener('change', (event) => selectCover(event.target.files[0]))
$('#generate-cover').addEventListener('click', generateWriterCover)
$('#remove-cover').addEventListener('click', () => {
  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  state.writer.cover = null
  state.writer.coverUrl = ''
  $('#cover-input').value = ''
  $('#cover-title-overlay').hidden = true
  $('#cover-placeholder').hidden = false
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
  const download = event.target.closest('[data-download]')
  if (download) {
    const book = state.books.find((item) => item.id === download.dataset.download)
    if (!book) {
      showToast('That book is no longer in your library.')
      return
    }
    try {
      downloadBook(book)
      showToast('Your EPUB download has started.')
    } catch (error) {
      console.error('Could not download the book from your library.', error)
      showToast('Could not download that book.')
    }
    return
  }

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
$('#back-button').addEventListener('click', closeReader)
$('#reader-prev-page').addEventListener('click', () => turnActivePage('prev'))
$('#reader-next-page').addEventListener('click', () => turnActivePage('next'))
$('#reader-prev-zone').addEventListener('click', () => turnActivePage('prev'))
$('#reader-next-zone').addEventListener('click', () => turnActivePage('next'))
const readerStage = $('.reader-stage')
let readerTouchStart = null
let suppressedReaderTap = null
readerStage.addEventListener('touchstart', (event) => {
  suppressedReaderTap = null
  if (event.touches.length !== 1) {
    readerTouchStart = null
    return
  }
  const touch = event.touches[0]
  readerTouchStart = { x: touch.clientX, y: touch.clientY }
}, { passive: true })
readerStage.addEventListener('touchmove', (event) => {
  if (!readerTouchStart) return
  if (event.touches.length !== 1) {
    readerTouchStart = null
    return
  }
  const touch = event.touches[0]
  const deltaX = touch.clientX - readerTouchStart.x
  const deltaY = touch.clientY - readerTouchStart.y
  if (Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY) && event.cancelable) {
    event.preventDefault()
  }
}, { passive: false })
readerStage.addEventListener('touchend', (event) => {
  if (!readerTouchStart) return
  const start = readerTouchStart
  readerTouchStart = null
  const touch = event.changedTouches[0]
  if (!touch) return
  const deltaX = touch.clientX - start.x
  const deltaY = touch.clientY - start.y
  const swipeThreshold = Math.max(32, readerStage.clientWidth * 0.08)
  if (Math.abs(deltaX) < swipeThreshold || Math.abs(deltaX) <= Math.abs(deltaY)) return

  suppressedReaderTap = { x: touch.clientX, y: touch.clientY, expiresAt: Date.now() + 500 }
  turnActivePage(deltaX < 0 ? 'next' : 'prev')
}, { passive: true })
readerStage.addEventListener('touchcancel', () => {
  readerTouchStart = null
}, { passive: true })
readerStage.addEventListener('click', (event) => {
  if (!suppressedReaderTap) return
  const { x, y, expiresAt } = suppressedReaderTap
  suppressedReaderTap = null
  if (Date.now() >= expiresAt || Math.abs(event.clientX - x) >= 32 || Math.abs(event.clientY - y) >= 32) return
  event.preventDefault()
  event.stopImmediatePropagation()
}, true)
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
  requestBookPageCount()
})
$('#reader-font-size').addEventListener('input', (event) => setReaderPreference('fontSize', Number(event.target.value)))
$('#reader-font-family').addEventListener('change', (event) => setReaderPreference('font', event.target.value))
$('#reader-line-height').addEventListener('change', (event) => setReaderPreference('lineHeight', Number(event.target.value)))
$('#reader-settings').addEventListener('click', (event) => {
  const theme = event.target.closest('[data-reader-theme]')
  if (theme) setReaderPreference('theme', theme.dataset.readerTheme)
})
const readerScreen = $('#reader-screen')
;['pointerdown', 'touchstart', 'click', 'keydown', 'input', 'change'].forEach((eventName) => {
  readerScreen.addEventListener(eventName, showReaderUi, { passive: eventName === 'touchstart' })
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