import PortalPageShell from "@/components/portal/PortalPageShell";

export default function ClientRequestsPage() {
  return (
    <PortalPageShell
      eyebrow="Client Portal"
      title="Client Requests"
      description="Track and submit client-facing service requests, support needs, and intake activity."
      route="/client/requests"
      sections={[
        {
          title: "Request queue",
          description:
            "This route will hold submitted requests, status, priority, ownership, and SLA progress for the client organization.",
        },
        {
          title: "Next build target",
          description:
            "Connect this page to org-scoped request records and provide create, filter, and detail actions.",
        },
      ]}
    />
  );
}