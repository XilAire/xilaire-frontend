"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { supabaseCaseTrades } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState<string | null>(
    "Validating reset link..."
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function recoverSession() {
      const params = new URLSearchParams(window.location.hash.substring(1));

      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabaseCaseTrades.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        window.history.replaceState({}, document.title, "/auth/reset-password");
      }

      const {
        data: { session },
      } = await supabaseCaseTrades.auth.getSession();

      if (!session) {
        setMessage("Reset link is invalid or expired. Request a new reset link.");
        return;
      }

      setReady(true);
      setMessage(null);
    }

    recoverSession();
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setMessage(null);
    setLoading(true);

    try {
      const { error } = await supabaseCaseTrades.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      await supabaseCaseTrades.auth.signOut();
      setMessage("Password updated. You can now sign in.");
      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage("Unable to update password.");
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
          Set New Password
        </h1>

        {ready && !message?.includes("updated") && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={loading}
              className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="w-full rounded-lg bg-sky-600 py-2 font-medium text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <LoadingSpinner size="sm" label="Updating password..." />
              ) : (
                "Update Password"
              )}
            </button>
          </form>
        )}

        {message && (
          <p className="mt-4 text-center text-sm text-slate-300">{message}</p>
        )}

        {message?.includes("updated") && (
          <p className="mt-4 text-center text-sm">
            <Link href="/auth/signin" className="text-sky-400 hover:underline">
              Return to Sign In →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}