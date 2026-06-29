import PortalPageShell from "@/components/portal/PortalPageShell";

export default function SystemOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="System"
      title="System Overview"
      description="System administration landing page for entitlements, settings, and platform-level logs."
      route="/system"
      actions={[
        { label: "Entitlements", href: "/system/entitlements" },
        { label: "Settings", href: "/system/settings" },
        { label: "Logs", href: "/system/logs" },
      ]}
      sections={[
        {
          title: "System control",
          description:
            "This page will become the highest-level operational view for entitlements, settings, and platform diagnostics.",
        },
        {
          title: "Next build target",
          description:
            "Add entitlement summaries, platform health indicators, and recent system event visibility.",
        },
      ]}
    />
  );
}