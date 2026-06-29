"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Pencil,
  PlusCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";

import StatusPill from "../[id]/components/StatusPill";
import ChangeRequestTasksAccordion from "./ChangeRequestTasksAccordion";

export default function ChangeRequestListItem({ change }: { change: any }) {
  const [expanded, setExpanded] = useState(false);

  const taskCount = change.taskCount ?? 0;

  // ✅ SAFE NAME RESOLUTION (NO CRASH)
  const requestedByName =
    change.requestedBy?.full_name ??
    change.requested_by_name ??
    null;

  const assignedToName =
    change.assignedTo?.full_name ??
    change.assigned_to_name ??
    null;

  return (
    <>
      {/* =========================
          CHANGE REQUEST ROW
      ========================== */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b 
        border-slate-200 dark:border-slate-800 hover:bg-slate-100 
        dark:hover:bg-slate-800 transition"
      >
        {/* LEFT — expand + navigation */}
        <div className="flex items-start gap-3 flex-1">
          {/* EXPAND / COLLAPSE */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-slate-500 hover:text-slate-900 
              dark:hover:text-white"
            title={expanded ? "Hide tasks" : "Show tasks"}
          >
            {expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </button>

          {/* MAIN LINK */}
          <Link
            href={`/helpdesk/change-requests/${change.id}`}
            className="flex-1 space-y-1"
          >
            <p className="font-medium text-slate-900 dark:text-white">
              {change.title}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span>ID: {change.id}</span>

              {/* ✅ REQUESTED BY (SAFE) */}
              {requestedByName && (
                <span>Requested by {requestedByName}</span>
              )}

              {/* ✅ ASSIGNED TO (SAFE) */}
              {assignedToName && (
                <span>Assigned to {assignedToName}</span>
              )}

              {/* TASK COUNT */}
              <span className="inline-flex items-center gap-1">
                🧩 {taskCount} task{taskCount !== 1 ? "s" : ""}
              </span>
            </div>
          </Link>
        </div>

        {/* RIGHT — actions */}
        <div className="flex items-center gap-4">
          <StatusPill status={change.status} />

          {/* EDIT CHANGE */}
          <Link
            href={`/helpdesk/change-requests/${change.id}/edit`}
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded hover:bg-slate-200 
              dark:hover:bg-slate-700"
            title="Edit Change"
          >
            <Pencil size={16} />
          </Link>

          {/* ADD TASK */}
          <Link
            href={`/helpdesk/change-requests/${change.id}/tasks/new`}
            className="p-2 rounded hover:bg-slate-200 
              dark:hover:bg-slate-700"
            title="Add Task"
            onClick={(e) => e.stopPropagation()}
          >
            <PlusCircle size={16} />
          </Link>
        </div>
      </div>

      {/* =========================
          TASKS ACCORDION
      ========================== */}
      {expanded && (
        <div className="px-10 pb-4">
          <ChangeRequestTasksAccordion
            changeRequestId={change.id}
          />
        </div>
      )}
    </>
  );
}
