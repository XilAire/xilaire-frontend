"use client";

import {
  CheckCircle,
  ArrowRight,
  Shield,
  Clock,
} from "lucide-react";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
export interface TimelineEvent {
  id?: string;
  message: string;
  actor?: string | null;
  timestamp: string | Date;
}

/* -------------------------------------------------
   COMPONENT
------------------------------------------------- */
export function UserTimeline({ events }: { events: TimelineEvent[] }) {
  if (!Array.isArray(events) || events.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        No activity recorded for this user.
      </div>
    );
  }

  function getIcon(message: string) {
    const msg = message.toLowerCase();

    if (msg.includes("approved"))
      return <CheckCircle className="h-4 w-4 text-emerald-600" />;

    if (msg.includes("role"))
      return <Shield className="h-4 w-4 text-purple-600" />;

    if (msg.includes("status"))
      return <ArrowRight className="h-4 w-4 text-blue-600" />;

    return <Clock className="h-4 w-4 text-slate-400" />;
  }

  function formatTimestamp(ts: string | Date) {
    const date = ts instanceof Date ? ts : new Date(ts);
    if (isNaN(date.getTime())) return "Unknown time";

    return date.toLocaleString();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-6 text-sm font-semibold text-slate-900">
        Activity Timeline
      </h3>

      <div className="relative space-y-6">
        {events.map((e, i) => (
          <div
            key={e.id ?? `${e.timestamp}-${i}`}
            className="relative flex gap-4"
          >
            {/* Rail */}
            <div className="relative">
              {i !== events.length - 1 && (
                <div className="absolute left-1/2 top-8 h-full w-px -translate-x-1/2 bg-slate-200" />
              )}

              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                {getIcon(e.message)}
              </div>
            </div>

            {/* Content */}
            <div className="pb-6">
              <p className="text-sm font-medium text-slate-900">
                {e.message}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {e.actor ? `By ${e.actor} • ` : ""}
                {formatTimestamp(e.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
