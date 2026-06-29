

// =============================
// app/loading.tsx
// =============================
export default function GlobalLoading() {
return (
<main className="min-h-[60vh] p-8">
<div className="max-w-3xl mx-auto space-y-6">
<div className="h-8 w-64 rounded-lg bg-muted animate-pulse" />
<div className="h-5 w-40 rounded bg-muted animate-pulse" />
<div className="grid gap-4">
{[...Array(4)].map((_, i) => (
<div key={i} className="rounded-2xl border p-4">
<div className="flex items-center justify-between">
<div className="h-5 w-56 rounded bg-muted animate-pulse" />
<div className="h-5 w-12 rounded bg-muted animate-pulse" />
</div>
<div className="mt-3 h-2 w-full rounded bg-muted animate-pulse" />
</div>
))}
</div>
</div>
</main>
);
}