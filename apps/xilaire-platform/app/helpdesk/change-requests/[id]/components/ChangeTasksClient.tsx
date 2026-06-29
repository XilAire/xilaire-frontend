"use client";

import Link from "next/link";
import { PlusCircle, User } from "lucide-react";
import StatusPill from "./StatusPill";

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  created_at?: string | null;

  // assignment
  assigned_to?: string | null;
  assigned_to_name?: string | null;
}

export default function ChangeTasksClient({
  changeId,
  initialTasks,
}: {
  changeId: string;
  initialTasks: Task[];
}) {
  const tasks = initialTasks ?? [];

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Tasks ({tasks.length})
        </h3>

        <Link
          href={`/helpdesk/change-requests/${changeId}/tasks/new`}
          className="
            inline-flex items-center gap-2 text-sm
            bg-blue-600 hover:bg-blue-700
            text-white px-3 py-1.5 rounded
          "
        >
          <PlusCircle size={14} />
          Add Task
        </Link>
      </div>

      {/* EMPTY STATE */}
      {tasks.length === 0 && (
        <p className="text-sm text-slate-400">
          No tasks have been created for this change request yet.
        </p>
      )}

      {/* TASK LIST */}
      <ul className="space-y-3">
        {tasks.map((task) => (
          <li key={task.id}>
            <Link
              href={`/helpdesk/change-requests/${changeId}/tasks/${task.id}`}
              className="
                block rounded-lg border border-slate-700
                bg-slate-900/40 p-4
                hover:bg-slate-800/60 transition
              "
            >
              <div className="flex justify-between gap-6">
                {/* LEFT */}
                <div className="space-y-2">
                  <h4 className="font-medium text-white">
                    {task.title}
                  </h4>

                  {task.description && (
                    <p className="text-sm text-slate-400">
                      {task.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    {/* CREATED */}
                    <span>
                      Created{" "}
                      {task.created_at
                        ? new Date(task.created_at).toLocaleString()
                        : "—"}
                    </span>

                    {/* ASSIGNED */}
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      {task.assigned_to_name || "Unassigned"}
                    </span>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-start">
                  <StatusPill status={task.status} />
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
