"use client";

import { useTransition } from "react";
import { updateTaskStatus } from "@/app/helpdesk/change-requests/actions";
import { Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  blocked: "Blocked",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["in_progress", "blocked"],
  in_progress: ["completed", "blocked"],
  blocked: ["open"],
  completed: [],
};

export default function TaskStatusControl({
  taskId,
  currentStatus,
  userId,
}: {
  taskId: string;
  currentStatus: "open" | "in_progress" | "completed" | "blocked";
  userId: string;
}) {
  const [isPending, startTransition] = useTransition();

  const nextStatuses = STATUS_TRANSITIONS[currentStatus] || [];

  if (nextStatuses.length === 0) {
    return (
      <p className="text-sm text-slate-400">
        Status is final
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((next) => (
        <button
          key={next}
          disabled={isPending}
          onClick={() =>
            startTransition(() =>
              updateTaskStatus(taskId, next as any, userId)
            )
          }
          className="inline-flex items-center gap-2
            px-3 py-1 rounded border border-slate-600
            text-sm text-slate-200
            hover:bg-slate-800
            disabled:opacity-50"
        >
          {isPending && <Loader2 size={14} className="animate-spin" />}
          {STATUS_LABELS[next]}
        </button>
      ))}
    </div>
  );
}
