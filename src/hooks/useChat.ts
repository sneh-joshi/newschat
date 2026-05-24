import { useState, useCallback } from 'react'
import type { ArticleData, ChatMessage, SearchResult } from '../types'
import { streamAnswer, generateSearchKeywords, MOCK_MODE, inferProvider, PRESET_ANTHROPIC, providerRequiresApiKey } from '../lib/claude'
import type { ProviderConfig } from '../lib/claude'
import { getMockSearchResult, getSearchErrorMessage } from '../lib/siteSearch'

// ── Helpers ───────────────────────────────────────────────────────────────

/** Extract `/search query` chips from assistant response text (backtick-wrapped) */
function extractSuggestions(text: string): string[] {
  const matches = [...text.matchAll(/`(\/(?:search|explain) [^`\n]{3,})`/g)]
  return [...new Set(matches.map((m) => m[1].trim()))]
}

/** Auto search term for /related: use meta keywords, then LLM, then title fallback */
async function relatedSearchTerm(article: ArticleData, config: ProviderConfig): Promise<string> {
  // 1. Best: keywords already extracted from page meta
  if (article.keywords) {
    // Take first 3 comma-separated tags, strip extra whitespace
    const first3 = article.keywords.split(',').slice(0, 3).map((k) => k.trim()).filter(Boolean).join(' ')
    if (first3.length > 3) return first3
  }
  // 2. Ask the LLM to generate focused keywords
  return generateSearchKeywords(article, config)
}

export function useChat(article: ArticleData | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchStatus, setSearchStatus] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (question: string) => {
      if (!article || isLoading) return

      const stored = await chrome.storage.local.get(['apiKey', 'apiUrl', 'model'])
      const apiUrl: string = stored.apiUrl || PRESET_ANTHROPIC.apiUrl
      const model: string = stored.model || PRESET_ANTHROPIC.model
      const apiKey: string = stored.apiKey || ''
      const config: ProviderConfig = {
        provider: inferProvider(apiUrl),
        apiUrl,
        model,
        apiKey,
      }
      if (providerRequiresApiKey(apiUrl) && !apiKey && !MOCK_MODE) return

      // Add user message
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: question,
        timestamp: Date.now(),
      }
      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setSearchStatus(null)

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', isStreaming: true, timestamp: Date.now() },
      ])

      try {
        // ── Command detection ────────────────────────────────────────────
        const searchMatch  = question.match(/^\/search(?:-website)?\s+(.+)/is)
        const explainMatch = question.match(/^\/explain\s+(.+)/is)
        const isRelated    = /^\/related\b/i.test(question)
        const isCommand    = !!(searchMatch || explainMatch || isRelated)

        if (isCommand) {
          let searchTerm: string
          let relatedArticles: ArticleData[] = []
          if (searchMatch)       searchTerm = searchMatch[1].trim()
          else if (explainMatch) searchTerm = explainMatch[1].trim()
          else                   searchTerm = await relatedSearchTerm(article, MOCK_MODE ? { ...config, apiKey: 'mock' } : config)

          const siteName = article.siteName ?? new URL(article.url).hostname
          setSearchStatus(`Searching ${siteName}...`)

          if (MOCK_MODE) {
            relatedArticles = getMockSearchResult(searchTerm, siteName).articles ?? []
          } else {
            const searchResponse = await new Promise<{ type: string; payload: unknown } | undefined>(
              (resolve) => chrome.runtime.sendMessage(
                { type: 'SEARCH_SITE', payload: { searchTerm, articleUrl: article.url } },
                resolve
              )
            )
            if (!searchResponse || searchResponse.type === 'SEARCH_ERROR') {
              const errorMsg = searchResponse
                ? getSearchErrorMessage(searchResponse.payload as SearchResult)
                : 'Could not search for related articles. Please try again.'
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: errorMsg, isStreaming: false } : m)
              )
              setIsLoading(false)
              setSearchStatus(null)
              return
            }
            relatedArticles = (searchResponse.payload as { articles: ArticleData[] }).articles ?? []
          }
          setSearchStatus(null)

          // ── Commands: skip LLM entirely, just show source cards ────────
          const siteLabelForDisplay = article.siteName ?? new URL(article.url).hostname
          const label = isRelated
            ? `Found ${relatedArticles.length} related stor${relatedArticles.length === 1 ? 'y' : 'ies'} on ${siteLabelForDisplay}.`
            : explainMatch
            ? `Found ${relatedArticles.length} article${relatedArticles.length === 1 ? '' : 's'} explaining "${explainMatch[1].trim()}" on ${siteLabelForDisplay}.`
            : `Found ${relatedArticles.length} article${relatedArticles.length === 1 ? '' : 's'} for "${searchMatch![1].trim()}" on ${siteLabelForDisplay}.`

          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? {
                    ...m,
                    content: label,
                    isStreaming: false,
                    sources: relatedArticles.map((a) => ({ title: a.title, url: a.url, siteName: a.siteName ?? '' })),
                  }
                : m
            )
          )
          return  // done — no LLM call for commands
        }

        // ── Regular question: stream answer from article only ────────────
        const stream = streamAnswer(
          question,
          article,
          messages,
          MOCK_MODE ? { ...config, apiKey: 'mock' } : config,
        )

        let fullContent = ''
        for await (const chunk of stream) {
          fullContent += chunk
          setMessages((prev) =>
            prev.map((m) => m.id === assistantId ? { ...m, content: fullContent } : m)
          )
        }

        const suggestions = extractSuggestions(fullContent)

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: fullContent,
                  isStreaming: false,
                  suggestions: suggestions.length ? suggestions : undefined,
                }
              : m
          )
        )
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${errorMsg}`, isStreaming: false } : m
          )
        )
      } finally {
        setIsLoading(false)
        setSearchStatus(null)
      }
    },
    [article, messages, isLoading]
  )

  const clearMessages = useCallback(() => setMessages([]), [])

  return { messages, isLoading, searchStatus, sendMessage, clearMessages }
}
