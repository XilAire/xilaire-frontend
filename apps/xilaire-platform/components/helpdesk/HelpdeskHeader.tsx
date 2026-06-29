"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { HelpCircle } from "lucide-react";

export default function HelpdeskHeader({
  title,
  subtitle,
  user,
}: {
  title?: string;
  subtitle?: string;
  user?: { email?: string } | null;
}) {
  const pathname = usePathname();

  // If no custom title provided, map based on path
  const autoTitle =
    title ||
    (pathname.includes("/helpdesk/tickets/") && !pathname.endsWith("/tickets")
      ? "Ticket Details"
      : pathname.includes("/helpdesk/tickets")
      ? "Tickets"
      : pathname.includes("/helpdesk/incidents")
      ? "Incidents"
      : pathname.includes("/helpdesk/service-requests")
      ? "Service Requests"
      : pathname.includes("/helpdesk/change-requests")
      ? "Change Requests"
      : pathname.includes("/helpdesk/approvals")
      ? "Approvals"
      : "Help Desk Dashboard");

  const autoSubtitle =
    subtitle ||
    (pathname.includes("/helpdesk/tickets/") &&
    !pathname.endsWith("/tickets")
      ? "View the details, activity, and resolution history"
      : "Overview and management of your helpdesk operations");

  return (
    <div className="flex items-center justify-between pt-6 pb-4">
      {/* Title + subtitle */}
      <div>
        <h1 className="text-xl font-semibold text-white">{autoTitle}</h1>
        <p className="text-xs text-slate-400">{autoSubtitle}</p>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-3">
        {/* New Ticket */}
        <Link
          href="/helpdesk/tickets/new"
          className="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700"
        >
          New Ticket
        </Link>

        {/* New Automation */}
        <Link
          href="/automations/new"
          className="px-4 py-2 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded-lg"
        >
          New Automation
        </Link>

        {/* Help icon */}
        <Link
          href="/helpdesk/help"
          className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700"
        >
          <HelpCircle size={16} className="text-slate-300" />
        </Link>

        {/* User avatar */}
        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
          {user?.email?.[0]?.toUpperCase() || "?"}
        </div>
      </div>
    </div>
  );
}
