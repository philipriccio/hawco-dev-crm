'use client'
import { useState, useCallback } from 'react'
export default function SourcePage({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const image = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) { setLoaded(node.naturalWidth > 0); setFailed(node.naturalWidth === 0) }
  }, [])
  return <div aria-busy={!loaded && !failed}>
    {!loaded && !failed ? <p role="status" className="p-4 text-sm">Loading source page…</p> : null}
    {failed ? <div role="alert" className="p-4 bg-amber-50">Page image could not load. Use the extracted text below or <button className="underline" onClick={() => { setFailed(false); setLoaded(false) }}>retry</button>.</div> : <>
      {/* A private authenticated image endpoint, intentionally not a public image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={image} src={src} alt={label} onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="block w-full h-auto" />
    </>}
  </div>
}
