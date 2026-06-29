import PortalPageShell from "@/components/portal/PortalPageShell";

export default function AdminVendorsPage() {
  return (
    <PortalPageShell
      eyebrow="Administration"
      title="Vendors"
      description="Administrative vendor oversight for onboarding status, compliance state, and vendor record management."
      route="/admin/vendors"
      sections={[
        {
          title: "Vendor oversight",
          description:
            "This page will manage vendor records, onboarding stage, compliance readiness, and profile linkage.",
        },
        {
          title: "Next build target",
          description:
            "Add vendor table, onboarding state filters, compliance flags, and direct vendor detail links.",
        },
      ]}
    />
  );
}