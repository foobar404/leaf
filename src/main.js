import ePub, { EpubCFI } from 'epubjs'
import {
  createIcons,
  AlignLeft,
  BookOpen,
  BookPlus,
  Bookmark,
  BookmarkCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Gauge,
  Headphones,
  Highlighter,
  Languages,
  Library,
  ListPlus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide'
import { generateOpenRouterImage, streamOpenRouter, synthesizeOpenRouterSpeech } from './ai.js'
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  Gauge,
  Headphones,
  Highlighter,
  Languages,
  Library,
  ListPlus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Square,
  SlidersHorizontal,
  Trash2,
  X,
}

const readerPreferenceDefaults = { fontSize: 100, font: 'serif', lineHeight: 1.75, theme: 'paper-white', aiBackgroundOpacity: 30, aiBackgroundMode: 'light' }
const readerPageTurnThrottleMs = 300
const aiStoryReaderTheme = 'ai-story-background'
const chapterDraftChunkCharacterLimit = 8000
const chapterDraftChunkWordLimit = 1000
const chapterPriorContextCharacterLimit = 3000
const aiStoryThemeModes = {
  light: { background: '#F4EBD9', color: '#342D22' },
  dark: { background: '#1E2024', color: '#E9E6DF', dark: true },
}
const readerFonts = {
  serif: 'Georgia, serif',
  soft: 'Palatino Linotype, Book Antiqua, Palatino, serif',
  sans: 'Arial, Helvetica, sans-serif',
  garamond: 'Garamond, Georgia, serif',
  bookman: 'Bookman Old Style, Georgia, serif',
  verdana: 'Verdana, Geneva, sans-serif',
  trebuchet: 'Trebuchet MS, sans-serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  segoe: '"Segoe UI", Tahoma, sans-serif',
  helvetica: 'Helvetica, Arial, sans-serif',
  roboto: 'Roboto, "Noto Sans", Arial, sans-serif',
  tahoma: 'Tahoma, Geneva, sans-serif',
  openSans: '"Open Sans", "Segoe UI", sans-serif',
}
const readerThemeImages = {
  parchment: new URL(`${import.meta.env.BASE_URL}reader-themes/parchment-fibers.svg`, window.location.href).href,
  botanical: new URL(`${import.meta.env.BASE_URL}reader-themes/botanical-paper.svg`, window.location.href).href,
  linen: new URL(`${import.meta.env.BASE_URL}reader-themes/linen-weave.svg`, window.location.href).href,
  watercolor: new URL(`${import.meta.env.BASE_URL}reader-themes/watercolor-wash.svg`, window.location.href).href,
  recycled: new URL(`${import.meta.env.BASE_URL}reader-themes/recycled-paper.svg`, window.location.href).href,
  cotton: new URL(`${import.meta.env.BASE_URL}reader-themes/cotton-paper.svg`, window.location.href).href,
  newsprint: new URL(`${import.meta.env.BASE_URL}reader-themes/newsprint-paper.svg`, window.location.href).href,
  rice: new URL(`${import.meta.env.BASE_URL}reader-themes/rice-paper.svg`, window.location.href).href,
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
  'sunset-gradient': { background: '#F1D9D1', color: '#382D35', backgroundGradient: 'linear-gradient(135deg, #F6DED0 0%, #F0C8B8 48%, #D9C8E8 100%)' },
  'ocean-gradient': { background: '#DCE9EC', color: '#26373B', backgroundGradient: 'linear-gradient(135deg, #DCE9EC 0%, #BBD8D7 50%, #B9C9E5 100%)' },
  'meadow-gradient': { background: '#E4EBD9', color: '#2D382D', backgroundGradient: 'linear-gradient(135deg, #EEF0DC 0%, #D2E4CE 52%, #B9D9D0 100%)' },
  'aurora-gradient': { background: '#26313E', color: '#F0EDF1', dark: true, backgroundGradient: 'linear-gradient(135deg, #1C2D40 0%, #31535B 52%, #54344F 100%)' },
  'blush-gradient': { background: '#F4DDE4', color: '#3D2835', backgroundGradient: 'linear-gradient(135deg, #FCE8EC 0%, #EDC2D5 52%, #D7C7F3 100%)' },
  'citrus-gradient': { background: '#F4E5B6', color: '#3B3320', backgroundGradient: 'linear-gradient(135deg, #FFF1BD 0%, #F3CF8B 48%, #C6DEBD 100%)' },
  'rosewood-gradient': { background: '#EAD8CC', color: '#392B2B', backgroundGradient: 'linear-gradient(135deg, #F3E2D4 0%, #D6B2A2 48%, #8D879D 100%)' },
  'glacier-gradient': { background: '#DCEBF2', color: '#26343D', backgroundGradient: 'linear-gradient(135deg, #EAF5F8 0%, #B4D9E5 50%, #C8C1E2 100%)' },
  'parchment-grain': { background: '#F4EBD9', color: '#342D22', backgroundImage: readerThemeImages.parchment },
  'botanical-paper': { background: '#EDF2E7', color: '#29342C', backgroundImage: readerThemeImages.botanical },
  'linen-weave': { background: '#F0ECE2', color: '#302D28', backgroundImage: readerThemeImages.linen },
  'watercolor-wash': { background: '#F3E9E4', color: '#352D32', backgroundImage: readerThemeImages.watercolor },
  'recycled-paper': { background: '#F3EFDF', color: '#332F28', backgroundImage: readerThemeImages.recycled },
  'cotton-paper': { background: '#F5F0E8', color: '#39332D', backgroundImage: readerThemeImages.cotton },
  [aiStoryReaderTheme]: { background: '#F4EBD9', color: '#342D22', aiStory: true },
  'lemon-cream': { background: '#FAF3CE', color: '#38311B' },
  'terracotta-paper': { background: '#F2DDD3', color: '#462D25' },
  'soft-charcoal': { background: '#1E2024', color: '#E9E6DF', dark: true },
  'true-night': { background: '#121212', color: '#EAE7E2', dark: true },
  'midnight-navy': { background: '#27313E', color: '#ECEFF4', dark: true },
  'forest-night': { background: '#2C332B', color: '#E8EBE4', dark: true },
  'midnight-plum': { background: '#332F36', color: '#EEEAF0', dark: true },
  'deep-ocean': { background: '#283435', color: '#E5ECEB', dark: true },
  'storm-slate': { background: '#353F4E', color: '#EFF3F8', dark: true },
  'burgundy-night': { background: '#33232D', color: '#F2E8ED', dark: true },
  'newsprint-paper': { background: '#F1EEE5', color: '#34312B', backgroundImage: readerThemeImages.newsprint },
  'rice-paper': { background: '#F4F0E4', color: '#342F28', backgroundImage: readerThemeImages.rice },
}
const coverArtStyles = {
  photographic: 'photographic',
  illustrated: 'editorial illustration',
  watercolor: 'watercolor illustration',
  minimalist: 'minimalist graphic design',
  oilPainting: 'expressive oil painting with visible painterly brushwork',
  digitalPainting: 'polished digital painting with rich colors and detailed brushwork',
  threeDimensional: 'polished 3D illustration with dimensional materials and cinematic lighting',
  artDeco: 'elegant Art Deco illustration with refined geometric ornament',
  graphicNovel: 'graphic-novel illustration with expressive ink lines',
  surrealist: 'surrealist fine-art painting',
  geometric: 'geometric vector illustration',
  inkWash: 'expressive ink-wash painting',
}
const legacyCoverArtStyleAliases = {
  linocut: 'digitalPainting',
  collage: 'digitalPainting',
  engraving: 'oilPainting',
  paperCut: 'threeDimensional',
}
const coverMoods = {
  serene: 'serene and contemplative',
  whimsical: 'whimsical and playful',
  mysterious: 'mysterious and atmospheric',
  dramatic: 'dramatic and cinematic',
  hopeful: 'hopeful and uplifting',
  romantic: 'romantic and tender',
  eerie: 'eerie and uncanny',
  adventurous: 'adventurous and exploratory',
  nostalgic: 'nostalgic and wistful',
  melancholic: 'melancholic and reflective',
  cozy: 'cozy and intimate',
  dreamlike: 'dreamlike and ethereal',
  triumphant: 'triumphant and awe-inspiring',
  suspenseful: 'tense and suspenseful',
}
const coverDesignVariations = [
  {
    composition: 'a close-up symbolic object with dramatic cropped framing',
    palette: 'deep jewel tones with one luminous accent',
    typography: 'a refined high-contrast serif title with a small author credit',
  },
  {
    composition: 'a tiny lone figure against a vast atmospheric landscape',
    palette: 'misty cool blues and quiet silver highlights',
    typography: 'an airy modern sans-serif title with generous spacing',
  },
  {
    composition: 'a layered double-exposure portrait with scenery inside the silhouette',
    palette: 'muted earth tones with a warm copper accent',
    typography: 'an elegant editorial serif title placed in clear negative space',
  },
  {
    composition: 'an overhead still life of meaningful objects from the story',
    palette: 'rich botanical greens, parchment, and restrained gold',
    typography: 'a compact uppercase title with understated author lettering',
  },
  {
    composition: 'a sweeping diagonal arrangement that suggests motion and discovery',
    palette: 'vivid complementary colors with bold light-dark contrast',
    typography: 'a confident condensed display title with a discreet author line',
  },
  {
    composition: 'a split scene contrasting two places or emotional states',
    palette: 'a deliberate split between warm amber and cool indigo',
    typography: 'an asymmetric title block aligned to one side of the composition',
  },
  {
    composition: 'a monumental silhouette surrounded by intricate tiny details',
    palette: 'near-black shadows with vivid jewel-like highlights',
    typography: 'a dramatic classic serif title with a quiet author credit',
  },
  {
    composition: 'a luminous doorway or window framing an unexpected world',
    palette: 'soft twilight violet, rose, and pale gold',
    typography: 'a graceful literary serif title with a modest author line',
  },
  {
    composition: 'an intimate character portrait with an unusual point of view',
    palette: 'restrained neutrals with one saturated focal color',
    typography: 'a clean contemporary title treatment with balanced spacing',
  },
  {
    composition: 'an asymmetrical collage of overlapping foreground layers',
    palette: 'a tactile mix of faded ink, cream, and bright vermilion',
    typography: 'a distinctive hand-cut inspired title with clearly printed lettering',
  },
]
let previousCoverDesignVariation = null

function chooseCoverDesignVariation() {
  const choices = coverDesignVariations.filter((variation) => variation !== previousCoverDesignVariation)
  const variation = choices[Math.floor(Math.random() * choices.length)]
  previousCoverDesignVariation = variation
  return variation
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
    const aiBackgroundOpacity = Number(preferences.aiBackgroundOpacity)
    return {
      fontSize: Number.isFinite(size) ? Math.min(200, Math.max(50, size)) : readerPreferenceDefaults.fontSize,
      font: Object.hasOwn(readerFonts, preferences.font) ? preferences.font : readerPreferenceDefaults.font,
      lineHeight: [1.5, 1.75, 2].includes(lineHeight) ? lineHeight : readerPreferenceDefaults.lineHeight,
      aiBackgroundOpacity: Number.isFinite(aiBackgroundOpacity)
        ? Math.min(100, Math.max(0, aiBackgroundOpacity))
        : readerPreferenceDefaults.aiBackgroundOpacity,
      aiBackgroundMode: Object.hasOwn(aiStoryThemeModes, preferences.aiBackgroundMode)
        ? preferences.aiBackgroundMode
        : readerPreferenceDefaults.aiBackgroundMode,
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
const aiAuthorAliases = [
  'Avery Wren',
  'Rowan Hart',
  'Mira Vale',
  'Ellis Marlowe',
  'Arden Quinn',
  'Sloane Rivers',
  'Willa North',
  'Elliot Ash',
  'Hazel Blythe',
  'Theo Everly',
  'Celeste Rowan',
  'Jules Mercer',
  'Remy Solace',
  'Morgan Bell',
  'Elian Frost',
  'Sage Whitmore',
  'Talia Brook',
  'August Bell',
  'Noa Sterling',
  'Lena Hollis',
]

function randomAiAuthorAlias() {
  return aiAuthorAliases[Math.floor(Math.random() * aiAuthorAliases.length)]
}

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
    chapterPromptScope: 'current',
    chapterGenerationController: null,
    allChapterPrompt: '',
    suggestedTitle: '',
    cover: null,
    coverUrl: '',
    coverCandidate: null,
    coverCandidateUrl: '',
  }
}

