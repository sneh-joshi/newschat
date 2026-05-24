import { useRef, useEffect, useState } from 'react'
import { useArticle } from './hooks/useArticle'
import { useChat } from './hooks/useChat'
import { getSuggestedQuestions, MOCK_MODE } from './lib/claude'
import { ArticleCard } from './components/ArticleCard'
import { ChatMessage } from './components/ChatMessage'
import { InputBar } from './components/InputBar'
import { SuggestedQuestions } from './components/SuggestedQuestions'

export default function App() {
  const { article, state, error, reload } = useArticle()
  const { messages, isLoading, searchStatus, sendMessage, clearMessages } = useChat(article)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const prevUrlRef = useRef<string | null>(null)
  const [prefill, setPrefill] = useState<{ text: string; version: number }>({ text: '', version: 0 })

  // Clear chat when navigating to a new article
  useEffect(() => {
    if (article?.url && article.url !== prevUrlRef.current) {
      prevUrlRef.current = article.url
      clearMessages()
    }
  }, [article?.url])

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, searchStatus])

  function handleSuggestionClick(text: string) {
    setPrefill((p) => ({ text, version: p.version + 1 }))
  }

  // ── States ────────────────────────────────────────────────────────────

  if (state === 'NO_API_KEY') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-4">
          <span className="text-white text-xl font-bold">N</span>
        </div>
        <h1 className="text-white font-semibold text-lg mb-2">Welcome to NewsChat</h1>
        <p className="text-gray-400 text-sm mb-5 leading-relaxed">
          Configure your AI provider to start asking questions about news articles.
        </p>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          Open Settings
        </button>
        {MOCK_MODE && (
          <p className="mt-4 text-xs text-yellow-500 bg-yellow-500/10 rounded-lg px-3 py-2">
            🧪 Mock mode active — no API key needed
          </p>
        )}
      </div>
    )
  }

  if (state === 'UNSUPPORTED') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-4xl mb-4">📰</div>
        <h2 className="text-white font-semibold mb-2">Open an article</h2>
        <p className="text-gray-400 text-sm leading-relaxed">
          Navigate to a news article on a supported site to start chatting.
        </p>
        <div className="mt-4 text-xs text-gray-600 space-y-1">
          {['BBC', 'CNN', 'The Guardian', 'Reuters', 'AP News', 'NYT', 'Washington Post', 'Bloomberg', 'NBC News', 'Politico'].map((s) => (
            <div key={s}>{s}</div>
          ))}
        </div>
      </div>
    )
  }

  if (state === 'LOADING') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-400 text-sm">Reading article...</p>
      </div>
    )
  }

  if (state === 'ERROR') {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-3xl mb-4">⚠️</div>
        <h2 className="text-white font-semibold mb-2">Something went wrong</h2>
        <p className="text-gray-400 text-sm mb-4">{error ?? 'Could not load the article.'}</p>
        <button
          onClick={reload}
          className="bg-gray-800 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-xl transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  // ── Ready State ───────────────────────────────────────────────────────

  const showSuggestions = messages.length === 0 && article

  return (
    <div className="h-screen flex flex-col bg-gray-950 font-sans">

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-white text-sm font-semibold">NewsChat</span>
          {MOCK_MODE && (
            <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-medium">
              MOCK
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1 rounded-lg hover:bg-gray-800 transition-all"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="text-gray-500 hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-800 transition-all"
            aria-label="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"></path>
            </svg>
          </button>
        </div>
      </div>

      {/* Article Card */}
      <div className="px-3 pt-3 flex-shrink-0">
        {article && <ArticleCard article={article} />}
      </div>

      {/* Messages / Suggestions */}
      <div className="flex-1 overflow-y-auto px-3 pt-1">
        {showSuggestions && (
          <SuggestedQuestions
            questions={getSuggestedQuestions(article!)}
            onSelect={sendMessage}
          />
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} onSuggestionClick={handleSuggestionClick} />
        ))}

        {/* Search status indicator */}
        {searchStatus && (
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
            <p className="text-xs text-gray-400">{searchStatus}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0">
        <InputBar
          onSend={sendMessage}
          disabled={isLoading}
          placeholder={isLoading ? 'Thinking...' : 'Ask about this article...'}
          prefill={prefill}
        />
      </div>
    </div>
  )
}
