"use client";

interface SRTimelineProps {
  request: any;
}

export default function SRTimeline({ request }: SRTimelineProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <p className="text-slate-400 text-sm">
        Timeline for request {request.id}
      </p>
    </div>
  );
}
