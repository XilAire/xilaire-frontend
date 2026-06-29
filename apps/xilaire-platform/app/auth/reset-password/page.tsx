"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";
import Image from "next/image";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!password.trim()) {
      setMessage("Please enter a new password.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("✓ Password updated! You can now sign in.");
      setPassword("");
    } finally {
      setLoading(false);
    }
  }

  const isSuccess = message.includes("updated");

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
          Set New Password
        </h1>

        <form onSubmit={handleUpdate} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            className="w-full auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />

          <button
            type="submit"
            className="auth-btn w-full disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        {message && (
          <p
            className={`text-center text-sm mt-4 ${
              isSuccess ? "text-emerald-400" : "text-slate-300"
            }`}
          >
            {message}
          </p>
        )}

        {isSuccess && (
          <p className="text-center text-sm text-blue-400 mt-4">
            <Link href="/auth/signin" className="hover:underline">
              Return to Sign In →
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}