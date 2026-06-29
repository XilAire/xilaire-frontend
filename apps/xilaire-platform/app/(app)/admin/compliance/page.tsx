import PortalPageShell from "@/components/portal/PortalPageShell";

export default function AdminCompliancePage() {
  return (
    <PortalPageShell
      eyebrow="Administration"
      title="Compliance"
      description="Track compliance requirements, missing records, expiration monitoring, and governance status."
      route="/admin/compliance"
      sections={[
        {
          title: "Compliance oversight",
          description:
            "This page will surface vendor and platform compliance issues, expirations, and readiness gaps.",
        },
        {
          title: "Next build target",
          description:
            "Add compliance status widgets, expiration reporting, and remediation queues.",
        },
      ]}
    />
  );
}