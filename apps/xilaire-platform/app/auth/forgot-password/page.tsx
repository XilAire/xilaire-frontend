"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient"; // ✅ FIXED IMPORT
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();

      if (!normalizedEmail) {
        setLoading(false);
        setMessage("Email is required.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: `${location.origin}/auth/reset-password`,
        }
      );

      setLoading(false);

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("✓ Password reset email sent! Check your inbox.");
    } catch (err) {
      console.error("FORGOT_PASSWORD_ERROR:", err);
      setLoading(false);
      setMessage("Unexpected error sending reset email.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 w-full max-w-md shadow-xl">

        <div className="flex justify-center mb-6">
          <Image
            src="/icon-light.png"
            alt="XilAire Logo"
            width={72}
            height={72}
            priority
            className="opacity-95"
          />
        </div>

        <h1 className="text-2xl font-semibold text-center text-white mb-6">
          Reset Your Password
        </h1>

        <form onSubmit={handleReset} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            className="auth-btn w-full"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        {message && (
          <p className="text-center text-sm text-slate-300 mt-4">
            {message}
          </p>
        )}

        <p className="text-center text-sm text-slate-400 mt-6">
          Remember your password?{" "}
          <Link href="/auth/signin" className="text-blue-400 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}