"use client"

import { useEffect } from "react"

// Replaces the root layout when it fails, so styles from globals.css are not
// guaranteed here; inline styles keep this page readable on its own.
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error("[app] root error:", error.digest ?? error.message)
    // A deploy can remove the JS chunks an open tab still references. A single
    // full reload picks up the new build instead of leaving the user stuck.
    const isChunkError = /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module/i.test(
      `${error.name} ${error.message}`,
    )
    if (isChunkError && !sessionStorage.getItem("vaap-chunk-reload")) {
      sessionStorage.setItem("vaap-chunk-reload", "1")
      window.location.reload()
    }
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f7f9fa",
          color: "#102a36",
          padding: "20px",
        }}
      >
        <main style={{ maxWidth: 480, textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ fontSize: 32, margin: 0 }}>We couldn&apos;t load the site</h1>
          <p style={{ color: "#425466", lineHeight: 1.6, margin: 0 }}>
            This is usually a brief connection issue. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              alignSelf: "center",
              background: "#247049",
              color: "#ffffff",
              border: 0,
              borderRadius: 999,
              padding: "12px 24px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload page
          </button>
        </main>
      </body>
    </html>
  )
}
