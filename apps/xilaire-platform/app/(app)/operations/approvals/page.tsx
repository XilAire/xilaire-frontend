import PortalPageShell from "@/components/portal/PortalPageShell";

export default function OperationsApprovalsPage() {
  return (
    <PortalPageShell
      eyebrow="Operations"
      title="Operations Approvals"
      description="Review approvals, decision queues, escalations, and approval history for operational work."
      route="/operations/approvals"
      sections={[
        {
          title: "Approval workflow",
          description:
            "This page will hold pending approvals, approval state, blockers, and decision history.",
        },
        {
          title: "Next build target",
          description:
            "Add approve and reject actions, notes, audit entries, and SLA indicators.",
        },
      ]}
    />
  );
}