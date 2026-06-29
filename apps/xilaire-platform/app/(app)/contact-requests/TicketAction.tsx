"use client";

import { useState } from "react";

interface TicketActionProps {
  contactId: string;
  linkedTicketId: string | null;
}

function shortId(id: string) {
  return id.slice(0, 8);
}

export function TicketAction({ contactId, linkedTicketId }: TicketActionProps) {
  const [ticketId, setTicketId] = useState<string | null>(linkedTicketId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/contact-requests/${contactId}/create-ticket`,
        {
          method: "POST",
        }
      );

      const data = await res.json();

      if (!res.ok || !data.ticketId) {
        setError(data.error || "Failed to create ticket");
        return;
      }

      setTicketId(data.ticketId);
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (ticketId) {
    return (
      <div className="space-y-1 text-right">
        <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
          Ticket created
        </span>
        <div className="text-[11px] text-slate-400">
          #{shortId(ticketId)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 text-right">
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="inline-flex items-center rounded-full border border-sky-500/60 bg-sky-500 px-3 py-1 text-[11px] font-medium text-white shadow-sm transition hover:bg-sky-600 hover:border-sky-600 disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create ticket"}
      </button>
      {error && (
        <p className="text-[10px] text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
