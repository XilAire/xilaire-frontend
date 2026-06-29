import PortalPageShell from "@/components/portal/PortalPageShell";

export default function FinanceProfitabilityPage() {
  return (
    <PortalPageShell
      eyebrow="Finance"
      title="Profitability"
      description="Analyze profitability, revenue versus cost, service margins, and project financial performance."
      route="/finance/profitability"
      sections={[
        {
          title: "Margin intelligence",
          description:
            "This page will become the margin and profitability view across services, projects, and vendor-driven delivery.",
        },
        {
          title: "Next build target",
          description:
            "Add gross margin cards, project-level profit views, and service-line profitability analysis.",
        },
      ]}
    />
  );
}