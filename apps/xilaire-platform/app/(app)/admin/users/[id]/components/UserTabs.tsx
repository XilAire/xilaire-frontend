"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";

const tabs = [
  { key: "details", label: "Details" },
  { key: "activity", label: "Activity" },
  { key: "timeline", label: "Timeline" },
];

export default function UserTabs({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "details";

  return (
    <div className="border-b border-slate-800">
      <nav className="flex gap-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <Link
              key={tab.key}
              href={`/admin/users/${userId}?tab=${tab.key}`}
              className={clsx(
                "relative pb-3 text-sm font-medium transition-colors",
                isActive
                  ? "text-slate-100"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.label}

              {isActive && (
                <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-sky-500" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}