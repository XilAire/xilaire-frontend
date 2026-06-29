import type { CoreReportingSnapshot } from "@/lib/reporting/getCoreReportingSnapshot";

export type ReportingAdvancedProps = {
  snapshot: CoreReportingSnapshot;
};

export default function ReportingAdvanced({ snapshot }: ReportingAdvancedProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 space-y-10">
      <header>
        <h1 className="text-3xl font-bold">Advanced Reporting</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Deeper operational visibility, trends, and performance metrics.
        </p>
      </header>

      {/* For now reuse Core metrics */}
      <pre className="rounded-lg border bg-slate-50 p-4 text-sm">
        {JSON.stringify(snapshot, null, 2)}
      </pre>
    </section>
  );
}
