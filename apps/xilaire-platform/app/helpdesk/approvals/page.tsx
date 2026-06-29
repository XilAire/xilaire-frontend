"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";
import { Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ============================================================
     LOAD APPROVALS
  ============================================================ */
  const loadApprovals = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("approvals")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setApprovals(data);
    setLoading(false);
  };

  useEffect(() => {
    loadApprovals();
  }, []);

  /* ============================================================
     COUNTS
  ============================================================ */
  const pendingCount = approvals.filter((a) => a.outcome === "pending").length;
  const approvedCount = approvals.filter((a) => a.outcome === "approved").length;
  const rejectedCount = approvals.filter((a) => a.outcome === "rejected").length;

  /* ============================================================
     OUTCOME COLORS
  ============================================================ */
  const outcomeBadge = {
    pending: `
      bg-yellow-100 text-yellow-700 border border-yellow-300
      dark:bg-yellow-600/20 dark:text-yellow-300 dark:border-yellow-800/40
    `,
    approved: `
      bg-green-100 text-green-700 border border-green-300
      dark:bg-green-600/20 dark:text-green-300 dark:border-green-800/40
    `,
    rejected: `
      bg-red-100 text-red-700 border border-red-300
      dark:bg-red-600/20 dark:text-red-300 dark:border-red-800/40
    `,
  };

  const iconMap: any = {
    pending: <Clock size={18} />,
    approved: <CheckCircle size={18} />,
    rejected: <XCircle size={18} />,
  };

  /* ============================================================
     PAGE UI
  ============================================================ */
  return (
    <div className="max-w-6xl mx-auto space-y-8 pt-6">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Approvals
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">
          Review pending approvals for service requests, incidents, and change requests.
        </p>
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <SummaryCard 
          label="Pending Approvals" 
          value={pendingCount} 
        />

        <SummaryCard 
          label="Approved" 
          value={approvedCount} 
        />

        <SummaryCard 
          label="Rejected" 
          value={rejectedCount} 
        />
      </div>

      {/* RECENT ACTIVITY */}
      <div
        className="
          rounded-xl border shadow-md p-6
          bg-white border-gray-300
          dark:bg-[#0f1628] dark:border-slate-800 dark:shadow-black/30
        "
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
          Recent Approval Activity
        </h2>

        {loading && (
          <div className="flex items-center gap-2 text-gray-500 dark:text-slate-400">
            <Loader2 className="animate-spin" size={16} />
            Loading...
          </div>
        )}

        {!loading && approvals.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-slate-400">
            No approval activity yet.
          </p>
        )}

        {/* Activity List */}
        {!loading && approvals.length > 0 && (
          <div className="divide-y divide-gray-200 dark:divide-slate-800">
            {approvals.map((a) => (
              <Link
                key={a.id}
                href={
                  a.request_type === "service_request"
                    ? `/helpdesk/service-requests/${a.request_id}`
                    : a.request_type === "incident"
                    ? `/helpdesk/incidents/${a.request_id}`
                    : `/helpdesk/change-requests/${a.request_id}`
                }
                className="
                  flex justify-between items-center py-4 px-1
                  hover:bg-gray-50 dark:hover:bg-[#131c33]
                  rounded-lg transition
                "
              >
                <div>
                  <p className="font-medium text-gray-800 dark:text-white">
                    {a.request_type.replace("_", " ").toUpperCase()}
                  </p>

                  {a.notes && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                      {a.notes}
                    </p>
                  )}

                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                    {new Date(a.created_at).toLocaleString()}
                  </p>
                </div>

                <span
                  className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium capitalize
                    ${outcomeBadge[a.outcome]}
                  `}
                >
                  {iconMap[a.outcome]}
                  {a.outcome}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Summary Card Component
============================================================ */
function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="
        rounded-xl p-6 border shadow-md
        bg-white border-gray-300
        dark:bg-[#0b1120] dark:border-slate-800 dark:shadow-black/40
      "
    >
      <p className="text-gray-500 dark:text-slate-400 text-sm">{label}</p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
