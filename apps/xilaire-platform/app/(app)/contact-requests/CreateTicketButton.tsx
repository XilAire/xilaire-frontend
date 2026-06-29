"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateTicketButtonProps = {
  requestId: string;
};

export function CreateTicketButton({ requestId }: CreateTicketButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/contact-requests/create-ticket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ requestId }),
      });

      const data = await res.json();
      console.log("Create-ticket response:", data);

      if (!res.ok) {
        console.error("Create-ticket failed:", data);
        // (Optional) show a toast or alert here
      }

      // 🔄 This is what forces the table to re-fetch fresh data
      router.refresh();
    } catch (err) {
      console.error("Create-ticket error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="rounded-md bg-sky-500 px-3 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Creating…" : "Create ticket"}
    </button>
  );
}
