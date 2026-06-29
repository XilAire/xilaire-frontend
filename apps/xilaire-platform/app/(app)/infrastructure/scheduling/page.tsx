import PortalPageShell from "@/components/portal/PortalPageShell";

export default function InfrastructureSchedulingPage() {
  return (
    <PortalPageShell
      eyebrow="Infrastructure"
      title="Infrastructure Scheduling"
      description="Plan upcoming work, site scheduling, crew coordination, and calendar-based delivery tracking."
      route="/infrastructure/scheduling"
      sections={[
        {
          title: "Scheduling operations",
          description:
            "This page will manage appointments, install windows, technician scheduling, and availability coordination.",
        },
        {
          title: "Next build target",
          description:
            "Add a schedule board, date filtering, assignment workflows, and linkouts to project and site-visit details.",
        },
      ]}
    />
  );
}