import PortalPageShell from "@/components/portal/PortalPageShell";

export default function FinanceOverviewPage() {
  return (
    <PortalPageShell
      eyebrow="Finance"
      title="Finance Overview"
      description="Finance operations landing page for invoices, vendor bills, recurring billing, and profitability analysis."
      route="/finance"
      actions={[
        { label: "Invoices", href: "/finance/invoices" },
        { label: "Vendor Bills", href: "/finance/vendor-bills" },
        { label: "Recurring Billing", href: "/finance/recurring" },
        { label: "Profitability", href: "/finance/profitability" },
      ]}
      sections={[
        {
          title: "Finance command view",
          description:
            "This page will become the core internal billing and margin overview for XilAire operations.",
        },
        {
          title: "Next build target",
          description:
            "Add invoice aging, vendor payable views, recurring revenue summaries, and profitability cards.",
        },
      ]}
    />
  );
}