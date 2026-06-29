"use server";

import { revalidatePath } from "next/cache";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

/* ---------------------------------------------------------
   Helper: Remove undefined fields
--------------------------------------------------------- */
function cleanPayload(payload: any) {
  return Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined)
  );
}

/* ---------------------------------------------------------
   DELETE CHANGE REQUEST
--------------------------------------------------------- */
export async function deleteChangeRequest(id: string) {
  const supabase = supabasePlatform;

  await supabase
    .from("change_request_attachments")
    .delete()
    .eq("request_id", id);

  await supabase
    .from("change_request_activity")
    .delete()
    .eq("change_request_id", id);

  const { error } = await supabase
    .from("change_requests")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/helpdesk/change-requests");
}

/* ---------------------------------------------------------
   UPDATE STATUS (WITH TASK GUARD)
--------------------------------------------------------- */
export async function updateChangeRequestStatus(
  id: string,
  newStatus: string
) {
  const supabase = supabasePlatform;

  /* 🔒 PRE-CHECK: block completion if tasks are open */
  if (newStatus === "completed") {
    const { data: openTasks, error: taskError } = await supabase
      .from("tasks")
      .select("id")
      .eq("parent_type", "change_request")
      .eq("parent_id", id)
      .neq("status", "completed");

    if (taskError) {
      throw new Error("Failed to validate tasks before completion.");
    }

    if (openTasks && openTasks.length > 0) {
      throw new Error(
        `Cannot complete change request. ${openTasks.length} task(s) still open.`
      );
    }
  }

  /* ✅ SAFE TO UPDATE */
  const { error } = await supabase
    .from("change_requests")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "status_changed",
    message: `Status updated to "${newStatus}".`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   UPDATE CHANGE REQUEST (FULL MODAL)
--------------------------------------------------------- */
export async function updateChangeRequest(id: string, payload: any) {
  const supabase = supabasePlatform;
  const cleaned = cleanPayload(payload);

  const { error } = await supabase
    .from("change_requests")
    .update(cleaned)
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "updated",
    message: `Change request updated.`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   APPROVE REQUEST
--------------------------------------------------------- */
export async function approveChangeRequest(
  id: string,
  approverId: string,
  notes: string
) {
  const supabase = supabasePlatform;

  const { error } = await supabase
    .from("change_requests")
    .update({
      approval_status: "approved",
      approval_notes: notes || null,
      approved_at: new Date().toISOString(),
      approved_by: approverId,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "approved",
    message: `Change request approved.`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   REJECT REQUEST
--------------------------------------------------------- */
export async function rejectChangeRequest(
  id: string,
  approverId: string,
  notes: string
) {
  const supabase = supabasePlatform;

  const { error } = await supabase
    .from("change_requests")
    .update({
      approval_status: "rejected",
      approval_notes: notes || null,
      approved_at: new Date().toISOString(),
      approved_by: approverId,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "rejected",
    message: `Change request rejected.`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   REQUEST APPROVAL
--------------------------------------------------------- */
export async function requestApproval(id: string, requestorId: string) {
  const supabase = supabasePlatform;

  const { error } = await supabase
    .from("change_requests")
    .update({
      approval_status: "pending",
      approved_at: null,
      approved_by: null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "approval_requested",
    message: `Approval requested.`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   REOPEN REQUEST
--------------------------------------------------------- */
export async function reopenChangeRequest(id: string, userId: string) {
  const supabase = supabasePlatform;

  const { error } = await supabase
    .from("change_requests")
    .update({
      approval_status: "pending",
      reopened_at: new Date().toISOString(),
      approved_at: null,
      approved_by: null,
    })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "reopened",
    message: `Change request reopened.`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   APPLY TEMPLATE
--------------------------------------------------------- */
export async function applyTemplateToChangeRequest(
  id: string,
  templateId: string
) {
  const supabase = supabasePlatform;

  const { data: template, error: tError } = await supabase
    .from("change_templates")
    .select("*")
    .eq("id", templateId)
    .single();

  if (tError || !template) throw new Error("Template not found.");

  const updates = {
    title: template.default_title,
    description: template.default_description,
    change_type: template.default_change_type,
    risk_level: template.default_risk_level,
    implementation_plan: template.default_implementation_plan,
    rollback_plan: template.default_rollback_plan,
    assigned_to: template.auto_assign_technician,
    approver_id: template.auto_assign_approver,
    sla_due_at: template.auto_sla_interval
      ? new Date(Date.now() + msFromInterval(template.auto_sla_interval))
      : null,
    template_id: template.id,
  };

  const cleaned = cleanPayload(updates);

  const { error } = await supabase
    .from("change_requests")
    .update(cleaned)
    .eq("id", id);

  if (error) throw new Error(error.message);

  await supabase.from("change_request_activity").insert({
    change_request_id: id,
    action: "template_applied",
    message: `Template "${template.name}" applied.`,
  });

  revalidatePath(`/helpdesk/change-requests/${id}`);
}

/* ---------------------------------------------------------
   Convert Postgres INTERVAL → ms
--------------------------------------------------------- */
function msFromInterval(pgInterval: string) {
  const parts = pgInterval.split(" ");
  const num = Number(parts[0]);
  const unit = parts[1];

  switch (unit) {
    case "day":
    case "days":
      return num * 24 * 60 * 60 * 1000;
    case "hour":
    case "hours":
      return num * 60 * 60 * 1000;
    case "minute":
    case "minutes":
      return num * 60 * 1000;
    default:
      return 0;
  }
}

/* ---------------------------------------------------------
   LOAD ALL TEMPLATES
--------------------------------------------------------- */
export async function loadTemplates() {
  const supabase = supabasePlatform;

  const { data, error } = await supabase
    .from("change_templates")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return data;
}

/* ---------------------------------------------------------
   FETCH TECHNICIANS + APPROVERS
--------------------------------------------------------- */
export async function fetchProfilesForModal() {
  const supabase = supabasePlatform;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .in("role", ["technician", "approver", "admin"]);

  if (error || !data) return { technicians: [], approvers: [] };

  return {
    technicians: data.filter((u) => u.role === "technician"),
    approvers: data.filter((u) =>
      ["approver", "admin"].includes(u.role)
    ),
  };
}
