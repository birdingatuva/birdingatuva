'use client'

import { useRef, useState } from 'react'
import { GROUPME_PLACEHOLDERS } from '@/lib/groupme'

const tokenPattern = /((?<![\w@])@(?:title|date|time|location|event_url|signup_url)\b)/g
const completeToken = /^@(?:title|date|time|location|event_url|signup_url)$/

export function GroupMeTemplateEditor({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled: boolean }) {
  const input = useRef<HTMLTextAreaElement>(null)
  const [query, setQuery] = useState<{ start: number; end: number; text: string } | null>(null)
  const suggestion = query?.text && !/\w/.test(value[query.end] || '')
    ? GROUPME_PLACEHOLDERS.find(key => key.startsWith(query.text) && key !== query.text)
    : undefined

  function updateQuery(text: string, caret: number) {
    const match = text.slice(0, caret).match(/(?:^|[^\w@])@([a-z_]*)$/)
    setQuery(match ? { start: caret - match[1].length - 1, end: caret, text: match[1] } : null)
  }
  function insert(key: string) {
    const start = query?.start ?? input.current?.selectionStart ?? value.length
    const end = query?.end ?? input.current?.selectionEnd ?? start
    const token = `@${key}`
    onChange(value.slice(0, start) + token + value.slice(end))
    setQuery(null)
    requestAnimationFrame(() => { input.current?.focus({ preventScroll: true }); input.current?.setSelectionRange(start + token.length, start + token.length) })
  }
  function highlighted(text: string) {
    return text.split(tokenPattern).map((part, index) => completeToken.test(part)
      ? <span key={index} className="font-semibold text-blue-600">{part}</span> : part)
  }

  return <div className="space-y-2">
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm" aria-label="Available template options">
      {GROUPME_PLACEHOLDERS.map(key => <button key={key} type="button" disabled={disabled} className="groupme-option font-medium text-blue-600" onClick={() => insert(key)}>@{key}</button>)}
    </div>
    <div className="relative rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring">
      <div aria-hidden="true" className="pointer-events-none relative z-10 whitespace-pre-wrap break-words px-3 py-5 font-mono text-sm leading-6">
        {query ? <>{highlighted(value.slice(0, query.start))}<span key={query.start} className={`font-semibold text-blue-600 ${suggestion ? 'groupme-active' : ''}`}>{value.slice(query.start, query.end)}</span>{suggestion && <span className="inline-block w-0 overflow-visible align-baseline"><button type="button" tabIndex={-1} onMouseDown={event => event.preventDefault()} onClick={() => insert(suggestion)} className="groupme-suggestion pointer-events-auto relative z-20 inline-block whitespace-nowrap bg-background p-0 align-baseline font-semibold leading-[inherit] text-blue-600"><span className="groupme-ghost">{suggestion.slice(query.text.length)}</span></button></span>}{highlighted(value.slice(query.end))}</> : highlighted(value)}{'\u200b'}
      </div>
      <textarea ref={input} id="groupme-template" aria-label="GroupMe trip announcements template" value={value} disabled={disabled} rows={1} spellCheck={false}
        className="absolute inset-0 block h-full w-full resize-none overflow-hidden bg-transparent px-3 py-5 font-mono text-sm leading-6 text-transparent caret-foreground outline-none selection:bg-blue-200/40"
        aria-autocomplete="inline" aria-describedby={suggestion ? 'groupme-completion' : undefined}
        onChange={event => { onChange(event.target.value); updateQuery(event.target.value, event.target.selectionStart) }}
        onClick={() => setQuery(null)}
        onBlur={() => setQuery(null)}
        onKeyDown={event => {
          if (event.key === 'Tab' && suggestion) { event.preventDefault(); insert(suggestion) }
          else if (['Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) setQuery(null)
        }} />
      <span className={`pointer-events-none absolute bottom-1 right-3 text-xs ${value.length > 1000 ? 'text-destructive' : 'text-muted-foreground'}`}>{value.length}/1000</span>
      {suggestion && <span id="groupme-completion" className="sr-only">Press Tab to complete @{suggestion}.</span>}
    </div>
    <style jsx>{`
      .groupme-active, .groupme-ghost, .groupme-option:hover {
        color: transparent;
        background-image: linear-gradient(90deg, #2563eb 0%, #bfdbfe 50%, #2563eb 100%);
        background-size: 200% 100%; background-clip: text; -webkit-background-clip: text;
        animation: groupme-shimmer 2s linear infinite;
      }
      .groupme-ghost { opacity: .75; }
      @keyframes groupme-shimmer {
        from { background-position: 200% 0; }
        to { background-position: 0% 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .groupme-active, .groupme-ghost, .groupme-option:hover { animation: none; color: #2563eb; background-image: none; }
      }
    `}</style>
  </div>
}
