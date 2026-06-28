"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export default function SignInPage() {
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = params.get("redirect") || "/dashboard";

  const authErrorCode = params.get("error_code");
  const authErrorDescription = params.get("error_description");

  const authMessage =
    authErrorCode === "otp_expired"
      ? "That email confirmation link is invalid or has expired. Please sign in if your email is already confirmed, or create a new confirmation email."
      : authErrorDescription
        ? decodeURIComponent(authErrorDescription.replace(/\+/g, " "))
        : null;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();

    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          redirectTo,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sign in.");
        setLoading(false);
        return;
      }

      window.location.href =
        typeof data.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : redirectTo;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <div className="mb-6 flex justify-center">
          <Image
            src="/icon-light.png"
            alt="CASE Trades Logo"
            width={72}
            height={72}
            priority
            className="opacity-95"
          />
        </div>

        <h1 className="mb-2 text-center text-2xl font-semibold text-slate-50">
          CASE Trades
        </h1>

        <p className="mb-6 text-center text-sm text-slate-400">
          Sign in to your trading dashboard.
        </p>

        {authMessage && (
          <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {authMessage}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-900/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-slate-400">
          <Link
            href="/auth/forgot-password"
            className="text-emerald-400 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <div className="mt-2 text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-emerald-400 hover:underline">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}