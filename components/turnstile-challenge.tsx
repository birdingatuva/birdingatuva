"use client"

import Script from 'next/script'
import { isLocalDevelopment } from '@/lib/local-development'
import { useEffect, useRef, useState } from 'react'

type Turnstile = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}

declare global {
  interface Window { turnstile?: Turnstile }
}

export function TurnstileChallenge({ onToken }: { onToken: (token: string) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const [localDevelopment, setLocalDevelopment] = useState<boolean | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    const local = isLocalDevelopment(window.location.hostname)
    setLocalDevelopment(local)
    if (local) onToken('local-development')
    return () => onToken('')
  }, [onToken])

  useEffect(() => {
    if (localDevelopment !== false || !ready || !sitekey || !container.current || !window.turnstile) return
    const api = window.turnstile
    const id = api.render(container.current, {
      sitekey,
      action: 'admin-login',
      size: 'flexible',
      callback: (token: string) => { setError(''); onToken(token) },
      'expired-callback': () => onToken(''),
      'error-callback': (code: string) => {
        onToken('')
        setError(`Security check failed (code ${code}). Please reopen the login dialog to retry.`)
      },
    })
    return () => { onToken(''); api.remove(id) }
  }, [localDevelopment, ready, sitekey, onToken])

  // Wait for the browser hostname before loading any third-party script.
  if (localDevelopment === null) return null
  if (localDevelopment) return <p className="mt-4 text-sm text-slate-500">Security check disabled for local development.</p>

  return (
    <div className="mt-4">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => setError('Unable to load the security check script. Check your connection or browser content blocker, then reload.')}
      />
      <div ref={container} />
      {!sitekey ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">Sign-in is temporarily unavailable.</p>
        : error ? <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>
        : !ready && <p role="status" className="text-sm text-slate-500">Loading security check…</p>}
    </div>
  )
}
