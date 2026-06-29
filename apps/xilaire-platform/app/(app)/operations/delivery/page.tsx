import PortalPageShell from "@/components/portal/PortalPageShell";

export default function OperationsDeliveryPage() {
  return (
    <PortalPageShell
      eyebrow="Operations"
      title="Operations Delivery"
      description="Track final delivery state, completion progress, customer handoff, and closure readiness."
      route="/operations/delivery"
      sections={[
        {
          title: "Delivery pipeline",
          description:
            "This page will show work approaching completion, handoff state, and closure requirements.",
        },
        {
          title: "Next build target",
          description:
            "Add completion tracking, final QA checkpoints, and downstream finance and client notifications.",
        },
      ]}
    />
  );
}