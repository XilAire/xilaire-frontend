"use server";

import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

export async function createChangeRequest(formData: FormData) {
  const supabase = createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const risk = formData.get("risk") as string;

  if (!title) {
    throw new Error("Title is required");
  }

  const { data, error } = await supabase
    .from("change_requests")
    .insert({
      title,
      description: description || null,
      risk: risk || "medium",
      status: "planning",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to create change request");
  }

  redirect(`/helpdesk/change-requests/${data.id}`);
}
