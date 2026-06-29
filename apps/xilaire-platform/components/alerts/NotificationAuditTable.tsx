"use client";

export type NotificationAuditRow = {
  notification_id: string;
  alert_id: string;
  hostname: string;
  metric: string;
  value: number;
  severity: "warning" | "critical";
  channel: string;
  destination: string;
  status: "sent" | "failed";
  error: string | null;
  sent_at: string;
};

export default function NotificationAuditTable({
  rows,
}: {
  rows: NotificationAuditRow[];
}) {
  return (
    <div className="rounded-lg border bg-background">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left">Host</th>
            <th className="px-3 py-2">Metric</th>
            <th className="px-3 py-2">Value</th>
            <th className="px-3 py-2">Severity</th>
            <th className="px-3 py-2">Channel</th>
            <th className="px-3 py-2">Destination</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Sent At</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.notification_id} className="border-b">
              <td className="px-3 py-2 font-medium">
                {r.hostname}
              </td>
              <td className="px-3 py-2">{r.metric}</td>
              <td className="px-3 py-2">{r.value}</td>
              <td className="px-3 py-2">{r.severity}</td>
              <td className="px-3 py-2">{r.channel}</td>
              <td className="px-3 py-2">{r.destination}</td>
              <td className="px-3 py-2">{r.status}</td>
              <td className="px-3 py-2">
                {new Date(r.sent_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
