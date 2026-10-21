'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { suggestEventLinkSchema } from '@/lib/input-validation'

const SETTING_URL = '/api/pages/events/settings/suggest_event_url'

export function SuggestEventSettings({ onSaved }: { onSaved: () => void }) {
  const [url, setUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const saveLock = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(SETTING_URL, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Unable to load the suggest an event link.')
        const value = suggestEventLinkSchema.safeParse(data.setting)
        const initial = value.success ? value.data : ''
        if (!controller.signal.aborted) {
          setUrl(initial)
          setSavedUrl(initial)
          setLoaded(true)
        }
      })
      .catch(loadError => {
        if (!controller.signal.aborted) setError(loadError instanceof Error ? loadError.message : 'Unable to load the suggest an event link.')
      })
    return () => controller.abort()
  }, [])

  const validation = suggestEventLinkSchema.safeParse(url)

  async function save() {
    if (!loaded || saveLock.current || !validation.success || validation.data === savedUrl) return
    saveLock.current = true
    setSaving(true)
    setError('')
    try {
      const response = await fetch(SETTING_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: validation.data }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Unable to save the suggest an event link.')
      setUrl(data.setting)
      setSavedUrl(data.setting)
      onSaved()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save the suggest an event link.')
    } finally {
      saveLock.current = false
      setSaving(false)
    }
  }

  return <section className="space-y-4" aria-label="Suggest an event link">
    <h3 className="text-xl font-semibold">Suggest an event link</h3>
    <p className="text-sm text-muted-foreground">Set the destination for the Suggest an event button on the Events page.</p>
    {!loaded && !error && <p role="status">Loading suggest an event link…</p>}
    {loaded && <>
      <div className="space-y-2">
        <label htmlFor="suggest-event-url" className="text-sm font-medium">Button URL</label>
        <Input id="suggest-event-url" type="url" value={url} disabled={saving} onChange={event => setUrl(event.target.value)} placeholder="https://…" />
      </div>
      <Button type="button" className="w-full sm:w-auto" disabled={saving || !validation.success || url.trim() === savedUrl} onClick={save}>{saving ? 'Saving...' : 'Save Changes'}</Button>
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </section>
}
