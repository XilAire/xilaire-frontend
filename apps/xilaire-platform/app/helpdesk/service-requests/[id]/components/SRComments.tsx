"use client";

interface SRCommentsProps {
  requestId: string;
}

export default function SRComments({ requestId }: SRCommentsProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <p className="text-slate-400 text-sm">
        Comments for Service Request: {requestId}
      </p>

      {/* comments UI will go here */}
    </div>
  );
}
