"use client";

import { reviewPlatformSettingChange } from "@/lib/reviewPlatformSettingChange";

type ChangeRequest = {
  id: string;
  setting_key: string;
  requested_value: boolean;
  reason: string | null;
  requested_at: string;
};

export default function PlatformSettingChangeApprovalTable({
  requests,
}: {
  requests: ChangeRequest[];
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-6 py-4 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Pending Platform Setting Changes
        </h2>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800">
        {requests.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between px-6 py-4"
          >
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                {r.setting_key}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Requested: {r.requested_value ? "Enable" : "Disable"}
              </p>
              {r.reason && (
                <p className="text-xs text-slate-400 mt-1">
                  Reason: {r.reason}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <form
                action={reviewPlatformSettingChange.bind(null, {
                  id: r.id,
                  approved: true,
                })}
              >
                <button className="rounded bg-emerald-600 px-3 py-1 text-xs text-white hover:bg-emerald-700">
                  Approve
                </button>
              </form>

              <form
                action={reviewPlatformSettingChange.bind(null, {
                  id: r.id,
                  approved: false,
                })}
              >
                <button className="rounded bg-rose-600 px-3 py-1 text-xs text-white hover:bg-rose-700">
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}

        {requests.length === 0 && (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            No pending platform setting changes.
          </div>
        )}
      </div>
    </div>
  );
}
