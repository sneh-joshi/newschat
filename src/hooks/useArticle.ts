import { useState, useEffect, useRef } from 'react'
import type { ArticleData, PanelState } from '../types'
import { PRESET_ANTHROPIC, providerRequiresApiKey } from '../lib/claude'

export function useArticle() {
  const [article, setArticle] = useState<ArticleData | null>(null)
  const [state, setState] = useState<PanelState>('LOADING')
  const [error, setError] = useState<string | null>(null)
  const currentUrl = useRef<string | null>(null)

  useEffect(() => {
    loadArticle()

    // Reload whenever the active tab navigates to a new URL
    function onTabUpdated(
      _tabId: number,
      changeInfo: chrome.tabs.TabChangeInfo,
      tab: chrome.tabs.Tab
    ) {
      if (!changeInfo.url) return           // not a URL change
      if (!tab.active) return               // not the active tab
      if (changeInfo.url === currentUrl.current) return  // same page
      loadArticle()
    }

    chrome.tabs.onUpdated.addListener(onTabUpdated)
    return () => chrome.tabs.onUpdated.removeListener(onTabUpdated)
  }, [])

  async function loadArticle() {
    setState('LOADING')
    setError(null)

    try {
      // Remote providers need a key; local OpenAI-compatible endpoints such as Ollama do not.
      const stored = await chrome.storage.local.get(['apiKey', 'apiUrl'])
      const apiUrl = stored['apiUrl'] || PRESET_ANTHROPIC.apiUrl
      const hasKey = !!stored['apiKey']
      if (providerRequiresApiKey(apiUrl) && !hasKey) {
        setState('NO_API_KEY')
        return
      }

      // Request article from background script
      const response = await new Promise<{ type: string; payload: unknown }>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_ARTICLE' }, resolve)
      })

      if (response.type === 'ARTICLE_ERROR') {
        setError(response.payload as string)
        setState('ERROR')
        return
      }

      if (response.type === 'ARTICLE_UNSUPPORTED' || !response.payload) {
        setState('UNSUPPORTED')
        return
      }

      if (response.type === 'ARTICLE_CONTENT' && response.payload) {
        const incoming = response.payload as ArticleData
        currentUrl.current = incoming.url
        setArticle(incoming)
        setState('READY')
      } else {
        setState('UNSUPPORTED')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load article')
      setState('ERROR')
    }
  }

  return { article, state, error, reload: loadArticle }
}
