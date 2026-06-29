import PortalPageShell from "@/components/portal/PortalPageShell";

export default function AdminOrganizationsPage() {
  return (
    <PortalPageShell
      eyebrow="Administration"
      title="Organizations"
      description="Manage organizations, tenant alignment, organizational metadata, and operational grouping."
      route="/admin/organizations"
      sections={[
        {
          title: "Organization administration",
          description:
            "This page will hold org search, tenant metadata, contact context, and relationship mapping.",
        },
        {
          title: "Next build target",
          description:
            "Add org table, profile counts, service relationships, and org detail drilldown.",
        },
      ]}
    />
  );
}