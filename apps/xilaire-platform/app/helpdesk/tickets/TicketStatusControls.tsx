"use client";

import { useState, useTransition } from "react";

type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
type TicketPriority = "low" | "medium" | "high" | "critical";

const STATUS_OPTIONS: { value: TicketStatus; label: string }[] = [
  { value: "open",        label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved",    label: "Resolved" },
  { value: "closed",      label: "Closed" },
];

const PRIORITY_OPTIONS: { value: TicketPriority; label: string }[] = [
  { value: "low",      label: "Low" },
  { value: "medium",   label: "Medium" },
  { value: "high",     label: "High" },
  { value: "critical", label: "Critical" },
];

type Props = {
  ticketId: string;
  initialStatus: TicketStatus;
  initialPriority: TicketPriority;
};

export function TicketStatusControls({
  ticketId,
  initialStatus,
  initialPriority,
}: Props) {
  const [status, setStatus] = useState<TicketStatus>(initialStatus);
  const [priority, setPriority] = useState<TicketPriority>(initialPriority);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const isActive = (option: string, current: string) => option === current;

  /* ---------------------------------------
   * Update Status
   * -------------------------------------*/
  function handleStatusChange(next: TicketStatus) {
    if (next === status) return;

    setMessage(null);

    startTransition(async () => {
      const res = await fetch("/api/helpdesk/tickets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status: next,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Unable to update status.");
        return;
      }

      setStatus(next);
      setMessage("Status updated.");
    });
  }

  /* ---------------------------------------
   * Update Priority
   * -------------------------------------*/
  function handlePriorityChange(next: TicketPriority) {
    if (next === priority) return;

    setMessage(null);

    startTransition(async () => {
      const res = await fetch("/api/helpdesk/tickets/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          priority: next,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Unable to update priority.");
        return;
      }

      setPriority(next);
      setMessage("Priority updated.");
    });
  }

  /* ---------------------------------------
   * UI
   * -------------------------------------*/
  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-200">

      {/* Status */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Status
        </h3>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              disabled={isPending}
              onClick={() => handleStatusChange(opt.value)}
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                isActive(opt.value, status)
                  ? "bg-sky-500 text-white"
                  : "bg-slate-900 text-slate-300 hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Priority
        </h3>

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
          <span className="text-[11px] text-slate-400">Level</span>

          <select
            value={priority}
            onChange={(e) =>
              handlePriorityChange(e.target.value as TicketPriority)
            }
            disabled={isPending}
            className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none"
          >
            {PRIORITY_OPTIONS.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-slate-900 text-slate-100"
              >
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <p className="text-[11px] text-emerald-300">{message}</p>
      )}

      {isPending && (
        <p className="text-[11px] text-slate-500">Saving changes…</p>
      )}
    </div>
  );
}
