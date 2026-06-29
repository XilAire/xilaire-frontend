import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

import TaskStatusPill from "./components/TaskStatusPill";
import TaskActionPill from "./components/TaskActionPill";
import TaskHeader from "./components/TaskHeader";
import TaskTabs from "./components/TaskTabs";
import TaskDetailsLeft from "./components/TaskDetailsLeft";
import TaskDetailsRight from "./components/TaskDetailsRight";
import TaskAttachments from "./components/TaskAttachments";
import TaskComments from "./components/TaskComments";
import TaskTimeline from "./components/TaskTimeline";
import TaskStatusControl from "./components/TaskStatusControl";


interface TaskPageProps {
  params: {
    id: string;      // changeRequestId
    taskId: string; // taskId
  };
  searchParams: {
    tab?: string;
  };
}

export default async function TaskDetailsPage({
  params,
  searchParams,
}: TaskPageProps) {
  const supabase = createServerSupabaseClient();
  const activeTab = searchParams.tab || "details";

  /* ----------------------------------------
     LOAD TASK
  ---------------------------------------- */
  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", params.taskId)
    .single();

  if (error || !task) return notFound();

  /* ----------------------------------------
     LOAD PROFILES
  ---------------------------------------- */
  const profileIds = [
    task.created_by,
    task.assigned_to,
    task.approved_by,
  ].filter(Boolean) as string[];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", profileIds);

  const nameFor = (id?: string | null) =>
    profiles?.find((p) => p.id === id)?.full_name || "Unknown";

  const hydratedTask = {
    ...task,
    createdByName: nameFor(task.created_by),
    assignedToName: nameFor(task.assigned_to),
    approvedByName: nameFor(task.approved_by),
  };

  /* ----------------------------------------
     RENDER
  ---------------------------------------- */
  return (
    <div className="p-6 space-y-6">
      {/* STATUS */}
      <div className="flex items-center gap-4">
      <TaskStatusPill status={hydratedTask.status} />

      <TaskStatusControl
        taskId={params.taskId}
        currentStatus={hydratedTask.status}
        userId={task.created_by}
      />
      </div>


      {/* HEADER + ACTIONS */}
      <div className="flex items-center justify-between">
        <TaskHeader task={hydratedTask} />

        {/* 🔑 REQUIRED FIX — PASS userId */}
        <TaskActionPill
          task={hydratedTask}
          userId={task.created_by}
        />
      </div>

      {/* TABS */}
      <TaskTabs
        id={params.taskId}
        changeId={params.id}
        activeTab={activeTab}
      />

      {/* TAB CONTENT */}
      <div className="mt-6 space-y-6">
        {activeTab === "details" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TaskDetailsLeft task={hydratedTask} />
            <TaskDetailsRight task={hydratedTask} />
          </div>
        )}

        {activeTab === "attachments" && (
          <TaskAttachments taskId={params.taskId} />
        )}

        {activeTab === "comments" && (
          <TaskComments taskId={params.taskId} />
        )}

        {activeTab === "timeline" && (
          <TaskTimeline task={hydratedTask} />
        )}
      </div>
    </div>
  );
}
