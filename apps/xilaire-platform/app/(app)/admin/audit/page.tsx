import PortalPageShell from "@/components/portal/PortalPageShell";

export default function AdminAuditPage() {
  return (
    <PortalPageShell
      eyebrow="Administration"
      title="Audit"
      description="Review audit activity, change history, access events, and operational traceability."
      route="/admin/audit"
      sections={[
        {
          title: "Audit visibility",
          description:
            "This page will provide administrative audit review across user actions, approvals, and sensitive system changes.",
        },
        {
          title: "Next build target",
          description:
            "Add audit table, filtering, actor visibility, and event detail drilldown.",
        },
      ]}
    />
  );
}