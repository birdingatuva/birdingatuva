"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Check, ArrowRight } from "lucide-react"
// Previous localStorage token helpers removed; now rely on HttpOnly cookie + session endpoint.
import { Button } from "@/components/ui/button"
import { CloudinaryImage } from "@/components/cloudinary-image"

export function Navigation({ initialAuthorized, initialVisiblePages }: {
  initialAuthorized: boolean
  initialVisiblePages: string[] | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState(initialAuthorized)
  const [showLogin, setShowLogin] = useState(false)
  const loginTriggerRef = useRef<HTMLButtonElement>(null)
  const loginPasswordRef = useRef<HTMLInputElement>(null)
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [loginPending, setLoginPending] = useState(false)
  const [visiblePages, setVisiblePages] = useState<string[] | null>(initialVisiblePages)
  // Re-check session on route change
  useEffect(() => {
    checkSession()
  }, [pathname])

  useEffect(() => {
    if (initialVisiblePages !== null) return
    fetch('/api/pages')
      .then((res) => res.ok ? res.json() : null)
      .then((data: { pages?: Array<{ slug: string }> } | null) => {
        if (data?.pages) setVisiblePages(data.pages.map((page) => page.slug))
      })
      .catch(() => undefined)
  }, [initialVisiblePages])

  useEffect(() => {
    const refreshPages = () => {
      fetch('/api/pages')
        .then((res) => res.ok ? res.json() : null)
        .then((data: { pages?: Array<{ slug: string }> } | null) => {
          if (data?.pages) setVisiblePages(data.pages.map((page) => page.slug))
        })
        .catch(() => undefined)
    }
    window.addEventListener('page-visibility-changed', refreshPages)
    return () => window.removeEventListener('page-visibility-changed', refreshPages)
  }, [])

  // Periodically poll session validity (every 15s)
  useEffect(() => {
    const id = setInterval(() => {
      checkSession()
    }, 15000)
    return () => clearInterval(id)
  }, [])

  async function checkSession() {
    try {
      const res = await fetch('/api/admin-session')
      if (res.ok || res.status === 401) setAuthorized(res.ok)
    } catch {
      // Keep the last confirmed state during temporary network failures.
    }
  }

  // Client no longer decodes JWT; server validates via cookie.

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPending || loginSuccess) return;

    if (!loginPassword || loginPassword.trim() === "") {
      setLoginError((prev) => prev !== "Please enter a password." ? "Please enter a password." : prev);
      return;
    }

    setLoginPending(true)
    setLoginError("")
    try {
      const res = await fetch("/api/validate-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: loginPassword }),
      });

      if (res.ok) {
        // Cookie set server-side; poll session
        await checkSession()
        setAuthorized(true)
        sessionStorage.removeItem("adminActivePage")
        setLoginError("");
        setLoginSuccess(true);
        setLoginPassword("");

        setTimeout(() => {
          setShowLogin(false);
          setLoginSuccess(false);
          setLoginPassword("");
          if (pathname === "/admin") {
            window.location.reload();
          } else {
            router.push("/admin");
          }
        }, 700);
      } else {
        setLoginError((prev) => prev !== "Invalid password. Please try again." ? "Invalid password. Please try again." : prev);
        setLoginSuccess(false);
      }
    } catch {
      setLoginError("Unable to sign in. Please try again.")
    } finally {
      setLoginPending(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
    sessionStorage.removeItem("adminActivePage")
    setAuthorized(false)
    setShowLogin(false)
    router.push("/")
  }

  // Insert Admin link if authorized
  const pageLinks = [
    { slug: "home", href: "/", label: "Home" },
    { slug: "events", href: "/events", label: "Events" },
    { slug: "leadership", href: "/leadership", label: "Leadership" },
    { slug: "faq", href: "/faq", label: "FAQ" },
    { slug: "links", href: "/links", label: "Links" },
  ]
  let links = pageLinks.filter((link) => (visiblePages ?? []).includes(link.slug)).map(({ href, label }) => ({ href, label }))
  if (authorized) {
    links = [...links, { href: "/admin", label: "Admin" }]
  }

  return (
    <>
      <nav style={{ top: "var(--announcement-height, 0px)" }} className="sticky z-40 bg-primary text-primary-foreground shadow-lg">
        <div className="container mx-auto px-4 md:px-5 lg:px-6">
          <div className="flex min-h-16 flex-col min-[900px]:flex-row min-[900px]:items-center min-[900px]:justify-between">
          {/* Logo and Name */}
          <Link href="/" className="flex h-16 shrink-0 items-center gap-3 self-center transition-opacity hover:opacity-90 min-[900px]:self-auto">
            <div className="relative w-[90px] h-[50px] overflow-hidden flex items-center">
              <CloudinaryImage
                src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dev-birdingatuva'}/image/upload/home-page/banner-transparent`}
                alt="Birding at UVA Banner"
                width={90}
                height={50}
                className="object-contain"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-sans text-lg sm:text-xl md:text-2xl font-semibold tracking-wide">
                Birding at UVA
              </span>
              <span className="font-sans text-xs md:text-sm font-light italic -mt-0.5">
                Hoo's Watching Hoo?
              </span>
            </div>
          </Link>

          {/* Navigation wraps below the brand when there is not enough horizontal room. */}
          <div className="flex w-full flex-wrap items-center justify-center gap-1 border-t border-primary-foreground/15 py-2 min-[900px]:ml-2 min-[900px]:w-auto min-[900px]:flex-nowrap min-[900px]:justify-end min-[900px]:border-t-0 min-[900px]:py-0 lg:ml-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={pathname === link.href ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-normal antialiased transition-colors sm:px-4 sm:text-base ${
                  pathname === link.href
                    ? "bg-primary-foreground text-primary"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Login/Logout button at far right */}
            {authorized ? (
              <button 
                onClick={handleLogout}
                className="rounded-lg px-3 py-2 text-sm font-normal antialiased text-primary-foreground transition-colors hover:bg-primary-foreground/10 sm:px-4 sm:text-base"
              >
                Logout
              </button>
            ) : (
              <button 
                ref={loginTriggerRef}
                onClick={() => setShowLogin(true)}
                className="rounded-lg px-3 py-2 text-sm font-normal antialiased text-primary-foreground transition-colors hover:bg-primary-foreground/10 sm:px-4 sm:text-base"
              >
                Login
              </button>
            )}
          </div>
        </div>
        </div>
      </nav>

      <Dialog.Root open={showLogin} onOpenChange={(open) => {
        if (loginPending || loginSuccess) return
        if (!open) {
          // Blur before unmounting so autofill providers see the field lose focus.
          loginPasswordRef.current?.blur()
          setLoginError("")
          setLoginPassword("")
        }
        setShowLogin(open)
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-950/50" />
          <Dialog.Content onCloseAutoFocus={(event) => {
            event.preventDefault()
            loginTriggerRef.current?.focus({ preventScroll: true })
          }} className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-slate-200 bg-white text-slate-900 shadow-xl outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-700">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Birding at UVA</p>
              <Dialog.Title className="text-xl font-semibold tracking-tight">Admin login</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Sign in to manage the club website.
              </Dialog.Description>
            </div>
            {loginSuccess ? (
              <div role="status" aria-live="polite" className="px-6 py-7">
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <Check aria-hidden="true" className="size-4 text-slate-600 dark:text-slate-300" />
                  Signed in successfully
                </div>
                <p className="mt-2 pl-[26px] text-sm text-slate-500 dark:text-slate-400">Opening your admin dashboard…</p>
              </div>
            ) : (
              <form onSubmit={handleLogin} aria-busy={loginPending} className="px-6 pb-5 pt-6">
                <label htmlFor="admin-password" className="mb-2 block text-sm font-medium">Password</label>
                <input
                  id="admin-password"
                  ref={loginPasswordRef}
                  type="password"
                  autoComplete="current-password"
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={loginPending}
                  aria-invalid={Boolean(loginError)}
                  aria-describedby={loginError ? "admin-login-error" : undefined}
                  className="h-11 w-full rounded-sm border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-400/25 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:border-slate-400"
                />
                {loginError && (
                  <p id="admin-login-error" role="alert" className="mt-3 text-sm leading-relaxed text-red-700 dark:text-red-400">{loginError}</p>
                )}
                <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                  <Dialog.Close asChild>
                    <button type="button" disabled={loginPending} className="rounded-sm px-3 py-2 text-sm text-slate-600 transition-colors hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-slate-400 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100">Cancel</button>
                  </Dialog.Close>
                  <Button type="submit" disabled={loginPending} className="h-10 rounded-sm bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white">
                    {loginPending ? "Signing in…" : "Sign in"}
                    {!loginPending && <ArrowRight aria-hidden="true" className="size-4" />}
                  </Button>
                </div>
              </form>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  )
}
