import PortalPageShell from "@/components/portal/PortalPageShell";

export default function OperationsIntakePage() {
  return (
    <PortalPageShell
      eyebrow="Operations"
      title="Operations Intake"
      description="Central intake queue for new work, submissions, request triage, and routing into downstream workflows."
      route="/operations/intake"
      sections={[
        {
          title: "Intake queue",
          description:
            "This page will show new requests, triage status, requester context, and initial routing decisions.",
        },
        {
          title: "Next build target",
          description:
            "Add queue filters, priority indicators, assignment actions, and conversion into active work.",
        },
      ]}
    />
  );
}