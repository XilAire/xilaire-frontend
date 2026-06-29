import PortalPageShell from "@/components/portal/PortalPageShell";

export default function OperationsAssignmentsPage() {
  return (
    <PortalPageShell
      eyebrow="Operations"
      title="Operations Assignments"
      description="Assignment board for internal ownership, technician routing, vendor coordination, and work distribution."
      route="/operations/assignments"
      sections={[
        {
          title: "Assignment workflow",
          description:
            "This page will display who owns each work item, current load balancing, and reassignment actions.",
        },
        {
          title: "Next build target",
          description:
            "Add assignee views, group routing, and overdue or unassigned indicators.",
        },
      ]}
    />
  );
}