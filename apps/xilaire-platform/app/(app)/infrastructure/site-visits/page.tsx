import PortalPageShell from "@/components/portal/PortalPageShell";

export default function InfrastructureSiteVisitsPage() {
  return (
    <PortalPageShell
      eyebrow="Infrastructure"
      title="Infrastructure Site Visits"
      description="Track upcoming and completed site visits, surveys, inspections, and field notes."
      route="/infrastructure/site-visits"
      sections={[
        {
          title: "Field operations",
          description:
            "This page will hold site visit records, visit status, assigned staff or vendors, and site-specific notes.",
        },
        {
          title: "Next build target",
          description:
            "Add visit status cards, scheduling integration, and photo or attachment support.",
        },
      ]}
    />
  );
}