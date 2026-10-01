"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
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
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState(false)
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

    if (!loginPassword || loginPassword.trim() === "") {
      setLoginError((prev) => prev !== "Please enter a password." ? "Please enter a password." : prev);
      return;
    }

    const res = await fetch("/api/validate-admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });

    if (res.ok) {
      // Cookie set server-side; poll session
      await checkSession()
      setAuthorized(true)
      setLoginError("");
      setLoginSuccess(true);
      
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
  }

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' })
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

      {/* Kept outside responsive navigation containers so it is always visible. */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4 sm:p-6" onClick={() => { setShowLogin(false); setLoginError(""); setLoginSuccess(false); }}>
          <form onSubmit={handleLogin} onClick={(e) => e.stopPropagation()} className="relative my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-sm flex-col overflow-y-auto rounded-xl border bg-white p-6 text-slate-900 shadow-lg dark:bg-slate-900 dark:text-slate-100 sm:p-8">
              <h2 className="text-xl font-bold mb-6 text-center">Admin Login</h2>
              {loginSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm mb-4">
                  Logged in successfully!
                </div>
              )}
              {loginError && !loginSuccess && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm mb-4">
                  {loginError}
                </div>
              )}
              <input 
                type="password" 
                value={loginPassword} 
                onChange={e => setLoginPassword(e.target.value)} 
                placeholder="Password" 
                required 
                autoFocus 
                className="mb-4 rounded-lg border px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <Button type="submit" className="focus:outline-none focus:ring-0 mb-4">Login</Button>
              <button 
                type="button" 
                onClick={() => { 
                  setShowLogin(false); 
                  setLoginError(""); 
                  setLoginPassword(""); // Clear password field on cancel
                }} 
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              >
                Cancel
              </button>
            </form>
        </div>
      )}
    </>
  )
}
