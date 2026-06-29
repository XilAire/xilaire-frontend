import PortalPageShell from "@/components/portal/PortalPageShell";

export default function InfrastructureOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="Infrastructure"
      title="Infrastructure Overview"
      description="Internal infrastructure operations landing page for projects, site work, estimating, scheduling, documents, and billing workflow."
      route="/infrastructure"
      actions={[
        { label: "Projects", href: "/infrastructure/projects" },
        { label: "Scheduling", href: "/infrastructure/scheduling" },
        { label: "Site Visits", href: "/infrastructure/site-visits" },
        { label: "Estimates", href: "/infrastructure/estimates" },
        { label: "Invoices", href: "/infrastructure/invoices" },
        { label: "Documents", href: "/infrastructure/documents" },
      ]}
      sections={[
        {
          title: "Operational command view",
          description:
            "This page will become the internal overview for infrastructure projects, scheduling, field activity, vendor coordination, estimating, and delivery progress.",
        },
        {
          title: "Next build target",
          description:
            "Add internal KPIs, project pipeline counts, upcoming site activity, estimate summaries, invoice snapshots, and document shortcuts.",
        },
      ]}
    />
  );
}