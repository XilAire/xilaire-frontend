"use client";

interface DetailsRightProps {
  request: any;
}

export default function DetailsRight({ request }: DetailsRightProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-2">
      <div className="text-sm text-slate-400">
        Priority: <span className="text-white">{request.priority}</span>
      </div>

      <div className="text-sm text-slate-400">
        Status: <span className="text-white">{request.status}</span>
      </div>
    </div>
  );
}