const state = {
  books: [],
  drafts: [],
  progress: [],
  bookmarks: [],
  highlights: [],
  active: null,
  readerPreferences: loadReaderPreferences(),
  audiobookVoiceURI: '',
  audiobookRate: 1,
  query: '',
  writer: createWriterState(),
}
let saveTimer
let writerAutosaveTimer = null
let writerSaveInProgress = false
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
          <div class="writer-wizard">
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
              </div>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="3" aria-labelledby="wizard-outline-title" hidden>
              <h2 id="wizard-outline-title">Chapter Suggestions</h2>
              <label class="writer-field" for="outline-revision-request">
              <textarea id="outline-revision-request" rows="2" spellcheck="true" placeholder="Make the middle chapters build more suspense..."></textarea>
              </label>
              <button class="button button--outline outline-revise" type="button" id="revise-outline"><i data-lucide="sparkles"></i><span>Edit Chapters</span></button>
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
                  <div class="chapter-navigation__actions">
                    <button class="button button--primary" type="button" id="generate-chapter"><i data-lucide="sparkles"></i><span>Generate chapter</span></button>
                    <button class="button button--outline" type="button" id="stop-chapter-generation" hidden><i data-lucide="square"></i><span>Stop generation</span></button>
                    <button class="icon-button chapter-undo-button" type="button" id="undo-chapter" aria-label="Undo the last generation for this chapter" title="Undo the last generation for this chapter" hidden><i data-lucide="rotate-ccw"></i></button>
                    <button class="icon-button chapter-remove-button" type="button" id="remove-chapter" aria-label="Remove current chapter" title="Remove current chapter"><i data-lucide="trash-2"></i></button>
                  </div>
                </div>
              </section>
              <div class="writer-field chapter-prompt-field">
                <div class="chapter-prompt-field__header">
                  <button class="chapter-prompt-field__toggle" type="button" id="chapter-prompt-toggle" aria-expanded="true" aria-controls="chapter-prompt">
                    <span id="chapter-prompt-label">Prompt for current chapter</span><i data-lucide="chevron-down"></i>
                  </button>
                  <div class="chapter-prompt-scope" role="group" aria-label="Chapter prompt scope">
                    <button type="button" id="chapter-prompt-current" aria-label="Apply prompt to the current chapter only" aria-pressed="true">Current</button>
                    <button type="button" id="chapter-prompt-all" aria-label="Apply prompt to all chapters and generate or update every chapter from the current one onward" title="Use this prompt for all chapters and generate or update them in sequence." aria-pressed="false">All</button>
                  </div>
                </div>
                <textarea id="chapter-prompt" rows="2" aria-label="Chapter prompt" placeholder="Guide generation or regeneration, e.g. build tension, sharpen the dialogue, or preserve a key moment."></textarea>
              </div>
              <textarea class="manuscript-editor" id="manuscript-editor" placeholder="Generate or write the chapter here." spellcheck="true" aria-label="Editable chapter text"></textarea>
            </section>

            <section class="writer-wizard-panel" data-wizard-panel="5" aria-labelledby="wizard-details-title" hidden>
              <div class="manuscript-meta">
                <label class="writer-field" for="book-title">Title<input id="book-title" type="text" placeholder="Filled from the suggestions" /></label>
                <label class="writer-field" for="book-author">Author<input id="book-author" type="text" placeholder="Your name or pen name" /></label>
              </div>
              <label class="writer-field">Cover</label> 
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
                    <p>Upload artwork or create an AI cover with your book title and author included.</p>
                  </div>
                  <div class="cover-card__options">
                    <label class="writer-field" for="cover-art-style">Art style
                      <select id="cover-art-style">
                        <option value="photographic">Photography</option>
                        <option value="illustrated">Illustration</option>
                        <option value="watercolor">Watercolor</option>
                        <option value="minimalist">Minimalist</option>
                        <option value="oilPainting">Oil painting</option>
                        <option value="digitalPainting">Digital painting</option>
                        <option value="threeDimensional">3D illustration</option>
                        <option value="artDeco">Art Deco</option>
                        <option value="graphicNovel">Graphic novel</option>
                        <option value="surrealist">Surrealist</option>
                        <option value="geometric">Geometric</option>
                        <option value="inkWash">Ink wash</option>
                      </select>
                    </label>
                    <label class="writer-field" for="cover-mood">Mood
                      <select id="cover-mood">
                        <option value="">Let AI choose</option>
                        <option value="serene">Serene</option>
                        <option value="whimsical">Whimsical</option>
                        <option value="mysterious">Mysterious</option>
                        <option value="dramatic">Dramatic</option>
                        <option value="hopeful">Hopeful</option>
                        <option value="romantic">Romantic</option>
                        <option value="eerie">Eerie</option>
                        <option value="adventurous">Adventurous</option>
                        <option value="nostalgic">Nostalgic</option>
                        <option value="melancholic">Melancholic</option>
                        <option value="cozy">Cozy</option>
                        <option value="dreamlike">Dreamlike</option>
                        <option value="triumphant">Triumphant</option>
                        <option value="suspenseful">Suspenseful</option>
                      </select>
                    </label>
                  </div>
                  <div class="cover-card__actions">
                    <label class="button button--outline cover-card__upload" for="cover-input">
                      <i data-lucide="upload"></i><span>Upload image</span>
                      <input id="cover-input" class="cover-card__file" type="file" accept="image/png,image/jpeg" aria-label="Upload a PNG or JPEG cover image" />
                    </label>
                    <button class="button button--primary" type="button" id="generate-cover"><i data-lucide="sparkles"></i><span>Generate with AI</span></button>
                    <button class="button button--primary" type="button" id="keep-cover" hidden><i data-lucide="check"></i><span>Keep</span></button>
                    <button class="button button--outline" type="button" id="undo-cover" hidden><i data-lucide="rotate-ccw"></i><span>Undo</span></button>
                  </div>
                  <p class="cover-card__title-warning" id="cover-title-warning" hidden>The generated cover title or author no longer matches. Regenerate the cover before saving.</p>
                  <p class="cover-card__note">PNG or JPEG · AI covers use two image generations with your OpenRouter key; provider charges may apply for each.</p>
                </div>
              </div>
            </section>

            <div class="writer-wizard-nav">
              <button class="button button--outline" type="button" id="wizard-back" disabled>Back</button>
              <span id="wizard-step-count" aria-live="polite">Step 1 of 5</span>
              <button class="button button--primary" type="button" id="wizard-next" disabled><span>Continue</span></button>
              <div class="writer-save-actions" hidden>
                <button class="button button--primary writer-save" type="button" id="save-draft" disabled><span>Save</span></button>
              </div>
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
            <button class="icon-button" type="button" id="audiobook-button" aria-label="Listen to audiobook" title="Listen to audiobook" aria-expanded="false" aria-controls="audiobook-player"><i data-lucide="headphones"></i></button>
            <button class="icon-button" type="button" id="reader-settings-button" aria-label="Reading settings" title="Reading settings" aria-expanded="false" aria-controls="reader-settings"><i data-lucide="sliders-horizontal"></i></button>
          </div>
        </header>
        <aside class="reader-settings" id="reader-settings" aria-label="Reading settings" hidden>
          <div class="reader-settings__header"><h2>Reading settings</h2><div><button class="reader-settings__reset" type="button" id="reset-reader-settings"><i data-lucide="rotate-ccw"></i><span>Reset</span></button><button class="icon-button" type="button" id="close-reader-settings" aria-label="Close reading settings"><i data-lucide="x"></i></button></div></div>
          <div class="reader-settings__layout">
          <div class="reader-settings__type-controls">
          <div class="reader-font-preview" id="reader-font-preview">
            <span class="reader-font-preview__label">Preview</span>
            <p id="reader-font-preview-text">The quick brown fox jumps over the lazy dog.</p>
          </div>
          <label class="reader-setting reader-font-size-setting" for="reader-font-size">
            <span>Text size</span>
            <div class="reader-font-size-control">
              <span class="reader-font-size-control__small" aria-hidden="true">A</span>
              <input id="reader-font-size" type="range" min="50" max="200" value="100" />
              <output id="reader-font-size-value">100%</output>
              <span class="reader-font-size-control__large" aria-hidden="true">A</span>
            </div>
          </label>
          <label class="reader-setting" for="reader-font-family"><span>Typeface</span><select id="reader-font-family">
            <optgroup label="Serif"><option value="serif">Georgia</option><option value="soft">Palatino</option><option value="garamond">Garamond</option><option value="bookman">Bookman</option></optgroup>
            <optgroup label="Sans-serif"><option value="sans">Arial</option><option value="system">System UI</option><option value="segoe">Segoe UI</option><option value="helvetica">Helvetica</option><option value="roboto">Roboto</option><option value="tahoma">Tahoma</option><option value="openSans">Open Sans</option><option value="verdana">Verdana</option><option value="trebuchet">Trebuchet</option></optgroup>
          </select></label>
          <div class="reader-setting">
            <span>Line spacing</span>
            <div class="reader-line-spacing-options" id="reader-line-spacing-options" role="group" aria-label="Line spacing">
              <button class="reader-line-spacing-option" type="button" data-reader-line-height="1.5" aria-label="Compact line spacing" title="Compact" aria-pressed="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
              </button>
              <button class="reader-line-spacing-option" type="button" data-reader-line-height="1.75" aria-label="Relaxed line spacing" title="Relaxed" aria-pressed="true">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16M4 9.5h16M4 14.5h16M4 19.5h16" /></svg>
              </button>
              <button class="reader-line-spacing-option" type="button" data-reader-line-height="2" aria-label="Open line spacing" title="Open" aria-pressed="false">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3h16M4 9h16M4 15h16M4 21h16" /></svg>
              </button>
            </div>
          </div>
          </div>
          <div class="reader-settings__appearance">
          <fieldset class="reader-theme-picker"><legend>Page theme</legend><div class="reader-theme-options">
            <div class="reader-theme-category"><span class="reader-theme-category__label">Light</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="paper-white" style="--reader-theme-background:#FAF9F6" aria-pressed="true"><span class="reader-theme-option__swatch"></span><span>Paper White</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="warm-ivory" style="--reader-theme-background:#FFF8E7" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Warm Ivory</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="classic-parchment" style="--reader-theme-background:#F4E8D2" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Classic Parchment</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="cloud-gray" style="--reader-theme-background:#F1F3F5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Cloud Gray</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="peach-bloom" style="--reader-theme-background:#FBE4D5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Peach Bloom</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="sage-garden" style="--reader-theme-background:#DEE8DC" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Sage Garden</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="vintage-sepia" style="--reader-theme-background:#EAD8B5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Vintage Sepia</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="powder-blue" style="--reader-theme-background:#E6F1F8" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Powder Blue</span></button>
            </div></div>
            <div class="reader-theme-category"><span class="reader-theme-category__label">Dark</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="soft-charcoal" style="--reader-theme-background:#1E2024" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Soft Charcoal</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="true-night" style="--reader-theme-background:#121212" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>True Night</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="midnight-navy" style="--reader-theme-background:#27313E" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Ink Blue</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="forest-night" style="--reader-theme-background:#2C332B" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Olive Charcoal</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="midnight-plum" style="--reader-theme-background:#332F36" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Smoke Plum</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="deep-ocean" style="--reader-theme-background:#283435" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Deep Teal</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="storm-slate" style="--reader-theme-background:#353F4E" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Storm Slate</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="burgundy-night" style="--reader-theme-background:#33232D" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Burgundy Night</span></button>
            </div></div>
            <div class="reader-theme-category"><span class="reader-theme-category__label">Textured</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="parchment-grain" style="--reader-theme-background:#F4EBD9" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Parchment Grain</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="botanical-paper" style="--reader-theme-background:#EDF2E7" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Botanical Paper</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="linen-weave" style="--reader-theme-background:#F0ECE2" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Linen Weave</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="watercolor-wash" style="--reader-theme-background:#F3E9E4" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Watercolor Wash</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="recycled-paper" style="--reader-theme-background:#F3EFDF" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Recycled Paper</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="cotton-paper" style="--reader-theme-background:#F5F0E8" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Cotton Paper</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="newsprint-paper" style="--reader-theme-background:#F1EEE5" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Newsprint</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="rice-paper" style="--reader-theme-background:#F4F0E4" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Rice Paper</span></button>
            </div></div>
            <div class="reader-theme-category"><span class="reader-theme-category__label">Gradient</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="sunset-gradient" style="--reader-theme-background:#F1D9D1" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Sunset</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="ocean-gradient" style="--reader-theme-background:#DCE9EC" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Ocean</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="meadow-gradient" style="--reader-theme-background:#E4EBD9" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Meadow</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="aurora-gradient" style="--reader-theme-background:#26313E" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Aurora</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="blush-gradient" style="--reader-theme-background:#F4DDE4" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Blush</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="citrus-gradient" style="--reader-theme-background:#F4E5B6" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Citrus</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="rosewood-gradient" style="--reader-theme-background:#EAD8CC" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Rosewood</span></button>
              <button class="reader-theme-option" type="button" data-reader-theme="glacier-gradient" style="--reader-theme-background:#DCEBF2" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>Glacier</span></button>
            </div></div>
            <div class="reader-theme-category"><span class="reader-theme-category__label">AI story background</span><div class="reader-theme-category-options">
              <button class="reader-theme-option" type="button" data-reader-theme="${aiStoryReaderTheme}" style="--reader-theme-background:#F4EBD9" aria-pressed="false"><span class="reader-theme-option__swatch"></span><span>AI Story</span></button>
            </div><p class="reader-theme-note">Uses your OpenRouter key and text from the next 10 pages to generate an image. Provider charges may apply.</p></div>
          </div></fieldset>
            <label class="reader-setting" id="reader-ai-background-opacity-setting" for="reader-ai-background-opacity" hidden><span>AI background opacity <output id="reader-ai-background-opacity-value">30%</output></span><input id="reader-ai-background-opacity" type="range" min="0" max="100" step="5" value="30" /></label>
            <label class="reader-setting" id="reader-ai-background-mode-setting" for="reader-ai-background-mode" hidden><span>AI background mode</span><select id="reader-ai-background-mode"><option value="light">Light</option><option value="dark">Dark</option></select></label>
          </div>
          </div>
        </aside>
        <div class="reader-layout">
          <aside class="toc-panel" id="toc-panel" hidden><div class="toc-panel__head"><h2>Contents</h2><button class="icon-button" type="button" id="toc-close" aria-label="Close contents"><i data-lucide="x"></i></button></div><nav id="chapter-list" class="chapter-list"></nav></aside>
          <aside class="toc-panel bookmark-panel" id="bookmark-panel" hidden>
            <div class="toc-panel__head"><h2>Bookmarks</h2><button class="icon-button" type="button" id="bookmark-close" aria-label="Close bookmarks"><i data-lucide="x"></i></button></div>
            <nav id="bookmark-list" class="chapter-list" aria-label="Saved bookmarks"></nav>
            <button class="button button--primary bookmark-current-action" type="button" id="bookmark-current" aria-label="Add bookmark" title="Add bookmark" aria-pressed="false"><i data-lucide="bookmark"></i><span>Add bookmark</span></button>
          </aside>
          <div class="reader-main">
            <div class="reader-stage">
              <div class="epub-frame" id="epub-frame" aria-label="Book text"></div>
              <div class="reader-touch-overlay" aria-hidden="true"></div>
            </div>
            <footer class="reader-footer"><button class="icon-button reader-page-button" type="button" id="reader-prev-page" aria-label="Previous page" title="Previous page"><i data-lucide="chevron-left"></i></button><span id="chapter-label">A quiet moment</span><div class="reading-progress-group"><div class="reading-progress"><span class="reading-progress__fill" id="progress-fill"></span></div><div class="reading-progress-meta"><span id="page-count-label" aria-label="Page count unavailable" title="Page count unavailable">— / —</span><span id="progress-label">—%</span></div></div><button class="icon-button reader-page-button" type="button" id="reader-next-page" aria-label="Next page" title="Next page"><i data-lucide="chevron-right"></i></button></footer>
          </div>
        </div>
        <div class="reader-selection-menu" id="reader-selection-menu" role="dialog" aria-label="Selected text actions" aria-busy="false" hidden>
          <p class="reader-selection-menu__quote" id="reader-selection-quote"></p>
          <ul class="reader-selection-menu__actions" aria-label="Selected text actions">
            <li><button type="button" data-reader-selection-action="copy"><i data-lucide="copy"></i><span>Copy</span></button></li>
            <li><button type="button" id="reader-selection-highlight" data-reader-selection-action="highlight"><i data-lucide="highlighter"></i><span>Highlight</span></button></li>
            <li><button type="button" data-reader-selection-action="definition"><i data-lucide="book-open"></i><span>Definition</span></button></li>
            <li><button type="button" data-reader-selection-action="translation"><i data-lucide="languages"></i><span>Translate</span></button></li>
            <li><button type="button" data-reader-selection-action="close"><i data-lucide="x"></i><span>Close</span></button></li>
          </ul>
          <p class="reader-selection-menu__result" id="reader-selection-result" role="status" aria-live="polite" hidden></p>
          <p class="reader-selection-menu__attribution" id="reader-selection-attribution" hidden></p>
        </div>
      </section>
    </main>
    <section class="audiobook-player" id="audiobook-player" role="dialog" aria-modal="true" aria-labelledby="audiobook-title" hidden>
      <div class="audiobook-player__background" id="audiobook-background" aria-hidden="true"></div>
      <div class="audiobook-player__shade" aria-hidden="true"></div>
      <button class="icon-button audiobook-player__close" type="button" id="audiobook-close" aria-label="Close audiobook player" title="Close audiobook player"><i data-lucide="x"></i></button>
      <div class="audiobook-player__content">
        <header class="audiobook-player__book">
          <div class="audiobook-player__cover" id="audiobook-cover" aria-hidden="true"></div>
          <p class="audiobook-player__eyebrow">Audiobook</p>
          <h2 id="audiobook-title"></h2>
          <p class="audiobook-player__author" id="audiobook-author"></p>
          <p class="audiobook-player__position" id="audiobook-position"></p>
        </header>
        <div class="audiobook-player__transcript" id="audiobook-transcript" role="region" aria-label="Text from the current page" tabindex="0">
          <p id="audiobook-text">Press play to read from the current page.</p>
        </div>
        <footer class="audiobook-player__footer">
          <div class="audiobook-player__controls">
            <button class="audiobook-player__skip" type="button" id="audiobook-skip-back" aria-label="Previous page" title="Previous page"><i data-lucide="skip-back"></i></button>
            <button class="audiobook-player__toggle" type="button" id="audiobook-toggle" aria-label="Play audiobook" title="Play audiobook"><i data-lucide="play"></i></button>
            <button class="audiobook-player__skip" type="button" id="audiobook-skip-forward" aria-label="Skip to next page" title="Skip to next page"><i data-lucide="skip-forward"></i></button>
          </div>
          <div class="audiobook-player__chapter-progress" id="audiobook-chapter-progress" role="progressbar" aria-label="Current chapter progress" aria-valuemin="0" aria-valuemax="100" hidden>
            <span id="audiobook-chapter-progress-fill"></span>
          </div>
          <span class="audiobook-player__page-count" id="audiobook-page-count">— / —</span>
          <div class="audiobook-player__options">
            <button class="audiobook-player__option-button audiobook-player__option-button--voice" type="button" id="audiobook-voice-cycle" aria-label="Voice: Browser default. Click to change voice." title="Voice: Browser default. Click to change voice."><i data-lucide="headphones" aria-hidden="true"></i><span id="audiobook-voice-value">Browser default</span></button>
            <button class="audiobook-player__option-button audiobook-player__option-button--speed" type="button" id="audiobook-speed-cycle" aria-label="Reading speed: 1.0 times. Click to change speed." title="Reading speed: 1.0×. Click to change speed."><i data-lucide="gauge" aria-hidden="true"></i><span id="audiobook-speed-value">1.0×</span></button>
          </div>
        </footer>
      </div>
    </section>
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
    const request = indexedDB.open('leaf-library', 4)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('progress')) db.createObjectStore('progress', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('bookmarks')) db.createObjectStore('bookmarks', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('highlights')) db.createObjectStore('highlights', { keyPath: 'id' })
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

async function storeTransaction(storeNames, mode, action) {
  const db = await database
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode)
    try {
      action(transaction)
    } catch (error) {
      transaction.abort()
      reject(error)
      return
    }
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed.'))
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction was aborted.'))
  })
}

