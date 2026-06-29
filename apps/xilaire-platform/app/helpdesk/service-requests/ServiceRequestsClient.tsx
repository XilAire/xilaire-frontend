"use client";

import { useState } from "react";
import ServiceRequestListItem from "./components/ServiceRequestListItem";
import BulkActionsBar from "./components/BulkActionsBar";

/* ---------------------------------------------------------
   TYPES
--------------------------------------------------------- */
interface StatusCounts {
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

interface ServiceRequestsClientProps {
  requests: any[];
  counts: StatusCounts;
}

/* ---------------------------------------------------------
   COMPONENT
--------------------------------------------------------- */
export default function ServiceRequestsClient({
  requests,
  counts,
}: ServiceRequestsClientProps) {
  /* ===============================
     SELECTION STATE (REQUIRED)
  ================================ */
  const [selected, setSelected] = useState<string[]>([]);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function clearSelection() {
    setSelected([]);
  }

  /* ===============================
     RENDER
  ================================ */
  return (
    <div className="p-6 space-y-6">
      {/* ===============================
         STATUS CARDS
      ================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard label="Open" value={counts.open} />
        <SummaryCard label="In Progress" value={counts.in_progress} />
        <SummaryCard label="Resolved" value={counts.resolved} />
        <SummaryCard label="Closed" value={counts.closed} />
      </div>

      {/* ===============================
         BULK ACTIONS
      ================================ */}
      {selected.length > 0 && (
        <BulkActionsBar
          selectedIds={selected}
          onClear={clearSelection}
        />
      )}

      {/* ===============================
         TABLE
      ================================ */}
      <div className="rounded-xl border border-slate-800 overflow-hidden">
        {/* HEADER */}
        <div className="grid grid-cols-12 px-6 py-3 text-xs text-slate-400 border-b border-slate-800">
          <div className="col-span-1" />
          <div className="col-span-4">Request</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Actions</div>
          <div className="col-span-1 text-right">Created</div>
        </div>

        {/* ROWS */}
        {requests.length === 0 && (
          <div className="px-6 py-10 text-center text-slate-500">
            No service requests found
          </div>
        )}

        {requests.map((request) => (
          <ServiceRequestListItem
            key={request.id}
            request={request}
            selected={selected.includes(request.id)}
            onToggleSelect={toggleSelect}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------
   SUMMARY CARD
--------------------------------------------------------- */
function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}
