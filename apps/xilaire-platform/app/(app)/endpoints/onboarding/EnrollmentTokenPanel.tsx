"use client";

import { useState, useTransition } from "react";
import { createEnrollmentToken } from "@/lib/agentEnrollment/createEnrollmentToken";

export default function EnrollmentTokenPanel() {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [maxUses, setMaxUses] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateToken = () => {
    setError(null);
    setToken(null);

    startTransition(async () => {
      try {
        const result = await createEnrollmentToken({
          expiresInHours: 24,
          maxUses: 1,
        });

        setToken(result.token);
        setExpiresAt(result.expiresAt);
        setMaxUses(result.maxUses);
      } catch (err) {
        setError("Failed to generate enrollment token.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Action */}
      <button
        onClick={generateToken}
        disabled={isPending}
        className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 disabled:opacity-50"
      >
        {isPending ? "Generating…" : "Generate enrollment token"}
      </button>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400">
          {error}
        </p>
      )}

      {/* Token Reveal */}
      {token && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold text-amber-300">
              Enrollment token (shown once)
            </p>
            <p className="text-xs text-amber-400">
              Copy this token now. You will not be able to view it again.
            </p>
          </div>

          <code className="block break-all rounded bg-slate-900 px-3 py-2 text-sm text-slate-200">
            {token}
          </code>

          <div className="text-xs text-slate-400 space-y-1">
            <p>
              Expires:{" "}
              <span className="text-slate-300">
                {new Date(expiresAt!).toLocaleString()}
              </span>
            </p>
            <p>
              Max uses:{" "}
              <span className="text-slate-300">
                {maxUses}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
