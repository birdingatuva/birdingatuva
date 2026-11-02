"use client"

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

const Session = createContext({ authorized: false, updateSession: (_authorized: boolean) => {} })
export const useAdminSession = () => useContext(Session)

export function AdminSessionProvider({ initialAuthorized, children }: { initialAuthorized: boolean; children: ReactNode }) {
  const [authorized, setAuthorized] = useState(initialAuthorized)
  const pending = useRef<AbortController | null>(null)

  function updateSession(value: boolean) {
    pending.current?.abort()
    pending.current = null
    setAuthorized(value)
    try { localStorage.setItem('admin-session-changed', crypto.randomUUID()) } catch { /* Storage unavailable. */ }
  }

  useEffect(() => {
    async function verify() {
      if (pending.current) return
      const controller = new AbortController()
      pending.current = controller
      try {
        const response = await fetch('/api/admin-session', { cache: 'no-store', signal: controller.signal })
        if (!controller.signal.aborted && (response.ok || response.status === 401)) setAuthorized(response.ok)
      } catch { /* Retain the last confirmed session on network errors. */ }
      finally { if (pending.current === controller) pending.current = null }
    }
    const onFocus = () => { if (authorized) void verify() }
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'admin-session-changed') return
      pending.current?.abort()
      pending.current = null
      void verify()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('admin-session-rejected', onFocus)
    window.addEventListener('storage', onStorage)
    return () => {
      pending.current?.abort()
      pending.current = null
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('admin-session-rejected', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [authorized])

  return <Session.Provider value={{ authorized, updateSession }}>{children}</Session.Provider>
}
