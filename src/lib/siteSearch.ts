import type { SiteConfig, SearchResult } from '../types'

// ── Supported Site Configurations ────────────────────────────────────────

export const SUPPORTED_SITES: SiteConfig[] = [
  {
    name: 'BBC',
    hostname: ['bbc.com', 'bbc.co.uk'],
    searchUrl: (term) => `https://www.bbc.co.uk/search/more.json?q=${encodeURIComponent(term)}&rows=5`,
    jsRendered: false,
  },
  {
    name: 'The Guardian',
    hostname: ['theguardian.com'],
    searchUrl: (term) => `https://content.guardianapis.com/search?q=${encodeURIComponent(term)}&api-key=test`,
    jsRendered: false,
  },
  {
    name: 'CNN',
    hostname: ['cnn.com'],
    searchUrl: (term) => `https://edition.cnn.com/search?q=${encodeURIComponent(term)}`,
    jsRendered: false,
  },
  {
    name: 'Reuters',
    hostname: ['reuters.com'],
    searchUrl: (term) => `https://www.reuters.com/pf/api/v3/content/fetch/articles-by-search-v2?query=${encodeURIComponent(JSON.stringify({ keyword: term, offset: 0, orderby: 'display_date:desc', size: 3, website: 'reuters' }))}&d=353&_website=reuters`,
    jsRendered: true,
  },
  {
    name: 'AP News',
    hostname: ['apnews.com'],
    searchUrl: (term) => `https://apnews.com/search?q=${encodeURIComponent(term)}`,
    jsRendered: false,
  },
  {
    name: 'NBC News',
    hostname: ['nbcnews.com'],
    searchUrl: (term) => `https://www.nbcnews.com/search/?q=${encodeURIComponent(term)}`,
    jsRendered: false,
  },
  {
    name: 'Politico',
    hostname: ['politico.com'],
    searchUrl: (term) => `https://www.politico.com/search?q=${encodeURIComponent(term)}`,
    jsRendered: false,
  },
  {
    name: 'The New York Times',
    hostname: ['nytimes.com'],
    searchUrl: (term) => `https://www.nytimes.com/search?query=${encodeURIComponent(term)}`,
    jsRendered: true, // Requires user to be logged in
  },
  {
    name: 'Washington Post',
    hostname: ['washingtonpost.com'],
    searchUrl: (term) => `https://www.washingtonpost.com/search/?query=${encodeURIComponent(term)}`,
    jsRendered: true,
  },
  {
    name: 'Bloomberg',
    hostname: ['bloomberg.com'],
    searchUrl: (term) => `https://www.bloomberg.com/search?query=${encodeURIComponent(term)}`,
    jsRendered: true,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────

export function getSiteConfig(hostname: string): SiteConfig | null {
  return (
    SUPPORTED_SITES.find((site) =>
      site.hostname.some((h) => hostname === h || hostname.endsWith(`.${h}`))
    ) ?? null
  )
}

export function isSupportedSite(hostname: string): boolean {
  return getSiteConfig(hostname) !== null
}

// ── Paywall Detection ─────────────────────────────────────────────────────

const PAYWALL_THRESHOLD = 300 // characters

export function isPaywalled(textContent: string | null | undefined): boolean {
  if (!textContent) return true
  return textContent.trim().length < PAYWALL_THRESHOLD
}

// ── Mock Search (MOCK_MODE only) ──────────────────────────────────────────

export function getMockSearchResult(searchTerm: string, siteName: string): SearchResult {
  return {
    status: 'OK',
    articles: [{
      title: `What is ${searchTerm}? Explained`,
      byline: 'Staff Writer',
      siteName,
      textContent: `This is a mock article explaining "${searchTerm}". In mock mode, no real API calls are made. This text stands in for a real article fetched from ${siteName}. It would normally contain a detailed explanation of the concept, sourced directly from a published article on that site.`,
      url: `https://example.com/article/${encodeURIComponent(searchTerm)}`,
      wordCount: 42,
    }],
  }
}

// ── User-facing messages ──────────────────────────────────────────────────

export function getSearchErrorMessage(result: SearchResult): string {
  const site = result.siteName ?? 'this site'

  switch (result.status) {
    case 'PAYWALL':
      return `We're just a tool to help — since you're not subscribed to ${site}, we can't retrieve this content. Consider subscribing for full access.`
    case 'NOT_FOUND':
      return `We couldn't find any articles about "${result.searchTerm}" on ${site}.`
    case 'ERROR':
      return `We were unable to search ${site} right now. Please try again.`
    default:
      return 'Something went wrong. Please try again.'
  }
}
