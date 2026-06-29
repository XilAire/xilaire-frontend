import PortalPageShell from "@/components/portal/PortalPageShell";

export default function FinanceVendorBillsPage() {
  return (
    <PortalPageShell
      eyebrow="Finance"
      title="Vendor Bills"
      description="Track vendor payables, bill status, aging, and reconciliation activity."
      route="/finance/vendor-bills"
      sections={[
        {
          title: "Payables workflow",
          description:
            "This page will hold vendor bill records, due dates, approval status, and reconciliation support.",
        },
        {
          title: "Next build target",
          description:
            "Add bill table, status filters, due-date highlighting, and payable detail views.",
        },
      ]}
    />
  );
}