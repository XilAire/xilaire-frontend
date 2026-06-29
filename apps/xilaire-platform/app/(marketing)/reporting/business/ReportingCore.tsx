import type { CoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";

export type ReportingCoreProps = {
  snapshot: CoreReportingSnapshot;
};

export default function ReportingCore({ snapshot }: ReportingCoreProps) {
  const { tickets } = snapshot;

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Reporting</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          High-level visibility into your environment and support activity.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Open Tickets</h3>
          <p className="mt-2 text-2xl font-bold">{tickets.open}</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Closed Tickets</h3>
          <p className="mt-2 text-2xl font-bold">{tickets.closed}</p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Created This Month</h3>
          <p className="mt-2 text-2xl font-bold">
            {tickets.createdThisMonth}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-6">
          <h3 className="font-semibold">Avg Resolution</h3>
          <p className="mt-2 text-2xl font-bold">
            {tickets.avgResolutionHours ?? "—"} hrs
          </p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Core reporting is informational and does not include enforcement,
        automation, or compliance auditing.
      </p>
    </section>
  );
}
