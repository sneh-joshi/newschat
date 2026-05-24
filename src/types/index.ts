// ── Message Types (Background ↔ Content Script ↔ Panel) ──────────────────

export type MessageType =
  | 'GET_ARTICLE'
  | 'ARTICLE_CONTENT'
  | 'ARTICLE_ERROR'
  | 'SEARCH_SITE'
  | 'SEARCH_RESULT'
  | 'SEARCH_ERROR'

export interface ArticleData {
  title: string
  byline: string | null
  siteName: string | null
  textContent: string
  url: string
  wordCount: number
  /** Comma-separated keywords from page meta tags, if available */
  keywords?: string
}

export interface SearchResult {
  status: 'OK' | 'PAYWALL' | 'NOT_FOUND' | 'ERROR'
  articles?: ArticleData[]
  siteName?: string
  searchTerm?: string
}

export interface Message {
  type: MessageType
  payload?: unknown
}

// ── Claude API Types ──────────────────────────────────────────────────────

export type QuestionMode = 'ARTICLE_QA' | 'NEEDS_SEARCH'

export interface ClassifyResult {
  mode: QuestionMode
  searchTerm?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: Array<{
    title: string
    url: string
    siteName: string
  }>
  /** Clickable /search chips extracted from the assistant's response */
  suggestions?: string[]
  isStreaming?: boolean
  timestamp: number
}

// ── Extension State ───────────────────────────────────────────────────────

export type PanelState =
  | 'UNSUPPORTED'    // Not a news site
  | 'LOADING'        // Extracting article
  | 'READY'          // Article loaded, ready to chat
  | 'NO_API_KEY'     // API key not set
  | 'ERROR'          // Something went wrong

export interface SiteConfig {
  name: string
  hostname: string[]
  searchUrl: (term: string) => string
  jsRendered: boolean
}