async function loadLibrary() {
  try {
    ;[state.books, state.drafts, state.progress, state.bookmarks, state.highlights] = await Promise.all([
      storeRequest('books', 'readonly', (store) => store.getAll()),
      storeRequest('drafts', 'readonly', (store) => store.getAll()),
      storeRequest('progress', 'readonly', (store) => store.getAll()),
      storeRequest('bookmarks', 'readonly', (store) => store.getAll()),
      storeRequest('highlights', 'readonly', (store) => store.getAll()),
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
        ${progress ? `<span class="book-card__read" aria-label="${progress.percentage || 0}% read">${progress.percentage || 0}%</span>` : ''}
        <div class="book-card__actions" role="group" aria-label="Actions for ${escapeHtml(book.title)}">
          <button class="book-card__action book-card__download" type="button" data-download="${escapeHtml(book.id)}" aria-label="Download ${escapeHtml(book.title)} as EPUB" title="Download EPUB"><i data-lucide="download"></i></button>
          <button class="book-card__action book-card__remove" type="button" data-remove="${escapeHtml(book.id)}" aria-label="Remove ${escapeHtml(book.title)}" title="Remove book"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="book-card__meta"><span>${escapeHtml(book.title)}</span></div>
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
const blockEpubTags = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DT', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'LI', 'MAIN', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TD', 'TH', 'TR', 'UL'])

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
  if (tag === 'IMG') {
    const alt = node.getAttribute('alt')
    return alt ? ` ${alt} ` : ''
  }
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
    const navigationTitles = epubNavigationTitles(navigation?.toc, book)
    const chapters = []

    for (const section of allSections) {
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
  restoreOpenRouterApiKey()
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
  if (step === 2) {
    const hasCurrentOutline = state.writer.outline.length && state.writer.outlinePrompt === outlinePromptSignature()
    const canGenerateOutline = $('#openrouter-key').value.trim()
      && $('#openrouter-model').value
      && $('#book-topic').value.trim()
      && isValidPageCount(Number($('#page-count').value))
    return Boolean(hasCurrentOutline || canGenerateOutline)
  }
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
  $('#wizard-step-count').textContent = `Step ${step} of 5`
  $('#wizard-back').disabled = busy || step === 1
  $('#wizard-next').hidden = step === 5
  $('.writer-save-actions').hidden = step !== 5
  $('#wizard-next').disabled = busy || !canContinueWriterStep(step)
  const hasCurrentOutline = state.writer.outline.length && state.writer.outlinePrompt === outlinePromptSignature()
  const nextLabel = step === 2
    ? busy ? 'Suggesting chapters...' : hasCurrentOutline ? 'Review suggestions' : state.writer.outline.length ? 'Regenerate suggestions' : 'Suggest chapters'
    : ({
      1: 'Continue',
      3: 'Draft chapters',
      4: 'Book details',
    })[step] || 'Continue'
  $('#wizard-next').querySelector('span').textContent = nextLabel
}

function updateWriterControls() {
  const title = $('#book-title').value.trim()
  const busy = state.writer.busy
  const words = state.writer.chapters.reduce((total, chapter) => total + countWords(chapter.content), 0)
  const activeChapter = state.writer.chapters[state.writer.currentChapter]
  const currentChapterWords = countWords(activeChapter?.content)
  $('#draft-stats').textContent = state.writer.chapters.length
    ? `Chapter ${state.writer.currentChapter + 1}: ${currentChapterWords.toLocaleString()} words · Total: ${words.toLocaleString()} words`
    : state.writer.outline.length ? `${state.writer.outline.length} AI-suggested chapters` : 'Your book idea will guide the chapter suggestions.'
  $('#revise-outline').disabled = busy || !$('#outline-revision-request').value.trim() || !parseOutline($('#chapter-outline').value).length
  const stopChapterGeneration = busy && Boolean(state.writer.chapterGenerationController)
  $('#generate-chapter').hidden = stopChapterGeneration
  $('#generate-chapter').disabled = busy || state.writer.stage !== 'chapters' || !activeChapter
  const stopButton = $('#stop-chapter-generation')
  stopButton.hidden = !stopChapterGeneration
  stopButton.disabled = Boolean(state.writer.chapterGenerationController?.signal.aborted)
  stopButton.querySelector('span').textContent = stopButton.disabled ? 'Stopping...' : 'Stop generation'
  updateChapterActionButton(activeChapter)
  $('#chapter-previous').disabled = busy || state.writer.currentChapter === 0
  $('#chapter-next').disabled = busy || state.writer.currentChapter >= state.writer.chapters.length - 1 || !activeChapter?.content.trim()
  $('#remove-chapter').disabled = busy || !activeChapter
  $('#chapter-prompt-current').disabled = busy
  $('#chapter-prompt-all').disabled = busy
  $('#cover-art-style').disabled = busy
  $('#cover-mood').disabled = busy
  const displayedCover = state.writer.coverCandidate || state.writer.cover
  const author = $('#book-author').value.trim()
  const coverAuthor = author || (displayedCover?.source === 'ai-titled' ? displayedCover.generatedAuthor || '' : '')
  const coverTextMismatch = displayedCover?.source === 'ai-titled'
    && (displayedCover.generatedTitle !== title
      || (typeof displayedCover.generatedAuthor === 'string' && displayedCover.generatedAuthor !== coverAuthor))
  $('#cover-title-warning').hidden = !coverTextMismatch
  const canSaveBook = !busy
    && state.writer.chapters.some((chapter) => chapter.content.trim())
    && Boolean(title)
    && !state.writer.coverCandidate
    && !coverTextMismatch
  $('#save-draft').disabled = !canSaveBook
  const hasCoverCandidate = Boolean(state.writer.coverCandidate)
  $('#generate-cover').hidden = hasCoverCandidate
  $('#generate-cover').disabled = busy
  $('#keep-cover').hidden = !hasCoverCandidate
  $('#keep-cover').disabled = busy || !hasCoverCandidate
  $('#undo-cover').hidden = !hasCoverCandidate
  $('#undo-cover').disabled = busy || !hasCoverCandidate
  $('#cover-input').disabled = busy
  $('#book-title').disabled = writerSaveInProgress
  $('#book-author').disabled = writerSaveInProgress
  $('#book-topic').disabled = writerSaveInProgress
  $('#page-count').disabled = writerSaveInProgress
  $('#chapter-outline').disabled = writerSaveInProgress
  $('#outline-revision-request').disabled = writerSaveInProgress
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

function countWords(text) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length
}

function updateChapterActionButton(chapter) {
  const button = $('#generate-chapter')
  const generateAllChapters = state.writer.chapterPromptScope === 'all'
  const hasUndo = typeof chapter?.undoContent === 'string'
  const hasContent = Boolean(chapter?.content.trim())
  const hasContentFromHere = state.writer.chapters
    .slice(state.writer.currentChapter)
    .some((item) => item.content.trim())
  const icon = 'sparkles'
  const label = state.writer.busy
    ? generateAllChapters
      ? hasContentFromHere ? 'Updating chapters...' : 'Writing chapters...'
      : hasContent ? 'Updating chapter...' : 'Writing chapter...'
    : generateAllChapters
      ? hasContentFromHere ? 'Update from here' : 'Generate from here'
      : hasContent ? 'Update chapter' : 'Generate chapter'
  $('#undo-chapter').hidden = !hasUndo || state.writer.busy
  $('#undo-chapter').disabled = state.writer.busy || !hasUndo
  button.querySelector('span').textContent = label
  if (button.dataset.chapterActionIcon !== icon) {
    button.innerHTML = `<i data-lucide="${icon}"></i><span>${label}</span>`
    button.dataset.chapterActionIcon = icon
    icons()
  }
}

function continueWriterWorkflow() {
  const step = state.writer.wizardStep
  if (state.writer.busy) return
  if (step === 2 && !(state.writer.outline.length && state.writer.outlinePrompt === outlinePromptSignature())) {
    if (canContinueWriterStep(step)) requestDraft('outline')
    return
  }
  if (!canContinueWriterStep(step)) return
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
      return {
        title,
        content: existing?.content || '',
        prompt: existing?.prompt || '',
        undoContent: typeof existing?.undoContent === 'string' ? existing.undoContent : null,
      }
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
  if (step === 4 && !state.writer.loadedBookId && !$('#book-author').value.trim()) {
    $('#book-author').value = randomAiAuthorAlias()
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
  if (type === 'error') showToast(message)
}

function persistOpenRouterApiKey(removeWhenEmpty = false) {
  const key = $('#openrouter-key').value.trim()
  try {
    if (key) localStorage.setItem(openRouterKeyStorageKey, key)
    else if (removeWhenEmpty) localStorage.removeItem(openRouterKeyStorageKey)
    return key
  } catch (error) {
    console.error('Could not save the OpenRouter API key to local storage.', error)
    setWriterStatus('Could not save the API key in this browser.', 'error')
    return null
  }
}

function openRouterApiKeyForAudiobook() {
  let apiKey
  try {
    apiKey = localStorage.getItem(openRouterKeyStorageKey)?.trim()
  } catch {
    throw new Error('Could not access your OpenRouter API key in browser storage.')
  }
  if (!apiKey) throw new Error('Add your OpenRouter API key in AI Writer settings to use Gemini voices.')
  return apiKey
}

function restoreOpenRouterApiKey() {
  const input = $('#openrouter-key')
  if (input.value.trim()) return
  try {
    input.value = localStorage.getItem(openRouterKeyStorageKey) || ''
  } catch (error) {
    console.error('Could not load the OpenRouter API key from local storage.', error)
    setWriterStatus('Could not access browser storage for your API key. Enter it again to continue.', 'error')
  }
}

function writerDraftHasContent() {
  return Boolean(
    state.writer.draftId
    || state.writer.savedBookId
    || state.writer.loadedBookId
    || state.writer.outline.length
    || state.writer.cover
    || state.writer.allChapterPrompt.trim()
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
    undoContent: typeof chapter.undoContent === 'string' ? chapter.undoContent : null,
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
      chapterPromptScope: state.writer.chapterPromptScope,
      allChapterPrompt: state.writer.allChapterPrompt,
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
      coverArtStyle: $('#cover-art-style').value,
      coverMood: $('#cover-mood').value,
    },
  }
}

async function persistWriterDraft() {
  if (writerSaveInProgress) return
  if (!writerDraftHasContent()) return
  if (!state.writer.draftId) state.writer.draftId = createUuid()
  const draft = createWriterDraftRecord()
  await storeRequest('drafts', 'readwrite', (store) => store.put(draft))
  const existingIndex = state.drafts.findIndex((item) => item.id === draft.id)
  if (existingIndex >= 0) state.drafts[existingIndex] = draft
  else state.drafts.push(draft)
  renderWriterLibraryOptions()
  if (!$('#library-screen').hidden) renderLibrary()
}

function reportWriterAutosaveError(error) {
  console.error('Could not autosave the unfinished book.', error)
  setWriterStatus('Autosave failed. Keep this page open and try again.', 'error')
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
  if (writerSaveInProgress) return
  clearTimeout(writerAutosaveTimer)
  if (!writerDraftHasContent()) return
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
  if (state.writer.coverCandidateUrl) URL.revokeObjectURL(state.writer.coverCandidateUrl)
  const savedWriter = draft.writer || {}
  const fields = draft.fields || {}
  const chapters = Array.isArray(savedWriter.chapters)
    ? savedWriter.chapters
      .filter((chapter) => chapter && typeof chapter === 'object')
      .map((chapter, index) => ({
        title: String(chapter.title || `Chapter ${index + 1}`),
        content: String(chapter.content || ''),
        prompt: String(chapter.prompt || ''),
        undoContent: typeof chapter.undoContent === 'string' ? chapter.undoContent : null,
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
    chapterPromptScope: savedWriter.chapterPromptScope === 'all' ? 'all' : 'current',
    allChapterPrompt: String(savedWriter.allChapterPrompt || ''),
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
  const savedCoverArtStyle = String(fields.coverArtStyle || '')
  const coverArtStyle = legacyCoverArtStyleAliases[savedCoverArtStyle] || savedCoverArtStyle
  const coverMood = String(fields.coverMood || '')
  $('#cover-art-style').value = Object.hasOwn(coverArtStyles, coverArtStyle) ? coverArtStyle : 'photographic'
  $('#cover-mood').value = Object.hasOwn(coverMoods, coverMood) ? coverMood : ''
  $('#cover-input').value = ''

  if (state.writer.cover?.data && state.writer.cover.mediaType) {
    state.writer.coverUrl = URL.createObjectURL(new Blob([state.writer.cover.data], { type: state.writer.cover.mediaType }))
  }
  renderWriterCoverPreview()

  if (chapters.length) renderCurrentChapter()
  else {
    $('#manuscript-title').textContent = 'Adjust your chapter text'
    $('#chapter-position').textContent = 'Chapter 1 of 1'
    $('#chapter-prompt').value = ''
    $('#manuscript-editor').value = ''
  }
  showWriter()
  setWriterStatus(`Resumed "${draft.title || 'Untitled draft'}".`)
}

function setWriterBusy(busy, mode = '') {
  state.writer.busy = busy
  updateWriterControls()
  $('#revise-outline').querySelector('span').textContent = busy && mode === 'outline-revision' ? 'Working...' : 'Edit Chapters'
  $('#generate-cover').querySelector('span').textContent = busy && mode === 'cover-background'
    ? 'Generating background...'
    : busy && mode === 'cover-title'
      ? 'Adding title...'
      : 'Generate with AI'
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
  $('#chapter-prompt').value = getCurrentChapterPrompt(chapter)
  renderChapterPromptScope()
  $('#chapter-position').textContent = `Chapter ${state.writer.currentChapter + 1} of ${state.writer.chapters.length}`
  $('#chapter-previous').disabled = state.writer.busy || state.writer.currentChapter === 0
  $('#chapter-next').disabled = state.writer.busy || state.writer.currentChapter >= state.writer.chapters.length - 1 || !chapter.content.trim()
  updateWriterControls()
  scheduleWriterAutosave()
}

function scrollManuscriptToBottom(editor) {
  editor.scrollTop = editor.scrollHeight
}

function getCurrentChapterPrompt(chapter = state.writer.chapters[state.writer.currentChapter]) {
  return state.writer.chapterPromptScope === 'all'
    ? state.writer.allChapterPrompt
    : String(chapter?.prompt || '')
}

function renderChapterPromptScope() {
  const allChapters = state.writer.chapterPromptScope === 'all'
  $('#chapter-prompt-current').setAttribute('aria-pressed', String(!allChapters))
  $('#chapter-prompt-all').setAttribute('aria-pressed', String(allChapters))
  $('#chapter-prompt-label').textContent = allChapters ? 'Prompt for all chapters' : 'Prompt for current chapter'
  $('#chapter-prompt').placeholder = allChapters
    ? 'This replaces chapter-specific prompts for every chapter.'
    : 'Guide this chapter’s generation or regeneration.'
}

function toggleChapterPrompt() {
  const toggle = $('#chapter-prompt-toggle')
  const expanded = toggle.getAttribute('aria-expanded') === 'true'
  toggle.setAttribute('aria-expanded', String(!expanded))
  $('#chapter-prompt').hidden = expanded
}

function setChapterPromptScope(scope) {
  if (state.writer.busy || state.writer.chapterPromptScope === scope) return
  const chapter = state.writer.chapters[state.writer.currentChapter]
  if (state.writer.chapterPromptScope === 'all') state.writer.allChapterPrompt = $('#chapter-prompt').value
  else if (chapter) chapter.prompt = $('#chapter-prompt').value
  state.writer.chapterPromptScope = scope
  $('#chapter-prompt').value = getCurrentChapterPrompt(chapter)
  renderChapterPromptScope()
  updateWriterControls()
  scheduleWriterAutosave()
}

function removeCurrentChapter() {
  if (state.writer.busy) return
  const index = state.writer.currentChapter
  const chapter = state.writer.chapters[index]
  if (!chapter) return
  const lastChapterNotice = state.writer.chapters.length === 1
    ? ' The AI flow will return to the outline step.'
    : ''
  if (!window.confirm(`Remove "${chapter.title}" and its generated text from this draft?${lastChapterNotice}`)) return

  state.writer.chapters.splice(index, 1)
  state.writer.outline = state.writer.chapters.map((item) => item.title)
  state.writer.savedBookId = null
  $('#chapter-outline').value = state.writer.outline.map((title, chapterIndex) => `${chapterIndex + 1}. ${title}`).join('\n')

  if (!state.writer.chapters.length) {
    state.writer.currentChapter = 0
    state.writer.stage = 'outline'
    state.writer.wizardStep = 3
    $('#chapter-position').textContent = 'No chapters'
    $('#manuscript-editor').value = ''
    $('#chapter-prompt').value = getCurrentChapterPrompt(null)
    renderChapterPromptScope()
    updateWriterControls()
    scheduleWriterAutosave()
    setWriterStatus('The last chapter was removed. Add a title or return to your book idea to generate another outline.')
    $('#chapter-outline').focus()
    return
  }

  state.writer.currentChapter = Math.min(index, state.writer.chapters.length - 1)
  renderCurrentChapter()
  setWriterStatus(`Removed "${chapter.title}" and its generated text from the draft.`)
}

function undoGeneratedChapter() {
  if (state.writer.busy) return
  const chapter = state.writer.chapters[state.writer.currentChapter]
  if (typeof chapter?.undoContent !== 'string') return
  chapter.content = chapter.undoContent
  chapter.undoContent = null
  $('#manuscript-editor').value = chapter.content
  renderCurrentChapter()
  setWriterStatus(`Undid the latest generation for "${chapter.title}".`)
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
    setWriterStatus('Draft deleted. Continued edits will create a new autosaved draft.')
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
    if (state.writer.coverCandidateUrl) URL.revokeObjectURL(state.writer.coverCandidateUrl)
    state.writer.cover = null
    state.writer.coverUrl = ''
    state.writer.coverCandidate = null
    state.writer.coverCandidateUrl = ''
    $('#cover-input').value = ''
    renderWriterCoverPreview()
    state.writer.draftId = null
    state.writer.loadedBookId = record.id
    state.writer.savedBookId = null
    state.writer.stage = 'chapters'
    state.writer.outline = chapters.map((chapter) => chapter.title)
    state.writer.outlinePrompt = ''
    state.writer.chapters = chapters
    state.writer.currentChapter = 0
    state.writer.chapterPromptScope = 'current'
    state.writer.allChapterPrompt = ''
    state.writer.suggestedTitle = title
    $('#book-title').value = title
    $('#book-author').value = author
    $('#cover-art-style').value = 'photographic'
    $('#cover-mood').value = ''
    $('#book-topic').value = `Preserve the existing story, characters, setting, and voice of "${title}". Revise the selected chapter using its existing text as the source.`
    $('#page-count').value = String(Math.max(1, Math.ceil(wordCount / 200)))
    $('#chapter-outline').value = chapters.map((chapter, index) => `${index + 1}. ${chapter.title}`).join('\n')
    $('#outline-revision-request').value = ''
    state.writer.outlinePrompt = outlinePromptSignature()
    state.writer.wizardStep = 4
    if (record.coverOriginal?.data && record.coverOriginal.mediaType) {
      const source = record.coverOriginal.generatedTitle ? 'ai-titled' : 'ai'
      setWriterCover(
        record.coverOriginal.data,
        record.coverOriginal.mediaType,
        source,
        record.coverOriginal.generatedTitle || '',
        record.coverOriginal.generatedAuthor || '',
      )
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

function setWriterCover(data, mediaType, source = 'upload', generatedTitle = '', generatedAuthor = '') {
  const coverData = data instanceof Uint8Array ? data : new Uint8Array(data)
  const previewUrl = URL.createObjectURL(new Blob([coverData], { type: mediaType }))
  discardWriterCoverCandidate()
  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  state.writer.cover = {
    data: coverData,
    mediaType,
    source,
    ...(generatedTitle ? { generatedTitle } : {}),
    ...(generatedAuthor ? { generatedAuthor } : {}),
  }
  state.writer.coverUrl = previewUrl
  renderWriterCoverPreview()
  updateWriterControls()
  scheduleWriterAutosave()
}

function discardWriterCoverCandidate() {
  if (state.writer.coverCandidateUrl) URL.revokeObjectURL(state.writer.coverCandidateUrl)
  state.writer.coverCandidate = null
  state.writer.coverCandidateUrl = ''
}

function renderWriterCoverPreview() {
  const candidateUrl = state.writer.coverCandidateUrl
  const previewUrl = candidateUrl || state.writer.coverUrl
  $('#cover-preview').hidden = !previewUrl
  if (previewUrl) $('#cover-preview').src = previewUrl
  else $('#cover-preview').removeAttribute('src')
  $('#cover-placeholder').hidden = Boolean(previewUrl)
  updateCoverTitleOverlay()
}

function setWriterCoverCandidate(data, mediaType, source = 'ai', generatedTitle = '', generatedAuthor = '') {
  const coverData = data instanceof Uint8Array ? data : new Uint8Array(data)
  discardWriterCoverCandidate()
  state.writer.coverCandidate = {
    data: coverData,
    mediaType,
    source,
    ...(generatedTitle ? { generatedTitle } : {}),
    ...(generatedAuthor ? { generatedAuthor } : {}),
  }
  state.writer.coverCandidateUrl = URL.createObjectURL(new Blob([coverData], { type: mediaType }))
  renderWriterCoverPreview()
  updateWriterControls()
}

function keepWriterCoverCandidate() {
  if (!state.writer.coverCandidate) return
  if (state.writer.coverUrl) URL.revokeObjectURL(state.writer.coverUrl)
  state.writer.cover = state.writer.coverCandidate
  state.writer.coverUrl = state.writer.coverCandidateUrl
  state.writer.coverCandidate = null
  state.writer.coverCandidateUrl = ''
  renderWriterCoverPreview()
  updateWriterControls()
  scheduleWriterAutosave()
  showToast('AI cover kept.')
}

function undoWriterCoverCandidate() {
  if (!state.writer.coverCandidate) return
  discardWriterCoverCandidate()
  renderWriterCoverPreview()
  updateWriterControls()
}

function updateCoverTitleOverlay() {
  const overlay = $('#cover-title-overlay')
  const title = $('#book-title').value.trim()
  const author = $('#book-author').value.trim()
  const cover = state.writer.coverCandidate || state.writer.cover
  const showText = ['ai', 'ai-background'].includes(cover?.source) && Boolean(title)
  overlay.replaceChildren()
  if (showText) {
    const titleElement = document.createElement('span')
    titleElement.className = 'cover-title-overlay__title'
    titleElement.textContent = title
    overlay.append(titleElement)
    if (author) {
      const authorElement = document.createElement('span')
      authorElement.className = 'cover-title-overlay__author'
      authorElement.textContent = author
      overlay.append(authorElement)
    }
  }
  overlay.hidden = !showText
}

async function createTitledCover(cover, title, author) {
  if (!['ai', 'ai-background'].includes(cover?.source) || !title.trim()) return cover

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
    const firstLineY = canvas.height * (author.trim() ? 0.88 : 0.92) - (lines.length - 1) * lineHeight
    lines.forEach((line, index) => {
      context.fillText(line, canvas.width / 2, firstLineY + index * lineHeight, titleWidth)
    })
    if (author.trim()) {
      const authorFontSize = Math.max(12, Math.round(canvas.width * 0.035))
      context.font = `500 ${authorFontSize}px Georgia, serif`
      context.fillText(author.trim(), canvas.width / 2, canvas.height * 0.96, titleWidth)
    }

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
  const authorField = $('#book-author')
  const author = authorField.value.trim()
    || (state.writer.cover?.source === 'ai-titled' ? state.writer.cover.generatedAuthor : '')
    || (state.writer.loadedBookId ? 'Leaf reader' : randomAiAuthorAlias())
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
  if (!authorField.value.trim()) {
    authorField.value = author
    updateWriterControls()
    updateCoverTitleOverlay()
    scheduleWriterAutosave()
  }

  const chapterTitles = state.writer.chapters.map((chapter) => chapter.title).filter(Boolean).join('; ')
  const artStyle = coverArtStyles[$('#cover-art-style').value] || coverArtStyles.photographic
  const mood = coverMoods[$('#cover-mood').value]
  const variation = chooseCoverDesignVariation()
  const prompt = `Create an original, polished ${artStyle} front-cover image for a book titled "${title}"${author ? ` by ${author}` : ''}. Use this book idea as visual inspiration: ${topic || chapterTitles || title}. ${mood ? `Convey a ${mood} mood. ` : ''}${chapterTitles ? `Chapter themes: ${chapterTitles}. ` : ''}Give this generation a distinct visual approach: ${variation.composition}. Use a ${variation.palette} palette. Make it a striking portrait composition with a clear focal subject that remains legible as a small thumbnail. No text, lettering, typography, logos, borders, or book mockups.`

  setWriterBusy(true, 'cover-background')
  let background
  try {
    background = await generateOpenRouterImage({ apiKey, prompt })
    setWriterBusy(true, 'cover-title')
    const titlePrompt = `Use the provided reference image as the background for a portrait book cover. Preserve its artwork, composition, subjects, and color palette. Use this typography direction: ${variation.typography}. Add a polished, clearly legible title with this exact text: ${JSON.stringify(title)}. Spell it exactly. Add the author name as smaller, clearly legible text below the title with this exact text: ${JSON.stringify(author)}. Spell it exactly. Place both lines where they do not obscure the focal subject. Do not add any other text, logos, or watermarks.`
    const cover = await generateOpenRouterImage({
      apiKey,
      prompt: titlePrompt,
      inputReferences: [background.dataUrl],
    })
    setWriterCoverCandidate(cover.data, cover.mediaType, 'ai-titled', title, author)
    showToast('AI cover preview ready. Keep it or undo to restore the current cover.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not generate an AI cover.'
    if (background) {
      console.error('Could not generate the AI cover title layer.', error)
      setWriterCoverCandidate(background.data, background.mediaType, 'ai-background')
      setWriterStatus(`The title layer could not be generated. The background preview is available to keep or undo. ${message}`, 'error')
    } else {
      console.error('Could not generate the AI cover background.', error)
      setWriterStatus(message, 'error')
    }
  } finally {
    setWriterBusy(false)
  }
}

function chapterTargetWordCount(chapter, content = chapter.content) {
  const existingWordCount = countWords(content)
  if (existingWordCount) return existingWordCount
  return Math.max(100, Math.ceil(Number($('#page-count').value) * 200 / Math.max(1, state.writer.chapters.length)))
}

function splitChapterDraft(text) {
  const chunks = []
  let start = 0
  while (start < text.length) {
    let end = Math.min(start + chapterDraftChunkCharacterLimit, text.length)
    if (end < text.length) {
      const minimumBoundary = start + Math.floor(chapterDraftChunkCharacterLimit * 0.6)
      const paragraphEnd = text.lastIndexOf('\n\n', end)
      const sentenceEnd = Math.max(text.lastIndexOf('. ', end), text.lastIndexOf('? ', end), text.lastIndexOf('! ', end))
      const wordEnd = text.lastIndexOf(' ', end)
      if (paragraphEnd >= minimumBoundary) end = paragraphEnd + 2
      else if (sentenceEnd >= minimumBoundary) end = sentenceEnd + 2
      else if (wordEnd >= minimumBoundary) end = wordEnd + 1
    }
    chunks.push(text.slice(start, end))
    start = end
  }
  return chunks
}

function writerMessages(kind, {
  existingDraft: requestedDraft,
  targetWords: requestedTargetWords,
  chunkIndex,
  chunkCount,
  continuity = '',
} = {}) {
  const topic = $('#book-topic').value.trim()
  const pages = Number($('#page-count').value)
  const system = 'You are a thoughtful, skilled book author. Follow the requested format exactly. Do not add commentary about the task.'
  const chapter = state.writer.chapters[state.writer.currentChapter]
  const outline = state.writer.chapters.map((item, index) => `${index + 1}. ${item.title}`).join('\n')
  const chapterPrompt = kind === 'chapter' ? getCurrentChapterPrompt(chapter).trim() : ''
  const chapterPromptInstruction = chapterPrompt ? `Chapter prompt:\n${chapterPrompt}\n\n` : ''
  const existingDraft = kind === 'chapter'
    ? typeof requestedDraft === 'string' ? requestedDraft : chapter?.content.trim() || ''
    : ''
  const targetWords = kind === 'chapter'
    ? Number.isSafeInteger(requestedTargetWords) ? requestedTargetWords : chapterTargetWordCount(chapter, existingDraft)
    : 0
  const priorChapters = existingDraft ? '' : state.writer.chapters.slice(0, state.writer.currentChapter)
    .filter((item) => item.content.trim())
    .map((item) => `## ${item.title}\n${item.content}`)
    .join('\n\n').slice(-chapterPriorContextCharacterLimit)
  const continuityContext = continuity
    ? `Immediately preceding revised prose for continuity:\n${continuity}\n\n`
    : ''
  const segmentInstruction = Number.isInteger(chunkCount) && chunkCount > 1
    ? existingDraft.trim()
      ? `This is part ${chunkIndex + 1} of ${chunkCount} of the existing chapter. Revise the entire supplied section, preserving its events and details. Do not summarize, omit, or skip any of its content, and keep its length similar. It is only one section of the chapter, so do not add a new introduction or conclusion. `
      : `Write part ${chunkIndex + 1} of ${chunkCount} of this chapter. Continue smoothly from the preceding prose without repeating it. Do not add a new introduction, and do not conclude the chapter until the final part. `
    : ''
  const currentSuggestions = parseOutline($('#chapter-outline').value)
  const instruction = kind === 'outline'
    ? `Suggest a coherent sequence of chapters tailored to this book idea, not a generic outline:\n${topic}\n\nAim for about ${pages} reading pages. Return a suggested title as "Title: ..." on the first line, followed by ${Math.min(8, Math.max(2, Math.ceil(pages / 2)))} chapter titles, one per line, numbered. Do not include descriptions or prose.`
    : kind === 'outline-revision'
      ? `Revise these chapter suggestions to follow the request while staying true to the book idea:\n${topic}\n\nCurrent chapter suggestions:\n${currentSuggestions.map((title, index) => `${index + 1}. ${title}`).join('\n')}\n\nRequested changes:\n${$('#outline-revision-request').value.trim()}\n\nKeep the existing number of chapters unless the request suggests otherwise. Return only the revised chapter titles, one per line, numbered. Do not include a book title, descriptions, or prose.`
      : existingDraft
        ? `Revise only the existing prose for Chapter ${state.writer.currentChapter + 1}, "${chapter.title}", applying the chapter prompt while using the book idea and approved chapter plan. Preserve the established characters, plot, setting, and voice unless the prompt explicitly requests a change.\n\nThe book is about:\n${topic}\n\n${chapterPromptInstruction}Approved chapter plan:\n${outline}\n\n${priorChapters ? `Previously written chapters for continuity:\n${priorChapters}\n\n` : ''}${continuityContext}${segmentInstruction}Existing chapter draft:\n${existingDraft}\n\nTarget about ${targetWords} words unless the chapter prompt requests a different length. Return only the revised prose. Do not repeat the chapter title or add notes.`
        : `Write only the prose for Chapter ${state.writer.currentChapter + 1}, "${chapter.title}". The book is about:\n${topic}\n\n${chapterPromptInstruction}Approved chapter plan:\n${outline}\n\n${priorChapters ? `Previously written chapters for continuity:\n${priorChapters}\n\n` : ''}${continuityContext}${segmentInstruction}Target about ${targetWords} words. Do not repeat the chapter title or add notes.`
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
  const generateAllChapters = state.writer.chapterPromptScope === 'all'
  const chapterIndexes = generateAllChapters
    ? state.writer.chapters
      .map((chapter, index) => ({ chapter, index }))
      .filter(({ index }) => index >= startIndex)
      .map(({ index }) => index)
    : [startIndex]

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

  const chapterGenerationController = new AbortController()
  state.writer.chapterGenerationController = chapterGenerationController
  setWriterBusy(true, 'chapter')
  let written = 0
  let activeChapterDraft = null
  let notifiedAboutChunking = false
  try {
    for (const chapterIndex of chapterIndexes) {
      if (chapterGenerationController?.signal.aborted) break
      state.writer.currentChapter = chapterIndex
      const chapter = state.writer.chapters[chapterIndex]
      const previous = chapter.content
      activeChapterDraft = { chapterIndex, content: previous, undoContent: chapter.undoContent }
      chapter.undoContent = previous
      const isExistingDraft = Boolean(previous.trim())
      const draftChunks = isExistingDraft ? splitChapterDraft(previous.trim()) : []
      const targetWordCount = chapterTargetWordCount(chapter, previous)
      const targetWordCounts = isExistingDraft
        ? draftChunks.map((draftChunk) => countWords(draftChunk))
        : Array.from(
          { length: Math.ceil(targetWordCount / chapterDraftChunkWordLimit) },
          (_, index) => Math.min(chapterDraftChunkWordLimit, targetWordCount - index * chapterDraftChunkWordLimit),
        )
      const chunkCount = isExistingDraft ? draftChunks.length : targetWordCounts.length
      if (chunkCount > 1 && !notifiedAboutChunking) {
        showToast(`Long chapter work is split across ${chunkCount} AI requests. Provider charges may apply.`)
        notifiedAboutChunking = true
      }
      editor.value = previous
      editor.scrollTop = 0
      $('#chapter-prompt').value = getCurrentChapterPrompt(chapter)
      $('#chapter-position').textContent = `Chapter ${chapterIndex + 1} of ${state.writer.chapters.length}`
      updateWriterControls()
      scheduleWriterAutosave()
      setWriterStatus(generateAllChapters
        ? `Writing chapter ${chapterIndex + 1} of ${state.writer.chapters.length}...`
        : 'Finding the first line...')
      const revisedSegments = []
      for (let chunkIndex = 0; chunkIndex < chunkCount; chunkIndex += 1) {
        if (chapterGenerationController?.signal.aborted) break
        const existingDraft = isExistingDraft ? draftChunks[chunkIndex] : ''
        const segmentWordCount = targetWordCounts[chunkIndex]
        const result = await streamOpenRouter({
          apiKey,
          model,
          messages: writerMessages('chapter', {
            existingDraft,
            targetWords: segmentWordCount,
            chunkIndex,
            chunkCount,
            continuity: revisedSegments.join('\n\n').slice(-3000),
          }),
          maxTokens: Math.min(10000, Math.max(700, segmentWordCount * 2)),
          continueOnLength: true,
          signal: chapterGenerationController?.signal,
          onUpdate: (text) => {
            chapter.content = [...revisedSegments, text].join('\n\n')
            editor.value = chapter.content
            scrollManuscriptToBottom(editor)
            updateWriterControls()
            scheduleWriterAutosave()
          },
        })
        revisedSegments.push(result)
        chapter.content = revisedSegments.join('\n\n')
        editor.value = chapter.content
        scrollManuscriptToBottom(editor)
        updateWriterControls()
        scheduleWriterAutosave()
      }
      if (chapterGenerationController?.signal.aborted) break
      activeChapterDraft = null
      written += 1
      renderCurrentChapter()
      scrollManuscriptToBottom(editor)
    }
    if (chapterGenerationController?.signal.aborted) {
      const message = 'Chapter generation stopped. Completed chapters and current partial text were kept.'
      setWriterStatus(message)
      showToast(message)
    } else {
      setWriterStatus(generateAllChapters
        ? `Finished generating or updating ${written} chapter${written === 1 ? '' : 's'}.`
        : 'Chapter ready. Review it or move to the next chapter.')
    }
  } catch (error) {
    const stopped = Boolean(chapterGenerationController?.signal.aborted)
    if (activeChapterDraft && !stopped) {
      const chapter = state.writer.chapters[activeChapterDraft.chapterIndex]
      chapter.content = activeChapterDraft.content
      chapter.undoContent = activeChapterDraft.undoContent ?? null
    }
    if (state.writer.chapters[state.writer.currentChapter]) renderCurrentChapter()
    else editor.value = ''
    if (stopped) {
      const message = 'Chapter generation stopped. Completed chapters and current partial text were kept.'
      setWriterStatus(message)
      showToast(message)
    } else {
      setWriterStatus(error.message || 'The chapter could not be generated.', 'error')
    }
  } finally {
    state.writer.chapterGenerationController = null
    setWriterBusy(false)
  }
}

function stopChapterGeneration() {
  const controller = state.writer.chapterGenerationController
  if (!controller || controller.signal.aborted) return
  controller.abort()
  updateWriterControls()
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

async function saveWriterBook() {
  if (writerSaveInProgress || state.writer.busy) return
  writerSaveInProgress = true
  setWriterBusy(true, 'save')
  try {
    clearTimeout(writerAutosaveTimer)
    writerAutosaveTimer = null
    await Promise.all([...writerAutosaveTasks])
    const title = $('#book-title').value.trim()
    const chapters = state.writer.chapters
      .filter((chapter) => chapter.content.trim())
      .map((chapter) => ({ title: chapter.title, content: chapter.content }))
    if (!title || !chapters.length) return

    const authorField = $('#book-author')
    const author = authorField.value.trim()
      || (state.writer.cover?.source === 'ai-titled' ? state.writer.cover.generatedAuthor : '')
      || (state.writer.loadedBookId ? 'Leaf reader' : randomAiAuthorAlias())
    if (!authorField.value.trim()) authorField.value = author
    if (state.writer.cover?.source === 'ai-titled'
      && (state.writer.cover.generatedTitle !== title
        || (typeof state.writer.cover.generatedAuthor === 'string' && state.writer.cover.generatedAuthor !== author))) {
      throw new Error('The AI cover title or author no longer matches the book details. Regenerate the cover before saving.')
    }
    const id = createUuid()
    const cover = await createTitledCover(state.writer.cover, title, author)
    const data = createEpub({ title, author, chapters, cover })
    const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'leaf-book'}.epub`
    const record = {
      id,
      title,
      author,
      fileName,
      data,
      addedAt: Date.now(),
      source: 'ai',
      ...(state.writer.cover?.source === 'ai' || state.writer.cover?.source === 'ai-background' || state.writer.cover?.source === 'ai-titled'
        ? {
          coverOriginal: {
            data: state.writer.cover.data,
            mediaType: state.writer.cover.mediaType,
            ...(state.writer.cover.source === 'ai-titled'
              ? {
                generatedTitle: state.writer.cover.generatedTitle,
                generatedAuthor: state.writer.cover.generatedAuthor,
              }
              : {}),
          },
        }
        : {}),
    }
    const draftIdsToRemove = new Set(state.writer.draftId ? [state.writer.draftId] : [])
    await storeTransaction(['books', 'drafts'], 'readwrite', (transaction) => {
      transaction.objectStore('books').add(record)
      for (const draftId of draftIdsToRemove) transaction.objectStore('drafts').delete(draftId)
    })
    state.books.push(record)
    state.drafts = state.drafts.filter((draft) => !draftIdsToRemove.has(draft.id))
    state.writer.draftId = null
    state.writer.savedBookId = id
    state.writer.wizardStep = 1
    renderWriterLibraryOptions()
    updateWriterControls()
    renderLibrary()
    setWriterStatus('A copy is saved to your library. Keep revising here to save another copy.')
    showToast('A copy of your book is on the shelf.')
  } finally {
    writerSaveInProgress = false
    setWriterBusy(false)
  }
}

async function handleWriterBookSave() {
  try {
    await saveWriterBook()
    showLibrary({ flushDraft: false })
  } catch (error) {
    setWriterStatus(error.message || 'The book could not be saved.', 'error')
    scheduleWriterAutosave()
  }
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

function closeReaderSelectionMenu(active = state.active) {
  const menu = $('#reader-selection-menu')
  if (active?.selectionLookupController) {
    active.selectionLookupController.abort()
    active.selectionLookupController = null
  }
  if (active) {
    active.selection = null
    active.selectionMenuToken = (active.selectionMenuToken || 0) + 1
  }
  menu.hidden = true
  menu.setAttribute('aria-busy', 'false')
  $('#reader-selection-result').hidden = true
  $('#reader-selection-result').textContent = ''
  $('#reader-selection-attribution').hidden = true
  $('#reader-selection-attribution').replaceChildren()
}

function positionReaderSelectionMenu(active, selection) {
  const menu = $('#reader-selection-menu')
  const screen = $('#reader-screen')
  menu.hidden = false
  menu.style.visibility = 'hidden'
  requestAnimationFrame(() => {
    if (state.active !== active || active.selection !== selection || menu.hidden) return
    const screenBounds = screen.getBoundingClientRect()
    const frameBounds = selection.frame.getBoundingClientRect()
    const scaleX = selection.frame.clientWidth ? frameBounds.width / selection.frame.clientWidth : 1
    const scaleY = selection.frame.clientHeight ? frameBounds.height / selection.frame.clientHeight : 1
    const anchorLeft = frameBounds.left + selection.rect.left * scaleX
    const anchorTop = frameBounds.top + selection.rect.top * scaleY
    const anchorBottom = frameBounds.top + selection.rect.bottom * scaleY
    const menuBounds = menu.getBoundingClientRect()
    const margin = 12
    const left = Math.max(margin, Math.min(
      anchorLeft + selection.rect.width * scaleX / 2 - screenBounds.left - menuBounds.width / 2,
      screen.clientWidth - menuBounds.width - margin,
    ))
    let top = anchorTop - screenBounds.top - menuBounds.height - margin
    if (top < margin) top = anchorBottom - screenBounds.top + margin
    top = Math.max(margin, Math.min(top, screen.clientHeight - menuBounds.height - margin))
    menu.style.left = `${left}px`
    menu.style.top = `${top}px`
    menu.style.visibility = ''
  })
}

function showReaderSelectionMenu(active, cfiRange, contents) {
  const selection = contents.document.getSelection()
  const frame = contents.document.defaultView?.frameElement
  if (!selection || selection.isCollapsed || !frame) return
  const text = selection.toString().trim()
  if (!text) return
  const range = selection.getRangeAt(0)
  const nextSelection = {
    cfiRange,
    text,
    frame,
    rect: range.getBoundingClientRect(),
    token: (active.selectionMenuToken || 0) + 1,
  }
  active.selectionLookupController?.abort()
  active.selectionLookupController = null
  active.selectionMenuToken = nextSelection.token
  active.selection = nextSelection
  $('#reader-selection-quote').textContent = text.length > 240 ? `${text.slice(0, 237)}…` : text
  const isHighlighted = state.highlights.some((highlight) => (
    highlight.bookId === active.record.id && highlight.cfiRange === cfiRange
  ))
  $('#reader-selection-highlight').querySelector('span').textContent = isHighlighted ? 'Remove highlight' : 'Highlight'
  $('#reader-selection-result').hidden = true
  $('#reader-selection-result').textContent = ''
  $('#reader-selection-attribution').hidden = true
  $('#reader-selection-attribution').replaceChildren()
  $('#reader-selection-menu').setAttribute('aria-busy', 'false')
  $('#reader-selection-menu').querySelectorAll('button').forEach((button) => {
    button.disabled = false
  })
  positionReaderSelectionMenu(active, nextSelection)
}

async function copyReaderSelection() {
  const text = state.active?.selection?.text
  if (!text) return
  let copied = false
  let clipboardError
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      copied = true
    }
  } catch (error) {
    clipboardError = error
  }
  if (!copied) {
    const fallback = document.createElement('textarea')
    fallback.value = text
    fallback.setAttribute('readonly', '')
    fallback.style.position = 'fixed'
    fallback.style.opacity = '0'
    try {
      document.body.append(fallback)
      fallback.select()
      copied = document.execCommand('copy')
    } catch (error) {
      clipboardError = error
    }
    fallback.remove()
  }
  if (!copied) {
    console.error('Could not copy selected book text.', clipboardError)
    showToast('Could not copy the selected text.')
    return
  }
  closeReaderSelectionMenu()
  showToast('Selected text copied.')
}

async function toggleReaderSelectionHighlight() {
  const active = state.active
  const selection = active?.selection
  if (!active || !selection) return
  const highlight = state.highlights.find((item) => (
    item.bookId === active.record.id && item.cfiRange === selection.cfiRange
  ))
  const button = $('#reader-selection-highlight')
  button.disabled = true
  try {
    if (highlight) {
      await storeRequest('highlights', 'readwrite', (store) => store.delete(highlight.id))
      state.highlights = state.highlights.filter((item) => item.id !== highlight.id)
      active.rendition.annotations.remove(highlight.cfiRange, 'highlight')
      button.querySelector('span').textContent = 'Highlight'
      showToast('Highlight removed.')
    } else {
      const newHighlight = {
        id: createUuid(),
        bookId: active.record.id,
        cfiRange: selection.cfiRange,
        text: selection.text,
        createdAt: Date.now(),
      }
      await storeRequest('highlights', 'readwrite', (store) => store.add(newHighlight))
      state.highlights.push(newHighlight)
      active.rendition.annotations.highlight(
        newHighlight.cfiRange,
        { text: newHighlight.text },
        undefined,
        'leaf-reader-highlight',
        { fill: '#f4d78f', 'fill-opacity': '0.42' },
      )
      button.querySelector('span').textContent = 'Remove highlight'
      showToast('Highlight saved.')
    }
  } catch (error) {
    console.error('Could not save the reader highlight.', error)
    showToast('Could not save the highlight.')
  } finally {
    button.disabled = false
  }
}

function selectedEnglishDictionaryWord(text) {
  const word = text.trim().replace(/^[^\p{L}\p{N}\p{M}]+|[^\p{L}\p{N}\p{M}]+$/gu, '')
  return word && !/\s/u.test(word) && /^[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*$/u.test(word)
    ? word
    : null
}

async function fetchDictionaryDefinition(word, signal) {
  let response
  try {
    response = await fetch(
      `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}`,
      { signal },
    )
  } catch (error) {
    if (signal.aborted) throw error
    throw new Error('Could not connect to the dictionary service. Check your connection and try again.')
  }

  let data
  try {
    data = await response.json()
  } catch {
    throw new Error('The dictionary service returned an invalid response.')
  }
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : ''
    throw new Error(message || `The dictionary lookup failed (${response.status}).`)
  }
  if (typeof data?.word !== 'string' || !Array.isArray(data.entries)) {
    throw new Error('The dictionary service returned an invalid response.')
  }

  const lines = []
  let definitionCount = 0
  const appendSenses = (senses, partOfSpeech) => {
    for (const sense of senses) {
      if (!sense) continue
      if (typeof sense.definition === 'string') {
        lines.push(`- ${partOfSpeech ? `${partOfSpeech}: ` : ''}${sense.definition}`)
        if (Array.isArray(sense.examples) && sense.examples[0]) {
          lines.push(`  Example: ${sense.examples[0]}`)
        }
        definitionCount += 1
        if (definitionCount >= 6) return
      }
      if (Array.isArray(sense.subsenses)) appendSenses(sense.subsenses, partOfSpeech)
      if (definitionCount >= 6) return
    }
  }

  for (const entry of data.entries) {
    if (!entry) continue
    const pronunciation = Array.isArray(entry.pronunciations)
      ? entry.pronunciations.find((item) => item?.type === 'ipa' && item.text)?.text
      : ''
    if (lines.length === 0) lines.push(pronunciation ? `${data.word} ${pronunciation}` : data.word)
    appendSenses(Array.isArray(entry.senses) ? entry.senses : [], entry.partOfSpeech || '')
    if (definitionCount >= 6) break
  }
  if (!definitionCount) throw new Error(`No English definition was found for "${word}".`)

  const sourceUrl = data.source?.url
  let source
  try {
    source = new URL(sourceUrl)
  } catch {
    throw new Error('The dictionary service did not provide a valid Wiktionary source.')
  }
  if (source.protocol !== 'https:' || source.hostname !== 'en.wiktionary.org') {
    throw new Error('The dictionary service provided an invalid Wiktionary source.')
  }

  const license = data.source?.license
  let licenseUrl = ''
  if (typeof license?.url === 'string') {
    try {
      const parsedLicenseUrl = new URL(license.url)
      if (parsedLicenseUrl.protocol === 'https:') licenseUrl = parsedLicenseUrl.href
    } catch {
      // The definition and source remain usable if license metadata is malformed.
    }
  }
  return { text: lines.join('\n'), sourceUrl: source.href, licenseName: license?.name, licenseUrl }
}

function renderDictionaryDefinition(result, definition) {
  result.textContent = definition.text
}

function renderDictionaryAttribution(attribution, definition) {
  const sourceLink = document.createElement('a')
  sourceLink.href = definition.sourceUrl
  sourceLink.target = '_blank'
  sourceLink.rel = 'noopener noreferrer'
  sourceLink.textContent = 'Wiktionary'

  const providerLink = document.createElement('a')
  providerLink.href = 'https://freedictionaryapi.com/'
  providerLink.target = '_blank'
  providerLink.rel = 'noopener noreferrer'
  providerLink.textContent = 'FreeDictionaryAPI.com'

  const content = [sourceLink, document.createTextNode(' · '), providerLink]
  if (definition.licenseName && definition.licenseUrl) {
    content.push(document.createTextNode(' · '))
    const licenseLink = document.createElement('a')
    licenseLink.href = definition.licenseUrl
    licenseLink.target = '_blank'
    licenseLink.rel = 'noopener noreferrer'
    licenseLink.textContent = definition.licenseName
    content.push(licenseLink)
  }
  attribution.replaceChildren(...content)
}

async function lookupReaderSelection(action) {
  const active = state.active
  const selection = active?.selection
  if (!active || !selection) return
  const result = $('#reader-selection-result')
  const attribution = $('#reader-selection-attribution')
  result.hidden = false
  attribution.hidden = true
  attribution.replaceChildren()
  if (selection.text.length > 5000) {
    result.textContent = 'Select a shorter passage (5,000 characters or fewer) for definition or translation.'
    return
  }
  const dictionaryWord = action === 'definition' ? selectedEnglishDictionaryWord(selection.text) : null
  if (action === 'definition' && !dictionaryWord) {
    result.textContent = 'Select a single English word to look it up in the dictionary.'
    return
  }
  const apiKey = action === 'translation' ? $('#openrouter-key').value.trim() : ''
  const model = action === 'translation' ? $('#openrouter-model').value : ''
  if (action === 'translation' && (!apiKey || !model)) {
    result.textContent = 'Add an OpenRouter API key and choose a model in AI Writer settings to use this action.'
    return
  }

  active.selectionLookupController?.abort()
  const controller = new AbortController()
  active.selectionLookupController = controller
  const menu = $('#reader-selection-menu')
  menu.setAttribute('aria-busy', 'true')
  menu.querySelectorAll('[data-reader-selection-action="definition"], [data-reader-selection-action="translation"]')
    .forEach((button) => { button.disabled = true })
  result.textContent = action === 'definition' ? 'Looking up a definition…' : 'Translating to English…'
  try {
    let response
    if (action === 'definition') {
      response = await fetchDictionaryDefinition(dictionaryWord, controller.signal)
    } else {
      response = await streamOpenRouter({
        apiKey,
        model,
        messages: [
          { role: 'system', content: 'You are a concise reading assistant. Return only the requested translation.' },
          { role: 'user', content: `Translate the selected text into English. Preserve its meaning and tone. If it is already in English, return it unchanged.\n\nSelected text:\n${JSON.stringify(selection.text)}` },
        ],
        maxTokens: 1800,
        signal: controller.signal,
        onUpdate: (text) => {
          if (state.active === active && active.selection === selection) result.textContent = text
        },
      })
    }
    if (state.active === active && active.selection === selection) {
      if (action === 'definition') {
        renderDictionaryDefinition(result, response)
        renderDictionaryAttribution(attribution, response)
        attribution.hidden = false
      } else result.textContent = response
    }
  } catch (error) {
    if (!controller.signal.aborted && state.active === active && active.selection === selection) {
      console.error(`Could not ${action} selected book text.`, error)
      result.textContent = error instanceof Error ? error.message : 'The lookup could not be completed.'
    }
  } finally {
    if (active.selectionLookupController === controller) {
      active.selectionLookupController = null
      menu.setAttribute('aria-busy', 'false')
      menu.querySelectorAll('[data-reader-selection-action="definition"], [data-reader-selection-action="translation"]')
        .forEach((button) => { button.disabled = false })
    }
  }
}

function allowReaderAction(active) {
  const now = Date.now()
  if (now - active.lastReaderActionAt < readerPageTurnThrottleMs) return false
  active.lastReaderActionAt = now
  return true
}

function turnActivePage(direction) {
  const active = state.active
  const rendition = active?.rendition
  if (!rendition || !allowReaderAction(active)) return
  closeReaderSelectionMenu(active)
  if (active.audiobook.status === 'playing' && !active.audiobook.autoAdvancing) {
    stopAudiobookPlayback(active, 'Playback stopped because the page changed.')
  }
  const navigation = direction === 'prev' ? rendition.prev() : rendition.next()
  navigation.catch((error) => console.error('[Leaf page-turn] Navigation failed.', error))
}

function handleReaderTap(x, width) {
  if (!(width > 0)) return
  const position = x / width
  if (position <= 0.3) turnActivePage('prev')
  else if (position >= 0.7) turnActivePage('next')
  else toggleReaderUi()
}

function speechSynthesisAvailable() {
  return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function'
}

function speechVoiceKey(voice) {
  return voice.voiceURI || `${voice.name}|${voice.lang}`
}

const audiobookRates = Array.from({ length: 16 }, (_, index) => (index + 5) / 10)
const browserAudiobookVoicePrefix = 'browser:'
const geminiAudiobookVoicePrefix = 'gemini:'
const geminiAudiobookVoices = [
  'Zephyr',
  'Puck',
  'Charon',
  'Kore',
  'Fenrir',
  'Leda',
  'Orus',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Enceladus',
  'Iapetus',
  'Umbriel',
  'Algieba',
  'Despina',
  'Erinome',
  'Algenib',
  'Rasalgethi',
  'Laomedeia',
  'Achernar',
  'Alnilam',
  'Schedar',
  'Gacrux',
  'Pulcherrima',
  'Achird',
  'Zubenelgenubi',
  'Vindemiatrix',
  'Sadachbia',
  'Sadaltager',
  'Sulafat',
]

function availableAudiobookVoices() {
  return speechSynthesisAvailable()
    ? window.speechSynthesis.getVoices().slice().sort((a, b) => (
      Number(b.default) - Number(a.default) || a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name)
    ))
    : []
}

function renderAudiobookVoices() {
  const voices = availableAudiobookVoices()
  if (
    state.audiobookVoiceURI.startsWith(browserAudiobookVoicePrefix)
    && voices.length
    && !voices.some((voice) => `${browserAudiobookVoicePrefix}${speechVoiceKey(voice)}` === state.audiobookVoiceURI)
  ) {
    state.audiobookVoiceURI = ''
  }
  if (
    state.audiobookVoiceURI.startsWith(geminiAudiobookVoicePrefix)
    && !geminiAudiobookVoices.includes(state.audiobookVoiceURI.slice(geminiAudiobookVoicePrefix.length))
  ) {
    state.audiobookVoiceURI = ''
  }
  renderAudiobookOptions()
}

function selectedAudiobookVoice() {
  if (!speechSynthesisAvailable() || !state.audiobookVoiceURI.startsWith(browserAudiobookVoicePrefix)) return null
  const voiceKey = state.audiobookVoiceURI.slice(browserAudiobookVoicePrefix.length)
  return window.speechSynthesis.getVoices().find((voice) => speechVoiceKey(voice) === voiceKey) || null
}

function selectedGeminiAudiobookVoice() {
  if (!state.audiobookVoiceURI.startsWith(geminiAudiobookVoicePrefix)) return ''
  const voice = state.audiobookVoiceURI.slice(geminiAudiobookVoicePrefix.length)
  return geminiAudiobookVoices.includes(voice) ? voice : ''
}

function audiobookVoiceLabel() {
  const geminiVoice = selectedGeminiAudiobookVoice()
  if (geminiVoice) return `Gemini ${geminiVoice}`
  const browserVoice = selectedAudiobookVoice()
  return browserVoice
    ? browserVoice.lang ? `${browserVoice.name} (${browserVoice.lang})` : browserVoice.name
    : 'Browser default'
}

function renderAudiobookOptions() {
  const voiceButton = $('#audiobook-voice-cycle')
  const voiceLabel = audiobookVoiceLabel()
  const voiceLoading = Boolean(state.active?.audiobook.audioRequest)
  voiceButton.querySelector('span').textContent = voiceLabel
  voiceButton.setAttribute('aria-label', `Voice: ${voiceLabel}. Click to change voice.`)
  voiceButton.title = `Voice: ${voiceLabel}. Click to change voice.`
  voiceButton.classList.toggle('audiobook-player__option-button--loading', voiceLoading)
  voiceButton.setAttribute('aria-busy', String(voiceLoading))

  const speed = `${state.audiobookRate.toFixed(1)}×`
  const speedButton = $('#audiobook-speed-cycle')
  speedButton.querySelector('span').textContent = speed
  speedButton.setAttribute('aria-label', `Reading speed: ${state.audiobookRate.toFixed(1)} times. Click to change speed.`)
  speedButton.title = `Reading speed: ${state.audiobookRate.toFixed(1)} times. Click to change speed.`
}

function setAudiobookVoice(voiceURI) {
  state.audiobookVoiceURI = voiceURI
  const active = state.active
  if (!active?.audiobook.open) {
    renderAudiobookOptions()
    return
  }
  const session = active.audiobook
  const voiceName = audiobookVoiceLabel()
  if (session.autoAdvancing) {
    session.message = session.status === 'playing'
      ? `${voiceName} will be used on the next page.`
      : `${voiceName} selected. Resume to continue with it.`
    renderAudiobookPlayer(active)
    return
  }
  if (!['playing', 'paused'].includes(session.status)) {
    session.message = `${voiceName} selected.`
    renderAudiobookPlayer(active)
    return
  }

  const wasPlaying = session.status === 'playing'
  const startIndex = session.currentCharIndex
  session.generation += 1
  const generation = session.generation
  cancelAudiobookOutput(active)
  session.message = wasPlaying
    ? `Switching to ${voiceName}…`
    : `${voiceName} selected. Resume to hear the new voice.`
  if (wasPlaying) speakAudiobookPage(active, generation, startIndex)
  else renderAudiobookPlayer(active)
}

function cycleAudiobookVoice() {
  const choices = [
    '',
    ...geminiAudiobookVoices.map((voice) => `${geminiAudiobookVoicePrefix}${voice}`),
    ...availableAudiobookVoices().map((voice) => `${browserAudiobookVoicePrefix}${speechVoiceKey(voice)}`),
  ]
  const currentIndex = choices.indexOf(state.audiobookVoiceURI)
  const nextIndex = (currentIndex + 1) % choices.length
  setAudiobookVoice(choices[nextIndex])
}

function cycleAudiobookRate() {
  const currentIndex = audiobookRates.findIndex((rate) => Math.abs(rate - state.audiobookRate) < 0.001)
  state.audiobookRate = audiobookRates[(currentIndex + 1) % audiobookRates.length]
  const active = state.active
  if (!active?.audiobook.open) {
    renderAudiobookOptions()
    return
  }
  const speed = `${state.audiobookRate.toFixed(1)}×`
  if (active.audiobook.audio) active.audiobook.audio.playbackRate = state.audiobookRate
  active.audiobook.message = ['playing', 'paused'].includes(active.audiobook.status)
    ? active.audiobook.audio
      ? `Read speed set to ${speed}.`
      : `Read speed set to ${speed}; it will change on the next page.`
    : `Read speed set to ${speed}.`
  renderAudiobookPlayer(active)
}

function renderAudiobookPlayer(active) {
  if (state.active !== active) return
  const session = active.audiobook
  const button = $('#audiobook-toggle')
  const isPlaying = session.status === 'playing'
  const icon = isPlaying ? 'pause' : 'play'
  button.innerHTML = `<i data-lucide="${icon}"></i>`
  button.setAttribute('aria-label', isPlaying ? 'Pause audiobook' : session.status === 'paused' ? 'Resume audiobook' : 'Play audiobook')
  button.title = isPlaying ? 'Pause audiobook' : session.status === 'paused' ? 'Resume audiobook' : 'Play audiobook'
  button.disabled = !speechSynthesisAvailable() && geminiAudiobookVoices.length === 0
  $('#audiobook-position').textContent = session.position || ''
  renderAudiobookOptions()
  icons()
}

function renderAudiobookTranscript(active, text, placeholder = 'Press play to read from the current page.') {
  const session = active.audiobook
  const textElement = $('#audiobook-text')
  const transcript = $('#audiobook-transcript')
  const fragment = document.createDocumentFragment()
  session.text = text
  session.wordOffsets = []
  session.wordElements = []
  session.activeWordElement = null
  session.currentCharIndex = 0
  session.speechText = ''
  session.speechTextOffset = 0
  session.transcriptSectionIndex = active.rendition.currentLocation()?.start?.index ?? null

  if (!text) {
    textElement.textContent = placeholder
    transcript.scrollTop = 0
    return
  }

  let offset = 0
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue
    if (/^\s+$/.test(part)) {
      fragment.append(document.createTextNode(part))
    } else {
      const word = document.createElement('span')
      word.className = 'audiobook-player__word'
      word.textContent = part
      session.wordOffsets.push({ start: offset, end: offset + part.length })
      session.wordElements.push(word)
      fragment.append(word)
    }
    offset += part.length
  }
  textElement.replaceChildren(fragment)
  transcript.scrollTop = 0
}

function audiobookTranscriptOffset(session, speechText, sectionIndex) {
  if (sectionIndex === null || session.transcriptSectionIndex !== sectionIndex) return null
  if (session.speechText === speechText) return session.speechTextOffset
  const searchStart = session.speechText
    ? session.speechTextOffset + session.speechText.length
    : 0
  const offset = session.text.indexOf(speechText, searchStart)
  return offset === -1 ? null : offset
}

function highlightAudiobookWord(active, charIndex) {
  const session = active.audiobook
  if (!Number.isFinite(charIndex)) return
  let wordIndex = session.wordOffsets.findIndex(({ start, end }) => charIndex >= start && charIndex < end)
  if (wordIndex === -1) wordIndex = session.wordOffsets.findIndex(({ start }) => start >= charIndex)
  if (wordIndex === -1) return

  session.currentCharIndex = Math.max(0, charIndex - session.speechTextOffset)
  const word = session.wordElements[wordIndex]
  if (word === session.activeWordElement) return
  session.activeWordElement?.classList.remove('audiobook-player__word--active')
  session.activeWordElement?.removeAttribute('aria-current')
  word.classList.add('audiobook-player__word--active')
  word.setAttribute('aria-current', 'true')
  session.activeWordElement = word

  const transcript = $('#audiobook-transcript')
  const transcriptBounds = transcript.getBoundingClientRect()
  const wordBounds = word.getBoundingClientRect()
  const transcriptMidpoint = transcriptBounds.top + transcript.clientHeight / 2
  const wordMidpoint = wordBounds.top + wordBounds.height / 2
  if (wordMidpoint > transcriptMidpoint || wordBounds.top < transcriptBounds.top) {
    transcript.scrollTop += wordMidpoint - transcriptMidpoint
  }
}

function syncAudiobookPosition(active, location = active.rendition.currentLocation()) {
  if (!active.audiobook.open) return
  const chapter = $('#chapter-label').textContent.trim()
  const page = $('#page-count-label').textContent.trim()
  const displayedPage = Number(location?.start?.displayed?.page)
  const displayedTotal = Number(location?.start?.displayed?.total)
  const progress = $('#audiobook-chapter-progress')
  const progressFill = $('#audiobook-chapter-progress-fill')
  if (Number.isInteger(displayedPage) && displayedPage > 0 && Number.isInteger(displayedTotal) && displayedTotal > 0) {
    const percentage = Math.min(100, (displayedPage / displayedTotal) * 100)
    progress.hidden = false
    progressFill.style.width = `${percentage}%`
    progress.setAttribute('aria-valuenow', percentage.toFixed(1))
    progress.setAttribute('aria-valuetext', `Page ${displayedPage} of ${displayedTotal}`)
    progress.title = `Current chapter progress: page ${displayedPage} of ${displayedTotal}`
  } else {
    progress.hidden = true
  }
  $('#audiobook-page-count').textContent = page
  active.audiobook.position = chapter
  renderAudiobookPlayer(active)
}

function audiobookCurrentPageText(active) {
  const location = active.rendition.currentLocation()
  if (!location?.start?.cfi || !location.end?.cfi) return ''
  const start = active.rendition.getRange(location.start.cfi)
  const end = active.rendition.getRange(location.end.cfi)
  if (!start || !end || start.startContainer.ownerDocument !== end.endContainer.ownerDocument) return ''
  const range = start.startContainer.ownerDocument.createRange()
  range.setStart(start.startContainer, start.startOffset)
  range.setEnd(end.endContainer, end.endOffset)
  return range.toString().replace(/\s+/g, ' ').trim()
}

function audiobookCurrentTranscriptText(active, pageText) {
  if (!pageText) return pageText
  const location = active.rendition.currentLocation()
  if (!location?.start?.cfi || !location.end?.cfi || location.start.index !== location.end.index) return pageText
  const contents = active.rendition.getContents().find((item) => item.sectionIndex === location.start.index)
  if (!contents) return pageText

  const end = contents.range(location.end.cfi)
  const root = contents.document.body || contents.document.documentElement
  const remainder = contents.document.createRange()
  remainder.setStart(end.endContainer, end.endOffset)
  remainder.setEnd(root, root.childNodes.length)
  const followingText = remainder.toString().replace(/\s+/gu, ' ').trim()
  return followingText ? `${pageText} ${followingText}` : pageText
}

function isCurrentAudiobookRequest(active, generation) {
  return state.active === active
    && active.audiobook.open
    && active.audiobook.generation === generation
    && !$('#audiobook-player').hidden
}

function clearAudiobookAudio(session) {
  if (session.audio) {
    session.audio.onended = null
    session.audio.onerror = null
    session.audio.ontimeupdate = null
    session.audio.pause()
    session.audio.removeAttribute('src')
    session.audio.load()
    session.audio = null
  }
  if (session.audioUrl) {
    URL.revokeObjectURL(session.audioUrl)
    session.audioUrl = null
  }
}

function cancelAudiobookOutput(active) {
  const session = active.audiobook
  const hadUtterance = Boolean(session.utterance)
  session.audioRequest?.abort()
  session.audioRequest = null
  clearAudiobookAudio(session)
  if (hadUtterance && speechSynthesisAvailable()) window.speechSynthesis.cancel()
  session.utterance = null
}

function playGeminiAudiobookAudio(active, generation, audio) {
  audio.play().catch((error) => {
    const session = active.audiobook
    if (!isCurrentAudiobookRequest(active, generation) || session.audio !== audio) return
    if (error?.name === 'NotAllowedError') {
      session.status = 'paused'
      session.message = 'Gemini audio is ready. Press play to start.'
      renderAudiobookPlayer(active)
      showToast('Gemini audio is ready. Press play to start.')
      return
    }
    failAudiobookPlayback(active, error)
  })
}

async function speakGeminiAudiobookPage(active, generation, text, speechStart, transcriptOffset, voice) {
  const session = active.audiobook
  const controller = new AbortController()
  session.audioRequest = controller
  session.message = 'Generating Gemini speech…'
  renderAudiobookPlayer(active)
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, 45_000)
  try {
    const audioBlob = await synthesizeOpenRouterSpeech({
      apiKey: openRouterApiKeyForAudiobook(),
      input: text.slice(speechStart),
      voice,
      signal: controller.signal,
    })
    if (!isCurrentAudiobookRequest(active, generation) || session.audioRequest !== controller) return
    session.audioRequest = null
    const audioUrl = URL.createObjectURL(audioBlob)
    const audio = new Audio(audioUrl)
    session.audioUrl = audioUrl
    session.audio = audio
    audio.preload = 'auto'
    audio.playbackRate = state.audiobookRate
    audio.ontimeupdate = () => {
      if (
        !isCurrentAudiobookRequest(active, generation)
        || session.audio !== audio
        || !Number.isFinite(audio.duration)
        || audio.duration <= 0
      ) return
      const spokenLength = text.length - speechStart
      const progress = Math.min(1, Math.max(0, audio.currentTime / audio.duration))
      const characterIndex = speechStart + Math.min(spokenLength - 1, Math.floor(progress * spokenLength))
      highlightAudiobookWord(active, transcriptOffset + characterIndex)
    }
    audio.onended = () => {
      if (!isCurrentAudiobookRequest(active, generation) || session.audio !== audio) return
      clearAudiobookAudio(session)
      session.currentCharIndex = 0
      advanceAudiobookPage(active, generation).catch((error) => failAudiobookPlayback(active, error))
    }
    audio.onerror = () => {
      if (!isCurrentAudiobookRequest(active, generation) || session.audio !== audio) return
      failAudiobookPlayback(active, new Error('The generated Gemini audio could not be played.'))
    }
    session.message = session.status === 'playing'
      ? 'Reading this page aloud.'
      : 'Gemini audio is ready. Press play to start.'
    renderAudiobookPlayer(active)
    if (session.status === 'playing') playGeminiAudiobookAudio(active, generation, audio)
  } catch (error) {
    if (!isCurrentAudiobookRequest(active, generation)) return
    if (session.audioRequest === controller) session.audioRequest = null
    failAudiobookPlayback(active, timedOut
      ? new Error('Gemini speech generation timed out. Check your connection and try again.')
      : error)
  } finally {
    clearTimeout(timeout)
  }
}

function failAudiobookPlayback(active, error) {
  const session = active.audiobook
  session.generation += 1
  session.status = 'idle'
  session.autoAdvancing = false
  session.message = error instanceof Error ? error.message : 'Audiobook playback could not continue.'
  cancelAudiobookOutput(active)
  console.error('[Leaf audiobook] Playback failed.', error)
  if (state.active === active && session.open) {
    renderAudiobookPlayer(active)
    showToast(session.message)
  }
}

function speakAudiobookPage(active, generation, startIndex = 0) {
  if (!isCurrentAudiobookRequest(active, generation)) return
  const session = active.audiobook
  if (session.status !== 'playing') return
  let text
  let transcriptText
  try {
    text = audiobookCurrentPageText(active)
    transcriptText = audiobookCurrentTranscriptText(active, text)
  } catch (error) {
    failAudiobookPlayback(active, error)
    return
  }
  if (!text) {
    renderAudiobookTranscript(active, '', 'No readable text on this page.')
    session.message = 'No readable text on this page. Turning to the next page…'
    renderAudiobookPlayer(active)
    advanceAudiobookPage(active, generation).catch((error) => failAudiobookPlayback(active, error))
    return
  }

  const sectionIndex = active.rendition.currentLocation()?.start?.index ?? null
  let transcriptOffset = audiobookTranscriptOffset(session, text, sectionIndex)
  if (transcriptOffset === null) {
    renderAudiobookTranscript(active, transcriptText)
    transcriptOffset = 0
  }
  session.transcriptSectionIndex = sectionIndex
  session.speechText = text
  session.speechTextOffset = transcriptOffset
  const speechStart = Number.isFinite(startIndex)
    ? Math.max(0, Math.min(Math.floor(startIndex), text.length - 1))
    : 0
  if (speechStart > 0) highlightAudiobookWord(active, transcriptOffset + speechStart)
  const geminiVoice = selectedGeminiAudiobookVoice()
  if (geminiVoice) {
    speakGeminiAudiobookPage(active, generation, text, speechStart, transcriptOffset, geminiVoice)
    return
  }
  if (!speechSynthesisAvailable()) {
    failAudiobookPlayback(active, new Error('Browser speech is unavailable. Select a Gemini voice to use OpenRouter text-to-speech.'))
    return
  }
  const utterance = new SpeechSynthesisUtterance(text.slice(speechStart))
  const voice = selectedAudiobookVoice()
  if (voice) utterance.voice = voice
  utterance.rate = state.audiobookRate
  session.utterance = utterance
  session.message = 'Reading this page aloud.'
  renderAudiobookPlayer(active)
  utterance.onend = () => {
    if (!isCurrentAudiobookRequest(active, generation)) return
    session.utterance = null
    advanceAudiobookPage(active, generation).catch((error) => failAudiobookPlayback(active, error))
  }
  utterance.onboundary = (event) => {
    if (!isCurrentAudiobookRequest(active, generation)) return
    highlightAudiobookWord(active, transcriptOffset + speechStart + event.charIndex)
  }
  utterance.onerror = (event) => {
    if (!isCurrentAudiobookRequest(active, generation)) return
    failAudiobookPlayback(active, new Error(`Browser speech synthesis reported "${event.error}".`))
  }
  try {
    window.speechSynthesis.speak(utterance)
  } catch (error) {
    failAudiobookPlayback(active, error)
  }
}

async function advanceAudiobookPage(active, generation) {
  if (!isCurrentAudiobookRequest(active, generation)) return
  const session = active.audiobook
  if (session.status !== 'playing') return
  const previousLocation = active.rendition.currentLocation()
  session.autoAdvancing = true
  session.message = 'Turning the page…'
  renderAudiobookPlayer(active)
  try {
    await active.rendition.next()
    await new Promise((resolve) => requestAnimationFrame(resolve))
  } catch (error) {
    session.autoAdvancing = false
    if (isCurrentAudiobookRequest(active, generation)) failAudiobookPlayback(active, error)
    return
  }
  if (!isCurrentAudiobookRequest(active, generation)) return
  const nextLocation = active.rendition.currentLocation()
  session.autoAdvancing = false
  if (
    !nextLocation?.start?.cfi
    || (nextLocation.start.cfi === previousLocation?.start?.cfi && nextLocation.end?.cfi === previousLocation?.end?.cfi)
  ) {
    session.status = 'ended'
    session.currentCharIndex = 0
    session.message = 'You have reached the end of the book.'
    renderAudiobookPlayer(active)
    return
  }
  session.currentCharIndex = 0
  if (session.status !== 'playing') {
    try {
      const pageText = audiobookCurrentPageText(active)
      const transcriptText = audiobookCurrentTranscriptText(active, pageText)
      renderAudiobookTranscript(active, transcriptText, 'No readable text on this page.')
    } catch (error) {
      failAudiobookPlayback(active, error)
      return
    }
    session.message = 'Paused.'
    renderAudiobookPlayer(active)
    return
  }
  speakAudiobookPage(active, generation)
}

function stopAudiobookPlayback(active, message = 'Playback stopped.') {
  const session = active.audiobook
  session.generation += 1
  cancelAudiobookOutput(active)
  session.autoAdvancing = false
  session.status = 'idle'
  session.message = message
  renderAudiobookPlayer(active)
}

async function skipAudiobookPage(direction) {
  const active = state.active
  if (!active || !active.audiobook.open) return
  const session = active.audiobook
  const wasPlaying = session.status === 'playing'
  const wasPaused = session.status === 'paused'
  session.generation += 1
  const generation = session.generation
  cancelAudiobookOutput(active)
  session.autoAdvancing = true
  session.status = wasPlaying ? 'playing' : wasPaused ? 'paused' : 'idle'
  session.message = direction === 'prev' ? 'Going to the previous page…' : 'Skipping to the next page…'
  renderAudiobookPlayer(active)
  const previousLocation = active.rendition.currentLocation()

  try {
    await (direction === 'prev' ? active.rendition.prev() : active.rendition.next())
    await new Promise((resolve) => requestAnimationFrame(resolve))
  } catch (error) {
    session.autoAdvancing = false
    if (isCurrentAudiobookRequest(active, generation)) failAudiobookPlayback(active, error)
    return
  }
  if (!isCurrentAudiobookRequest(active, generation)) return

  const nextLocation = active.rendition.currentLocation()
  session.autoAdvancing = false
  const changed = nextLocation?.start?.cfi
    && (nextLocation.start.cfi !== previousLocation?.start?.cfi || nextLocation.end?.cfi !== previousLocation?.end?.cfi)
  if (!changed && direction === 'next') {
    session.status = 'ended'
    session.message = 'You have reached the end of the book.'
    renderAudiobookPlayer(active)
    return
  }
  if (session.status === 'playing') {
    speakAudiobookPage(active, generation)
    return
  }

  try {
    const pageText = audiobookCurrentPageText(active)
    const transcriptText = audiobookCurrentTranscriptText(active, pageText)
    renderAudiobookTranscript(active, transcriptText, 'No readable text on this page.')
  } catch (error) {
    failAudiobookPlayback(active, error)
    return
  }
  const remainsPaused = session.status === 'paused'
  session.status = remainsPaused ? 'paused' : 'idle'
  session.message = changed
    ? remainsPaused ? 'New page loaded. Resume when ready.' : 'New page loaded. Press play to listen.'
    : 'You are already at the first page.'
  renderAudiobookPlayer(active)
}

function toggleAudiobookPlayback() {
  const active = state.active
  if (!active || !active.audiobook.open) return
  const session = active.audiobook
  if (!speechSynthesisAvailable() && !selectedGeminiAudiobookVoice()) {
    session.message = 'Select a Gemini voice to use OpenRouter text-to-speech in this browser.'
    renderAudiobookPlayer(active)
    return
  }

  if (session.status === 'playing') {
    if (session.audio) session.audio.pause()
    else if (session.utterance && speechSynthesisAvailable() && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause()
    }
    session.status = 'paused'
    session.message = 'Paused.'
    renderAudiobookPlayer(active)
    return
  }
  if (session.status === 'paused') {
    session.status = 'playing'
    session.message = session.audioRequest ? 'Generating Gemini speech…' : 'Reading this page aloud.'
    if (session.audio) playGeminiAudiobookAudio(active, session.generation, session.audio)
    else if (session.utterance && speechSynthesisAvailable()) window.speechSynthesis.resume()
    else if (!session.autoAdvancing && !session.audioRequest) {
      speakAudiobookPage(active, session.generation, session.currentCharIndex)
    }
    renderAudiobookPlayer(active)
    return
  }

  session.generation += 1
  session.status = 'playing'
  session.currentCharIndex = 0
  session.message = 'Starting audiobook…'
  renderAudiobookPlayer(active)
  speakAudiobookPage(active, session.generation)
}

async function openAudiobookPlayer() {
  const active = state.active
  if (!active) return
  setReaderSettingsOpen(false)
  $('#toc-panel').hidden = true
  $('#bookmark-panel').hidden = true
  $('#bookmarks-button').setAttribute('aria-expanded', 'false')
  const session = active.audiobook
  session.open = true
  session.position = ''
  if (!speechSynthesisAvailable() && !selectedGeminiAudiobookVoice()) {
    state.audiobookVoiceURI = `${geminiAudiobookVoicePrefix}${geminiAudiobookVoices[0]}`
  }
  session.message = speechSynthesisAvailable()
    ? 'Ready to read from the current page.'
    : 'Gemini voices are available; playback requires an OpenRouter API key.'
  $('#audiobook-title').textContent = active.record.title
  $('#audiobook-author').textContent = active.record.author || ''
  $('#audiobook-player').hidden = false
  $('#audiobook-button').setAttribute('aria-expanded', 'true')
  $('#audiobook-background').style.backgroundImage = ''
  $('#audiobook-cover').style.backgroundImage = ''
  renderAudiobookVoices()
  const location = active.rendition.currentLocation()
  if (location?.start) updateReadingPosition(location)
  try {
    const pageText = audiobookCurrentPageText(active)
    const transcriptText = audiobookCurrentTranscriptText(active, pageText)
    renderAudiobookTranscript(active, transcriptText, 'No readable text on this page.')
  } catch (error) {
    console.error('[Leaf audiobook] Could not load transcript text.', error)
    renderAudiobookTranscript(active, '', 'The current page text could not be loaded.')
    showToast('Could not load the audiobook transcript.')
  }
  syncAudiobookPosition(active, location)
  renderAudiobookPlayer(active)
  showReaderUi()
  $('#audiobook-close').focus()

  try {
    const coverUrl = await active.book.coverUrl()
    if (state.active !== active || !session.open || !coverUrl) return
    const coverImage = `url("${coverUrl}")`
    $('#audiobook-background').style.backgroundImage = coverImage
    $('#audiobook-cover').style.backgroundImage = coverImage
  } catch (error) {
    console.error('[Leaf audiobook] Could not load the book cover.', error)
    if (state.active === active && session.open) {
      session.message = 'Ready to read from the current page. The cover could not be loaded.'
      renderAudiobookPlayer(active)
      showToast('Audiobook opened without the book cover.')
    }
  }
}

function closeAudiobookPlayer(restoreFocus = true) {
  const active = state.active
  if (active) {
    stopAudiobookPlayback(active)
    active.audiobook.open = false
  }
  $('#audiobook-player').hidden = true
  $('#audiobook-button').setAttribute('aria-expanded', 'false')
  if (restoreFocus && active) {
    $('#audiobook-button').focus()
    showReaderUi()
  }
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
    measurementBook.spine.hooks.content.register(sanitizeEpubContent)
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

function sanitizeEpubContent(document) {
  document.querySelectorAll('script').forEach((script) => script.remove())
  document.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach(({ name, value }) => {
      const attributeName = name.toLowerCase()
      const isExecutableUrl = ['href', 'src', 'xlink:href', 'action', 'formaction'].includes(attributeName)
        && /^\s*javascript:/i.test(value)
      if (attributeName.startsWith('on') || isExecutableUrl) element.removeAttribute(name)
    })
  })
}

function cancelAiStoryBackground(active) {
  active.aiBackgroundRequest?.controller.abort()
  active.aiBackgroundRequest = null
}

function clearAiStoryBackgroundCache(active) {
  active.aiBackgroundObjectUrls.forEach((url) => URL.revokeObjectURL(url))
  active.aiBackgroundObjectUrls.clear()
  active.aiBackgroundByPage.clear()
  active.aiBackgroundRanges.length = 0
  active.aiBackgroundUrl = null
}

function destroyAiStoryBackgrounds(active) {
  cancelAiStoryBackground(active)
  clearAiStoryBackgroundCache(active)
}

function isCurrentAiStoryRequest(active, request) {
  return state.active === active
    && active.aiBackgroundRequest === request
    && !request.controller.signal.aborted
    && state.readerPreferences.theme === aiStoryReaderTheme
}

async function collectAiStoryPageText(active, startCfi, request) {
  const readerFrame = $('#epub-frame')
  const width = readerFrame.clientWidth
  const height = readerFrame.clientHeight
  if (width < 1 || height < 1) throw new Error('The reader is not ready to prepare an AI background.')

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

  let backgroundBook
  let backgroundRendition
  try {
    backgroundBook = ePub(active.record.data)
    await backgroundBook.ready
    backgroundBook.spine.hooks.content.register(sanitizeEpubContent)
    backgroundRendition = backgroundBook.renderTo(container, {
      width,
      height,
      spread: 'none',
      flow: 'paginated',
      allowScriptedContent: false,
    })
    applyRenditionReaderTheme(backgroundRendition, state.readerPreferences)
    await backgroundRendition.display(startCfi)

    const pages = []
    const seenPageCfis = new Set()
    for (let pageIndex = 0; pageIndex < 10; pageIndex += 1) {
      if (!isCurrentAiStoryRequest(active, request)) return pages
      const location = backgroundRendition.currentLocation()
      if (!location?.start?.cfi || !location.end?.cfi) {
        throw new Error('Could not locate the text for the next reader page.')
      }
      const pageCfi = String(location.start.cfi)
      if (seenPageCfis.has(pageCfi)) break
      seenPageCfis.add(pageCfi)

      const contents = backgroundRendition.getContents().find((item) => item.sectionIndex === location.start.index)
      if (!contents || location.end.index !== location.start.index) {
        throw new Error('Could not read a page range from this EPUB.')
      }
      const startRange = contents.range(location.start.cfi)
      const endRange = contents.range(location.end.cfi)
      const pageRange = contents.document.createRange()
      pageRange.setStart(startRange.startContainer, startRange.startOffset)
      pageRange.setEnd(endRange.startContainer, endRange.startOffset)
      pages.push({
        cfi: pageCfi,
        endCfi: String(location.end.cfi),
        text: pageRange.toString().replace(/\s+/gu, ' ').trim(),
      })

      if (location.atEnd || pageIndex === 9) break
      await backgroundRendition.next()
    }
    return pages
  } finally {
    try {
      backgroundRendition?.destroy()
    } finally {
      try {
        backgroundBook?.destroy()
      } finally {
        container.remove()
      }
    }
  }
}

function ensureAiStoryBackground(active, location) {
  if (state.active !== active || state.readerPreferences.theme !== aiStoryReaderTheme || !location?.start?.cfi) return

  const startCfi = String(location.start.cfi)
  const cachedImage = active.aiBackgroundByPage.get(startCfi)
  if (cachedImage) {
    if (active.aiBackgroundUrl !== cachedImage) {
      active.aiBackgroundUrl = cachedImage
      applyReaderTheme()
    }
    return
  }
  const cfiComparer = new EpubCFI()
  const cachedRange = active.aiBackgroundRanges.find((range) =>
    cfiComparer.compare(range.startCfi, startCfi) <= 0
    && cfiComparer.compare(startCfi, range.endCfi) <= 0)
  if (cachedRange) {
    active.aiBackgroundByPage.set(startCfi, cachedRange.url)
    if (active.aiBackgroundUrl !== cachedRange.url) {
      active.aiBackgroundUrl = cachedRange.url
      applyReaderTheme()
    }
    return
  }
  if (active.aiBackgroundRequest || Date.now() < active.aiBackgroundRetryAfter) return

  let apiKey
  try {
    apiKey = localStorage.getItem(openRouterKeyStorageKey)?.trim()
  } catch (error) {
    console.error('Could not read the OpenRouter API key for an AI reader background.', error)
    showToast('Could not access the saved OpenRouter key. Re-enter it in the AI Writer settings.')
    return
  }
  if (!apiKey) {
    if (!active.aiBackgroundKeyWarningShown) {
      showToast('Add an OpenRouter key in AI Writer settings to use the AI Story theme.')
      active.aiBackgroundKeyWarningShown = true
    }
    return
  }

  active.aiBackgroundKeyWarningShown = false
  const request = { startCfi, controller: new AbortController() }
  active.aiBackgroundRequest = request
  showToast('Generating a story background for the next 10 pages...')

  const generateBackground = async () => {
    const pages = await collectAiStoryPageText(active, startCfi, request)
    if (!isCurrentAiStoryRequest(active, request)) return
    const passage = pages
      .filter((page) => page.text)
      .map((page, index) => `Page ${index + 1}: ${page.text.slice(0, 350)}`)
      .join('\n')
    if (!passage) throw new Error('No readable text was found in the next pages.')

    const prompt = [
      `Create a quiet, atmospheric, text-free illustration to use as a subtle background while reading "${active.record.title}".`,
      'Use a soft, low-contrast composition with no lettering, logos, or watermark. Keep details away from the center and preserve clear readability for text overlaid on the image.',
      'Illustrate the setting, mood, and imagery suggested by this passage from up to the next ten pages:',
      passage,
    ].join('\n\n')
    const image = await generateOpenRouterImage({
      apiKey,
      prompt,
      signal: request.controller.signal,
    })
    if (!isCurrentAiStoryRequest(active, request)) return

    const backgroundUrl = URL.createObjectURL(new Blob([image.data], { type: image.mediaType }))
    active.aiBackgroundObjectUrls.add(backgroundUrl)
    pages.forEach((page) => active.aiBackgroundByPage.set(page.cfi, backgroundUrl))
    active.aiBackgroundByPage.set(startCfi, backgroundUrl)
    active.aiBackgroundRanges.push({
      startCfi,
      endCfi: pages[pages.length - 1].endCfi,
      url: backgroundUrl,
    })
  }

  void generateBackground().catch((error) => {
    if (request.controller.signal.aborted) return
    active.aiBackgroundRetryAfter = Date.now() + 30_000
    const reason = error instanceof Error ? error.message : String(error)
    console.error('Could not generate an AI story background.', error)
    showToast(reason ? `AI background could not be generated: ${reason}` : 'AI background could not be generated.')
  }).finally(() => {
    if (active.aiBackgroundRequest === request) active.aiBackgroundRequest = null
    if (state.active !== active || state.readerPreferences.theme !== aiStoryReaderTheme || request.controller.signal.aborted) return

    ensureAiStoryBackground(active, active.rendition.currentLocation())
  })
}

async function openBook(id) {
  const record = state.books.find((book) => book.id === id)
  if (!record) return
  closeReaderSelectionMenu()
  clearReaderUiTimer()
  if (state.active) {
    closeAudiobookPlayer(false)
    cancelBookPageCount(state.active)
    destroyAiStoryBackgrounds(state.active)
    state.active.rendition.destroy()
    state.active.book.destroy()
  }
  const book = ePub(record.data)
  await book.ready
  book.spine.hooks.content.register(sanitizeEpubContent)
  const rendition = book.renderTo('epub-frame', {
    width: '100%',
    height: '100%',
    spread: 'none',
    flow: 'paginated',
    allowScriptedContent: false,
  })
  const active = {
    book,
    rendition,
    record,
    lastReaderActionAt: 0,
    pageCountOffsets: null,
    pageCountTotal: null,
    pageCountToken: 0,
    pageCountTimer: null,
    pageCountQueue: Promise.resolve(),
    pageCountObserver: null,
    pageCountResizeHandler: null,
    selection: null,
    selectionLookupController: null,
    selectionMenuToken: 0,
    aiBackgroundByPage: new Map(),
    aiBackgroundRanges: [],
    aiBackgroundObjectUrls: new Set(),
    aiBackgroundUrl: null,
    aiBackgroundRequest: null,
    aiBackgroundRetryAfter: 0,
    aiBackgroundKeyWarningShown: false,
    audiobook: {
      open: false,
      status: 'idle',
      message: '',
      position: '',
      generation: 0,
      utterance: null,
      audio: null,
      audioUrl: null,
      audioRequest: null,
      autoAdvancing: false,
      text: '',
      wordOffsets: [],
      wordElements: [],
      activeWordElement: null,
      currentCharIndex: 0,
      speechText: '',
      speechTextOffset: 0,
      transcriptSectionIndex: null,
    },
  }
  state.active = active
  for (const highlight of state.highlights.filter((item) => item.bookId === record.id)) {
    if (typeof highlight.cfiRange !== 'string') continue
    rendition.annotations.highlight(
      highlight.cfiRange,
      { text: highlight.text },
      undefined,
      'leaf-reader-highlight',
      { fill: '#f4d78f', 'fill-opacity': '0.42' },
    )
  }
  const pageDocuments = new WeakSet()
  const readerFrame = $('#epub-frame')
  const dispatchStageGesture = (detail) => {
    if (state.active !== active) return
    readerStage.dispatchEvent(new CustomEvent('reader-gesture', { detail }))
  }
  const pageXInStage = (pageFrame, pageX) => {
    const frameBounds = pageFrame.getBoundingClientRect()
    const stageBounds = readerStage.getBoundingClientRect()
    const scaleX = pageFrame.clientWidth ? frameBounds.width / pageFrame.clientWidth : 1
    return frameBounds.left + pageX * scaleX - stageBounds.left
  }
  rendition.on('selected', (cfiRange, contents) => {
    if (state.active === active) showReaderSelectionMenu(active, cfiRange, contents)
  })
  rendition.on('rendered', (_section, view) => {
    const pageDocument = view.contents?.document
    const pageFrame = view.iframe
    if (!pageDocument || !pageFrame) {
      showToast('Reader navigation could not be prepared for this page.')
      return
    }
    if (pageDocuments.has(pageDocument)) return
    pageDocuments.add(pageDocument)
    let touchStart = null
    let suppressedTouchClick = null
    let mousePressAt = 0
    let pendingMouseTap = null
    pageDocument.addEventListener('pointerdown', (event) => {
      closeReaderSelectionMenu(active)
      clearTimeout(pendingMouseTap)
      pendingMouseTap = null
      if (event.pointerType === 'mouse' && event.button === 0) {
        mousePressAt = Date.now()
      } else {
        mousePressAt = 0
      }
    }, { capture: true })
    pageDocument.addEventListener('touchstart', (event) => {
      if (event.touches.length !== 1) {
        touchStart = null
        return
      }
      const touch = event.touches[0]
      touchStart = { x: touch.clientX, y: touch.clientY, startedAt: Date.now() }
    }, { capture: true, passive: true })
    pageDocument.addEventListener('touchmove', (event) => {
      if (!touchStart) return
      const selection = pageDocument.getSelection()
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        return
      }
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
      const selection = pageDocument.getSelection()
      const suppressClick = () => {
        suppressedTouchClick = { x: touch.clientX, y: touch.clientY, expiresAt: Date.now() + 500 }
      }
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        suppressClick()
        return
      }
      const deltaX = touch.clientX - start.x
      const deltaY = touch.clientY - start.y
      const swipeThreshold = Math.max(20, pageFrame.clientWidth * 0.04)
      if (Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
        dispatchStageGesture({ type: 'swipe', direction: deltaX < 0 ? 'next' : 'prev' })
        suppressClick()
      } else if (Math.abs(deltaX) <= 12 && Math.abs(deltaY) <= 12) {
        suppressClick()
        if (Date.now() - start.startedAt < 450) {
          dispatchStageGesture({
            type: 'tap',
            x: pageXInStage(pageFrame, touch.clientX),
            width: readerStage.clientWidth,
          })
        }
      } else {
        suppressClick()
      }
    }, { capture: true, passive: true })
    pageDocument.addEventListener('touchcancel', () => {
      touchStart = null
    }, { capture: true, passive: true })
    pageDocument.addEventListener('contextmenu', (event) => {
      const selection = pageDocument.getSelection()
      if (selection && !selection.isCollapsed && selection.toString().trim()) event.preventDefault()
    })
    pageDocument.addEventListener('click', (event) => {
      if (suppressedTouchClick) {
        const { x, y, expiresAt } = suppressedTouchClick
        suppressedTouchClick = null
        const isTouchClick = event.pointerType && event.pointerType !== 'mouse'
        const matchesTouch = Math.abs(event.clientX - x) < 32 && Math.abs(event.clientY - y) < 32
        if (Date.now() < expiresAt && (isTouchClick || (!event.pointerType && matchesTouch))) return
      }
      if (event.pointerType && event.pointerType !== 'mouse') return
      if (event.button !== 0 || event.detail === 0) return
      const selection = pageDocument.getSelection()
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        clearTimeout(pendingMouseTap)
        pendingMouseTap = null
        return
      }
      if (event.detail > 1) {
        clearTimeout(pendingMouseTap)
        pendingMouseTap = null
        return
      }
      const pressDuration = mousePressAt ? Date.now() - mousePressAt : 0
      mousePressAt = 0
      if (pressDuration >= 450) return
      clearTimeout(pendingMouseTap)
      pendingMouseTap = setTimeout(() => {
        pendingMouseTap = null
        if (state.active !== active) return
        const currentSelection = pageDocument.getSelection()
        if (currentSelection && !currentSelection.isCollapsed && currentSelection.toString().trim()) return
        dispatchStageGesture({
          type: 'tap',
          x: pageXInStage(pageFrame, event.clientX),
          width: readerStage.clientWidth,
        })
      }, 220)
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
  const highlights = state.highlights
    .filter((highlight) => highlight.bookId === state.active.record.id)
    .sort((first, second) => second.createdAt - first.createdAt)
  const bookmarkItems = records.map((bookmark) => `
    <div class="bookmark-item">
      <button class="chapter-link bookmark-link" type="button" data-bookmark-cfi="${escapeHtml(bookmark.cfi)}">
        <span>${escapeHtml(bookmark.chapter || 'Reading')}</span><small>${Number.isFinite(bookmark.percentage) ? `${bookmark.percentage}%` : '—%'}</small>
      </button>
      <button class="icon-button bookmark-remove" type="button" data-bookmark-remove="${escapeHtml(bookmark.id)}" aria-label="Remove bookmark" title="Remove bookmark"><i data-lucide="x"></i></button>
    </div>`).join('')
  const highlightItems = highlights.map((highlight) => `
    <div class="bookmark-item">
      <button class="chapter-link bookmark-link highlight-link" type="button" data-highlight-cfi="${escapeHtml(highlight.cfiRange)}" aria-label="Go to highlight: ${escapeHtml(highlight.text)}">
        <i data-lucide="highlighter" aria-hidden="true"></i><span>${escapeHtml(highlight.text.replace(/\s+/g, ' ').trim())}</span>
      </button>
      <button class="icon-button bookmark-remove" type="button" data-highlight-remove="${escapeHtml(highlight.id)}" aria-label="Remove highlight" title="Remove highlight"><i data-lucide="x"></i></button>
    </div>`).join('')
  $('#bookmark-list').innerHTML = `
    ${bookmarkItems || '<p class="toc-empty">No bookmarks in this book yet.</p>'}
    <h3 class="bookmark-section-title">Highlights <small>${highlights.length}</small></h3>
    ${highlightItems || '<p class="toc-empty">No highlights saved in this book yet.</p>'}`
  icons()
  syncBookmarkButton(state.active.rendition.currentLocation()?.start?.cfi)
}

async function navigateToHighlight(rendition, cfiRange) {
  const highlightStart = new EpubCFI(cfiRange)
  highlightStart.collapse(true)
  const targetCfi = highlightStart.toString()
  const cfiComparator = new EpubCFI()

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await rendition.display(targetCfi)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    const location = rendition.currentLocation()
    if (!location?.start?.cfi || !location.end?.cfi) continue
    if (
      cfiComparator.compare(location.start.cfi, targetCfi) <= 0
      && cfiComparator.compare(targetCfi, location.end.cfi) <= 0
    ) return
  }

  throw new Error('The reader did not reach the selected highlight.')
}

function syncBookmarkButton(cfi) {
  const isBookmarked = Boolean(state.active && state.bookmarks.some((bookmark) => bookmark.bookId === state.active.record.id && bookmark.cfi === cfi))
  const button = $('#bookmark-current')
  const label = isBookmarked ? 'Remove bookmark' : 'Add bookmark'
  button.title = label
  button.setAttribute('aria-label', label)
  button.setAttribute('aria-pressed', String(isBookmarked))
  button.querySelector('span').textContent = label
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
  syncAudiobookPosition(state.active, location)
  syncBookmarkButton(location.start.cfi)
  if (state.readerPreferences.theme === aiStoryReaderTheme) ensureAiStoryBackground(state.active, location)
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
  if (name === 'theme' && state.active) {
    if (value === aiStoryReaderTheme) {
      state.active.aiBackgroundRetryAfter = 0
      state.active.aiBackgroundKeyWarningShown = false
    } else {
      cancelAiStoryBackground(state.active)
      state.active.aiBackgroundUrl = null
    }
  }
  applyReaderTheme()
  if (name === 'theme' && value === aiStoryReaderTheme && state.active) {
    ensureAiStoryBackground(state.active, state.active.rendition.currentLocation())
  }
  if (['fontSize', 'font', 'lineHeight'].includes(name)) requestBookPageCount()
}

function readerThemeBackgroundImage(colors, aiBackgroundUrl, aiBackgroundOpacity) {
  if (colors.aiStory && aiBackgroundUrl) {
    const themeOverlayOpacity = 100 - aiBackgroundOpacity
    const overlay = `color-mix(in srgb, ${colors.background} ${themeOverlayOpacity}%, transparent)`
    return `linear-gradient(${overlay}, ${overlay}), url("${aiBackgroundUrl}")`
  }
  if (colors.backgroundGradient) return colors.backgroundGradient
  return colors.backgroundImage ? `url("${colors.backgroundImage}")` : 'none'
}

function readerThemeColors(themeName, aiBackgroundMode) {
  const theme = readerThemes[themeName]
  return theme.aiStory ? { ...theme, ...aiStoryThemeModes[aiBackgroundMode] } : theme
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
  const colors = readerThemeColors(preferences.theme, preferences.aiBackgroundMode)
  const aiBackgroundUrl = colors.aiStory ? state.active?.aiBackgroundUrl : null
  const backgroundImage = readerThemeBackgroundImage(colors, aiBackgroundUrl, preferences.aiBackgroundOpacity)
  const backgroundSize = aiBackgroundUrl ? '100% 100%, cover' : colors.backgroundImage ? '320px 360px' : colors.backgroundGradient ? '100% 100%' : 'auto'
  const backgroundRepeat = aiBackgroundUrl || colors.backgroundGradient ? 'no-repeat' : 'repeat'
  const backgroundPosition = aiBackgroundUrl ? 'center' : '0 0'
  $('#reader-font-size').value = preferences.fontSize
  $('#reader-font-size-value').textContent = `${preferences.fontSize}%`
  $('#reader-ai-background-opacity').value = preferences.aiBackgroundOpacity
  $('#reader-ai-background-opacity-value').textContent = `${preferences.aiBackgroundOpacity}%`
  $('#reader-ai-background-opacity-setting').hidden = !colors.aiStory
  $('#reader-ai-background-mode').value = preferences.aiBackgroundMode
  $('#reader-ai-background-mode-setting').hidden = !colors.aiStory
  $('#reader-font-family').value = preferences.font
  document.querySelectorAll('[data-reader-line-height]').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.readerLineHeight) === preferences.lineHeight))
  })
  const preview = $('#reader-font-preview')
  const previewText = $('#reader-font-preview-text')
  preview.style.setProperty('--reader-preview-background', colors.background)
  preview.style.setProperty('--reader-preview-color', colors.color)
  preview.style.backgroundImage = backgroundImage
  preview.style.backgroundSize = aiBackgroundUrl ? '100% 100%, cover' : colors.backgroundImage ? '320px 360px' : colors.backgroundGradient ? '100% 100%' : ''
  preview.style.backgroundRepeat = aiBackgroundUrl || colors.backgroundGradient ? 'no-repeat' : 'repeat'
  previewText.style.fontFamily = readerFonts[preferences.font]
  previewText.style.fontSize = `${preferences.fontSize}%`
  previewText.style.lineHeight = String(preferences.lineHeight)
  document.querySelectorAll('[data-reader-theme]').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.readerTheme === preferences.theme))
    const theme = readerThemes[button.dataset.readerTheme]
    const themeColors = readerThemeColors(button.dataset.readerTheme, preferences.aiBackgroundMode)
    const themeImage = theme.aiStory ? state.active?.aiBackgroundUrl : theme.backgroundImage
    button.style.setProperty('--reader-theme-background', themeColors.background)
    button.style.setProperty('--reader-theme-color', themeColors.color)
    button.style.setProperty('--reader-theme-image', themeImage
      ? `url("${themeImage}")`
      : theme.aiStory
        ? 'linear-gradient(135deg, #E6D3B3, #C5D0BB, #8498A6)'
        : theme.backgroundGradient || 'none')
  })
  const shell = app.querySelector('.app-shell')
  shell.style.setProperty('--reader-app-background', colors.background)
  shell.style.setProperty('--reader-app-color', colors.color)
  shell.style.setProperty('--reader-app-background-image', backgroundImage)
  shell.style.setProperty('--reader-app-background-size', backgroundSize)
  shell.style.setProperty('--reader-app-background-repeat', backgroundRepeat)
  shell.style.setProperty('--reader-app-background-position', backgroundPosition)
  const screen = $('#reader-screen')
  screen.dataset.theme = preferences.theme
  screen.style.setProperty('--reader-app-background', colors.background)
  screen.style.setProperty('--reader-app-color', colors.color)
  screen.style.setProperty('--reader-toolbar-background', colors.background)
  screen.style.setProperty('--reader-paper-background', colors.background)
  screen.style.setProperty('--reader-frame-border', colors.background)
  screen.dataset.themeMode = colors.dark ? 'dark' : 'light'
  const themeColorMeta = document.querySelector('meta[name="theme-color"]')
  if (themeColorMeta) themeColorMeta.content = colors.background
  if (!state.active) return
  applyRenditionReaderTheme(state.active.rendition, preferences)
}

function applyRenditionReaderTheme(rendition, preferences) {
  const colors = readerThemeColors(preferences.theme, preferences.aiBackgroundMode)
  rendition.themes.default({
    html: {
      'background-color': 'transparent !important',
      'background-image': 'none !important',
    },
    body: {
      'font-family': `${readerFonts[preferences.font]} !important`,
      'font-size': `${preferences.fontSize}% !important`,
      'line-height': `${preferences.lineHeight} !important`,
      color: `${colors.color} !important`,
      'background-color': 'transparent !important',
      'background-image': 'none !important',
      padding: '16px 4% !important',
      'user-select': 'text !important',
      '-webkit-user-select': 'text !important',
      '-webkit-touch-callout': 'none !important',
      'touch-action': 'pan-y !important',
    },
  })
  rendition.themes.fontSize(`${preferences.fontSize}%`)
}

function closeReader() {
  clearReaderUiTimer()
  closeReaderSelectionMenu()
  closeAudiobookPlayer(false)
  if (state.active) {
    cancelBookPageCount(state.active)
    destroyAiStoryBackgrounds(state.active)
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

function toggleReaderUi() {
  const screen = $('#reader-screen')
  const active = state.active
  if (!active || screen.hidden || !allowReaderAction(active)) return
  if (screen.classList.contains('reader-screen--ui-hidden')) {
    screen.classList.remove('reader-screen--ui-hidden')
    scheduleReaderUiHide()
  } else {
    clearTimeout(readerUiTimer)
    readerUiTimer = null
    screen.classList.add('reader-screen--ui-hidden')
  }
}

function readerNavigationPanelOpen() {
  return !$('#reader-settings').hidden || !$('#toc-panel').hidden || !$('#bookmark-panel').hidden || !$('#audiobook-player').hidden
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
$('#revise-outline').addEventListener('click', () => reviseOutline())
$('#generate-chapter').addEventListener('click', () => requestDraft('chapter'))
$('#stop-chapter-generation').addEventListener('click', stopChapterGeneration)
$('#undo-chapter').addEventListener('click', undoGeneratedChapter)
$('#remove-chapter').addEventListener('click', removeCurrentChapter)
$('#save-draft').addEventListener('click', handleWriterBookSave)
$('#toggle-key').addEventListener('click', (event) => {
  const input = $('#openrouter-key')
  const visible = input.type === 'password'
  input.type = visible ? 'text' : 'password'
  event.currentTarget.setAttribute('aria-label', visible ? 'Hide API key' : 'Show API key')
  event.currentTarget.title = visible ? 'Hide API key' : 'Show API key'
  event.currentTarget.innerHTML = `<i data-lucide="${visible ? 'eye-off' : 'eye'}"></i>`
  icons()
})
restoreOpenRouterApiKey()
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
  persistOpenRouterApiKey(true)
  updateWriterControls()
})
$('#openrouter-key').addEventListener('change', persistOpenRouterApiKey)
$('#openrouter-key').addEventListener('blur', persistOpenRouterApiKey)
$('#openrouter-key').addEventListener('focus', restoreOpenRouterApiKey)
window.addEventListener('pagehide', persistOpenRouterApiKey)
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
  if (state.writer.chapterPromptScope === 'all') state.writer.allChapterPrompt = $('#chapter-prompt').value
  else if (chapter) chapter.prompt = $('#chapter-prompt').value
  scheduleWriterAutosave()
})
$('#chapter-prompt-current').addEventListener('click', () => setChapterPromptScope('current'))
$('#chapter-prompt-all').addEventListener('click', () => setChapterPromptScope('all'))
$('#chapter-prompt-toggle').addEventListener('click', toggleChapterPrompt)
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
$('#book-author').addEventListener('input', () => {
  updateWriterControls()
  updateCoverTitleOverlay()
  scheduleWriterAutosave()
})
$('#cover-art-style').addEventListener('change', scheduleWriterAutosave)
$('#cover-mood').addEventListener('change', scheduleWriterAutosave)
$('#cover-input').addEventListener('change', (event) => selectCover(event.target.files[0]))
$('#generate-cover').addEventListener('click', generateWriterCover)
$('#keep-cover').addEventListener('click', keepWriterCoverCandidate)
$('#undo-cover').addEventListener('click', undoWriterCoverCandidate)
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
      ...state.highlights.filter((highlight) => highlight.bookId === id)
        .map((highlight) => storeRequest('highlights', 'readwrite', (store) => store.delete(highlight.id))),
      ...state.bookmarks.filter((bookmark) => bookmark.bookId === id)
        .map((bookmark) => storeRequest('bookmarks', 'readwrite', (store) => store.delete(bookmark.id))),
    ])
    releaseBookCover(id)
    state.books = state.books.filter((item) => item.id !== id)
    state.progress = state.progress.filter((item) => item.id !== id)
    state.highlights = state.highlights.filter((highlight) => highlight.bookId !== id)
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
$('#reader-selection-menu').addEventListener('click', (event) => {
  const action = event.target.closest('[data-reader-selection-action]')?.dataset.readerSelectionAction
  if (!action) return
  if (action === 'copy') copyReaderSelection()
  else if (action === 'highlight') toggleReaderSelectionHighlight()
  else if (action === 'definition' || action === 'translation') lookupReaderSelection(action)
  else closeReaderSelectionMenu()
})
const readerStage = $('.reader-stage')
const readerTouchOverlay = $('.reader-touch-overlay')
let readerTouchStart = null
let suppressedReaderTap = null
readerStage.addEventListener('reader-gesture', (event) => {
  const { type, direction, x, width } = event.detail
  if (type === 'swipe') turnActivePage(direction)
  else if (type === 'tap') handleReaderTap(x, width)
})
readerStage.addEventListener('touchstart', (event) => {
  if (event.target instanceof HTMLIFrameElement) {
    readerTouchStart = null
    return
  }
  suppressedReaderTap = null
  if (event.touches.length !== 1) {
    readerTouchStart = null
    return
  }
  const touch = event.touches[0]
  readerTouchStart = { x: touch.clientX, y: touch.clientY, startedAt: Date.now() }
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
  const swipeThreshold = Math.max(20, readerStage.clientWidth * 0.04)
  if (Math.abs(deltaX) >= swipeThreshold && Math.abs(deltaX) > Math.abs(deltaY)) {
    suppressedReaderTap = { x: touch.clientX, y: touch.clientY, expiresAt: Date.now() + 500 }
    readerStage.dispatchEvent(new CustomEvent('reader-gesture', {
      detail: { type: 'swipe', direction: deltaX < 0 ? 'next' : 'prev' },
    }))
  } else if (Math.abs(deltaX) <= 12 && Math.abs(deltaY) <= 12) {
    const bounds = readerStage.getBoundingClientRect()
    suppressedReaderTap = { x: touch.clientX, y: touch.clientY, expiresAt: Date.now() + 500 }
    if (Date.now() - start.startedAt < 450) {
      readerStage.dispatchEvent(new CustomEvent('reader-gesture', {
        detail: {
          type: 'tap',
          x: touch.clientX - bounds.left,
          width: readerStage.clientWidth,
        },
      }))
    }
  } else {
    suppressedReaderTap = { x: touch.clientX, y: touch.clientY, expiresAt: Date.now() + 500 }
  }
}, { passive: true })
readerStage.addEventListener('touchcancel', () => {
  readerTouchStart = null
}, { passive: true })
readerStage.addEventListener('click', (event) => {
  if (!suppressedReaderTap) return
  const { x, y, expiresAt } = suppressedReaderTap
  suppressedReaderTap = null
  const isTouchClick = event.pointerType && event.pointerType !== 'mouse'
  const matchesTouch = Math.abs(event.clientX - x) < 32 && Math.abs(event.clientY - y) < 32
  if (Date.now() >= expiresAt || (!isTouchClick && (event.pointerType || !matchesTouch))) return
  event.preventDefault()
  event.stopImmediatePropagation()
}, true)
readerStage.addEventListener('click', (event) => {
  if (event.target instanceof HTMLIFrameElement || event.target.closest('.reader-touch-overlay')) return
  if (event.pointerType && event.pointerType !== 'mouse') return
  if (event.button !== 0 || event.detail === 0) return
  const bounds = readerStage.getBoundingClientRect()
  readerStage.dispatchEvent(new CustomEvent('reader-gesture', {
    detail: {
      type: 'tap',
      x: event.clientX - bounds.left,
      width: readerStage.clientWidth,
    },
  }))
})
readerTouchOverlay.addEventListener('click', (event) => {
  if (event.button !== 0) return
  const bounds = readerStage.getBoundingClientRect()
  const x = event.detail === 0 ? readerStage.clientWidth / 2 : event.clientX - bounds.left
  handleReaderTap(x, readerStage.clientWidth)
})
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
  const highlightRemove = event.target.closest('[data-highlight-remove]')
  if (highlightRemove) {
    const id = highlightRemove.dataset.highlightRemove
    const highlight = state.highlights.find((item) => item.id === id)
    try {
      await storeRequest('highlights', 'readwrite', (store) => store.delete(id))
      state.highlights = state.highlights.filter((item) => item.id !== id)
      if (highlight) state.active?.rendition.annotations.remove(highlight.cfiRange, 'highlight')
      renderBookmarks()
    } catch (error) {
      console.error('Could not remove the reader highlight.', error)
      showToast('Could not remove the highlight.')
    }
    return
  }
  const highlight = event.target.closest('[data-highlight-cfi]')
  if (highlight && state.active) {
    closeReaderSelectionMenu()
    $('#bookmark-panel').hidden = true
    $('#bookmarks-button').setAttribute('aria-expanded', 'false')
    try {
      await navigateToHighlight(state.active.rendition, highlight.dataset.highlightCfi)
    } catch (error) {
      console.error('Could not navigate to the reader highlight.', error)
      showToast('Could not open that highlight.')
    }
    return
  }
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
    closeReaderSelectionMenu()
    $('#bookmark-panel').hidden = true
    $('#bookmarks-button').setAttribute('aria-expanded', 'false')
    await state.active.rendition.display(bookmark.dataset.bookmarkCfi)
  }
})
$('#reader-settings-button').addEventListener('click', () => setReaderSettingsOpen($('#reader-settings').hidden))
$('#close-reader-settings').addEventListener('click', () => setReaderSettingsOpen(false))
$('#audiobook-button').addEventListener('click', () => {
  openAudiobookPlayer().catch((error) => {
    console.error('[Leaf audiobook] Could not open the player.', error)
    showToast('The audiobook player could not be opened.')
  })
})
$('#audiobook-close').addEventListener('click', () => closeAudiobookPlayer())
$('#audiobook-toggle').addEventListener('click', toggleAudiobookPlayback)
$('#audiobook-skip-back').addEventListener('click', () => {
  skipAudiobookPage('prev').catch((error) => {
    if (state.active) failAudiobookPlayback(state.active, error)
  })
})
$('#audiobook-skip-forward').addEventListener('click', () => {
  skipAudiobookPage('next').catch((error) => {
    if (state.active) failAudiobookPlayback(state.active, error)
  })
})
$('#audiobook-voice-cycle').addEventListener('click', cycleAudiobookVoice)
$('#audiobook-speed-cycle').addEventListener('click', cycleAudiobookRate)
if (speechSynthesisAvailable()) {
  renderAudiobookVoices()
  window.speechSynthesis.addEventListener('voiceschanged', renderAudiobookVoices)
}
$('#reset-reader-settings').addEventListener('click', () => {
  if (state.active) {
    cancelAiStoryBackground(state.active)
    state.active.aiBackgroundUrl = null
  }
  state.readerPreferences = { ...readerPreferenceDefaults }
  persistReaderPreferences()
  applyReaderTheme()
  requestBookPageCount()
})
$('#reader-font-size').addEventListener('input', (event) => setReaderPreference('fontSize', Number(event.target.value)))
$('#reader-ai-background-opacity').addEventListener('input', (event) => setReaderPreference('aiBackgroundOpacity', Number(event.target.value)))
$('#reader-ai-background-mode').addEventListener('change', (event) => setReaderPreference('aiBackgroundMode', event.target.value))
$('#reader-font-family').addEventListener('change', (event) => setReaderPreference('font', event.target.value))
$('#reader-line-spacing-options').addEventListener('click', (event) => {
  const button = event.target.closest('[data-reader-line-height]')
  if (button) setReaderPreference('lineHeight', Number(button.dataset.readerLineHeight))
})
$('#reader-settings').addEventListener('click', (event) => {
  const theme = event.target.closest('[data-reader-theme]')
  if (theme) setReaderPreference('theme', theme.dataset.readerTheme)
})
const readerScreen = $('#reader-screen')
;['pointerdown', 'touchstart', 'click', 'keydown', 'input', 'change'].forEach((eventName) => {
  readerScreen.addEventListener(eventName, (event) => {
    if (event.target?.closest?.('.reader-stage')) return
    showReaderUi()
  }, { passive: eventName === 'touchstart' })
})
document.addEventListener('pointerdown', (event) => {
  const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement
  if (!target) return

  if (!$('#reader-selection-menu').hidden && !target.closest('#reader-selection-menu')) {
    closeReaderSelectionMenu()
  }
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
  closeReaderSelectionMenu()
  $('#toc-panel').hidden = true
  rendition.display(chapter.dataset.href).catch((error) => {
    showToast('That chapter could not be opened.')
    console.error(error)
  })
})
document.addEventListener('keydown', (event) => {
  if (!state.active) return
  if (event.key !== 'Escape') return
  if (!$('#reader-selection-menu').hidden) {
    closeReaderSelectionMenu()
    return
  }
  if (!$('#audiobook-player').hidden) {
    closeAudiobookPlayer()
    return
  }
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

applyReaderTheme()
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