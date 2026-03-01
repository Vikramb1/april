'use client'

import React from 'react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
}

let _keySeq = 0
function _k() { return ++_keySeq }

// Wrap numbers/dollar amounts in mono spans within a text segment
function inlineFormat(text: string): React.ReactNode[] {
  const parts = text.split(/(\$[\d,]+(?:\.\d{2})?|\b\d[\d,]*(?:\.\d+)?\b)/)
  return parts.map((part) => {
    if (/^\$[\d,]+/.test(part) || /^\d[\d,]*(?:\.\d+)?$/.test(part)) {
      return <span key={_k()} className="font-mono">{part}</span>
    }
    return part
  })
}

// Render **bold** within a text segment
function inlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  const result: React.ReactNode[] = []
  parts.forEach((part) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2)
      result.push(<strong key={_k()}>{inlineFormat(inner)}</strong>)
    } else {
      result.push(...inlineFormat(part))
    }
  })
  return result
}

function renderMarkdown(content: string): React.ReactNode[] {
  const rawLines = content.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < rawLines.length) {
    const line = rawLines[i]

    // Blank line → spacer
    if (line.trim() === '') {
      nodes.push(<div key={i} className="h-2" />)
      i++
      continue
    }

    // Unordered list — collect consecutive bullet lines
    if (/^[-*] /.test(line)) {
      const items: React.ReactNode[] = []
      while (i < rawLines.length && /^[-*] /.test(rawLines[i])) {
        const text = rawLines[i].replace(/^[-*] /, '')
        items.push(<li key={i}>{inlineBold(text)}</li>)
        i++
      }
      nodes.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-0.5 my-1">
          {items}
        </ul>
      )
      continue
    }

    // Ordered list — collect consecutive numbered lines
    if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = []
      while (i < rawLines.length && /^\d+\. /.test(rawLines[i])) {
        const text = rawLines[i].replace(/^\d+\. /, '')
        items.push(<li key={i}>{inlineBold(text)}</li>)
        i++
      }
      nodes.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-0.5 my-1">
          {items}
        </ol>
      )
      continue
    }

    // Plain text paragraph
    nodes.push(<p key={i}>{inlineBold(line)}</p>)
    i++
  }

  return nodes
}

export function ChatMessage({ role, content }: ChatMessageProps) {
  if (role === 'assistant') {
    return (
      <div className="border-l-2 border-green pl-3 text-[14px] text-ink leading-relaxed space-y-1">
        {renderMarkdown(content)}
      </div>
    )
  }

  return (
    <div className="text-right text-[14px] text-muted ml-8">
      {content}
    </div>
  )
}
