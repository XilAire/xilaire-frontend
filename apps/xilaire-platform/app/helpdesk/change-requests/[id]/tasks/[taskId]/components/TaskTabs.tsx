"use client";

import Link from "next/link";

export default function TaskTabs({
  id,
  changeId,
  activeTab,
}: {
  id: string;
  changeId: string;
  activeTab: string;
}) {
  const tabs = [
    { key: "details", label: "Details" },
    { key: "attachments", label: "Attachments" },
    { key: "comments", label: "Comments" },
    { key: "timeline", label: "Timeline" },
  ];

  return (
    <div className="border-b border-slate-700 flex gap-6">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={`/helpdesk/change-requests/${changeId}/tasks/${id}?tab=${tab.key}`}
          className={`pb-3 text-sm ${
            activeTab === tab.key
              ? "text-white border-b-2 border-blue-500"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
