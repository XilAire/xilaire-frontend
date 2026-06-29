"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

import StatusPill from "../[id]/components/StatusPill";
import UpdateTaskStatusModal from "./modals/UpdateTaskStatusModal";
import { ChangeRequestTask } from "../types";

export default function ChangeRequestTasksAccordion({
  changeRequestId,
}: {
  changeRequestId: string;
}) {
  const [open, setOpen] = useState(true);
  const [tasks, setTasks] = useState<ChangeRequestTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] =
    useState<ChangeRequestTask | null>(null);

  useEffect(() => {
    const loadTasks = async () => {
      setLoading(true);

      const { data, error } = await supabasePlatform
        .from("tasks")
        .select(`
          id,
          title,
          status,
          due_date,
          assigned_to:assigned_to (
            full_name
          )
        `)
        .eq("parent_type", "change_request")
        .eq("parent_id", changeRequestId)
        .order("created_at");

      if (!error && data) {
        setTasks(
          data.map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            due_date: t.due_date,
            assigned_to_name: t.assigned_to?.full_name ?? null,
          }))
        );
      }

      setLoading(false);
    };

    loadTasks();
  }, [changeRequestId]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      {/* HEADER */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3
        bg-slate-50 dark:bg-slate-900 hover:bg-slate-100
        dark:hover:bg-slate-800 transition rounded-t-xl"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span className="font-medium text-slate-900 dark:text-white">
            Tasks ({tasks.length})
          </span>
        </div>
      </button>

      {/* BODY */}
      {open && (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {loading ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              Loading tasks…
            </div>
          ) : tasks.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">
              No tasks have been added to this change request yet.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="px-4 py-3 flex items-center justify-between
                hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {task.title}
                  </p>

                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    {task.assigned_to_name && (
                      <span>Assigned to {task.assigned_to_name}</span>
                    )}
                    {task.due_date && (
                      <span>
                        Due {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                <button onClick={() => setSelectedTask(task)}>
                  <StatusPill status={task.status} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* STATUS MODAL */}
      {selectedTask && (
        <UpdateTaskStatusModal
          open
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdated={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
