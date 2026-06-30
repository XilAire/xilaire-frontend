"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getSignalExecution(signalId: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("signal_executions")
    .select("*")
    .eq("signal_id", signalId)
    .maybeSingle();

  if (error) {
    console.error("getSignalExecution failed", error);
    throw new Error("Failed to load execution");
  }

  return data;
}

