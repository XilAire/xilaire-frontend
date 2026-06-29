import PortalPageShell from "@/components/portal/PortalPageShell";

export default function VendorOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="Vendor Portal"
      title="Vendor Overview"
      description="Primary vendor workspace for assigned projects, site visits, estimates, invoices, documents, and vendor profile management."
      route="/vendor"
      actions={[
        { label: "Projects", href: "/vendor/projects" },
        { label: "Site Visits", href: "/vendor/site-visits" },
        { label: "Estimates", href: "/vendor/estimates" },
        { label: "Invoices", href: "/vendor/invoices" },
        { label: "Documents", href: "/vendor/documents" },
        { label: "Profile", href: "/vendor/profile" },
      ]}
      sections={[
        {
          title: "Vendor workspace",
          description:
            "This page will become the vendor landing page for assigned work, estimate activity, invoice visibility, compliance documents, and profile readiness.",
        },
        {
          title: "Next build target",
          description:
            "Add vendor-scoped metrics, assigned project summaries, pending estimates, invoice snapshots, document shortcuts, and onboarding status visibility.",
        },
      ]}
    />
  );
}