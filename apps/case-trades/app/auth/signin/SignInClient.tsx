"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function SignInClient() {
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
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

    if (loading || transitioning) return;

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

      let data: {
        error?: string;
        redirectTo?: string;
      } = {};

      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        setError(data.error || "Failed to sign in.");
        setLoading(false);
        return;
      }

      setTransitioning(true);

      window.location.href =
        typeof data.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : redirectTo;
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred.");
      setLoading(false);
      setTransitioning(false);
    }
  }

  const isBusy = loading || transitioning;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <div className="relative w-full max-w-sm overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-xl transition-all duration-300">
        {isBusy && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <div className="absolute h-20 w-20 rounded-full border-4 border-slate-700" />
              <div className="absolute h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-emerald-400 border-r-emerald-500" />
              <Loader2 className="h-8 w-8 animate-spin text-emerald-300" />
            </div>

            <p className="mt-5 text-sm font-medium text-slate-100">
              {transitioning ? "Opening Dashboard..." : "Signing in..."}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Preparing your CASE Trades workspace.
            </p>
          </div>
        )}

        <div
          className={
            "transition duration-300 " +
            (isBusy ? "scale-[0.98] opacity-40" : "scale-100 opacity-100")
          }
        >
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
                disabled={isBusy}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-sm text-slate-300">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                disabled={isBusy}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <button
              type="submit"
              disabled={isBusy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {transitioning
                ? "Opening Dashboard..."
                : loading
                  ? "Signing in..."
                  : "Sign In"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-slate-400">
            <Link
              href="/auth/forgot-password"
              className={
                "text-emerald-400 hover:underline " +
                (isBusy ? "pointer-events-none opacity-50" : "")
              }
            >
              Forgot password?
            </Link>
          </div>

          <div className="mt-2 text-center text-sm text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/signup"
              className={
                "text-emerald-400 hover:underline " +
                (isBusy ? "pointer-events-none opacity-50" : "")
              }
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}