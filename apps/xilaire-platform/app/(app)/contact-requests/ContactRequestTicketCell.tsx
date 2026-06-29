"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = {
  requestId: string;
  linkedTicketId: string | null;
};

export default function ContactRequestTicketCell({
  requestId,
  linkedTicketId,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already linked, just show the ticket link
  if (linkedTicketId) {
    return (
      <div className="flex flex-col items-start gap-1">
        <Link
          href={`/tickets/${linkedTicketId}`}
          className="text-[11px] font-medium text-sky-300 hover:text-sky-200"
        >
          View ticket →
        </Link>
        {error && (
          <span className="text-[10px] text-rose-300/80">Error: {error}</span>
        )}
      </div>
    );
  }

  const handleCreate = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/contact-requests/${requestId}/create-ticket`,
        {
          method: "POST",
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create ticket.");
      }

      // Refresh the server component so the new ticket link appears
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="rounded-md border border-sky-500/50 px-3 py-1 text-[11px] font-medium text-sky-300 hover:border-sky-400 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Creating…" : "Create ticket"}
      </button>
      {error && (
        <span className="text-[10px] text-rose-300/80">Error: {error}</span>
      )}
    </div>
  );
}
