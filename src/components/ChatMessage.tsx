import type { ChatMessage as ChatMessageType } from '../types'

interface Props {
  message: ChatMessageType
  onSuggestionClick?: (text: string) => void
}

export function ChatMessage({ message, onSuggestionClick }: Props) {
  const isUser = message.role === 'user'

  if (isUser) {
    // Highlight command prefix in user messages
    const cmdMatch = message.content.match(/^(\/(?:search|explain|related)(?:\s|$))(.*)/is)
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-3.5 py-2.5 max-w-[85%]">
          {cmdMatch ? (
            <p className="text-sm leading-relaxed">
              <span className="font-mono text-emerald-300">{cmdMatch[1]}</span>
              {cmdMatch[2]}
            </p>
          ) : (
            <p className="text-sm leading-relaxed">{message.content}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[92%]">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-white text-xs font-bold">N</span>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex-1">
            {message.content ? (
              <p className={`text-sm text-gray-100 leading-relaxed whitespace-pre-wrap ${message.isStreaming ? 'streaming-cursor' : ''}`}>
                {message.content}
              </p>
            ) : (
              <div className="flex items-center gap-1.5 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            )}

            {/* Clickable /search suggestion chips */}
            {message.suggestions && message.suggestions.length > 0 && !message.isStreaming && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-700 space-y-1.5">
                <p className="text-xs text-gray-500 mb-1">Try searching:</p>
                {message.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSuggestionClick?.(s)}
                    className="flex items-center gap-1.5 w-full text-left bg-gray-700/60 hover:bg-gray-700 border border-gray-600/50 hover:border-emerald-500/50 rounded-lg px-2.5 py-1.5 transition-colors group"
                  >
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span className="text-xs font-mono text-emerald-400 group-hover:text-emerald-300 transition-colors">{s}</span>
                    <svg className="w-3 h-3 text-gray-600 ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                ))}
              </div>
            )}

            {/* Source cards for search-synthesized answers */}
            {message.sources && message.sources.length > 0 && !message.isStreaming && (
              <div className="mt-2.5 pt-2.5 border-t border-gray-700 space-y-1.5">
                <p className="text-xs text-gray-500 mb-1.5">Sources</p>
                {message.sources.map((src) => (
                  <a
                    key={src.url}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg px-2.5 py-2 transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-blue-400 group-hover:text-blue-300 transition-colors line-clamp-2 leading-snug">{src.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{src.siteName}</p>
                    </div>
                    <svg className="w-3 h-3 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
