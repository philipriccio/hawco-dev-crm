// Render notes as text, never HTML. Only explicit web URLs become links.
export function SourceNotes({ text }: { text: string }) {
  return <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 [overflow-wrap:anywhere]">
    {text.split(/(https?:\/\/[^\s<>]+)/g).map((part, index) => {
      if (!/^https?:\/\//.test(part)) return part
      const url = part.replace(/[.,;!?)\]]+$/, '')
      return <span key={index}><a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline focus-visible:outline-2 focus-visible:outline-blue-600">{url}</a>{part.slice(url.length)}</span>
    })}
  </p>
}
