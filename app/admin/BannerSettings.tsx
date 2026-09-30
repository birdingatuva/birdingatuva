"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { BannerContent } from '@/components/banner-content'
import { defaultBannerContent } from '@/lib/banner'
import { LexicalMarkdownEditor } from './LexicalMarkdownEditor'

export function BannerSettings() {
  const [content, setContent] = useState(defaultBannerContent)
  const [saved, setSaved] = useState(defaultBannerContent)
  const [enabled, setEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loaded, setLoaded] = useState(false)
  const changed = JSON.stringify(content) !== JSON.stringify(saved)

  useEffect(() => {
    let active = true
    fetch('/api/banner', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('Unable to load banner settings. Reload to try again.')
      const data = await response.json()
      if (active) {
        setContent(data.content)
        setSaved(data.content)
        setEnabled(data.enabled)
        setLoaded(true)
      }
    }).catch(error => { if (active) setError(error.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function persist(visibilityOnly: boolean) {
    setError('')
    setMessage('')
    const snapshot = { ...content }
    const nextEnabled = !enabled
    visibilityOnly ? setToggling(true) : setSaving(true)
    try {
      const response = await fetch('/api/banner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visibilityOnly ? { enabled: nextEnabled } : { content: snapshot }),
      })
      if (!response.ok) throw new Error('Unable to save banner settings. Please try again.')
      if (visibilityOnly) setEnabled(nextEnabled)
      else setSaved(snapshot)
      setMessage(visibilityOnly ? (nextEnabled ? 'Banner enabled.' : 'Banner hidden.') : 'Banner changes saved.')
      window.dispatchEvent(new Event('banner-changed'))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to save banner settings.')
    } finally {
      visibilityOnly ? setToggling(false) : setSaving(false)
    }
  }

  if (loading) return <p role="status">Loading banner settings...</p>
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center gap-3">
      <h3 className="text-xl font-semibold">Site announcement banner</h3>
      <button type="button" role="switch" aria-checked={enabled} aria-label="Show announcement banner" aria-busy={toggling}
        disabled={!loaded || toggling || saving || (!enabled && !saved.markdown.trim())} onClick={() => void persist(true)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${enabled ? 'bg-primary' : 'bg-muted-foreground/40'}`}>
        <span aria-hidden="true" className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
    {!saved.markdown.trim() && <p className="text-sm text-muted-foreground">Save a message before turning the banner on.</p>}
    {loaded && <>
      <LexicalMarkdownEditor value={content.markdown} onChange={markdown => { setContent(current => ({ ...current, markdown })); setMessage('') }} placeholder="Write an interest meeting announcement or urgent message..." />
      <div className="flex flex-wrap gap-6">
        {(['backgroundColor', 'textColor'] as const).map(key => <label key={key} className="flex items-center gap-3 text-sm font-medium">
          {key === 'backgroundColor' ? 'Background color' : 'Text color'}
          <input type="color" value={content[key]} onChange={event => { setContent(current => ({ ...current, [key]: event.target.value })); setMessage('') }} className="h-10 w-14 cursor-pointer rounded border border-border" />
          <span className="font-mono">{content[key]}</span>
        </label>)}
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">Preview</p>
        <div className="overflow-hidden rounded-md border border-border"><BannerContent content={content} /></div>
      </div>
      <Button type="button" disabled={saving || toggling || !changed || content.markdown.length > 10000} onClick={() => void persist(false)} className="disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100">
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>
      {content.markdown.length > 10000 && <p role="alert" className="text-sm text-destructive">Keep the banner under 10,000 characters.</p>}
    </>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
  </div>
}
