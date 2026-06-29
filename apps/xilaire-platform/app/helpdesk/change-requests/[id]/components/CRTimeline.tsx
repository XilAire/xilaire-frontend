"use client";

import { Clock, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";

interface CRTimelineProps {
  change: any;
}

export default function CRTimeline({ change }: CRTimelineProps) {
  const {
    created_at,
    status,
    current_stage,
    approval_status,
    approvals,
  } = change;

  // -------------------------------------------------------------
  // BUILD TIMELINE EVENTS
  // -------------------------------------------------------------
  const events: any[] = [];

  // CREATED EVENT
  events.push({
    label: "Change Request Created",
    detail: `Initial status: ${status || "unknown"}`,
    date: created_at,
    icon: <Clock className="h-4 w-4 text-slate-400" />,
  });

  // APPROVAL STATUS
  if (approval_status) {
    events.push({
      label: "Approval Status Updated",
      detail: `Status: ${approval_status}`,
      date: change.updated_at,
      icon: <CheckCircle className="h-4 w-4 text-green-400" />,
    });
  }

  // CURRENT STAGE
  if (current_stage) {
    events.push({
      label: "Workflow Stage Updated",
      detail: `Stage: ${current_stage}`,
      date: change.updated_at,
      icon: <ArrowRight className="h-4 w-4 text-blue-400" />,
    });
  }

  // PARSE APPROVALS JSON
  if (Array.isArray(approvals)) {
    approvals.forEach((item: any) => {
      if (!item) return;

      events.push({
        label: item.title || "Approval Event",
        detail: item.detail || "",
        date: item.date || created_at,
        icon: <AlertCircle className="h-4 w-4 text-yellow-400" />,
      });
    });
  }

  // SORT EVENTS BY DATE DESC
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-xl font-semibold text-white mb-6">Timeline</h2>

      {events.length === 0 ? (
        <p className="text-slate-400 text-sm">No timeline events recorded.</p>
      ) : (
        <div className="relative">
          {/* Vertical Line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-700"></div>

          <div className="space-y-8">
            {events.map((event, index) => (
              <div key={index} className="relative pl-12 flex flex-col">
                {/* Dot + Icon */}
                <div className="absolute left-0 h-8 w-8 flex items-center justify-center 
                  bg-slate-800 border border-slate-700 rounded-full">
                  {event.icon}
                </div>

                {/* Event Label */}
                <h3 className="text-white font-medium">{event.label}</h3>

                {/* Event Detail */}
                {event.detail && (
                  <p className="text-slate-400 text-sm mt-1 whitespace-pre-line">
                    {event.detail}
                  </p>
                )}

                {/* Event Date */}
                <p className="text-slate-500 text-xs mt-1">{formatDate(event.date)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
