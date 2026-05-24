// Background service worker — self-contained, no external imports

// ── Supported hostnames ───────────────────────────────────────────────────

const SUPPORTED_HOSTNAMES = [
  'nytimes.com', 'bbc.com', 'bbc.co.uk', 'cnn.com',
  'theguardian.com', 'reuters.com', 'apnews.com',
  'washingtonpost.com', 'bloomberg.com', 'nbcnews.com', 'politico.com',
]

function isSupportedSite(hostname: string): boolean {
  return SUPPORTED_HOSTNAMES.some((h) => hostname === h || hostname.endsWith(`.${h}`))
}

// ── Side Panel: open on icon click for supported sites ────────────────────

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch(console.error)

chrome.tabs.onUpdated.addListener(async (tabId, _info, tab) => {
  if (!tab.url) return
  // Only handle http/https pages — chrome://, about:, etc. are not supported
  if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) return
  try {
    const url = new URL(tab.url)
    const supported = isSupportedSite(url.hostname)
    await chrome.sidePanel.setOptions({
      tabId,
      path: 'panel.html',
      enabled: supported,
    })
  } catch {
    // ignore
  }
})

// ── Message Routing ───────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_ARTICLE') {
    handleGetArticle(sendResponse)
    return true
  }
  if (message.type === 'SEARCH_SITE') {
    handleSearchSite(message.payload, sendResponse)
    return true
  }
})

// ── Site Search ───────────────────────────────────────────────────────────

// NOTE: This map mirrors SUPPORTED_SITES in src/lib/siteSearch.ts.
// background.ts cannot import from src/ (separate build pass), so the two
// tables must be kept in sync by hand when adding or changing a site.
const SEARCH_URL_MAP: Record<string, (term: string) => string> = {
  // BBC: JSON API avoids the JS-rendered search page and edgeauth redirects
  'bbc.com':           (t) => `https://www.bbc.co.uk/search/more.json?q=${encodeURIComponent(t)}&rows=5`,
  'bbc.co.uk':         (t) => `https://www.bbc.co.uk/search/more.json?q=${encodeURIComponent(t)}&rows=5`,
  // Guardian's public /search page currently returns 404; the open content API returns stable JSON.
  'theguardian.com':   (t) => `https://content.guardianapis.com/search?q=${encodeURIComponent(t)}&api-key=test`,
  'cnn.com':           (t) => `https://edition.cnn.com/search?q=${encodeURIComponent(t)}`,
  // reuters.com uses a JSON API — handled separately in handleSearchSite
  'reuters.com':       (t) => `https://www.reuters.com/pf/api/v3/content/fetch/articles-by-search-v2?query=${encodeURIComponent(JSON.stringify({ keyword: t, offset: 0, orderby: 'display_date:desc', size: 3, website: 'reuters' }))}&d=353&_website=reuters`,
  'apnews.com':        (t) => `https://apnews.com/search?q=${encodeURIComponent(t)}`,
  'nbcnews.com':       (t) => `https://www.nbcnews.com/search/?q=${encodeURIComponent(t)}`,
  'politico.com':      (t) => `https://www.politico.com/search?q=${encodeURIComponent(t)}`,
  'nytimes.com':       (t) => `https://www.nytimes.com/search?query=${encodeURIComponent(t)}`,
  'washingtonpost.com':(t) => `https://www.washingtonpost.com/search/?query=${encodeURIComponent(t)}`,
  'bloomberg.com':     (t) => `https://www.bloomberg.com/search?query=${encodeURIComponent(t)}`,
}

function getSearchUrl(hostname: string, term: string): string | null {
  for (const [key, builder] of Object.entries(SEARCH_URL_MAP)) {
    if (hostname === key || hostname.endsWith(`.${key}`)) return builder(term)
  }
  return null
}

function isSiteHostname(hostname: string, siteHostname: string): boolean {
  const baseDomain = siteHostname.split('.').slice(-2).join('.')
  return hostname === baseDomain || hostname.endsWith(`.${baseDomain}`)
}

/** Strip HTML tags and collapse whitespace */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/**
 * Fallback: use Google site: search to find article URLs.
 * Returns up to `max` article URLs from the target hostname.
 */
