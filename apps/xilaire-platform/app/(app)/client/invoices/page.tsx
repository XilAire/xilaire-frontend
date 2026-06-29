import PortalPageShell from "@/components/portal/PortalPageShell";

export default function ClientInvoicesPage() {
  return (
    <PortalPageShell
      eyebrow="Client Portal"
      title="Client Invoices"
      description="Review invoices, balances, payment activity, and billing history for the client account."
      route="/client/invoices"
      sections={[
        {
          title: "Billing visibility",
          description:
            "This page will show invoice status, due dates, aging, payment history, and downloadable invoice records.",
        },
        {
          title: "Next build target",
          description:
            "Connect invoice data to org-scoped finance records and payment-state indicators.",
        },
      ]}
    />
  );
}