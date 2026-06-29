import PortalPageShell from "@/components/portal/PortalPageShell";

export default function OperationsOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="Operations"
      title="Operations Overview"
      description="Internal operations command page for intake, assignments, approvals, and delivery workflow."
      route="/operations"
      actions={[
        { label: "Intake Queue", href: "/operations/intake" },
        { label: "Assignments", href: "/operations/assignments" },
        { label: "Approvals", href: "/operations/approvals" },
        { label: "Delivery", href: "/operations/delivery" },
      ]}
      sections={[
        {
          title: "Operational visibility",
          description:
            "This page will become the internal workflow hub for service intake, dispatch, ownership, and completion tracking.",
        },
        {
          title: "Next build target",
          description:
            "Add workload KPIs, queues by stage, and assignment health indicators for operations teams.",
        },
      ]}
    />
  );
}