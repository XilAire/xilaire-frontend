"use client";

import { useTransition } from "react";
import ChangeRequestActions from "@/components/ui/pills/ChangeRequestActions";

import {
  deleteChangeRequest,
  updateChangeRequestStatus
} from "./actions";   // ✅ FIXED — load server actions from actions.ts

export default function ChangeRequestActionsWrapper({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteChangeRequest(id);
    });
  };

  const handleUpdateStatus = (newStatus: string) => {
    startTransition(async () => {
      await updateChangeRequestStatus(id, newStatus);
    });
  };

  return (
    <ChangeRequestActions
      requestId={id}
      deleteRequest={handleDelete}
      updateStatus={handleUpdateStatus}
    />
  );
}
