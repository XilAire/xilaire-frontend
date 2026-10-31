"use client";
import AuthThemeSwitch from "@/components/ui/AuthThemeSwitch";
import { useState } from "react";
import Link from "next/link";
import ThemeLogo from "@/components/ui/ThemeLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setMessage("");
    try {
      const result = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", body: JSON.stringify({ email: email.trim() }),
      });
      const data: { message?: string; error?: string } = await result.json();
      setMessage(data.message ?? data.error ?? "Unable to process request.");
    } catch { setMessage("Unable to reach the server. Try again."); }
    finally { setLoading(false); }
  }
  return (
    <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4"><AuthThemeSwitch />
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-md shadow-xl">
        <div className="flex justify-center mb-6"><ThemeLogo size={72} priority /></div>
        <h1 className="text-2xl font-semibold text-center text-foreground mb-6">Reset Your Password</h1>
        <form onSubmit={handleReset} className="space-y-4">
          <label htmlFor="recovery-email" className="sr-only">Email address</label>
          <input id="recovery-email" type="email" required autoComplete="email" placeholder="Email" className="w-full auth-input" value={email} onChange={e => setEmail(e.target.value)} disabled={loading}/>
          <button type="submit" className="auth-btn w-full" disabled={loading}>{loading ? "Sending..." : "Send Reset Link"}</button>
        </form>
        {message && <p role="status" className="text-center text-sm text-muted-foreground mt-4">{message}</p>}
        <p className="text-center text-sm text-muted-foreground mt-6">Remember your password? <Link href="/auth/signin" className="text-sky-600 dark:text-sky-400 hover:underline">Back to Sign In</Link></p>
      </div>
    </main>
  );
}
