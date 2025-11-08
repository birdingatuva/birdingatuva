"use client"
import { MAX_IMAGE_COUNT, MAX_IMAGE_MB, MAX_IMAGE_SIZE } from '@/lib/constants'
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Helper to get/set token in localStorage
function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || ''
}
function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('admin_token', token)
}

function resizeImage(file: File, maxWidth: number, maxHeight: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      let { width, height } = img
      const scale = Math.min(maxWidth / width, maxHeight / height, 1)
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
  // Auth state now handled globally in navigation bar
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
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check authorization on mount and periodically
  useEffect(() => {
    const checkAuth = () => {
      setIsAuthorized(!!getToken())
    }
    checkAuth()
    const interval = setInterval(checkAuth, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Load form data from localStorage on mount
    const savedForm = localStorage.getItem("adminFormData");
    if (savedForm) {
      setForm(JSON.parse(savedForm));
    }
  }, []);

  useEffect(() => {
    // Save form data to localStorage whenever it changes
    localStorage.setItem("adminFormData", JSON.stringify(form));
  }, [form]);

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
    const { name, value, type } = e.target;
    let fieldValue: string | boolean = value;
    if (type === "checkbox") {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setForm((f) => {
      const updatedForm = { ...f, [name]: fieldValue };
      if (name === "title") {
        updatedForm.slug = value
          .toLowerCase()
          .replace(/[^a-z0-9-\s]/g, "") // Remove invalid characters
          .replace(/\s+/g, "-"); // Replace spaces with dashes
      }
      return updatedForm;
    });
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
    images.forEach((img, idx) => {
      fd.append(`image${idx + 1}`, img);
    });
    fd.append("imageCount", String(images.length));

    // Use the token already stored during login
    const token = getToken();
    if (!token) {
      setError("You must be logged in to submit the form.");
      setSubmitting(false);
      return;
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    if (res.ok) {
      alert("Event submitted!");
      setForm(initialForm);
      setImages([]);
      setImagePreviews([]);
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 1500); // Adjusted to 1.5 seconds
      router.refresh();
    } else {
      setError("Submission failed. Please try again.");
    }

    setSubmitting(false);
  }

  // Check if user is logged in
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        <main className="flex-1 flex flex-col items-center justify-center text-center relative z-10">
          <h1 className="font-display text-5xl font-bold mb-4 text-primary">Access Restricted</h1>
          <p className="text-lg mb-6 text-muted-foreground max-w-md mx-auto">
            Please log in using the Login button in the navigation bar to access the admin page.
          </p>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex-1 relative flex flex-col">
      <Navigation />
      <main className="relative z-20 flex-1">
        <DecorativeBirds images={[]} />
        <PageHeader
          title="Admin Panel"
          description="Create and manage club events. Fill out the form below to add a new event to the website."
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-4xl relative z-20">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Add New Event</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Title</label>
                    <Input name="title" value={form.title} onChange={handleChange} required placeholder="e.g., Saturday Morning Bird Walk" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">URL Slug</label>
                    <Input name="slug" value={form.slug} onChange={handleChange} required placeholder="e.g., saturday-morning-bird-walk" />
                    <p className="text-xs text-muted-foreground">This will be used in the event URL</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input name="startDate" type="date" value={form.startDate} onChange={handleChange} required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date (Optional)</label>
                      <Input name="endDate" type="date" value={form.endDate} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Time (Optional)</label>
                      <Input name="startTime" type="time" value={form.startTime} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Time (Optional)</label>
                      <Input name="endTime" type="time" value={form.endTime} onChange={handleChange} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input name="location" value={form.location} onChange={handleChange} required placeholder="e.g., Ivy Creek Natural Area" />
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Signup Information (Optional)</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Signup URL</label>
                        <Input name="signupUrl" value={form.signupUrl} onChange={handleChange} placeholder="https://forms.gle/..." />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Signup Embed URL</label>
                        <Input name="signupEmbedUrl" value={form.signupEmbedUrl} onChange={handleChange} placeholder="https://docs.google.com/forms/d/e/..." />
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <input
                          id="hasGoogleForm"
                          name="hasGoogleForm"
                          type="checkbox"
                          checked={form.hasGoogleForm}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <label htmlFor="hasGoogleForm" className="text-sm font-medium cursor-pointer">Include embedded Google Form on event page</label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Event Images (Optional, max {MAX_IMAGE_COUNT})</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground">Images will be resized to max 1200x800px</p>
                      {imagePreviews.length > 0 && (
                        <div className="flex gap-3 flex-wrap mt-3">
                          {imagePreviews.map((src, i) => (
                            <div key={i} className="relative">
                              <Image src={src} alt={`Preview ${i + 1}`} width={150} height={100} className="rounded-lg border-2 object-cover" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Event Description</label>
                      <div className="flex gap-2 mb-3">
                        <Button type="button" size="sm" variant={showMarkdown ? "default" : "outline"} onClick={() => setShowMarkdown(true)}>
                          Edit Markdown
                        </Button>
                        <Button type="button" size="sm" variant={!showMarkdown ? "default" : "outline"} onClick={() => setShowMarkdown(false)}>
                          Preview
                        </Button>
                      </div>
                      {showMarkdown ? (
                        <Textarea
                          name="bodyMarkdown"
                          value={form.bodyMarkdown}
                          onChange={handleChange}
                          rows={12}
                          placeholder="Enter event description in Markdown format..."
                          className="font-mono text-sm bg-white dark:bg-slate-900" // Ensure consistent background color
                        />
                      ) : (
                        <div className="prose dark:prose-invert border rounded-lg p-4 bg-slate-50 dark:bg-slate-800 min-h-[12rem]">
                          <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(form.bodyMarkdown) as string) }} />
                        </div>
                      )}
                    </div>
                  </div>

                  {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm font-medium">{error}</div>}

                  <div className="flex gap-3 pt-4">
                    <Button type="submit" disabled={submitting || submitted} className="flex-1" size="lg">
                      {submitting ? "Submitting..." : submitted ? "✓ Submitted!" : "Create Event"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
