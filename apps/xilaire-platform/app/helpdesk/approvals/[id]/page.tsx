"use client";

import React, { useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";
import { ArrowLeft, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ApprovalDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();

  const [approval, setApproval] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [user, setUser] = useState<any>(null);

  /* ============================================================
     LOAD APPROVAL DETAILS + USER
  ============================================================ */

  const loadApproval = async () => {
    setLoading(true);

    const { data, error } = await supabasePlatform
      .from("approvals")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setApproval(data);
      setNotes(data.notes || "");
    }

    setLoading(false);
  };

  useEffect(() => {
    supabasePlatform.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    loadApproval();
  }, [id]);

  /* ============================================================
     BADGES + ICONS
  ============================================================ */

  const outcomeStyles: Record<string, string> = {
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

  const icons: Record<string, React.ReactNode> = {
    pending: <Clock size={20} />,
    approved: <CheckCircle size={20} />,
    rejected: <XCircle size={20} />,
  };

  const readableType: Record<string, string> = {
    service_request: "Service Request",
    incident: "Incident",
    change_request: "Change Request",
  };

  /* LINK GENERATION */
  const linkTarget =
    approval?.request_type === "service_request"
      ? `/helpdesk/service-requests/${approval.request_id}`
      : approval?.request_type === "incident"
      ? `/helpdesk/incidents/${approval.request_id}`
      : approval?.request_type === "change_request"
      ? `/helpdesk/change-requests/${approval.request_id}`
      : "#";

  /* ============================================================
     ACTION HANDLERS: APPROVE / REJECT
  ============================================================ */

  const updateOutcome = async (outcome: "approved" | "rejected") => {
    if (!user) return;

    setActionLoading(true);

    const { error } = await supabasePlatform
      .from("approvals")
      .update({
        outcome,
        notes,
        approver_id: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    setActionLoading(false);

    if (!error) {
      await loadApproval();
      router.refresh();
    }
  };

  /* ============================================================
     UI
  ============================================================ */

  if (loading)
    return <p className="text-gray-500 dark:text-slate-400 p-6">Loading…</p>;

  if (!approval)
    return <p className="text-red-400 p-6">Approval not found.</p>;

  const isFinal = approval.outcome === "approved" || approval.outcome === "rejected";
  const outcome = approval.outcome || "pending";

  return (
    <div className="max-w-4xl mx-auto space-y-8 pt-6">
      {/* Back Button */}
      <Link
        href="/helpdesk/approvals"
        className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 
          hover:text-gray-900 dark:text-slate-400 dark:hover:text-white"
      >
        <ArrowLeft size={18} />
        Back to Approvals
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Approval Details
        </h1>
        <p className="text-gray-500 dark:text-slate-400 mt-1">
          Full review of approval request and decision metadata.
        </p>
      </div>

      {/* Details Card */}
      <div
        className="rounded-xl border shadow-md p-6 space-y-6
          bg-white border-gray-300
          dark:bg-[#0b1120] dark:border-slate-800 dark:shadow-black/40"
      >
        {/* Request Type */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Request Type
          </p>
          <p className="mt-1 text-lg font-medium text-gray-900 dark:text-white">
            {readableType[approval.request_type] || approval.request_type}
          </p>
        </div>

        {/* Related Request */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Related Request
          </p>
          <Link
            href={linkTarget}
            className="mt-1 inline-block text-sky-600 dark:text-sky-400 font-medium hover:underline"
          >
            View {readableType[approval.request_type] || "Request"}
          </Link>
        </div>

        {/* Outcome Badge */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Outcome
          </p>
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 mt-1 rounded-full text-sm font-medium capitalize ${outcomeStyles[outcome]}`}
          >
            {icons[outcome]}
            {outcome}
          </span>
        </div>

        {/* Notes */}
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
            Notes
          </p>
          <textarea
            disabled={isFinal || actionLoading}
            className="w-full mt-2 p-3 rounded-lg bg-white border border-gray-300 
              dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200 text-sm"
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter approval notes..."
          />
        </div>

        {/* Approval Actions */}
        {!isFinal && (
          <div className="flex gap-3 pt-2">
            {/* Approve */}
            <button
              onClick={() => updateOutcome("approved")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm 
                font-medium disabled:opacity-40 flex items-center gap-2"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Approve
            </button>

            {/* Reject */}
            <button
              onClick={() => updateOutcome("rejected")}
              disabled={actionLoading}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm 
                font-medium disabled:opacity-40 flex items-center gap-2"
            >
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Reject
            </button>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
          <div>
            <p className="text-xs uppercase text-gray-500 dark:text-slate-400">
              Created At
            </p>
            <p className="text-gray-800 dark:text-slate-200 mt-1">
              {new Date(approval.created_at).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase text-gray-500 dark:text-slate-400">
              Last Updated
            </p>
            <p className="text-gray-800 dark:text-slate-200 mt-1">
              {new Date(approval.updated_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
