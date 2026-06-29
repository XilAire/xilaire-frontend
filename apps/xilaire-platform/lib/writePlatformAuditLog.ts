import { createServerSupabaseClient } from "@/lib/supabaseServer";

type PlatformAuditInput = {
  action: string;
  actor: string;
  target_type?: string;
  target_id?: string;
  metadata?: Record<string, any>;
};

export async function writePlatformAuditLog(input: PlatformAuditInput) {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("platform_audit_logs")
    .insert({
      action: input.action,
      actor: input.actor,
      target_type: input.target_type ?? null,
      target_id: input.target_id ?? null,
      metadata: input.metadata ?? {},
    });

  if (error) {
    console.error("Failed to write platform audit log", error);
  }
}
