"use client";

import Link from "next/link";
import useSWR from "swr";
import {
  Ticket,
  AlertTriangle,
  ClipboardList,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function HelpdeskDashboard() {
  const { data: counts } = useSWR("/api/helpdesk/counts", fetcher, {
    refreshInterval: 5000,
  });

  const cards = [
    {
      label: "Open Tickets",
      value: counts?.tickets ?? 0,
      icon: <Ticket size={22} className="text-sky-300" />,
      href: "/helpdesk/tickets",
    },
    {
      label: "Incidents",
      value: counts?.incidents ?? 0,
      icon: <AlertTriangle size={22} className="text-amber-300" />,
      href: "/helpdesk/incidents",
    },
    {
      label: "Service Requests",
      value: counts?.serviceRequests ?? 0,
      icon: <ClipboardList size={22} className="text-emerald-300" />,
      href: "/helpdesk/service-requests",
    },
    {
      label: "Change Requests",
      value: counts?.changeRequests ?? 0,
      icon: <RefreshCcw size={22} className="text-purple-300" />,
      href: "/helpdesk/change-requests",
    },
    {
      label: "Approvals",
      value: counts?.approvals ?? 0,
      icon: <CheckCircle2 size={22} className="text-blue-300" />,
      href: "/helpdesk/approvals",
    },
  ];

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-white tracking-tight">
        Help Desk Dashboard
      </h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((card, i) => (
          <Link
            key={i}
            href={card.href}
            className="group relative rounded-xl bg-slate-900/80 border border-slate-800 
                       p-5 shadow-lg hover:shadow-sky-800/30 hover:border-sky-700/40 
                       transition-all cursor-pointer"
          >
            {/* Icon */}
            <div className="absolute top-4 right-4 opacity-70 group-hover:opacity-100 transition">
              {card.icon}
            </div>

            {/* Label */}
            <p className="text-slate-400 text-sm">{card.label}</p>

            {/* Value */}
            <p
              className="text-4xl font-bold text-white mt-2 tracking-tight 
                         transition-all group-hover:text-sky-300"
            >
              {card.value}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
