import PortalPageShell from "@/components/portal/PortalPageShell";

export default function SystemLogsPage() {
  return (
    <PortalPageShell
      eyebrow="System"
      title="System Logs"
      description="Review platform logs, system events, processing diagnostics, and operational trace data."
      route="/system/logs"
      sections={[
        {
          title: "System diagnostics",
          description:
            "This page will centralize log review, job status visibility, and platform event diagnostics.",
        },
        {
          title: "Next build target",
          description:
            "Add log table, severity filtering, source grouping, and event detail drilldown.",
        },
      ]}
    />
  );
}