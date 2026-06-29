"use client";

import { useState } from "react";
import Link from "next/link";
import { acknowledgeAlerts } from "@/lib/acknowledgeAlerts";
import { resolveAlerts } from "@/lib/resolveAlerts";

/* -------------------------------------------------
   TYPES
------------------------------------------------- */
type AlertListRow = {
  id: string;
  metric: string;
  severity: string;
  status: string;
  triggered_at: string | null;
  device_name: string | null;
};

type StyleMap = Record<
  string,
  { bg: string; text: string; ring: string }
>;

export default function AlertsListClient({
  alerts,
  severityStyles,
  statusStyles,
}: {
  alerts: AlertListRow[];
  severityStyles: StyleMap;
  statusStyles: StyleMap;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const acknowledge = async () => {
    setBusy(true);
    try {
      await acknowledgeAlerts(
        alerts
          .filter(
            (a) => selected.includes(a.id) && a.status === "open"
          )
          .map((a) => a.id)
      );
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const resolve = async () => {
    setBusy(true);
    try {
      await resolveAlerts(
        alerts
          .filter(
            (a) =>
              selected.includes(a.id) &&
              a.status === "acknowledged"
          )
          .map((a) => a.id)
      );
      window.location.reload();
    } finally {
      setBusy(false);
    }
  };

  const hasOpen = alerts.some(
    (a) => selected.includes(a.id) && a.status === "open"
  );

  const hasAcknowledged = alerts.some(
    (a) =>
      selected.includes(a.id) && a.status === "acknowledged"
  );

  return (
    <div className="space-y-4">
      {(hasOpen || hasAcknowledged) && (
        <div className="flex items-center gap-3">
          {hasOpen && (
            <button
              onClick={acknowledge}
              disabled={busy}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Acknowledge
            </button>
          )}

          {hasAcknowledged && (
            <button
              onClick={resolve}
              disabled={busy}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Resolve
            </button>
          )}
        </div>
      )}

      <div className="divide-y rounded-lg border border-slate-200 dark:border-slate-800">
        {alerts.map((alert) => {
          const severityStyle =
            severityStyles[alert.severity] ??
            severityStyles.__fallback;

          const statusStyle =
            statusStyles[alert.status] ??
            statusStyles.__fallback;

          return (
            <div
              key={alert.id}
              className="flex items-center justify-between gap-4 px-4 py-4"
            >
              <div className="flex items-start gap-3">
                {alert.status !== "resolved" && (
                  <input
                    type="checkbox"
                    checked={selected.includes(alert.id)}
                    onChange={() => toggle(alert.id)}
                    className="mt-1 h-4 w-4"
                  />
                )}

                <Link
                  href={`/alerts/${alert.id}`}
                  className="block transition hover:underline"
                >
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {alert.metric.toUpperCase()} Alert
                    {alert.device_name && (
                      <span className="ml-2 text-xs text-slate-500">
                        • {alert.device_name}
                      </span>
                    )}
                  </p>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Triggered{" "}
                    {alert.triggered_at
                      ? new Date(alert.triggered_at).toLocaleString()
                      : "Unknown time"}
                  </p>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium ring-1",
                    statusStyle.bg,
                    statusStyle.text,
                    statusStyle.ring,
                  ].join(" ")}
                >
                  {alert.status}
                </span>

                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium ring-1",
                    severityStyle.bg,
                    severityStyle.text,
                    severityStyle.ring,
                  ].join(" ")}
                >
                  {alert.severity}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
