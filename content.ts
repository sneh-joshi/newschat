// Content script — auto-injected on supported news pages via manifest.
// Extracts article on load, caches it, then responds to GET_ARTICLE messages.

(function () {
  /** Returns true only when the current page looks like a news article (not a home/section/search page) */
  function isArticlePage(): boolean {
    // Most reliable: structured meta tags set by CMSes only on article pages
    const ogType = document.querySelector('meta[property="og:type"]')
    if (ogType instanceof HTMLMetaElement && ogType.content === 'article') return true

    // Published-time meta is a strong indicator
    const publishedMeta = document.querySelector(
      'meta[property="article:published_time"], meta[name="publishdate"], meta[name="date"], meta[itemprop="datePublished"]'
    )
    if (publishedMeta) return true

    // URL heuristics: date segments (/2024/03/) or known article path keywords
    const path = window.location.pathname
    if (/\/\d{4}\/\d{2}\//.test(path)) return true
    if (/\/(article|articles|story|news|world|politics|business|science|health|technology|sports|entertainment)\/[^/]{5,}/.test(path)) return true

    return false
  }

  function extractSiteName(): string {
    const ogSite = document.querySelector('meta[property="og:site_name"]')
    if (ogSite instanceof HTMLMetaElement && ogSite.content) return ogSite.content
    const hostname = window.location.hostname.replace(/^www\./, '')
    return hostname.split('.')[0].replace(/^\w/, (c) => c.toUpperCase())
  }

  function extractByline(): string | null {
    const selectors = ['[rel="author"]', '.author', '.byline', '[class*="author"]', '[class*="byline"]']
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el?.textContent?.trim()) return el.textContent.trim()
    }
    return null
  }

  function extractKeywords(): string | undefined {
    // Try in order: article:tag (og), keywords meta, news_keywords, then JSON-LD keywords
    const selectors = [
      'meta[property="article:tag"]',
      'meta[name="keywords"]',
      'meta[name="news_keywords"]',
      'meta[property="og:article:tag"]',
    ]
    for (const sel of selectors) {
      // article:tag can appear multiple times — collect all
      const els = Array.from(document.querySelectorAll(sel))
      const values = els
        .map((el) => (el instanceof HTMLMetaElement ? el.content.trim() : ''))
        .filter(Boolean)
      if (values.length) return values.join(', ')
    }
    // Try JSON-LD
    for (const script of Array.from(document.querySelectorAll('script[type="application/ld+json"]'))) {
      try {
        const json = JSON.parse(script.textContent ?? '') as Record<string, unknown>
        const kws = json['keywords']
        if (typeof kws === 'string' && kws.trim()) return kws.trim()
        if (Array.isArray(kws) && kws.length) return (kws as string[]).join(', ')
      } catch { /* skip */ }
    }
    return undefined
  }

  function extractArticle() {
    // Try all common article containers, ranked by specificity
    const selectors = [
      'article',
      '[class*="ArticleBody"]', '[class*="article-body"]', '[class*="article__body"]',
      '[class*="story-body"]', '[class*="post-body"]', '[class*="entry-content"]',
      '[class*="content-body"]', '[class*="post-content"]',
      'main', '[role="main"]',
    ]

    for (const selector of selectors) {
      // Use querySelectorAll and pick the longest one to avoid nav/header matches
      const candidates = Array.from(document.querySelectorAll(selector))
      for (const el of candidates) {
        // Clone to strip scripts/styles before reading text
        const clone = el.cloneNode(true) as HTMLElement
        clone.querySelectorAll('script,style,noscript,nav,footer,aside,[class*="ad-"]').forEach(n => n.remove())
        const text = clone.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        if (text.length > 300) {
          return {
            title: document.title,
            byline: extractByline(),
            siteName: extractSiteName(),
            textContent: text,
            url: window.location.href,
            wordCount: text.split(/\s+/).length,
            keywords: extractKeywords(),
          }
        }
      }
    }
    return null
  }

  // Cache the article so repeated requests are instant
  let cachedArticle: ReturnType<typeof extractArticle> = null

  function getArticle() {
    if (!cachedArticle) cachedArticle = extractArticle()
    return cachedArticle
  }

  // Listen for background asking for article data
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_ARTICLE') {
      try {
        if (!isArticlePage()) {
          sendResponse({ type: 'ARTICLE_UNSUPPORTED' })
          return false
        }
        const article = getArticle()
        sendResponse(article
          ? { type: 'ARTICLE_CONTENT', payload: article }
          : { type: 'ARTICLE_UNSUPPORTED' }
        )
      } catch (err) {
        sendResponse({ type: 'ARTICLE_ERROR', payload: String(err) })
      }
    }
    return false // synchronous response, no async needed
  })
})()
