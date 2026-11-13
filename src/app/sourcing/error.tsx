'use client'
export default function ErrorPage({reset}:{reset:()=>void}) {return <main className="space-y-4 p-8"><h1 className="text-2xl font-semibold">Sourcing is temporarily unavailable</h1><p role="alert">The current records could not be loaded. No empty slate or successful save is assumed.</p><button onClick={reset} className="underline">Try loading again</button></main>}
