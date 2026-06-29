"use client";

import { useEffect, useState } from "react";
import { MessageSquare, ArrowRight, Wand2 } from "lucide-react";

export default function ActivityLog({ ticketId }: { ticketId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const iconForType = (type: string) => {
    switch (type) {
      case "comment":
        return <MessageSquare size={16} className="text-sky-300" />;
      case "status_change":
      case "priority_change":
        return <ArrowRight size={16} className="text-amber-300" />;
      default:
        return <Wand2 size={16} className="text-slate-300" />;
    }
  };

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/helpdesk/activity?ticketId=${ticketId}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setLoading(false);
    }
    load();
  }, [ticketId]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <h3 className="text-sm font-semibold text-slate-50 mb-3">Activity</h3>

      <div className="space-y-3">
        {loading && (
          <p className="text-slate-500 text-sm">Loading activity…</p>
        )}

        {!loading && logs.length === 0 && (
          <p className="text-slate-500 text-sm">
            No activity yet.
          </p>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-3 rounded-lg bg-slate-900 p-3 border border-slate-800"
          >
            {iconForType(log.type)}

            <div className="flex-1">
              <p className="text-slate-200 text-sm">
                {log.message}
              </p>

              <p className="text-[11px] text-slate-500 mt-1">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
