"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { revalidatePath } from "next/cache";

export async function approveChangeRequestStage(
  approvalId: string,
  changeRequestId: string
) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Approve current stage
  await supabase
    .from("approvals")
    .update({
      outcome: "approved",
      approver_id: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  // Activate next stage
  const { data: approvals } = await supabase
    .from("approvals")
    .select("*")
    .eq("request_type", "change_request")
    .eq("request_id", changeRequestId)
    .order("created_at");

  const next = approvals?.find((a) => !a.outcome);
  if (next) {
    await supabase
      .from("approvals")
      .update({ outcome: "pending" })
      .eq("id", next.id);
  } else {
    await supabase
      .from("change_requests")
      .update({ status: "approved" })
      .eq("id", changeRequestId);
  }

  revalidatePath(`/helpdesk/change-requests/${changeRequestId}`);
}

export async function rejectChangeRequestStage(
  approvalId: string,
  changeRequestId: string,
  notes: string
) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  await supabase
    .from("approvals")
    .update({
      outcome: "rejected",
      approver_id: user.id,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", approvalId);

  await supabase
    .from("change_requests")
    .update({ status: "rejected" })
    .eq("id", changeRequestId);

  revalidatePath(`/helpdesk/change-requests/${changeRequestId}`);
}