async function googleSiteSearch(siteHostname: string, searchTerm: string, max = 3): Promise<string[]> {
  const q = `site:${siteHostname} ${searchTerm}`
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}&num=10`
  try {
    const res = await fetch(googleUrl, {
      credentials: 'omit',
      headers: {
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    if (!res.ok) return []
    const html = await res.text()

    // Google wraps result links as href="/url?q=https://actual-url&..."
    const seen = new Set<string>()
    const results: string[] = []
    const re = /href="\/url\?q=(https?:\/\/[^&"]+)/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) !== null && results.length < max) {
      try {
        const url = decodeURIComponent(m[1])
        const u = new URL(url)
        if (!isSiteHostname(u.hostname, siteHostname)) continue
        // Skip obvious non-articles
        if (/\/(tag|author|topic|section|search|video|gallery)[/?]/i.test(u.pathname)) continue
        if (!seen.has(u.pathname)) {
          seen.add(u.pathname)
          results.push(url)
        }
      } catch { continue }
    }
    return results
  } catch {
    return []
  }
}

/** Extract up to `max` article-like hrefs from search results HTML */
function extractArticleUrls(html: string, siteHostname: string, max = 3): string[] {
  const baseDomain = siteHostname.split('.').slice(-2).join('.')

  // Paths that are definitely NOT articles
  const EXCLUDE = /\/(graphics?|pictures?|video|photo|gallery|podcast|live\/|sponsored|advertis|tag\/|author\/|topic\/|section\/|search[/?])/i

  const seen = new Set<string>()
  const results: string[] = []

  const hrefRe = /href="(https?:\/\/[^"#?]+)"/gi
  let match: RegExpExecArray | null
  while ((match = hrefRe.exec(html)) !== null && results.length < max) {
    const url = match[1]
    try {
      const u = new URL(url)
      if (!(u.hostname === baseDomain || u.hostname.endsWith(`.${baseDomain}`))) continue
      if (EXCLUDE.test(u.pathname)) continue
      // Must look like a news article path
      if (/\/\d{4}\/\d{2}\//.test(u.pathname) || /\/(article|news|story|world|business|markets|politics|technology|science|health)\//.test(u.pathname)) {
        if (!seen.has(u.pathname)) {
          seen.add(u.pathname)
          results.push(url)
        }
      }
    } catch {
      continue
    }
  }
  return results
}

async function handleSearchSite(
  payload: { searchTerm: string; articleUrl: string },
  sendResponse: (r: object) => void
): Promise<void> {
  const { searchTerm, articleUrl } = payload
  try {
    const siteHostname = new URL(articleUrl).hostname.replace(/^www\./, '')
    const searchUrl = getSearchUrl(siteHostname, searchTerm)

    if (!searchUrl) {
      sendResponse({ type: 'SEARCH_ERROR', payload: { status: 'ERROR', siteName: siteHostname, searchTerm } })
      return
    }

    // Fetch search results — Reuters uses a JSON API, others return HTML
    let articleUrls: string[] = []
    let primaryFailed = false

    const searchRes = await fetch(searchUrl, {
      headers: { 'Accept': 'text/html,application/json,*/*' },
    })
    if (!searchRes.ok) {
      primaryFailed = true
    } else {
      // Collect up to 3 candidate article URLs
      if (isSiteHostname(siteHostname, 'reuters.com')) {
        // Reuters JSON API
        try {
          const json = await searchRes.json() as Record<string, unknown>
          const resultBlock = (json['result'] ?? json) as Record<string, unknown>
          const rArticles = (resultBlock['articles'] as Array<Record<string, unknown>> | undefined) ?? []
          for (const a of rArticles.slice(0, 3)) {
            if (typeof a['canonical_url'] === 'string' && (a['canonical_url'] as string).length > 5) {
              const path = a['canonical_url'] as string
              articleUrls.push(path.startsWith('http') ? path : `https://www.reuters.com${path}`)
            }
          }
        } catch { /* fall through */ }
      } else if (siteHostname === 'bbc.com' || siteHostname === 'bbc.co.uk' || siteHostname.endsWith('.bbc.com') || siteHostname.endsWith('.bbc.co.uk')) {
        // BBC JSON search API — returns { results: [{ url, title, summary, section }] }
        try {
          const json = await searchRes.json() as Record<string, unknown>
          const results = (json['results'] as Array<Record<string, unknown>> | undefined) ?? []
          for (const r of results.slice(0, 5)) {
            const path = (r['url'] as string | undefined) ?? ''
            if (!path) continue
            // Skip non-article paths (sport scores, live pages, etc.)
            if (/\/(sport\/scores|live\/|cbeebies|sounds)/i.test(path)) continue
            const full = path.startsWith('http') ? path : `https://www.bbc.com${path}`
            articleUrls.push(full)
            if (articleUrls.length >= 3) break
          }
        } catch { /* fall through */ }
      } else if (isSiteHostname(siteHostname, 'theguardian.com')) {
        // Guardian content API — returns { response: { results: [{ webUrl }] } }
        try {
          const json = await searchRes.json() as Record<string, unknown>
          const response = (json['response'] ?? {}) as Record<string, unknown>
          const results = (response['results'] as Array<Record<string, unknown>> | undefined) ?? []
          for (const result of results.slice(0, 3)) {
            const url = result['webUrl']
            if (typeof url === 'string' && url.length > 5) articleUrls.push(url)
          }
        } catch { /* fall through */ }
      } else {
        const searchHtml = await searchRes.text()
        articleUrls = extractArticleUrls(searchHtml, siteHostname, 3)
      }
    }

    // ── Google site: fallback ─────────────────────────────────────────────
    if (primaryFailed || articleUrls.length === 0) {
      const googleUrls = await googleSiteSearch(siteHostname, searchTerm, 6)
      // Filter: require at least one search word to appear in the URL path
      // to avoid completely off-topic results
      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter((w) => w.length > 3)
      articleUrls = googleUrls.filter((url) => {
        if (searchWords.length === 0) return true
        const path = url.toLowerCase()
        return searchWords.some((w) => path.includes(w))
      }).slice(0, 3)
      // If nothing passed the word filter, fall back to unfiltered top results
      if (articleUrls.length === 0) articleUrls = googleUrls.slice(0, 3)
    }

    // Fetch all candidate articles in parallel
    const settled = await Promise.allSettled(
      articleUrls.map(async (url) => {
        const res = await fetch(url)
        if (!res.ok) return null
        const html = await res.text()
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
        const title = titleMatch ? titleMatch[1].trim() : searchTerm
        const bodyMatch = html.match(/<article[\s\S]*?<\/article>/i) ?? html.match(/<main[\s\S]*?<\/main>/i)
        const textContent = stripHtml(bodyMatch ? bodyMatch[0] : html).slice(0, 6000)
        if (textContent.length < 200) return null
        return { title, byline: null as null, siteName: siteHostname, textContent, url, wordCount: textContent.split(/\s+/).length }
      })
    )

    const articles = settled
      .filter((r): r is PromiseFulfilledResult<NonNullable<typeof r extends PromiseFulfilledResult<infer V> ? V : never>> =>
        r.status === 'fulfilled' && r.value !== null)
      .map((r) => (r as PromiseFulfilledResult<{title:string;byline:null;siteName:string;textContent:string;url:string;wordCount:number}>).value)

    if (articles.length === 0) {
      sendResponse({ type: 'SEARCH_ERROR', payload: { status: 'PAYWALL', siteName: siteHostname, searchTerm } })
      return
    }

    sendResponse({ type: 'SEARCH_RESULT', payload: { articles } })
  } catch (err) {
    sendResponse({ type: 'SEARCH_ERROR', payload: { status: 'ERROR', searchTerm } })
  }
}

async function handleGetArticle(sendResponse: (r: object) => void): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id) {
      sendResponse({ type: 'ARTICLE_ERROR', payload: 'No active tab found' })
      return
    }

    // Content script is already injected via manifest — just message it directly
    chrome.tabs.sendMessage(tab.id, { type: 'GET_ARTICLE' }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not ready (e.g. page still loading) — retry once via scripting
        chrome.scripting.executeScript(
          { target: { tabId: tab.id! }, files: ['content.js'] },
          () => {
            chrome.tabs.sendMessage(tab.id!, { type: 'GET_ARTICLE' }, (retryResponse) => {
              if (chrome.runtime.lastError || !retryResponse) {
                sendResponse({ type: 'ARTICLE_ERROR', payload: 'Could not extract article content' })
              } else {
                sendResponse(retryResponse)
              }
            })
          }
        )
        return
      }
      if (!response) {
        sendResponse({ type: 'ARTICLE_ERROR', payload: 'Could not extract article content' })
      } else {
        sendResponse(response)
      }
    })
  } catch (err) {
    sendResponse({
      type: 'ARTICLE_ERROR',
      payload: err instanceof Error ? err.message : 'Unknown error',
    })
  }
}
