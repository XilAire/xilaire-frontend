"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

import ChangeRequestListHeader from "./components/ChangeRequestListHeader";
import ChangeRequestListItem from "./components/ChangeRequestListItem";
import ChangeRequestSummary from "./components/ChangeRequestSummary";
import EmptyState from "./components/EmptyState";

interface ChangeRequestsClientProps {
  requests: any[];
}

/* ---------------------------------------------------------
   NORMALIZE STATUS (DEFENSIVE, BUT CLEAN)
--------------------------------------------------------- */
const normalizeStatus = (status?: string) =>
  status?.toLowerCase().trim();

export default function ChangeRequestsClient({
  requests,
}: ChangeRequestsClientProps) {
  /* ---------------------------------------------------------
     STATUS COUNTS (CANONICAL — MATCH DB LOOKUP TABLE)
  --------------------------------------------------------- */
  const planningCount = requests.filter(
    (r) => normalizeStatus(r.status) === "planning"
  ).length;

  const pendingApprovalCount = requests.filter(
    (r) => normalizeStatus(r.status) === "pending_approval"
  ).length;

  const scheduledCount = requests.filter(
    (r) => normalizeStatus(r.status) === "scheduled"
  ).length;

  const inProgressCount = requests.filter(
    (r) => normalizeStatus(r.status) === "in_progress"
  ).length;

  const completedCount = requests.filter(
    (r) => normalizeStatus(r.status) === "completed"
  ).length;

  return (
    <div className="max-w-7xl mx-auto space-y-10 px-4 pt-6">
      {/* =========================
          PAGE HEADER
      ========================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Change Requests
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Track, approve, and review configuration & infrastructure changes.
          </p>
        </div>

        <Link
          href="/helpdesk/change-requests/new"
          className="inline-flex items-center gap-2 rounded-lg
                     bg-blue-600 px-4 py-2 text-white
                     shadow-sm transition hover:bg-blue-700"
        >
          <Plus size={18} />
          New Request
        </Link>
      </div>

      {/* =========================
          SUMMARY CARDS
      ========================== */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <ChangeRequestSummary
          label="Planning"
          count={planningCount}
        />
        <ChangeRequestSummary
          label="Pending Approval"
          count={pendingApprovalCount}
        />
        <ChangeRequestSummary
          label="Scheduled"
          count={scheduledCount}
        />
        <ChangeRequestSummary
          label="In Progress"
          count={inProgressCount}
        />
        <ChangeRequestSummary
          label="Completed"
          count={completedCount}
        />
      </div>

      {/* =========================
          LIST CONTAINER
      ========================== */}
      <div
        className="overflow-hidden rounded-xl border
                   border-slate-300 bg-white shadow-xl
                   dark:border-slate-800 dark:bg-slate-950"
      >
        <ChangeRequestListHeader />

        {requests.length === 0 ? (
          <EmptyState label="change requests" />
        ) : (
          requests.map((change) => (
            <ChangeRequestListItem
              key={change.id}
              change={change}
            />
          ))
        )}
      </div>
    </div>
  );
}
