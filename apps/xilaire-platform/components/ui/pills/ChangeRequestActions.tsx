"use client";

import ActionPill from "@/components/ui/ActionPill";   // correct path
import { useRouter } from "next/navigation";

export default function ChangeRequestActions({
  requestId,
  updateStatus,
  deleteRequest,
}: {
  requestId: string;
  updateStatus: (newStatus: string) => void;  // Must return void
  deleteRequest: () => void;                  // Must return void
}) {
  const router = useRouter();

  const options = [
    {
      label: "Create New",
      onClick: () => router.push("/helpdesk/change-requests/new"),
    },
    {
      label: "Change Status",
      submenu: [
        { label: "Planning", onClick: () => updateStatus("planning") },
        { label: "Pending Approval", onClick: () => updateStatus("pending") },
        { label: "Approved", onClick: () => updateStatus("approved") },
        { label: "Scheduled", onClick: () => updateStatus("scheduled") },
        { label: "Implementing", onClick: () => updateStatus("implementing") },
        { label: "Completed", onClick: () => updateStatus("completed") },
        { label: "Rejected", onClick: () => updateStatus("rejected") },
      ],
    },
    {
      label: "Add Comment",
      onClick: () =>
        document.getElementById("comment-box")?.scrollIntoView({
          behavior: "smooth",
        }),
    },
    { divider: true, label: "cr-divider" },
    {
      label: "Delete Change Request",
      destructive: true,
      onClick: () => deleteRequest(), // void wrapper
    },
  ];

  return <ActionPill label="Actions" items={options} />;
}
