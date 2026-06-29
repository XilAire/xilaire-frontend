"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";


const URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;
const supabase = createClient(URL, ANON);


export default function LoginPage() {
const [email, setEmail] = useState("");
const [status, setStatus] = useState<string | null>(null);


async function sendLink(e: React.FormEvent) {
e.preventDefault();
setStatus("Sending magic link...");


const next = "/"; // where to go after callback (e.g., a course list)
const { error } = await supabase.auth.signInWithOtp({
email,
options: {
emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
},
});


setStatus(
error ? `Error: ${error.message}` : "✅ Check your email for the sign-in link."
);
}


return (
<main className="p-6 space-y-6 max-w-md mx-auto">
<h1 className="text-2xl font-semibold">Login</h1>
<form onSubmit={sendLink} className="space-y-3">
<input
type="email"
placeholder="you@domain.com"
className="w-full rounded border p-2"
value={email}
onChange={(e) => setEmail(e.target.value)}
required
/>
<button type="submit" className="rounded bg-primary text-white px-3 py-2">
Send Magic Link
</button>
</form>
</main>
);
}