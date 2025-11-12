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

import { useState } from "react"

export default function DevBanner() {
  const [atTop, setAtTop] = useState(true)
  if (!isDevEnv()) return null
  return (
    <div
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
      <span style={{marginRight: 8, display: "inline-block", verticalAlign: "middle"}}>
        <span style={{fontSize: "1em", marginRight: 4}}>🚧</span>
        <span style={{fontWeight: 600}}>Dev/Preview Build</span>
        <span style={{margin: "0 4px"}}>|</span>
        <span style={{fontWeight: 400}}>Not production</span>
      </span>
      <button
        aria-label={atTop ? "Move banner to bottom of page" : "Move banner to top of page"}
        title={atTop ? "Move banner to bottom of page" : "Move banner to top of page"}
        onClick={() => setAtTop(t => !t)}
        style={{
          background: "rgba(255,255,255,0.13)",
          border: "1.2px solid #fff",
          color: "#fff",
          cursor: "pointer",
          fontSize: "0.85em",
          borderRadius: "999px",
          padding: "10px 18px 10px 14px",
          marginLeft: 6,
          marginTop: 2,
          marginBottom: 2,
          boxShadow: "0 1px 4px 0 rgba(0,0,0,0.08)",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          transition: "background 0.15s, border 0.15s",
          outline: "none"
        }}
  onMouseOver={e => (e.currentTarget.style.background = "rgba(255,255,255,0.22)")}
  onMouseOut={e => (e.currentTarget.style.background = "rgba(255,255,255,0.13)")}
  onFocus={e => (e.currentTarget.style.outline = "none")}
      >
        <span style={{fontSize: "0.95em", marginRight: 2, display: "inline-block", lineHeight: 1}}>{atTop ? "\u2B07" : "\u2B06"}</span>
        <span style={{fontWeight: 500, fontSize: "1em", textDecoration: "underline dotted"}}>
          {atTop ? "Move to bottom" : "Move to top"}
        </span>
      </button>
    </div>
  )
}
