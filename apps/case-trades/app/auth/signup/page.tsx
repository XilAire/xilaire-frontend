"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";

const PLAN_LABELS: Record<string, string> = {
  signals_weekly: "CASE Signals Weekly",
  signals_monthly: "CASE Signals Monthly",
  journal_starter: "CASE Journal Starter",
  journal_pro: "CASE Journal Pro",
  journal_elite: "CASE Journal Elite",
};

export default function SignupPage() {
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
    setMessage(null);

    if (!firstName || !lastName || !email || !password || !confirm) {
      return setMessage("All fields are required.");
    }

    if (password !== confirm) {
      return setMessage("Passwords do not match.");
    }

    setLoading(true);

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

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMessage(data.error || "Failed to create account.");
      return;
    }

    setMessage(
      selectedPlanLabel
        ? `✓ Check your email to confirm your account. After confirmation, complete your ${selectedPlanLabel} subscription from Billing.`
        : "✓ Check your email to confirm your account."
    );
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
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Last Name"
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="w-full rounded-lg bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-emerald-500"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-40"
          >
            {loading ? "Creating…" : "Sign Up"}
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