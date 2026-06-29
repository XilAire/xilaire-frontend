"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React from "react";

interface CRTabsProps {
  activeTab: string;
  id: string;
}

const tabs = [
  { id: "details", label: "Details" },
  { id: "attachments", label: "Attachments" },
  { id: "change-info", label: "Change Info" },
  { id: "comments", label: "Comments" },
  { id: "timeline", label: "Timeline" },
];

export default function CRTabs({ activeTab, id }: CRTabsProps) {
  const router = useRouter();
  const search = useSearchParams();

  const handleChange = (tabId: string) => {
    const params = new URLSearchParams(search.toString());
    params.set("tab", tabId);

    router.push(`/helpdesk/change-requests/${id}?${params.toString()}`);
  };

  return (
    <div className="border-b border-slate-800 flex gap-6 text-sm overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`
              pb-3 
              whitespace-nowrap
              transition
              ${
                isActive
                  ? "text-blue-400 border-b-2 border-blue-500"
                  : "text-slate-400 hover:text-slate-200"
              }
            `}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
