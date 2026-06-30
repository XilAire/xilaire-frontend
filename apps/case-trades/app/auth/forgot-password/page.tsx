"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { supabaseCaseTrades } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabaseCaseTrades.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        }
      );

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessage("Password reset email sent. Check your inbox.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage("Unable to send reset email.");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
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

        <h1 className="mb-6 text-center text-2xl font-semibold text-white">
          Reset Your Password
        </h1>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            required
            autoComplete="email"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-lg bg-sky-600 py-2 font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <LoadingSpinner
                size="sm"
                label="Sending reset email..."
              />
            ) : (
              "Send Reset Link"
            )}
          </button>
        </form>

        {message && (
          <p className="mt-4 text-center text-sm text-slate-300">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-sm text-slate-400">
          Remember your password?{" "}
          <Link
            href="/auth/signin"
            className="text-sky-400 hover:underline"
          >
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}