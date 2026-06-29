import PortalPageShell from "@/components/portal/PortalPageShell";

export default function ClientDocumentsPage() {
  return (
    <PortalPageShell
      eyebrow="Client Portal"
      title="Client Documents"
      description="Central document workspace for shared files, contracts, proposals, reports, and implementation deliverables."
      route="/client/documents"
      sections={[
        {
          title: "Document library",
          description:
            "This page will expose files the client is allowed to access, grouped by project, billing, onboarding, and support category.",
        },
        {
          title: "Next build target",
          description:
            "Connect file metadata, secure downloads, and folder-level filtering to your org-scoped document model.",
        },
      ]}
    />
  );
}