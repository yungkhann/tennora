export default function Loading() {
  return (
    <div role="status" className="animate-pulse py-4">
      <span className="sr-only">Loading your workspace…</span>
      <div className="h-9 w-64 rounded-lg bg-muted" />
      <div className="mt-5 h-4 max-w-96 rounded bg-muted" />
      <div className="mt-10 h-72 rounded-2xl bg-muted" />
    </div>
  );
}
