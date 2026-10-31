"use client";

interface DetailsLeftProps {
  request: any;
}

export default function DetailsLeft({ request }: DetailsLeftProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-2">Summary</h2>
      <p className="text-slate-700 dark:text-slate-300 text-sm">
        {request.description ?? "No description provided."}
      </p>
    </div>
  );
}
