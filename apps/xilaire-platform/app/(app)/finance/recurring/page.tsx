import PortalPageShell from "@/components/portal/PortalPageShell";

export default function FinanceRecurringPage() {
  return (
    <PortalPageShell
      eyebrow="Finance"
      title="Recurring Billing"
      description="Monitor recurring revenue, billing schedules, renewals, and subscription-based service activity."
      route="/finance/recurring"
      sections={[
        {
          title: "Recurring revenue",
          description:
            "This page will show active recurring items, renewal timing, failed cycles, and billing health.",
        },
        {
          title: "Next build target",
          description:
            "Add schedule visibility, MRR-style summaries, and billing failure indicators.",
        },
      ]}
    />
  );
}