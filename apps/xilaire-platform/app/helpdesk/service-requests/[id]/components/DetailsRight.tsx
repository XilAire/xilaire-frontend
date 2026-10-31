"use client";

interface DetailsRightProps {
  request: any;
}

export default function DetailsRight({ request }: DetailsRightProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-2">
      <div className="text-sm text-slate-600 dark:text-slate-400">
        Priority: <span className="text-white">{request.priority}</span>
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-400">
        Status: <span className="text-white">{request.status}</span>
      </div>
    </div>
  );
}
