export default function Loading() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-8 w-40 rounded bg-surface-2" />
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="h-96 rounded-xl bg-surface" />
        <div className="h-64 rounded-xl bg-surface" />
      </div>
    </div>
  );
}
