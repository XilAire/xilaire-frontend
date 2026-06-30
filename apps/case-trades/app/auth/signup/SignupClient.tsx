"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

import LoadingSpinner from "@/components/ui/LoadingSpinner";

const PLAN_LABELS: Record<string, string> = {
  signals_weekly: "CASE Signals Weekly",
  signals_monthly: "CASE Signals Monthly",
  journal_starter: "CASE Journal Starter",
  journal_pro: "CASE Journal Pro",
  journal_elite: "CASE Journal Elite",
};

export default function SignupClient() {
  const searchParams = useSearchParams();

  const selectedPlan = searchParams.get("plan") ?? "";

  const selectedPlanLabel = useMemo(() => {
    if (!selectedPlan) {
      return null;
    }

    return PLAN_LABELS[selectedPlan] ?? selectedPlan;
  }, [selectedPlan]);

  const signinHref = selectedPlan
    ? `/auth/signin?plan=${encodeURIComponent(selectedPlan)}`
    : "/auth/signin";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    setMessage(null);

    if (!firstName || !lastName || !email || !password || !confirm) {
      setMessage("All fields are required.");
      return;
    }

    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          pendingPlan: selectedPlan || null,
          redirectTo: selectedPlan
            ? `/dashboard/billing?plan=${encodeURIComponent(
                selectedPlan
              )}&reason=complete_subscription`
            : "/dashboard/billing?reason=complete_subscription",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setMessage(data?.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      setMessage(
        selectedPlanLabel
          ? `✓ Check your email to confirm your account. After confirmation, complete your ${selectedPlanLabel} subscription from Billing.`
          : "✓ Check your email to confirm your account."
      );

      setLoading(false);
    } catch (err) {
      console.error(err);
      setMessage("An unexpected error occurred while creating your account.");
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

        <h1 className="mb-3 text-center text-2xl font-semibold text-white">
          Create a CASE Trades Account
        </h1>

        {selectedPlanLabel && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-center text-sm text-emerald-300">
            Selected plan:{" "}
            <span className="font-semibold">{selectedPlanLabel}</span>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <input
            type="text"
            placeholder="First Name"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Last Name"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? (
              <LoadingSpinner size="sm" label="Creating account..." />
            ) : (
              "Sign Up"
            )}
          </button>

          {message && (
            <p className="mt-2 text-center text-sm text-slate-300">
              {message}
            </p>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Already have an account?{" "}
          <Link href={signinHref} className="text-emerald-400 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}