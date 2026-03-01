'use client'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

// Wrap numbers/dollar amounts in mono spans
function formatContent(content: string) {
  const parts = content.split(/(\$[\d,]+(?:\.\d{2})?|\b\d[\d,]*(?:\.\d+)?\b)/)
  return parts.map((part, i) => {
    if (/^\$[\d,]+/.test(part) || /^\d[\d,]*(?:\.\d+)?$/.test(part)) {
      return <span key={i} className="font-mono">{part}</span>
    }
    return part
  })
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'assistant') {
    return (
      <div className="border-l-2 border-green pl-3 text-[14px] text-ink leading-relaxed">
        {formatContent(content)}
      </div>
    )
  }

  return (
    <div className="text-right text-[14px] text-muted ml-8">
      {content}
    </div>
  )
}
