"use client";

type PlatformAuditLog = {
  action: string;
  actor: string | null;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

export default function PlatformAuditTable({
  logs,
}: {
  logs: PlatformAuditLog[];
}) {
  const safeLogs = Array.isArray(logs) ? logs : [];
  const hasLogs = safeLogs.length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Platform Audit Log
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Recent system-level actions across the XilAire platform.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              <th className="px-6 py-3">Action</th>
              <th className="px-6 py-3">Actor</th>
              <th className="px-6 py-3">Time</th>
            </tr>
          </thead>

          <tbody>
            {!hasLogs && (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No audit activity recorded.
                </td>
              </tr>
            )}

            {hasLogs &&
              safeLogs.map((log) => (
                <tr
                  key={`${log.created_at}-${log.action}`}
                  className="border-t border-slate-200 dark:border-slate-800"
                >
                  <td className="px-6 py-3">
                    {log.action}
                  </td>

                  <td className="px-6 py-3 text-slate-700 dark:text-slate-300">
                    {log.actor ?? "system"}
                  </td>

                  <td className="px-6 py-3 text-slate-500">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
