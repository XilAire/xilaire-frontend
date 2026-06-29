import PortalPageShell from "@/components/portal/PortalPageShell";

export default function AdminOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="Administration"
      title="Administration Overview"
      description="Administrative control surface for users, organizations, vendors, compliance, and audit activity."
      route="/admin"
      actions={[
        { label: "Users", href: "/admin/users" },
        { label: "Organizations", href: "/admin/organizations" },
        { label: "Vendors", href: "/admin/vendors" },
        { label: "Compliance", href: "/admin/compliance" },
        { label: "Audit", href: "/admin/audit" },
      ]}
      sections={[
        {
          title: "Administrative control",
          description:
            "This page will become the main overview for governance, user administration, and platform oversight.",
        },
        {
          title: "Next build target",
          description:
            "Add user counts, org summaries, vendor compliance indicators, and audit trend snapshots.",
        },
      ]}
    />
  );
}