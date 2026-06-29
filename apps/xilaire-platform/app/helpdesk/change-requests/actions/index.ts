"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  TASK_FIELD_MAP,
  TaskEditableField,
  CreateChangeTaskInput,
} from "./task-field-map";

/* ---------------------------------------------------------
   APPROVAL STAGES (LOGICAL ORDER)
--------------------------------------------------------- */
const CHANGE_REQUEST_APPROVAL_STAGES = [
  "Planning Review",
  "Risk Assessment",
  "Security Review",
  "CAB Approval",
  "Scheduling Approval",
  "Implementation Approval",
  "Post-Implementation Review",
];

/* ---------------------------------------------------------
   HELPERS (LOCAL ONLY)
--------------------------------------------------------- */
function normalizeDate(value: any): string | null {
  if (!value) return null;

  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid date value");
  }

  return d.toISOString();
}

/* ---------------------------------------------------------
   CREATE CHANGE REQUEST
--------------------------------------------------------- */
export async function createChangeRequest(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const title = formData.get("title") as string;
  const description = formData.get("description") as string | null;
  const risk = (formData.get("risk") as string) ?? "medium";

  if (!title) throw new Error("Title is required");

  /* -------------------------
     INSERT CHANGE REQUEST
  ------------------------- */
  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      title,
      description,
      risk,
      status: "planning",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create change request");
  }

  /* -------------------------
     SEED APPROVAL STAGES
     (uses existing approvals table)
  ------------------------- */
  await supabase.from("approvals").insert(
    CHANGE_REQUEST_APPROVAL_STAGES.map((stage, index) => ({
      request_type: "change_request",
      request_id: data.id,
      outcome: index === 0 ? "pending" : null,
      notes: stage, // stage label
    }))
  );

  revalidatePath("/helpdesk/change-requests");

  redirect(`/helpdesk/change-requests/${data.id}`);
}

/* ---------------------------------------------------------
   CREATE CHANGE TASK
--------------------------------------------------------- */
export async function createChangeTask(input: CreateChangeTaskInput) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase.from("tasks").insert({
    parent_type: "change_request",
    parent_id: input.changeRequestId,

    title: input.summary,
    description: input.description ?? null,

    requires_approval: input.requiresApproval,
    approval_status: input.requiresApproval ? "pending" : null,

    assigned_to: input.assignedTo ?? null,
    start_date: normalizeDate(input.startDate),
    end_date: normalizeDate(input.endDate),

    implementation_plan: input.implementationPlan ?? null,
    pre_test_plan: input.preTestPlan ?? null,
    post_test_plan: input.postTestPlan ?? null,
    backout_plan: input.backoutPlan ?? null,

    outage_expected: input.outageExpected ?? false,

    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(`/helpdesk/change-requests/${input.changeRequestId}`);
}

/* ---------------------------------------------------------
   UPDATE CHANGE REQUEST FIELD
--------------------------------------------------------- */
export async function updateChangeRequest(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const id = formData.get("id") as string;
  const field = formData.get("field") as string;
  const value = formData.get("value") as string;

  const { data: oldRow } = await supabase
    .from("change_requests")
    .select(field)
    .eq("id", id)
    .single();

  await supabase
    .from("change_requests")
    .update({ [field]: value })
    .eq("id", id);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: `${field}_changed`,
    message: `${field} changed`,
    old_value: String(oldRow?.[field]),
    new_value: String(value),
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   UPDATE TASK FIELD
--------------------------------------------------------- */
export async function updateTaskField({
  taskId,
  field,
  value,
}: {
  taskId: string;
  field: TaskEditableField;
  value: any;
}) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const dbField = TASK_FIELD_MAP[field];
  if (!dbField) {
    throw new Error(`Invalid task field: ${field}`);
  }

  let normalizedValue: any = value;

  if (field === "startDate" || field === "endDate") {
    normalizedValue = normalizeDate(value);
  }

  if (field === "assignedTo") {
    if (value && typeof value !== "string") {
      throw new Error("Invalid assignee");
    }
    normalizedValue = value ?? null;
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .select("id, parent_id, title")
    .eq("id", taskId)
    .single();

  if (error || !task) throw new Error("Task not found");

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ [dbField]: normalizedValue })
    .eq("id", taskId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: task.parent_id,
    action: "task_field_updated",
    message: `Task "${task.title}" updated (${dbField})`,
    new_value: String(normalizedValue),
    actor_id: user.id,
  });

  revalidatePath(`/helpdesk/change-requests/${task.parent_id}`);
}

/* ---------------------------------------------------------
   UPDATE TASK STATUS
--------------------------------------------------------- */
export async function updateTaskStatus(
  taskId: string,
  nextStatus: "open" | "in_progress" | "completed" | "blocked"
) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: task, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (error || !task) throw new Error("Task not found");

  if (
    task.requires_approval &&
    task.approval_status === "pending" &&
    nextStatus !== "blocked"
  ) {
    throw new Error("Task requires approval");
  }

  const allowedTransitions: Record<string, string[]> = {
    open: ["in_progress", "blocked"],
    in_progress: ["completed", "blocked"],
    blocked: ["open"],
    completed: [],
  };

  if (!allowedTransitions[task.status]?.includes(nextStatus)) {
    throw new Error("Invalid task transition");
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({
      status: nextStatus,
      approved_at:
        task.requires_approval && nextStatus !== "blocked"
          ? new Date().toISOString()
          : null,
      approved_by:
        task.requires_approval && nextStatus !== "blocked"
          ? user.id
          : null,
    })
    .eq("id", taskId);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: task.parent_id,
    action: "task_status_changed",
    message: `Task "${task.title}" → ${nextStatus}`,
    actor_id: user.id,
  });

  revalidatePath(`/helpdesk/change-requests/${task.parent_id}`);
}
