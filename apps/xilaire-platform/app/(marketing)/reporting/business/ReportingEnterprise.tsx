import type { CoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";

export type ReportingEnterpriseProps = {
  snapshot: CoreReportingSnapshot;
};

export default function ReportingEnterprise({
  snapshot,
}: ReportingEnterpriseProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Enterprise Reporting</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Executive dashboards, compliance metrics, and SLA enforcement.
        </p>
      </header>

      <pre className="rounded-lg border bg-slate-50 p-4 text-sm">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </section>
  );
}
