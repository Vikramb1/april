'use client'

import { useState, useRef } from 'react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function send() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div>
      {/* Input row */}
      <div className="flex items-center border border-hairline rounded-xl bg-cream px-3 h-11">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Message April..."
          disabled={disabled}
          className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted disabled:opacity-40"
        />
        <button
          onClick={send}
          disabled={disabled || !value.trim()}
          className="w-7 h-7 rounded-full bg-green flex items-center justify-center ml-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-opacity"
          aria-label="Send message"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 10L10 6L2 2V5L7 6L2 7V10Z" fill="white" />
          </svg>
        </button>
      </div>
    </div>
  )
}
