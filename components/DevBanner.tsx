"use client"

import React from "react"

function isDevEnv() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname
    
    // Check for localhost
    if (host === "localhost" || host === "127.0.0.1") return true
    
    // Check for dev subdomain
    if (host === "dev.birdingatuva.org") return true
    
    if (host.includes(".birdingatuva.org") && host !== "www.birdingatuva.org") return true
  }
  return false
}

import { useEffect, useState } from "react"

export default function DevBanner() {
  const [mounted, setMounted] = useState(false)
  const [atTop, setAtTop] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !isDevEnv()) return null
  return (
    <div
      onMouseEnter={() => setAtTop((current) => !current)}
      style={{
        background: "linear-gradient(90deg, #d32f2f 0%, #b71c1c 100%)",
        color: "#fff",
        padding: "8px 10px",
        textAlign: "center",
        fontWeight: 500,
        fontSize: "0.89rem",
        letterSpacing: "0.03em",
        zIndex: 10000,
        position: "fixed",
        left: 0,
        right: 0,
        width: "100%",
        opacity: 0.93,
        boxShadow: "0 2px 10px 0 rgba(0,0,0,0.10)",
        borderRadius: 0,
        borderBottom: atTop ? "2px solid #b71c1c" : undefined,
        borderTop: !atTop ? "2px solid #b71c1c" : undefined,
        top: atTop ? 0 : undefined,
        bottom: !atTop ? 0 : undefined,
        transition: "top 0.2s, bottom 0.2s, border-radius 0.2s"
      }}
    >
      <span style={{display: "inline-block", verticalAlign: "middle"}}>
        <span style={{fontSize: "1em", marginRight: 4}}>🚧</span>
        <span style={{fontWeight: 600}}>Dev Preview</span>
        <span style={{fontSize: "1em", marginLeft: 4}}>🚧</span>
      </span>
    </div>
  )
}
