"use client";

import Link from "next/link";

export default function ContactRequestTicketCell({ request }) {
  return (
    <Link
      href={`/helpdesk/contact-requests/${request.id}`}
      className="flex items-center justify-between py-4 px-2 hover:bg-slate-800 transition rounded"
    >
      <div>
        <div className="text-white font-medium">
          {request.full_name || "Unknown Sender"}
        </div>

        <div className="text-slate-400 text-sm">{request.email}</div>
      </div>

      <div className="text-xs text-slate-500">
        {new Date(request.created_at).toLocaleString()}
      </div>
    </Link>
  );
}
