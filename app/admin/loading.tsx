export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="flex animate-pulse flex-col gap-6">
      <span className="sr-only">Loading…</span>
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 rounded-md bg-muted" />
        <div className="h-4 w-96 max-w-full rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-20 rounded-xl border border-border bg-card" />
        ))}
      </div>
    </div>
  )
}
