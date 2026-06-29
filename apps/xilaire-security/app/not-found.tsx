// =============================
// app/not-found.tsx
// =============================
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";


export default function NotFound() {
return (
<main className="min-h-[60vh] grid place-items-center p-8">
<div className="max-w-xl text-center space-y-6">
<div className="mx-auto h-16 w-16 grid place-items-center rounded-2xl shadow bg-muted">
<Shield className="h-8 w-8" />
</div>
<h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
<p className="text-muted-foreground">
We couldn’t find that page. It might have moved or you may not have access.
</p>
<div className="flex items-center justify-center gap-3">
<Link href="/" className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm">
<ArrowLeft className="h-4 w-4" />
Back to dashboard
</Link>
<Link href="/courses" className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm">
Browse courses
</Link>
</div>
</div>
</main>
);
}