"use client";

import Link from "next/link";

interface SRTabsProps {
  id: string;
  activeTab: string;
}

export default function SRTabs({ id, activeTab }: SRTabsProps) {
  const tabs = [
    { key: "details", label: "Details" },
    { key: "comments", label: "Comments" },
    { key: "timeline", label: "Timeline" },
  ];

  return (
    <div className="flex gap-6 border-b border-slate-800">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;

        return (
          <Link
            key={tab.key}
            href={`/helpdesk/service-requests/${id}?tab=${tab.key}`}
            className={`pb-3 text-sm font-medium transition ${
              isActive
                ? "text-white border-b-2 border-blue-500"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
