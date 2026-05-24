import { useState, useRef, useEffect, type KeyboardEvent } from 'react'

interface Props {
  onSend: (message: string) => void
  disabled: boolean
  placeholder?: string
  /** Pre-fills the input (e.g. from a suggestion chip click). Increments version to force update. */
  prefill?: { text: string; version: number }
}

const COMMANDS = [
  { cmd: '/search ', label: '/search', desc: 'Search website' },
  { cmd: '/related', label: '/related', desc: 'Find related stories' },
  { cmd: '/explain ', label: '/explain', desc: 'Explain a keyword' },
]

export function InputBar({ onSend, disabled, placeholder = 'Ask about this article...', prefill }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastPrefillVersion = useRef(0)

  // Pre-fill when a suggestion chip is clicked
  useEffect(() => {
    if (prefill && prefill.version !== lastPrefillVersion.current && prefill.text) {
      lastPrefillVersion.current = prefill.version
      setValue(prefill.text)
      setTimeout(() => {
        const el = textareaRef.current
        if (!el) return
        el.focus()
        el.setSelectionRange(el.value.length, el.value.length)
        el.style.height = 'auto'
        el.style.height = Math.min(el.scrollHeight, 120) + 'px'
      }, 0)
    }
  }, [prefill])

  const activeCmd = COMMANDS.find((c) => value.trimStart().toLowerCase().startsWith(c.cmd.toLowerCase().trimEnd()) ||
    value.trimStart().toLowerCase() === c.cmd.toLowerCase().trim())

  function handleSend() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  function handleInput() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  const borderColor = activeCmd ? 'border-emerald-500/60 focus-within:border-emerald-400' : 'border-gray-700 focus-within:border-blue-500'
  const btnColor    = activeCmd ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'

  return (
    <div className="border-t border-gray-800 bg-gray-950 p-3">

      {/* Command hint banner */}
      {activeCmd && (
        <div className="mb-2 flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span className="font-mono font-semibold">{activeCmd.label}</span>
          <span className="text-emerald-500">— {activeCmd.desc}</span>
        </div>
      )}

      {/* Input row */}
      <div className={`flex items-end gap-2 bg-gray-900 border rounded-xl px-3 py-2 transition-colors ${borderColor}`}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none outline-none leading-relaxed disabled:opacity-50"
          style={{ maxHeight: '120px' }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className={`flex-shrink-0 w-7 h-7 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 ${btnColor}`}
          aria-label="Send"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>

      {/* Tools row */}
      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
        {COMMANDS.map((c) => (
          <button
            key={c.cmd}
            onClick={() => {
              setValue(c.cmd)
              setTimeout(() => textareaRef.current?.focus(), 0)
            }}
            disabled={disabled}
            className="text-xs font-mono text-gray-500 hover:text-emerald-400 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/30 rounded-md px-2 py-0.5 transition-all disabled:opacity-30"
          >
            {c.label}
          </button>
        ))}
        <span className="text-xs text-gray-700 ml-auto">Shift+Enter for new line</span>
      </div>
    </div>
  )
}
