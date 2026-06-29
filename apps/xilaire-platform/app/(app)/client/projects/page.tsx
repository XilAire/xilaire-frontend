import PortalPageShell from "@/components/portal/PortalPageShell";

export default function ClientProjectsPage() {
  return (
    <PortalPageShell
      eyebrow="Client Portal"
      title="Client Projects"
      description="View project status, milestones, timelines, deliverables, and active implementation work."
      route="/client/projects"
      sections={[
        {
          title: "Project visibility",
          description:
            "This page will show scoped projects for the client org, including stage, owner, due dates, and workstream summaries.",
        },
        {
          title: "Next build target",
          description:
            "Connect project cards and detail views to infrastructure and managed-services project records.",
        },
      ]}
    />
  );
}