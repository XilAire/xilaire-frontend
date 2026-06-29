import PortalPageShell from "@/components/portal/PortalPageShell";

export default function ClientOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="Client Portal"
      title="Client Overview"
      description="Primary client-facing workspace for service visibility, requests, projects, estimates, documents, and billing activity."
      route="/client"
      actions={[
        { label: "Requests", href: "/client/requests" },
        { label: "Projects", href: "/client/projects" },
        { label: "Estimates", href: "/client/estimates" },
        { label: "Invoices", href: "/client/invoices" },
        { label: "Documents", href: "/client/documents" },
      ]}
      sections={[
        {
          title: "Client experience",
          description:
            "This page will become the client landing page for requests, projects, estimate approvals, invoices, and shared files.",
        },
        {
          title: "Next build target",
          description:
            "Wire org-scoped client metrics, recent activity, billing summaries, and document visibility into this overview.",
        },
      ]}
    />
  );
}