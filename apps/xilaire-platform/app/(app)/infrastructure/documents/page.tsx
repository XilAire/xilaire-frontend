import PortalPageShell from "@/components/portal/PortalPageShell";

export default function InfrastructureDocumentsPage() {
  return (
    <PortalPageShell
      eyebrow="Infrastructure"
      title="Infrastructure Documents"
      description="Internal document library for estimates, vendor files, site records, contracts, and project attachments."
      route="/infrastructure/documents"
      sections={[
        {
          title: "Document operations",
          description:
            "This page will organize project files, site attachments, vendor compliance docs, and estimate artifacts.",
        },
        {
          title: "Next build target",
          description:
            "Add filtered document grids, secure preview and download, and source links to project or vendor records.",
        },
      ]}
    />
  );
}