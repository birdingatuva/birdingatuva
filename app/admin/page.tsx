"use client"
import { MAX_IMAGE_COUNT, MAX_IMAGE_MB, MAX_IMAGE_SIZE } from '@/lib/constants'
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Image from "next/image"
import { Navigation } from "@/components/navigation"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, X, ImageIcon } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

// No local token; rely on HttpOnly cookie and session endpoint.

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

// Helper to convert File/Blob to base64 for localStorage
function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
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
    signupUrl: "",
    signupEmbedUrl: "",
    hasGoogleForm: false,
  }
  const [form, setForm] = useState(initialForm)
  const [displaySlug, setDisplaySlug] = useState<string>("")
  const [checkingSlug, setCheckingSlug] = useState<boolean>(false)
  const [headerImage, setHeaderImage] = useState<File | null>(null)
  const [headerImagePreview, setHeaderImagePreview] = useState<string>("")
  const [additionalImages, setAdditionalImages] = useState<File[]>([])
  const [additionalImagePreviews, setAdditionalImagePreviews] = useState<string[]>([])
  const [showMarkdown, setShowMarkdown] = useState(false) // Default to showing preview
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [error, setError] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [birdImages, setBirdImages] = useState<string[]>([])
  const router = useRouter()
  const headerImageInputRef = useRef<HTMLInputElement>(null)
  const additionalImagesInputRef = useRef<HTMLInputElement>(null)

  // No client-side JWT helpers required.

  // Check authorization on mount and periodically via session endpoint
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin-session')
        setIsAuthorized(res.ok)
      } catch {
        setIsAuthorized(false)
      }
    }
    checkAuth()
    const interval = setInterval(checkAuth, 15000)
    return () => clearInterval(interval)
  }, [])

  // Load bird images for decorative birds
  useEffect(() => {
    // Use just the filenames - DecorativeBirds will construct the full path
    const birds = [
      'bluejay.png',
      'woodduck.png',
      'redtail.png',
      'modo.png',
      'rwbb.png',
      'kestrel.png',
      'flicker.png',
      'baldeagle.png',
      'kingfisher.png',
      'gbh.png',
      'cardinal.png',
      'yrwa.png',
    ]
    setBirdImages(birds)
  }, [])

  useEffect(() => {
    // Load form data from localStorage on mount
    const savedForm = localStorage.getItem("adminFormData");
    if (savedForm) {
      try {
        setForm(JSON.parse(savedForm));
      } catch (e) {
        console.error("Failed to load saved form data:", e);
      }
    }
    
    // Load saved image previews (not the actual files, just previews for display)
    const savedHeaderPreview = localStorage.getItem("adminHeaderImagePreview");
    if (savedHeaderPreview) {
      setHeaderImagePreview(savedHeaderPreview);
    }
    
    const savedAdditionalPreviews = localStorage.getItem("adminAdditionalImagePreviews");
    if (savedAdditionalPreviews) {
      try {
        setAdditionalImagePreviews(JSON.parse(savedAdditionalPreviews));
      } catch (e) {
        console.error("Failed to load saved image previews:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Save form data to localStorage whenever it changes
    // Use a timeout to debounce saves
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem("adminFormData", JSON.stringify(form));
      } catch (e) {
        console.error("Failed to save form data:", e);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [form]);

  // Save form data when tab visibility changes or before unload
  useEffect(() => {
    const saveFormData = () => {
      try {
        localStorage.setItem("adminFormData", JSON.stringify(form));
      } catch (e) {
        console.error("Failed to save form data:", e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        saveFormData();
      }
    };

    const handleBeforeUnload = () => {
      saveFormData();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [form]);

  const handleHeaderImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > MAX_IMAGE_SIZE) {
      alert(`File ${file.name} is too large. Max size is ${MAX_IMAGE_MB}MB.`)
      return
    }
    
    const resized = await resizeImage(file, 1200, 800)
    const resizedFile = new File([resized], file.name, { type: file.type })
    setHeaderImage(resizedFile)
    
    // Convert to base64 for localStorage persistence across page reloads
    const base64Preview = await fileToBase64(resizedFile)
    setHeaderImagePreview(base64Preview)
    localStorage.setItem("adminHeaderImagePreview", base64Preview)
  }

  const handleAdditionalImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxAdditional = MAX_IMAGE_COUNT - 1 // -1 for header image
    
    // Calculate how many more images we can add
    const remainingSlots = maxAdditional - additionalImages.length
    
    if (files.length > remainingSlots) {
      setUploadError(`You can only add ${remainingSlots} more image(s). Maximum total is ${maxAdditional}.`)
      return
    }
    
    // Clear any previous errors when successfully adding images
    if (uploadError) {
      setUploadError("")
    }
    
    const resizedFiles: File[] = []
    const previews: string[] = []
    
    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        setUploadError(`File ${file.name} is too large. Max size is ${MAX_IMAGE_MB}MB.`)
        continue
      }
      const resized = await resizeImage(file, 1200, 800)
      const resizedFile = new File([resized], file.name, { type: file.type })
      resizedFiles.push(resizedFile)
      
      // Convert to base64 for localStorage persistence across page reloads
      const base64Preview = await fileToBase64(resizedFile)
      previews.push(base64Preview)
    }
    
    // Append to existing images instead of replacing
    setAdditionalImages(prev => [...prev, ...resizedFiles])
    setAdditionalImagePreviews(prev => {
      const newPreviews = [...prev, ...previews]
      // Save to localStorage
      localStorage.setItem("adminAdditionalImagePreviews", JSON.stringify(newPreviews))
      return newPreviews
    })
    
    // Reset the input so the same files can be selected again if needed
    if (additionalImagesInputRef.current) {
      additionalImagesInputRef.current.value = ""
    }
  }

  const removeHeaderImage = () => {
    setHeaderImage(null)
    setHeaderImagePreview("")
    localStorage.removeItem("adminHeaderImagePreview")
    if (headerImageInputRef.current) {
      headerImageInputRef.current.value = ""
    }
  }

  const removeAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index))
    setAdditionalImagePreviews(prev => {
      const newPreviews = prev.filter((_, i) => i !== index)
      localStorage.setItem("adminAdditionalImagePreviews", JSON.stringify(newPreviews))
      return newPreviews
    })
  }

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
    setAdditionalImages(resizedFiles)
    setAdditionalImagePreviews(previews)
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

  // Debounced slug availability check whenever slug changes
  useEffect(() => {
    if (!form.slug) {
      setDisplaySlug("")
      return
    }
    const controller = new AbortController()
    const t = setTimeout(async () => {
      try {
        setCheckingSlug(true)
        const res = await fetch(`/api/check-slug?base=${encodeURIComponent(form.slug)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data: { uniqueSlug: string; isTaken: boolean } = await res.json()
        setDisplaySlug(data.uniqueSlug)
        // Always auto-apply increment since slug is not user-editable
        if (data.uniqueSlug !== form.slug) {
          setForm(prev => ({ ...prev, slug: data.uniqueSlug }))
        }
      } catch (e) {
        // ignore aborts/errors; keep current display
      } finally {
        setCheckingSlug(false)
      }
    }, 300)
    return () => {
      controller.abort()
      clearTimeout(t)
    }
  }, [form.slug])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("=== FORM SUBMISSION STARTED ===");
    setSubmitting(true);
    setError("");

    // Validate required fields
    if (!headerImage) {
      console.log("Validation failed: No header image");
      setError("Event header image is required.");
      setSubmitting(false);
      // Scroll to the header image section
      const element = document.querySelector('[data-section="header-image"]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Add offset for fixed navigation (if any)
        window.scrollBy({ top: -100, behavior: 'smooth' });
      }
      return;
    }

    console.log("Form data:", form);
    console.log("Header image:", headerImage?.name, headerImage?.size, "bytes");
    console.log("Additional images count:", additionalImages.length);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      fd.append(k, String(v));
      console.log(`Form field: ${k} = ${String(v).substring(0, 100)}`);
    });
    
    // Add header image as first image
    let imageIndex = 1
    if (headerImage) {
      fd.append(`image${imageIndex}`, headerImage);
      console.log(`Added image${imageIndex}:`, headerImage.name);
      imageIndex++
    }
    
    // Add additional images
    additionalImages.forEach((img) => {
      fd.append(`image${imageIndex}`, img);
      console.log(`Added image${imageIndex}:`, img.name);
      imageIndex++
    });
    
    fd.append("imageCount", String(imageIndex - 1));
    console.log("Total images:", imageIndex - 1);

    // Session handled via HttpOnly cookie; rely on server to reject if unauthorized

    try {
      console.log("Sending POST request to /api/events");
      const res = await fetch("/api/events", { method: "POST", body: fd });

      console.log("Response status:", res.status, res.statusText);
      
      if (res.ok) {
        console.log("✅ Submission successful!");
        setForm(initialForm);
        setHeaderImage(null);
        setHeaderImagePreview("");
        setAdditionalImages([]);
        setAdditionalImagePreviews([]);
        setSubmitted(true);
        setShowSuccessToast(true);
        // Clear all saved form data from localStorage
        localStorage.removeItem("adminFormData");
        localStorage.removeItem("adminHeaderImagePreview");
        localStorage.removeItem("adminAdditionalImagePreviews");
        setTimeout(() => setSubmitted(false), 1500);
        setTimeout(() => setShowSuccessToast(false), 2000);
        router.refresh();
      } else {
        console.log("❌ Submission failed with status:", res.status);
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Error response:', errorData);
        if (res.status === 401) {
          setIsAuthorized(false)
          setError('Your session is invalid or expired. Please log in again and resubmit.')
        } else {
          setError(`Submission failed: ${errorData.error || 'Please try again.'}`);
        }
      }
    } catch (err) {
      console.error("❌ Submission exception:", err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Please check your connection and try again.'}`);
    } finally {
      setSubmitting(false);
      console.log("=== FORM SUBMISSION ENDED ===");
    }
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
        {showSuccessToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-md text-sm font-semibold animate-in fade-in slide-in-from-top-2 duration-300">
            Event submitted successfully
          </div>
        )}
        <DecorativeBirds images={birdImages} />
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
                  <style jsx>{`
                    form > div,
                    form input,
                    form textarea {
                      scroll-margin-top: 8rem;
                    }
                  `}</style>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Title</label>
                    <Input name="title" value={form.title} onChange={handleChange} required placeholder="e.g., Saturday Morning Bird Walk" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      URL Slug
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">Auto</span>
                    </label>
                    <div
                      className="relative"
                      role="textbox"
                      aria-readonly="true"
                    >
                      <Input 
                        value={form.slug} 
                        placeholder="saturday-morning-bird-walk" 
                        readOnly 
                        className="font-mono pr-16 cursor-default opacity-100"
                      />
                      <span className="absolute top-1/2 -translate-y-1/2 right-3 text-[11px] text-muted-foreground select-none">
                        locked
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">Generated from the title. Dashes, lowercase, and numeric suffix if taken.</p>
                    {form.slug && (
                      <div className="text-xs mt-1 flex items-center gap-2">
                        <span className="text-muted-foreground">Final URL:</span>
                        <code className="px-1 py-[2px] rounded bg-muted/50 border border-border font-mono text-[11px]">/events/{displaySlug || form.slug}</code>
                        {checkingSlug && <span className="text-[10px] opacity-70">checking…</span>}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Date</label>
                      <Input 
                        name="startDate" 
                        type="date" 
                        value={form.startDate} 
                        onChange={handleChange} 
                        required 
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Date (Optional)</label>
                      <Input 
                        name="endDate" 
                        type="date" 
                        value={form.endDate} 
                        onChange={handleChange}
                        min={form.startDate || new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Start Time (Optional)</label>
                      <Input name="startTime" type="time" value={form.startTime} onChange={handleChange} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Time (Optional)</label>
                      <Input 
                        name="endTime" 
                        type="time" 
                        value={form.endTime} 
                        onChange={handleChange}
                        min={form.startTime || undefined}
                      />
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

                  <div className="border-t pt-6" data-section="header-image">
                    <h3 className="text-lg font-semibold mb-4">Event Images</h3>
                    
                    {/* Header Image Upload */}
                    <div className="space-y-2 mb-6">
                      <label className="text-sm font-medium">Event Header Image (Required)</label>
                      <p className="text-xs text-muted-foreground mb-3">This will be the main image displayed for your event</p>
                      
                      {!headerImagePreview ? (
                        <label 
                          htmlFor="headerImage" 
                          className="flex flex-col items-center justify-center w-full max-w-md aspect-[16/9] border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center">
                            <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                            <p className="mb-2 text-sm font-medium text-muted-foreground">Click to upload header image</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to {MAX_IMAGE_MB}MB</p>
                            <p className="text-xs text-muted-foreground mt-1">Recommended: 1280x720px (16:9 ratio)</p>
                          </div>
                          <input 
                            id="headerImage" 
                            ref={headerImageInputRef}
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleHeaderImageChange}
                          />
                        </label>
                      ) : (
                        <div className="relative w-1/2 aspect-[16/9] rounded-lg overflow-hidden border border-border group">
                          <Image 
                            src={headerImagePreview} 
                            alt="Header preview" 
                            fill 
                            className="object-cover" 
                          />
                          <button
                            type="button"
                            onClick={removeHeaderImage}
                            className="absolute top-3 right-3 p-2 rounded-full bg-background/90 hover:bg-background shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                            aria-label="Remove header image"
                          >
                            <X className="w-4 h-4 text-foreground" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Additional Images Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Additional Images (Optional, max {MAX_IMAGE_COUNT - 1})</label>
                      <p className="text-xs text-muted-foreground mb-3">
                        Upload additional images for the event gallery
                        {additionalImages.length > 0 && ` (${additionalImages.length}/${MAX_IMAGE_COUNT - 1} uploaded)`}
                      </p>
                      
                      {/* Upload Error Message - displayed above the upload button */}
                      {uploadError && (
                        <div className="mb-4 bg-red-50 dark:bg-red-950/30 border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-4 py-3 rounded-lg text-sm font-semibold flex items-start gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{uploadError}</span>
                        </div>
                      )}
                      
                      {additionalImages.length < MAX_IMAGE_COUNT - 1 && (
                        <label 
                          htmlFor="additionalImages" 
                          className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer bg-muted/20 hover:bg-muted/40 transition-colors"
                        >
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImageIcon className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-1 text-sm font-medium text-muted-foreground">
                              {additionalImages.length > 0 ? 'Click to add more images' : 'Click to upload additional images'}
                            </p>
                            <p className="text-xs text-muted-foreground">Multiple images allowed</p>
                          </div>
                          <input 
                            id="additionalImages" 
                            ref={additionalImagesInputRef}
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            multiple
                            onChange={handleAdditionalImagesChange}
                          />
                        </label>
                      )}
                      
                      {additionalImagePreviews.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                          {additionalImagePreviews.map((src, i) => (
                            <div key={i} className="relative group">
                              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-border">
                                <Image 
                                  src={src} 
                                  alt={`Additional preview ${i + 1}`} 
                                  fill 
                                  className="object-cover" 
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAdditionalImage(i)}
                                className="absolute top-2 right-2 p-1.5 rounded-full bg-background/90 hover:bg-background shadow-lg border border-border opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                aria-label={`Remove image ${i + 1}`}
                              >
                                <X className="w-3 h-3 text-foreground" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Event Description</h3>
                    <div className="space-y-2">
                      <div className="flex gap-2 mb-3">
                        <Button 
                          type="button" 
                          size="sm" 
                          variant={!showMarkdown ? "default" : "outline"} 
                          onClick={() => setShowMarkdown(false)}
                          className={!showMarkdown ? "hover:bg-primary hover:text-primary-foreground cursor-default" : "hover:text-foreground"}
                        >
                          Preview
                        </Button>
                        <Button 
                          type="button" 
                          size="sm" 
                          variant={showMarkdown ? "default" : "outline"} 
                          onClick={() => setShowMarkdown(true)}
                          className={showMarkdown ? "hover:bg-primary hover:text-primary-foreground cursor-default" : "hover:text-foreground"}
                        >
                          Edit Markdown
                        </Button>
                      </div>
                      {showMarkdown ? (
                        <Textarea
                          name="bodyMarkdown"
                          value={form.bodyMarkdown}
                          onChange={handleChange}
                          rows={12}
                          placeholder="Enter event description in Markdown format..."
                          className="font-mono text-sm"
                        />
                      ) : (
                        <div className="prose prose-neutral prose-base dark:prose-invert max-w-none border rounded-lg p-6 bg-muted/20 min-h-[12rem] overflow-auto [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4 [&_li]:mb-0 [&_strong]:font-bold">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {form.bodyMarkdown || '*No content yet*'}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-4 py-3 rounded-lg text-sm font-semibold">
                      {error}
                    </div>
                  )}

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
