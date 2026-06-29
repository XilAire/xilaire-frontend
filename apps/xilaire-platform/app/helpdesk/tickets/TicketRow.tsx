"use client";

import Link from "next/link";
import StatusBadge from "@/app/helpdesk/tickets/StatusBadge";

export default function TicketRow({ ticket }) {
  if (!ticket) return null;

  const createdAt = ticket.created_at
    ? new Date(ticket.created_at).toLocaleString()
    : "Unknown date";

  return (
    <Link
      href={`/helpdesk/tickets/${ticket.id}`}
      className="flex items-center justify-between py-4 px-2 hover:bg-slate-800 rounded transition"
    >
      {/* Left Side */}
      <div className="min-w-0">
        <p className="text-white font-semibold truncate">{ticket.title}</p>

        <p className="text-slate-400 text-sm truncate">
          {ticket.description || "No description provided"}
        </p>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4 flex-shrink-0">
        <StatusBadge status={ticket.status} />

        <span className="text-xs text-slate-500 whitespace-nowrap">
          {createdAt}
        </span>
      </div>
    </Link>
  );
}
