"use client";

import { useState } from "react";

type ContactStatus = "new" | "in_review" | "converted" | "closed";

interface StatusControlProps {
  id: string;
  initialStatus: ContactStatus;
}

export function StatusControl({ id, initialStatus }: StatusControlProps) {
  const [status, setStatus] = useState<ContactStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = e.target.value as ContactStatus;
    const prev = status;

    setStatus(next);
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/contact-requests/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update status");
        setStatus(prev); // revert
      }
    } catch {
      setError("Network error");
      setStatus(prev); // revert
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={isSaving}
        className="w-full rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-100 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      >
        <option value="new">New</option>
        <option value="in_review">In review</option>
        <option value="converted">Converted</option>
        <option value="closed">Closed</option>
      </select>
      {error && (
        <p className="text-[10px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
