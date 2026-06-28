export default function SignalsLoading() {
  return (
    <div className="space-y-6">
      {/* PAGE TITLE SKELETON */}
      <div className="h-7 w-48 animate-pulse rounded bg-slate-800" />

      {/* CARD SKELETON */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-6">
        <div className="h-4 w-1/3 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
      </div>

      {/* SECOND CARD SKELETON */}
      <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900 p-6">
        <div className="h-4 w-1/4 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-800" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-slate-800" />
      </div>
    </div>
  );
}
