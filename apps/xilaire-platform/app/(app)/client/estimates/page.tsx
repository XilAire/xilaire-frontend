import PortalPageShell from "@/components/portal/PortalPageShell";

export default function ClientEstimatesPage() {
  return (
    <PortalPageShell
      eyebrow="Client Portal"
      title="Client Estimates"
      description="Review estimates, proposals, approvals, and estimate lifecycle activity."
      route="/client/estimates"
      sections={[
        {
          title: "Estimate workflow",
          description:
            "This page will surface draft, sent, approved, and rejected estimates tied to the client organization.",
        },
        {
          title: "Next build target",
          description:
            "Wire estimate summary cards, approval actions, and attachment access into the client experience.",
        },
      ]}
    />
  );
}