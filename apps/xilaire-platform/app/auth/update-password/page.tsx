"use client";
import AuthThemeSwitch from "@/components/ui/AuthThemeSwitch";
import { useState } from "react";
import Link from "next/link";
import ThemeLogo from "@/components/ui/ThemeLogo";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (password.length < 12) { setError("Use at least 12 characters."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/update-password", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const json: { error?: string } = await res.json();
      if (!res.ok) { setError(json.error ?? "Unable to update password."); return; }
      setDone(true); setPassword(""); setConfirm("");
    } catch { setError("Unable to reach the server."); }
    finally { setLoading(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-background text-foreground px-4"><AuthThemeSwitch /><div className="w-full max-w-md bg-surface border border-border rounded-2xl p-8 shadow-xl">
    <div className="flex justify-center mb-6"><ThemeLogo size={72} priority /></div>
    <h1 className="text-2xl font-semibold text-center text-foreground mb-2">Update Password</h1>
    {done ? <p className="text-emerald-700 dark:text-emerald-400 text-center">Password updated. <Link href="/auth/signin" className="underline">Return to sign in</Link>.</p> : <>
      <p className="text-muted-foreground text-sm mb-6 text-center">Open this page using the password-recovery link in your email.</p>
      <form onSubmit={submit} className="space-y-4">
        <input aria-label="New password" type="password" autoComplete="new-password" minLength={12} required placeholder="New password (12+ characters)" className="w-full auth-input" value={password} disabled={loading} onChange={e => setPassword(e.target.value)}/>
        <input aria-label="Confirm password" type="password" autoComplete="new-password" minLength={12} required placeholder="Confirm new password" className="w-full auth-input" value={confirm} disabled={loading} onChange={e => setConfirm(e.target.value)}/>
        {error && <p role="alert" className="text-red-600 dark:text-red-400 text-sm">{error}</p>}
        <button type="submit" className="auth-btn w-full" disabled={loading}>{loading ? "Updating..." : "Update Password"}</button>
      </form>
    </>}
  </div></main>;
}
