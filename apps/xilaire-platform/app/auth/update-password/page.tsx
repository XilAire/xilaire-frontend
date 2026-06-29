"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import Image from "next/image";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = supabasePlatform;

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess("✓ Password updated successfully!");

    // Redirect after 1.5 seconds
    setTimeout(() => {
      router.push("/auth/signin");
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">

        {/* 🔥 XilAire Logo */}
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

        <h1 className="text-2xl font-semibold text-center text-white mb-2">
          Update Password
        </h1>

        <p className="text-sm text-slate-400 mb-6 text-center">
          Enter a new password to finish the reset process.
        </p>

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="text-sm text-slate-300">New Password</label>
            <input
              type="password"
              placeholder="Enter new password"
              className="mt-1 w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          {success && (
            <p className="text-green-400 text-sm text-center">{success}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-600 py-2 font-medium text-white transition hover:bg-sky-700 disabled:opacity-40"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
