"use client"
import { MAX_IMAGE_MB, MAX_IMAGE_SIZE } from '@/lib/constants'
import { useState, useRef, useEffect, useLayoutEffect, useCallback } from "react"
import { dedupeJson } from '@/lib/fetch-dedupe'
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { Footer } from "@/components/footer"
import { DecorativeBirds } from "@/components/decorative-birds"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronUp, CalendarDays, CheckCircle2, ChevronDown, CircleHelp, Eye, EyeOff, GripVertical, House, Link2, Pencil, Search, Trash2, ShieldCheck, Upload, UsersRound, X } from "lucide-react"
import { GenerateCarpool } from "./GenerateCarpool"
import { ShortlinkTools } from "./ShortlinkTools"
import { BannerSettings } from "./BannerSettings"
import { LexicalMarkdownEditor } from "./LexicalMarkdownEditor"

// No local token; rely on HttpOnly cookie and session endpoint.

const ADMIN_ACTIVE_PAGE_KEY = "adminActivePage"
const ADMIN_PAGES = ["Home", "Events", "FAQ", "Leadership", "Links", "Admin"] as const

type AdminPageName = (typeof ADMIN_PAGES)[number]

function isAdminPageName(value: string | null): value is AdminPageName {
  return ADMIN_PAGES.some((page) => page === value)
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
    dashboardUrl: "",
    showFaqBanner: true,
    hidden: false,
  }
  const [form, setForm] = useState(initialForm)
  const [displaySlug, setDisplaySlug] = useState<string>("")
  const [checkingSlug, setCheckingSlug] = useState<boolean>(false)
  const [headerImage, setHeaderImage] = useState<File | null>(null)
  const [headerImagePreview, setHeaderImagePreview] = useState<string>("")
  const [password, setPassword] = useState("")
  const [generatingCarpool, setGeneratingCarpool] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitAction, setSubmitAction] = useState<"create" | "preview">("create")
  const [visibilitySaving, setVisibilitySaving] = useState<string | null>(null)
  const [visibilityError, setVisibilityError] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [showSuccessToast, setShowSuccessToast] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [error, setError] = useState("")
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [birdImages, setBirdImages] = useState<string[]>([])
  // Edit Events state
  const [events, setEvents] = useState<Array<{
    slug: string
    title: string
    startDate: string
    endDate: string | null
    startTime: string | null
    endTime: string | null
    location: string
    imagePublicId: string
    hidden: boolean
    signupUrl: string | null
    dashboardUrl: string | null
    showFaqBanner: boolean
    bodyMarkdown: string
  }>>([])
  const [eventSearchQuery, setEventSearchQuery] = useState("")
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [originalEventForm, setOriginalEventForm] = useState<typeof initialForm | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null)
  const [deletingTitle, setDeletingTitle] = useState<string>("")
  const [deleting, setDeleting] = useState(false)
  const [activePage, setActivePage] = useState<AdminPageName>("Events")
  const [pageVisibility, setPageVisibility] = useState<Record<string, boolean>>({})
  const [visibilityPrompt, setVisibilityPrompt] = useState<{ slug: string; name: string; published: boolean } | null>(null)
  const [faqMarkdown, setFaqMarkdown] = useState("")
  const [originalFaqMarkdown, setOriginalFaqMarkdown] = useState("")
  const [loadingFaq, setLoadingFaq] = useState(false)
  const [savingFaq, setSavingFaq] = useState(false)
  const [isEditEventsOpen, setIsEditEventsOpen] = useState(true)
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(true)
  const [linkSettings, setLinkSettings] = useState<Array<{ label: string; url: string; enabled: boolean }>>([])
  const [originalLinkSettings, setOriginalLinkSettings] = useState<Array<{ label: string; url: string; enabled: boolean }>>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  const [savingLinks, setSavingLinks] = useState(false)
  const [leadershipSettings, setLeadershipSettings] = useState<Array<{ position: string; name: string; major: string; year: string; email: string; bio: string; image: string; favoriteBird: string }>>([])
  const [originalLeadershipSettings, setOriginalLeadershipSettings] = useState<typeof leadershipSettings>([])
  const [loadingLeadership, setLoadingLeadership] = useState(false)
  const [savingLeadership, setSavingLeadership] = useState(false)
  const [leadershipImages, setLeadershipImages] = useState<Record<number, File>>({})
  const [processingLeadershipImage, setProcessingLeadershipImage] = useState(false)
  const leadershipImageVersion = useRef(0)
  const draggedLinkIndex = useRef<number | null>(null)
  const dragOrder = useRef<typeof linkSettings | null>(null)
  const linkIds = useRef(new WeakMap<object, string>())
  const linkNodes = useRef(new Map<string, HTMLDivElement>())
  const linkPositions = useRef(new Map<string, number>())
  function linkId(link: object) {
    let id = linkIds.current.get(link)
    if (!id) { id = crypto.randomUUID(); linkIds.current.set(link, id) }
    return id
  }
  useLayoutEffect(() => {
    linkNodes.current.forEach((node, id) => {
      const top = node.getBoundingClientRect().top
      const previous = linkPositions.current.get(id)
      if (draggedLinkIndex.current !== null && previous !== undefined && previous !== top && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        node.animate([{ transform: `translateY(${previous - top}px)` }, { transform: 'translateY(0)' }], { duration: 160, easing: 'ease-out' })
      }
      linkPositions.current.set(id, top)
    })
  }, [linkSettings])
  const router = useRouter()
  const imageSelectionVersion = useRef(0)
  const eventEditFromUrlHandled = useRef<string | null>(null)
  const [processingImage, setProcessingImage] = useState(false)
  const headerImageInputRef = useRef<HTMLInputElement>(null)

  // No client-side JWT helpers required.

  // Check authorization on mount and periodically via session endpoint
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const data = await dedupeJson<{ authenticated: boolean }>('/api/admin-session')
        setIsAuthorized(!!data.authenticated)
        if (data.authenticated) {
          const savedPage = sessionStorage.getItem(ADMIN_ACTIVE_PAGE_KEY)
          if (isAdminPageName(savedPage)) setActivePage(savedPage)
        }
      } catch {
        setIsAuthorized(false)
      }
    }
    checkAuth()
    const interval = setInterval(checkAuth, 15000)
    return () => clearInterval(interval)
  }, [])

  const selectAdminPage = (page: AdminPageName) => {
    setActivePage(page)
    sessionStorage.setItem(ADMIN_ACTIVE_PAGE_KEY, page)
  }

  // Load events when authorized
  useEffect(() => {
    const loadEvents = async () => {
      if (!isAuthorized) return
      try {
        setLoadingEvents(true)
        const data = await dedupeJson<{ events: any[] }>('/api/events?admin=true')
        setEvents(data.events || [])
      } catch {
        // ignore
      } finally {
        setLoadingEvents(false)
      }
    }
    loadEvents()
  }, [isAuthorized])

  useEffect(() => {
    const loadPages = async () => {
      if (!isAuthorized) return
      try {
        const data = await dedupeJson<{ pages: Array<{ slug: string; published: boolean }> }>('/api/pages?admin=true')
        setPageVisibility(Object.fromEntries(data.pages.map((page) => [page.slug, page.published])))
      } catch {
        setError('Unable to load page settings.')
      }
    }
    loadPages()
  }, [isAuthorized])

  useEffect(() => {
    const loadFaq = async () => {
      if (!isAuthorized) return
      try {
        setLoadingFaq(true)
        const data = await dedupeJson<{ page: { contentMarkdown: string } }>('/api/pages/faq?admin=true')
        setFaqMarkdown(data.page.contentMarkdown)
        setOriginalFaqMarkdown(data.page.contentMarkdown)
      } catch {
        setError('Unable to load FAQ content.')
      } finally {
        setLoadingFaq(false)
      }
    }
    loadFaq()
  }, [isAuthorized])

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
    
    const version = ++imageSelectionVersion.current
    setProcessingImage(true)
    try {
      const resized = await resizeImage(file, 1200, 800)
      const resizedFile = new File([resized], file.name, { type: file.type })
      const preview = await fileToBase64(resizedFile)
      if (version !== imageSelectionVersion.current) return
      setHeaderImage(resizedFile)
      setHeaderImagePreview(preview)
      if (!editMode) localStorage.setItem("adminHeaderImagePreview", preview)
    } catch {
      if (version === imageSelectionVersion.current) setError("Unable to read this image. Please choose another image.")
    } finally {
      if (version === imageSelectionVersion.current) setProcessingImage(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let fieldValue: string | boolean = value;
    if (type === "checkbox") {
      fieldValue = (e.target as HTMLInputElement).checked;
    }
    setForm((f) => {
      const updatedForm = { ...f, [name]: fieldValue };
      // Only generate slug from title if NOT in edit mode
      if (name === "title" && !editMode) {
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
    if (editMode) {
      // In edit mode, keep existing slug; skip uniqueness checks
      setDisplaySlug(form.slug)
      return
    }
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
  }, [form.slug, editMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const preview = (e.nativeEvent as SubmitEvent).submitter instanceof HTMLButtonElement
      && ((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement).value === "preview";
    setSubmitAction(preview ? "preview" : "create");
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

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      fd.append(k, String(v));
      console.log(`Form field: ${k} = ${String(v).substring(0, 100)}`);
    });
    
    fd.set("hidden", String(preview));

    fd.append("image", headerImage);
    console.log("Added event image:", headerImage.name);

    // Session handled via HttpOnly cookie; rely on server to reject if unauthorized

    try {
      console.log("Sending POST request to /api/events");
  const res = await fetch("/api/events", { method: "POST", body: fd });

      console.log("Response status:", res.status, res.statusText);
      
      if (res.ok) {
        const created = await res.json();
        console.log("✅ Submission successful!");
        setForm(initialForm);
        setHeaderImage(null);
        setHeaderImagePreview("");
        setSubmitted(true);
        // Clear all saved form data from localStorage
        localStorage.removeItem("adminFormData");
        localStorage.removeItem("adminHeaderImagePreview");
        setTimeout(() => setSubmitted(false), 1500);
        router.refresh();
        // reload events for list below
  try { const d = await dedupeJson<{ events: any[] }>('/api/events?admin=true'); setEvents(d.events || []) } catch {}
        if (preview) router.push(`/events/${created.slug}`);
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

  // Admin: start editing an event -> populate form and switch to editMode
  const startEdit = useCallback((e: typeof events[number]) => {
    if (generatingCarpool) return
    setEditMode(true)
    setEditingSlug(e.slug)
    // Populate form fields
    const eventForm = {
      title: e.title,
      slug: e.slug, // keep slug read-only
      startDate: e.startDate || "",
      endDate: e.endDate || "",
      startTime: e.startTime || "",
      endTime: e.endTime || "",
      location: e.location,
      bodyMarkdown: e.bodyMarkdown || "",
      signupUrl: e.signupUrl || "",
      dashboardUrl: e.dashboardUrl || "",
      showFaqBanner: !!e.showFaqBanner,
      hidden: !!e.hidden,
    }
    setForm(eventForm)
    setOriginalEventForm(eventForm)
    // Keep the saved image visible; a replacement stays local until Save Changes.
    imageSelectionVersion.current++
    setProcessingImage(false)
    setHeaderImage(null)
    setHeaderImagePreview(e.imagePublicId ? `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/${e.imagePublicId}` : "")
    if (headerImageInputRef.current) headerImageInputRef.current.value = ""
    // Clear any saved local draft since we're editing existing
    localStorage.removeItem("adminFormData")
    localStorage.removeItem("adminHeaderImagePreview")
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [generatingCarpool])

  useEffect(() => {
    const eventSlug = new URLSearchParams(window.location.search).get("edit")
    if (!isAuthorized || !eventSlug || eventEditFromUrlHandled.current === eventSlug) return

    const event = events.find((item) => item.slug === eventSlug)
    if (!event) return

    eventEditFromUrlHandled.current = eventSlug
    startEdit(event)
  }, [events, isAuthorized, startEdit])

  // Save changes for edited event (without re-uploading images unless provided)
  const saveChanges = async () => {
    if (!editingSlug) return
    try {
      setSubmitting(true)
      setError("")
      // Build payload from form. Only include fields we allow to update.
      const payload: any = {
        title: form.title,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        location: form.location,
        bodyMarkdown: form.bodyMarkdown || '',
        signupUrl: form.signupUrl || null,
        dashboardUrl: form.dashboardUrl || null,
        showFaqBanner: !!form.showFaqBanner,
      }
      let body: BodyInit = JSON.stringify(payload)
      if (headerImage) {
        const upload = new FormData()
        upload.append('data', JSON.stringify(payload))
        upload.append('image', headerImage)
        body = upload
      }
      const res = await fetch(`/api/events/${encodeURIComponent(editingSlug)}` , {
        method: 'PUT',
        headers: headerImage ? undefined : { 'Content-Type': 'application/json' },
        body,
      })
      if (res.ok) {
        // Refresh list and exit edit mode
  try { const d = await dedupeJson<{ events: any[] }>('/api/events?admin=true'); setEvents(d.events || []) } catch {}
        setEditMode(false)
        setEditingSlug(null)
        setOriginalEventForm(null)
        clearForm()
        setSuccessMessage("Changes saved successfully.")
        setShowSuccessToast(true)
        setTimeout(() => setShowSuccessToast(false), 1800)
      } else {
        const err = await res.json().catch(() => ({ error: 'Update failed' }))
        setError(err.error || 'Update failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleHidden = async (slug: string, nextHidden: boolean) => {
    if (visibilitySaving || (editMode && editingSlug === slug)) return
    setVisibilitySaving(slug)
    setVisibilityError("")
    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slug)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: nextHidden }),
      })
      if (!res.ok) throw new Error('Could not update event visibility. Please try again.')
      setEvents(prev => prev.map(ev => ev.slug === slug ? { ...ev, hidden: nextHidden } : ev))
      router.refresh()
    } catch (error) {
      setVisibilityError(error instanceof Error ? error.message : 'Could not update event visibility.')
    } finally {
      setVisibilitySaving(null)
    }
  }

  const requestDelete = (slug: string, title: string) => {
    // Ignore delete requests while another delete is already in progress.
    if (deleting) return
    setDeletingSlug(slug)
    setDeletingTitle(title)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    if (deleting) return
    setShowDeleteModal(false)
    setDeletingSlug(null)
    setDeletingTitle("")
  }

  const confirmDelete = async () => {
    if (!deletingSlug || deleting) return

    const slugToDelete = deletingSlug
    setDeleting(true)

    try {
      const res = await fetch(`/api/events/${encodeURIComponent(slugToDelete)}`, { method: 'DELETE' })
      if (res.ok) {
        setEvents(prev => prev.filter(e => e.slug !== slugToDelete))
        setShowDeleteModal(false)
        setDeletingSlug(null)
        setDeletingTitle("")
      } else {
        const err = await res.json().catch(() => ({ error: 'Delete failed' }))
        alert(err.error || 'Delete failed')
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleBodyMarkdownChange = useCallback((bodyMarkdown: string) => {
    setForm((current) => ({ ...current, bodyMarkdown }))
  }, [])

  const saveFaq = async () => {
    try {
      setSavingFaq(true)
      setError("")
      const response = await fetch('/api/pages/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentMarkdown: faqMarkdown }),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to save FAQ content.' }))
        throw new Error(data.error || 'Failed to save FAQ content.')
      }
      setSuccessMessage("Changes saved")
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 1800)
      setOriginalFaqMarkdown(faqMarkdown)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save FAQ content.')
    } finally {
      setSavingFaq(false)
    }
  }

  useEffect(() => {
    const loadLinks = async () => {
      if (!isAuthorized) return
      try {
        setLoadingLinks(true)
        const data = await dedupeJson<{ setting: unknown }>('/api/pages/links/settings/links')
        const loadedSettings = Array.isArray(data.setting) ? data.setting as Array<{ label: string; url: string; enabled: boolean }> : []
        setLinkSettings(loadedSettings)
        setOriginalLinkSettings(loadedSettings)
      } catch {
        setError('Unable to load Links settings.')
      } finally {
        setLoadingLinks(false)
      }
    }
    loadLinks()
  }, [isAuthorized])

  useEffect(() => {
    const loadLeadership = async () => {
      if (!isAuthorized) return
      try {
        setLoadingLeadership(true)
        const data = await dedupeJson<{ setting: unknown }>('/api/pages/leadership/settings/leadership')
        const loaded = Array.isArray(data.setting) ? data.setting as typeof leadershipSettings : []
        setLeadershipSettings(loaded)
        setOriginalLeadershipSettings(loaded)
      } catch {
        setError('Unable to load Leadership settings.')
      } finally {
        setLoadingLeadership(false)
      }
    }
    loadLeadership()
  }, [isAuthorized])

  const togglePageVisibility = async (slug: string, published: boolean) => {
    setPageVisibility((current) => ({ ...current, [slug]: published }))
    const response = await fetch('/api/pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, published }),
    })
    if (!response.ok) {
      setPageVisibility((current) => ({ ...current, [slug]: !published }))
      setError('Unable to update page visibility.')
      return
    }
    window.dispatchEvent(new Event('page-visibility-changed'))
  }

  const confirmPageVisibility = async () => {
    if (!visibilityPrompt) return
    const { slug, published } = visibilityPrompt
    setVisibilityPrompt(null)
    await togglePageVisibility(slug, published)
  }

  const updateLinkSetting = (index: number, field: "label" | "url" | "enabled", value: string | boolean) => {
    setLinkSettings((current) => current.map((link, linkIndex) => linkIndex === index ? { ...link, [field]: value } : link))
  }

  const saveLinks = async () => {
    try {
      setSavingLinks(true)
      const response = await fetch('/api/pages/links/settings/links', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: linkSettings }),
      })
      if (!response.ok) throw new Error('Unable to save Links settings.')
      setOriginalLinkSettings(linkSettings)
      setSuccessMessage('Changes saved')
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 1800)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save Links settings.')
    } finally {
      setSavingLinks(false)
    }
  }

  const reorderLinks = (toIndex: number) => {
    const fromIndex = draggedLinkIndex.current
    if (fromIndex === null || fromIndex === toIndex) return
    const reordered = [...(dragOrder.current || linkSettings)]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)
    draggedLinkIndex.current = toIndex
    dragOrder.current = reordered
    setLinkSettings(reordered)
  }

  const finishLinkDrag = async () => {
    const reordered = dragOrder.current
    draggedLinkIndex.current = null
    dragOrder.current = null
    if (!reordered) return
    setSavingLinks(true)
    try {
      const response = await fetch('/api/pages/links/settings/links', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: reordered }),
      })
      if (!response.ok) throw new Error('Unable to save link order.')
      setOriginalLinkSettings(reordered)
    } catch { setError('Unable to save link order. Use Save Changes to retry.') }
    finally { setSavingLinks(false) }
  }

  const selectLeadershipImage = async (index: number, file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/') || file.size > MAX_IMAGE_SIZE) {
      setError(`Please choose an image up to ${MAX_IMAGE_MB}MB.`)
      return
    }
    const version = ++leadershipImageVersion.current
    setProcessingLeadershipImage(true)
    try {
      const resized = new File([await resizeImage(file, 1200, 1200)], file.name, { type: file.type })
      const preview = await fileToBase64(resized)
      if (version !== leadershipImageVersion.current) return
      setLeadershipImages(current => ({ ...current, [index]: resized }))
      setLeadershipSettings(current => current.map((item, i) => i === index ? { ...item, image: preview } : item))
    } catch {
      if (version === leadershipImageVersion.current) setError('Unable to read this image. Please choose another image.')
    } finally {
      if (version === leadershipImageVersion.current) setProcessingLeadershipImage(false)
    }
  }

  const saveLeadership = async () => {
    try {
      setSavingLeadership(true)
      const upload = new FormData()
      upload.append('setting', JSON.stringify(leadershipSettings.map((leader, index) => ({
        ...leader, image: leadershipImages[index] ? '' : leader.image,
      }))))
      Object.entries(leadershipImages).forEach(([index, file]) => upload.append(`image-${index}`, file))
      const response = await fetch('/api/pages/leadership/settings/leadership', {
        method: 'PUT',
        body: upload,
      })
      if (!response.ok) throw new Error('Unable to save Leadership settings.')
      const { setting } = await response.json()
      setLeadershipSettings(setting)
      setOriginalLeadershipSettings(setting)
      setLeadershipImages({})
      setSuccessMessage('Changes saved')
      setShowSuccessToast(true)
      setTimeout(() => setShowSuccessToast(false), 1800)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save Leadership settings.')
    } finally {
      setSavingLeadership(false)
    }
  }

  const leadershipChanged = JSON.stringify(leadershipSettings) !== JSON.stringify(originalLeadershipSettings)

  // Check if user is logged in
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
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

  const clearForm = () => {
    if (generatingCarpool) return
    imageSelectionVersion.current++;
    setProcessingImage(false);
    setEditMode(false);
    setEditingSlug(null);
    setOriginalEventForm(null);
    setIsCreateEventOpen(true);
    setSubmitAction("create");
    setSubmitted(false);
    setError("");
    localStorage.removeItem("adminHeaderImagePreview");
    localStorage.removeItem("adminFormData");
    if (headerImageInputRef.current) headerImageInputRef.current.value = "";
    setForm(initialForm);
    setHeaderImage(null);
    setHeaderImagePreview("");
  };

  const eventFormChanged = editMode && originalEventForm !== null && (headerImage !== null || JSON.stringify(form) !== JSON.stringify(originalEventForm))
  const filteredEvents = events.filter((event) => {
    const query = eventSearchQuery.trim().toLowerCase()
    if (!query) return true
    return [event.title, event.location, event.startDate, event.endDate]
      .some((value) => value?.toLowerCase().includes(query))
  })
  const normalizeFaqMarkdown = (markdown: string) => markdown.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "")
  const faqChanged = normalizeFaqMarkdown(faqMarkdown) !== normalizeFaqMarkdown(originalFaqMarkdown)
  const linksChanged = JSON.stringify(linkSettings) !== JSON.stringify(originalLinkSettings)

  const sitePages: Array<{ name: AdminPageName; icon: typeof House }> = [
    { name: "Home", icon: House },
    { name: "Events", icon: CalendarDays },
    { name: "FAQ", icon: CircleHelp },
    { name: "Leadership", icon: UsersRound },
    { name: "Links", icon: Link2 },
    { name: "Admin", icon: ShieldCheck },
  ]

  return (
    <div className="flex-1 relative flex flex-col">
      <main className="relative z-20 flex-1">
        {showSuccessToast && (
          <div role="status" className="fixed top-20 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-primary/25 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {successMessage}
          </div>
        )}
        <DecorativeBirds images={birdImages} />
        <PageHeader
          title="Admin Panel"
        />
        <section className="py-12 px-4">
          <div className="container mx-auto max-w-7xl relative z-20">
            <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
              <aside className="h-fit rounded-lg border border-border bg-card p-3 lg:sticky lg:top-24">
                <nav className="space-y-1" aria-label="Site pages">
                  {sitePages.map(({ name, icon: PageIcon }) => (
                    <div key={name} className={`flex items-stretch rounded-md text-sm transition-colors ${activePage === name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                      <button type="button" onClick={() => selectAdminPage(name)} className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-3 py-2 text-left">
                        <PageIcon className="h-4 w-4 shrink-0" />
                        <span className="truncate">{name}</span>
                      </button>
                      {name !== "Admin" && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            const published = pageVisibility[name.toLowerCase()] !== false
                            setVisibilityPrompt({ slug: name.toLowerCase(), name, published: !published })
                          }}
                          title={pageVisibility[name.toLowerCase()] === false ? `Show ${name} page` : `Hide ${name} page`}
                          aria-label={pageVisibility[name.toLowerCase()] === false ? `Show ${name} page` : `Hide ${name} page`}
                          className="my-1.5 mr-2 rounded p-1 hover:bg-background/20"
                        >
                          {pageVisibility[name.toLowerCase()] === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  ))}
                </nav>
              </aside>

              <div className="min-w-0">
                {activePage === "Events" ? (
                  <>
                    <h2 className="mb-6 px-6 font-display text-3xl text-primary">Events</h2>
            <Card className="relative">
              {editMode && originalEventForm?.hidden && (
                <div aria-hidden="true" className="preview-outline pointer-events-none absolute -inset-px z-10 rounded-[inherit]" />
              )}
              <CardHeader className="flex justify-between items-center">
                <CardTitle className="text-2xl">{editMode ? 'Edit Event' : 'Add New Event'}</CardTitle>
                <Button onClick={clearForm} size="sm" variant={"outline"} className="hover:bg-primary hover:text-foreground">
                  Clear Form
                </Button>
              </CardHeader>
              {(editMode || isCreateEventOpen) && <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <fieldset disabled={generatingCarpool} className="space-y-6">
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
                      <Input 
                        name="startTime" 
                        type="time" 
                        value={form.startTime.slice(0, 5)} 
                        onChange={handleChange} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">End Time (Optional)</label>
                      <Input 
                        name="endTime" 
                        type="time" 
                        value={form.endTime} 
                        onChange={(e) => {
                          if (!form.startTime && e.target.value) {
                            setError('Please select a start time before setting an end time.');
                            return;
                          }
                          handleChange(e);
                        }}
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
                    <GenerateCarpool onBusyChange={setGeneratingCarpool} key={editingSlug || 'new-event'} title={form.title} startDate={form.startDate} signupUrl={form.signupUrl} dashboardUrl={form.dashboardUrl} disabled={submitting || !isAuthorized} onGenerated={(links) => setForm(current => ({ ...current, signupUrl: links.signupUrl, dashboardUrl: links.dashboardUrl }))} />
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Signup URL</label>
                        <Input name="signupUrl" value={form.signupUrl} onChange={handleChange} placeholder="https://forms.gle/..." />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="dashboardUrl" className="text-sm font-medium">Carpool dashboard URL</label>
                        <Input id="dashboardUrl" name="dashboardUrl" value={form.dashboardUrl || ""} onChange={handleChange} placeholder="https://docs.google.com/spreadsheets/d/.../edit" />
                        <p className="text-xs text-muted-foreground">Use the public dashboard sheet link. Leave blank to hide the dashboard.</p>
                      </div>
                      <div className="flex items-center gap-3 pt-2">
                        <input
                          id="showFaqBanner"
                          name="showFaqBanner"
                          type="checkbox"
                          checked={form.showFaqBanner}
                          onChange={handleChange}
                          className="w-4 h-4 rounded border-gray-300"
                        />
                        <label htmlFor="showFaqBanner" className="text-sm font-medium cursor-pointer">Show the new-to-birding FAQ banner on the event page</label>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-6" data-section="header-image">
                    <h3 className="text-lg font-semibold mb-4">Event Header Image (Required)</h3>
                    
                    {/* Header Image Upload */}
                    <div className="space-y-2 mb-6">
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
                        </label>
                      ) : (
                        <button type="button" onClick={() => headerImageInputRef.current?.click()} disabled={submitting || processingImage}
                          aria-label="Upload new image"
                          className="relative block w-full max-w-md aspect-[16/9] rounded-lg overflow-hidden border border-border group focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                          <Image 
                            src={headerImagePreview} 
                            alt="Header preview" 
                            fill 
                            className="object-cover" 
                          />
                          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white transition-colors group-hover:bg-black/50 group-focus-visible:bg-black/50">
                            <Upload className="h-8 w-8" aria-hidden="true" />
                            <span className="text-sm font-semibold">Upload new image</span>
                          </span>
                        </button>
                      )}
                          <input 
                            id="headerImage"
                            ref={headerImageInputRef}
                            type="file" 
                            className="hidden" 
                            accept="image/*"
                            disabled={submitting || processingImage}
                            onClick={(event) => { event.currentTarget.value = "" }}
                            onChange={handleHeaderImageChange}
                          />

                      {processingImage && <p className="text-sm text-muted-foreground" role="status">Preparing image…</p>}
                    </div>

                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold mb-4">Event Description</h3>
                    <div className="space-y-2">
                      <LexicalMarkdownEditor
                        value={form.bodyMarkdown}
                        onChange={handleBodyMarkdownChange}
                        placeholder="Describe the event..."
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-4 py-3 rounded-lg text-sm font-semibold">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    {editMode ? (
                      <>
                        <Button key="save-event" type="button" onClick={saveChanges} disabled={submitting || processingImage || !eventFormChanged} className="flex-1" size="lg">
                          {submitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button key="cancel-edit" type="button" disabled={submitting} variant="outline" className="hover:bg-primary hover:text-foreground" size="lg" onClick={(event) => {
                          // Cancel the click's default action before replacing edit controls with submit buttons.
                          event.preventDefault();
                          setEditMode(false);
                          setEditingSlug(null);
                          setOriginalEventForm(null);
                          clearForm();
                        }}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button key="publish-event" type="submit" disabled={submitting || processingImage || submitted} className="flex-1" size="lg">
                          {submitAction === "create" && submitting ? "Submitting..." : submitAction === "create" && submitted ? "✓ Submitted!" : "Publish Event"}
                        </Button>
                        <Button key="preview-event" type="submit" name="action" value="preview" variant="outline" disabled={submitting || processingImage || submitted} className="relative flex-1 text-black hover:text-black dark:text-black dark:hover:text-black" size="lg">
                          <span aria-hidden="true" className="preview-outline pointer-events-none absolute inset-0 rounded-[inherit] [--preview-outline-width:3px]" />
                          {submitAction === "preview" && submitting ? "Preparing preview..." : submitAction === "preview" && submitted ? "✓ Preview ready!" : "Preview Event"}
                        </Button>
                      </>
                    )}
                  </div>
                </fieldset>
                </form>
              </CardContent>}
            </Card>
            {/* Edit Events Section */}
            <Card className="mt-10 gap-0 overflow-hidden pt-0">
              <button type="button" className="flex h-5 w-full items-center justify-center rounded-none bg-background text-black transition-colors hover:bg-accent hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring dark:bg-input/30 dark:text-black dark:hover:bg-input/50 dark:hover:text-black" aria-label={isEditEventsOpen ? 'Collapse edit events' : 'Expand edit events'} aria-expanded={isEditEventsOpen} aria-controls="edit-events-content" onClick={() => setIsEditEventsOpen(open => !open)}>
                {isEditEventsOpen ? <ChevronUp className="h-4 w-4" aria-hidden="true" /> : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
              </button>
              <CardHeader className="pt-1">
                <CardTitle className="text-2xl">Edit Events</CardTitle>
              </CardHeader>
              <CardContent id="edit-events-content" className="mt-6" hidden={!isEditEventsOpen}>
                {visibilityError && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{visibilityError}</p>}
                <div className="relative mb-4">
                  <label htmlFor="event-search" className="sr-only">Search events</label>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id="event-search"
                    type="search"
                    value={eventSearchQuery}
                    onChange={(event) => setEventSearchQuery(event.target.value)}
                    placeholder="Search events by title, location, or date..."
                    className="pl-9"
                  />
                </div>
                {loadingEvents ? (
                  <div className="text-sm text-muted-foreground">Loading events…</div>
                ) : events.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No events found.</div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No events match your search.</div>
                ) : (
                  <div className="space-y-3">
                    {filteredEvents.map((ev) => (
                      <div key={ev.slug} className={`relative flex flex-wrap items-center gap-4 p-3 border rounded-lg ${editMode && editingSlug === ev.slug ? "border-primary ring-[3px] ring-primary/50" : ""}`}>
                        {ev.hidden && <span aria-hidden="true" className="preview-outline pointer-events-none absolute inset-0 rounded-[inherit] [--preview-outline-width:5.625px]" />}
                        <Link
                          href={`/events/${ev.slug}`}
                          aria-label={`View ${ev.title}`}
                          className="relative block w-24 h-16 bg-muted rounded overflow-hidden flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          {ev.imagePublicId ? (
                            <Image
                              src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/${ev.imagePublicId}`}
                              alt={ev.title}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                          )}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link href={`/events/${ev.slug}`} className="inline-block max-w-full align-bottom font-semibold truncate hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">
                            {ev.title}
                          </Link>
                          <div className="text-xs text-muted-foreground truncate">{ev.startDate}{ev.endDate ? ` - ${ev.endDate}` : ''} {ev.startTime ? ` | ${ev.startTime.slice(0, 5)}` : ''}{ev.endTime ? ` - ${ev.endTime.slice(0, 5)}` : ''} | {ev.location}</div>
                        </div>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          <div className={`inline-flex rounded-lg border border-border bg-background p-1 shadow-sm ${editMode && editingSlug === ev.slug ? "grayscale opacity-50" : ""}`} role="group" aria-label={`Visibility for ${ev.title}`} aria-busy={visibilitySaving === ev.slug}>
                            <button type="button" aria-pressed={ev.hidden} disabled={(editMode && editingSlug === ev.slug) || visibilitySaving !== null} onClick={() => !ev.hidden && toggleHidden(ev.slug, true)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${ev.hidden ? "preview-stripes bg-amber-500/15 text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                              Preview
                            </button>
                            <button type="button" aria-pressed={!ev.hidden} disabled={(editMode && editingSlug === ev.slug) || visibilitySaving !== null} onClick={() => ev.hidden && toggleHidden(ev.slug, false)} className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${!ev.hidden ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                              Published
                            </button>
                          </div>
                          <span className="sr-only" role="status">{visibilitySaving === ev.slug ? "Updating visibility..." : ev.hidden ? "Only admins can view this event" : "Visible to everyone"}</span>
                          <Button size="icon-sm" aria-label={`Edit ${ev.title}`} title="Edit event" disabled={visibilitySaving !== null} onClick={() => startEdit(ev)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon-sm" variant="destructive" aria-label={`Delete ${ev.title}`} title="Delete event" onClick={() => requestDelete(ev.slug, ev.title)} disabled={deleting}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="mt-10">
              <CardHeader>
                <CardTitle className="text-2xl">Event Settings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  Additional event settings will appear here.
                </div>
              </CardContent>
            </Card>
            {/* Delete confirmation modal */}
            {showDeleteModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={closeDeleteModal}
                aria-disabled={deleting}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-card-foreground shadow-lg"
                >
                  <h2 className="mb-3 text-center font-display text-2xl font-bold text-primary">
                    Delete Event
                  </h2>

                  <p className="mb-4 text-center text-lg text-muted-foreground">
                    Are you sure you want to delete the event "{deletingTitle}"?
                  </p>
                  
                  <div className="flex justify-center gap-3">
                    <Button
                      variant="outline"
                      size="lg"
                      className="hover:bg-primary hover:text-foreground"
                      onClick={closeDeleteModal}
                      disabled={deleting}
                    >
                      Cancel
                    </Button>

                    <Button
                      variant="destructive"
                      size="lg"
                      onClick={confirmDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </div>
            )}
                  </>
                ) : (
                  <div>
                    <h2 className="mb-6 px-6 font-display text-3xl text-primary">{activePage}</h2>
                    <div>
                      {activePage === "Links" ? (
                        <div className="space-y-2">
                          {linkSettings.map((link, index) => (
                            <div
                              key={linkId(link)}
                              ref={node => { const id = linkId(link); if (node) linkNodes.current.set(id, node); else linkNodes.current.delete(id) }}
                              draggable={!savingLinks}
                              onDragStart={event => { draggedLinkIndex.current = index; event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', linkId(link)) }}
                              onDragOver={event => {
                                event.preventDefault()
                                event.dataTransfer.dropEffect = 'move'
                                const from = draggedLinkIndex.current
                                if (from === null || from === index) return
                                const rect = event.currentTarget.getBoundingClientRect()
                                const midpoint = rect.top + rect.height / 2
                                if ((from < index && event.clientY >= midpoint) || (from > index && event.clientY <= midpoint)) reorderLinks(index)
                              }}
                              onDrop={event => { event.preventDefault(); void finishLinkDrag() }}
                              onDragEnd={() => void finishLinkDrag()}
                              className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[auto_1fr_2fr_auto_auto]"
                            >
                              <button type="button" title="Drag to reorder" aria-label="Drag to reorder link" className="cursor-grab self-center text-muted-foreground active:cursor-grabbing">
                                <GripVertical className="h-5 w-5" />
                              </button>
                              <Input className="text-left" value={link.label} placeholder="Link name" onBlur={(event) => { event.currentTarget.scrollLeft = 0 }} onChange={(event) => updateLinkSetting(index, "label", event.target.value)} />
                              <Input className="text-left" value={link.url} placeholder="https://..." onBlur={(event) => { event.currentTarget.scrollLeft = 0 }} onChange={(event) => updateLinkSetting(index, "url", event.target.value)} />
                              <Button type="button" variant="outline" onClick={() => updateLinkSetting(index, "enabled", !link.enabled)}>{link.enabled ? "Enabled" : "Disabled"}</Button>
                              <Button type="button" variant="outline" onClick={() => setLinkSettings((current) => current.filter((_, linkIndex) => linkIndex !== index))}>Remove</Button>
                            </div>
                          ))}
                          <div className="flex flex-wrap gap-3">
                            <Button type="button" variant="outline" onClick={() => setLinkSettings((current) => [...current, { label: "", url: "", enabled: true }])}>Add Link</Button>
                            <Button type="button" onClick={saveLinks} disabled={loadingLinks || savingLinks || !linksChanged}>{savingLinks ? "Saving..." : "Save Changes"}</Button>
                          </div>
                          <ShortlinkTools />
                        </div>
                      ) : (
                        <Card>
                          <CardContent>
                          {activePage === "Home" ? (
                            <BannerSettings />
                          ) : activePage === "FAQ" ? (
                            <div className="space-y-4">
                              <LexicalMarkdownEditor value={faqMarkdown} onChange={setFaqMarkdown} placeholder="Write the FAQ page content..." />
                              <Button type="button" onClick={saveFaq} disabled={loadingFaq || savingFaq || !faqChanged} className="w-full sm:w-auto">
                                {savingFaq ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          ) : activePage === "Leadership" ? (
                            <div className="space-y-4">
                              {leadershipSettings.map((leader, index) => (
                                <fieldset disabled={savingLeadership || processingLeadershipImage} key={`leader-${index}`} className="grid gap-3 rounded-lg border border-border p-4 md:grid-cols-2">
                                  <legend className="px-2 text-sm font-semibold">{leader.name || `Position ${index + 1}`}</legend>
                                  {([
                                    ['position', 'Position'], ['name', 'Name'], ['major', 'Major'],
                                    ['year', 'Class year'], ['email', 'Email'], ['favoriteBird', 'Favorite bird'],
                                  ] as const).map(([field, label]) => (
                                    <div key={field} className="space-y-2">
                                      <label htmlFor={`leader-${index}-${field}`} className="text-sm font-medium">{label}</label>
                                      <Input id={`leader-${index}-${field}`} type={field === 'email' ? 'email' : 'text'} value={leader[field]} onChange={(event) => setLeadershipSettings(current => current.map((item, i) => i === index ? { ...item, [field]: event.target.value } : item))} />
                                    </div>
                                  ))}
                                  <div className="space-y-2">
                                    <label htmlFor={`leader-${index}-image`} className="text-sm font-medium">Profile image</label>
                                    <button type="button" aria-label={`Upload new image for ${leader.name || `position ${index + 1}`}`}
                                      onClick={() => document.getElementById(`leader-${index}-image`)?.click()}
                                      className="relative block w-full max-w-xs aspect-square overflow-hidden rounded-lg border border-border group focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                                      {leader.image && <Image src={leader.image} alt={`${leader.name || 'Leadership'} profile preview`} fill unoptimized className="object-cover" />}
                                      <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-white transition-colors group-hover:bg-black/50 group-focus-visible:bg-black/50">
                                        <Upload className="h-8 w-8" aria-hidden="true" />
                                        <span className="text-sm font-semibold">Upload new image</span>
                                      </span>
                                    </button>
                                    <input id={`leader-${index}-image`} type="file" accept="image/*" className="hidden"
                                      onClick={event => { event.currentTarget.value = '' }}
                                      onChange={event => selectLeadershipImage(index, event.target.files?.[0])} />
                                    <p className="text-xs text-muted-foreground">PNG, JPG, WEBP up to {MAX_IMAGE_MB}MB</p>
                                  </div>
                                  <div className="space-y-2">
                                    <label htmlFor={`leader-${index}-bio`} className="text-sm font-medium">Bio</label>
                                    <textarea id={`leader-${index}-bio`} value={leader.bio} rows={6} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" onChange={event => setLeadershipSettings(current => current.map((item, i) => i === index ? { ...item, bio: event.target.value } : item))} />
                                  </div>
                                  <Button type="button" variant="outline" onClick={() => {
                                    setLeadershipSettings(current => current.filter((_, i) => i !== index))
                                    setLeadershipImages(current => Object.fromEntries(Object.entries(current).filter(([i]) => Number(i) !== index).map(([i, file]) => [Number(i) > index ? Number(i) - 1 : Number(i), file])))
                                  }}>Remove</Button>
                                </fieldset>
                              ))}
                              <div className="flex flex-wrap gap-3">
                                <Button type="button" variant="outline" disabled={savingLeadership || processingLeadershipImage} onClick={() => setLeadershipSettings((current) => [...current, { position: "", name: "", major: "", year: "", email: "", bio: "", image: "", favoriteBird: "" }])}>Add Position</Button>
                                <Button type="button" onClick={saveLeadership} disabled={loadingLeadership || savingLeadership || processingLeadershipImage || !leadershipChanged}>{savingLeadership ? "Saving..." : "Save Changes"}</Button>
                                <Button type="button" variant="outline" disabled={savingLeadership || (!leadershipChanged && !processingLeadershipImage)} onClick={() => {
                                  leadershipImageVersion.current++
                                  setProcessingLeadershipImage(false)
                                  setLeadershipSettings(originalLeadershipSettings)
                                  setLeadershipImages({})
                                }}>Cancel</Button>
                                {processingLeadershipImage && <p role="status" className="text-sm text-muted-foreground">Preparing image…</p>}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-md border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                              No page settings are available for {activePage} yet.
                            </div>
                          )}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
        {visibilityPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setVisibilityPrompt(null)}>
            <div className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-lg" onClick={(event) => event.stopPropagation()}>
              <h3 className="mb-2 text-lg font-bold">Change page visibility?</h3>
              <p className="mb-5 text-sm text-muted-foreground">{visibilityPrompt.published ? `Show ${visibilityPrompt.name} in the website navigation?` : `Hide ${visibilityPrompt.name} from the website navigation and public URL?`}</p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setVisibilityPrompt(null)}>Cancel</Button>
                <Button type="button" onClick={confirmPageVisibility}>Confirm</Button>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}
