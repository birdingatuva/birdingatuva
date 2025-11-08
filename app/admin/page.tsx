import { MAX_IMAGE_COUNT, MAX_IMAGE_MB, MAX_IMAGE_SIZE } from '@/lib/constants'
"use client"

import { useState, useRef, useEffect } from "react"
// Helper to get/set token in localStorage
function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || ''
}
function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('admin_token', token)
}
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import DOMPurify from 'dompurify'

function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      let scale = Math.min(maxWidth / width, maxHeight / height, 1)
      width = Math.round(width * scale)
      height = Math.round(height * scale)
      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error("Image resize failed"))
      }, file.type)
      URL.revokeObjectURL(url)
    }
    img.onerror = reject
    img.src = url
  })
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [loginPassword, setLoginPassword] = useState("")
  const initialForm = {
    title: "",
    slug: "",
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
    location: "",
    bodyMarkdown: "",
    signupTitle: "",
    signupUrl: "",
    signupEmbedUrl: "",
    hasGoogleForm: false,
  }
  const [form, setForm] = useState(initialForm)
  const [images, setImages] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [showMarkdown, setShowMarkdown] = useState(true)
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  // Check auth on mount
  useEffect(() => {
    const token = getToken()
    if (!token) {
      setShowLogin(true)
      setAuthorized(false)
      return
    }
    // Try to access /admin with token
    fetch('/admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => {
      if (res.status === 401) {
        setShowLogin(true)
        setAuthorized(false)
      } else {
        setShowLogin(false)
        setAuthorized(true)
      }
    })
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length > MAX_IMAGE_COUNT) {
      alert(`You can upload a maximum of ${MAX_IMAGE_COUNT} images.`)
      return
    }
    const resizedFiles: File[] = []
    const previews: string[] = []
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        alert(`File ${file.name} is too large. Max size is ${MAX_IMAGE_MB}MB.`)
        continue
      }
      const resized = await resizeImage(file, 1200, 800)
      const resizedFile = new File([resized], file.name, { type: file.type })
      resizedFiles.push(resizedFile)
      previews.push(URL.createObjectURL(resizedFile))
    }
    setImages(resizedFiles)
    setImagePreviews(previews)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    let fieldValue: string | boolean = value
    if (type === "checkbox") {
      fieldValue = (e.target as HTMLInputElement).checked
    }
    setForm((f) => ({ ...f, [name]: fieldValue }))
    if (name === "title") {
      setForm((f) => ({ ...f, slug: value.toLowerCase().replace(/\s+/g, "-") }))
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    // Try to access /admin with password
    const res = await fetch('/admin', {
      method: 'GET',
      headers: { Authorization: `Bearer ${loginPassword}` },
    })
    if (res.status === 401) {
      alert('Incorrect password')
      setLoginPassword("")
      return
    }
    setToken(loginPassword)
    setShowLogin(false)
    setAuthorized(true)
  }

  const handleLogout = () => {
    setToken("")
    setAuthorized(false)
    setShowLogin(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    const fd = new FormData()
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)))
    images.forEach((img, idx) => {
      fd.append(`image${idx+1}`, img)
    })
    fd.append('imageCount', String(images.length))
    // Auth header
    const token = getToken()
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    })
    if (res.ok) {
      alert("Event submitted!")
      setForm(initialForm)
      setImages([])
      setImagePreviews([])
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
      router.refresh()
    } else {
      setError("Submission failed. Check password and try again.")
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="w-full flex justify-end p-4">
        {authorized && (
          <Button variant="outline" onClick={handleLogout} className="ml-auto">Logout</Button>
        )}
        {!authorized && (
          <Button variant="default" onClick={() => setShowLogin(true)} className="ml-auto">Login</Button>
        )}
      </header>
      <main className="flex-1 container mx-auto max-w-2xl py-12">
        {showLogin && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border w-full max-w-sm flex flex-col gap-4">
              <h2 className="text-xl font-bold mb-2">Admin Login</h2>
              <Input type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="Password" required autoFocus />
              <Button type="submit">Login</Button>
            </form>
          </div>
        )}
        {authorized && (
          <>
            <h1 className="font-display text-3xl mb-8">Admin: Add New Event</h1>
            <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border">
              <div className="flex flex-col gap-2">
                <label>Title</label>
                <Input name="title" value={form.title} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-2">
                <label>Slug</label>
                <Input name="slug" value={form.slug} onChange={handleChange} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label>Start Date</label>
                  <Input name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
                </div>
                <div className="flex flex-col gap-2">
                  <label>End Date</label>
                  <Input name="endDate" type="date" value={form.endDate} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label>Start Time</label>
                  <Input name="startTime" type="time" value={form.startTime} onChange={handleChange} />
                </div>
                <div className="flex flex-col gap-2">
                  <label>End Time</label>
                  <Input name="endTime" type="time" value={form.endTime} onChange={handleChange} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label>Location</label>
                <Input name="location" value={form.location} onChange={handleChange} required />
              </div>
              <div className="flex flex-col gap-2">
                <label>Signup Title</label>
                <Input name="signupTitle" value={form.signupTitle} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-2">
                <label>Signup URL</label>
                <Input name="signupUrl" value={form.signupUrl} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-2">
                <label>Signup Embed URL</label>
                <Input name="signupEmbedUrl" value={form.signupEmbedUrl} onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-2">
                <label>Event Images</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="block border rounded p-2"
                />
                <div className="flex gap-2 flex-wrap">
                  {imagePreviews.map((src, i) => (
                    <Image key={i} src={src} alt={`Preview ${i+1}`} width={150} height={100} className="rounded border" />
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <label>Event Description (Markdown)</label>
                <div className="flex gap-2 items-center mb-2">
                  <Button type="button" variant={showMarkdown ? "default" : "outline"} onClick={() => setShowMarkdown(true)}>
                    Markdown
                  </Button>
                  <Button type="button" variant={!showMarkdown ? "default" : "outline"} onClick={() => setShowMarkdown(false)}>
                    Preview
                  </Button>
                </div>
                {showMarkdown ? (
                  <Textarea name="bodyMarkdown" value={form.bodyMarkdown} onChange={handleChange} rows={8} />
                ) : (
                  <div className="prose dark:prose-invert border rounded p-4 bg-slate-50 dark:bg-slate-800 min-h-[8rem]">
                    {/* @ts-ignore */}
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(window.marked ? window.marked(form.bodyMarkdown) : form.bodyMarkdown) }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="hasGoogleForm">Include Google Form?</label>
                <input
                  id="hasGoogleForm"
                  name="hasGoogleForm"
                  type="checkbox"
                  checked={form.hasGoogleForm}
                  onChange={handleChange}
                  className="w-5 h-5"
                />
              </div>
              {error && <div className="text-red-600">{error}</div>}
              <Button type="submit" disabled={submitting || submitted} className="w-full opacity-90">
                {submitting ? "Submitting..." : submitted ? "Submitted!" : "Submit Event"}
              </Button>
            </form>
          </>
        )}
      </main>
    </div>
  )
}
