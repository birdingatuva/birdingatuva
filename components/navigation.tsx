"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X } from "lucide-react"
import { useState, useEffect, useRef } from "react"
// Helper to get/set token in localStorage
function getToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || ''
}
function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem('admin_token', token)
}
import { Button } from "@/components/ui/button"

export function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [authorized, setAuthorized] = useState(() => !!getToken())
  const [showLogin, setShowLogin] = useState(false)
  const [loginPassword, setLoginPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginSuccess, setLoginSuccess] = useState(false)
  // Re-check token on route change to avoid flicker
  useEffect(() => {
    setAuthorized(!!getToken())
  }, [pathname])

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
      const { token } = await res.json();
      setToken(token);
      setAuthorized(true);
      setLoginError("");
      setLoginSuccess(true);
      
      // Keep popup open for 1 second to show success message, then close and redirect
      setTimeout(() => {
        setShowLogin(false);
        setLoginSuccess(false);
        setLoginPassword("");
        router.push("/admin");
      }, 700);
    } else {
      setLoginError((prev) => prev !== "Invalid password. Please try again." ? "Invalid password. Please try again." : prev);
      setLoginSuccess(false);
    }
  }

  // Toast for logout
  const [showLogoutToast, setShowLogoutToast] = useState(false)
  const logoutTimeout = useRef<NodeJS.Timeout | null>(null)
  // Login toast state
  const [showLoginToast, setShowLoginToast] = useState(false)
  const loginTimeout = useRef<NodeJS.Timeout | null>(null)
  const handleLogout = () => {
    setToken("")
    setAuthorized(false)
    setShowLogin(false)
    router.push("/") // Redirect to home page
  }

  // Insert Admin link if authorized
  let links = [
    { href: "/", label: "Home" },
    //{ href: "/leadership", label: "Leadership" },
    { href: "/events", label: "Events" },
    { href: "/faq", label: "FAQ" },
  ]
  if (authorized) {
    links = [
      ...links.slice(0, 3),
      { href: "/admin", label: "Admin" },
      ...links.slice(3)
    ]
  }

  return (
    <nav className="sticky top-0 z-40 bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 md:pl-6 md:pr-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Name */}
          <Link href="/" className="flex items-center gap-3 hover:opacity-90 transition-opacity md:-ml-12">
            <Image
              src="/images/club-logo.png"
              alt="Birding at UVA Logo"
              width={50}
              height={50}
              className="rounded-full"
              quality={90}
              sizes="50px"
            />
            <div className="flex flex-col">
              <span className="font-sans text-lg sm:text-xl md:text-2xl font-semibold tracking-wide">
                Birding at UVA
              </span>
              <span className="font-sans text-xs md:text-sm font-light italic -mt-0.5">
                Hoo's Watching Hoo?
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 md:ml-auto md:-mr-12">
            {links.map((link, idx) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg transition-all ${
                  pathname === link.href
                    ? "bg-primary-foreground text-primary font-semibold"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
      {/* Logout Toast */}
      {showLogoutToast && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg text-sm font-medium transition-opacity duration-1000 ease-in-out"
          style={{ animation: "fade-out 1s forwards" }}
        >
          Logged out successfully
        </div>
      )}
      {showLoginToast && (
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white px-4 py-2 rounded-lg shadow-md text-sm font-medium animate-fade-in-out"
          style={{ animationDuration: "1.5s" }}
        >
          Logged in successfully
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in-out {
          0% {
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
      `}</style>
            {/* Login/Logout button at far right */}
            {authorized ? (
              <button 
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg transition-all hover:bg-primary-foreground/10 text-primary-foreground"
              >
                Logout
              </button>
            ) : (
              <button 
                onClick={() => setShowLogin(true)}
                className="px-4 py-2 rounded-lg transition-all hover:bg-primary-foreground/10 text-primary-foreground"
              >
                Login
              </button>
            )}
      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => { setShowLogin(false); setLoginError(""); setLoginSuccess(false); }}>
          <form onSubmit={handleLogin} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border w-full max-w-sm flex flex-col relative overflow-visible" style={{ position: 'fixed', bottom: '40%', left: '50%', transform: 'translateX(-50%)' }}>
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
                className="border rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-slate-800 dark:border-slate-700" 
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
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground p-0"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {/* Force larger icon size with explicit w/h so the nav bar height stays the same */}
            {mobileMenuOpen ? (
              // add a class containing "size-" so the Button's svg override selector won't apply
              <X className="size-7 w-7 h-7" />
            ) : (
              <Menu className="size-7 w-7 h-7" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg transition-all ${
                  pathname === link.href
                    ? "bg-primary-foreground text-primary font-semibold"
                    : "hover:bg-primary-foreground/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {/* Login/Logout button in mobile menu */}
            {authorized ? (
              <button 
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-2 rounded-lg transition-all hover:bg-primary-foreground/10"
              >
                Logout
              </button>
            ) : (
              <button 
                onClick={() => { setShowLogin(true); setMobileMenuOpen(false); }}
                className="block w-full text-left px-4 py-2 rounded-lg transition-all hover:bg-primary-foreground/10"
              >
                Login
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
