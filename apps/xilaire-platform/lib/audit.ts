import { supabaseAdmin } from "@/lib/supabaseAdmin";

interface AuditParams {
  actorId: string;
  targetId: string;
  orgId: string | null;

  action: string;
  field?: string;
  oldValue?: string | null;
  newValue?: string | null;
}

export async function logProfileAudit({
  actorId,
  targetId,
  orgId,
  action,
  field,
  oldValue,
  newValue,
}: AuditParams) {
  await supabaseAdmin.from("profile_audit_logs").insert({
    actor_id: actorId,
    target_id: targetId,
    org_id: orgId,
    action,
    field,
    old_value: oldValue ?? null,
    new_value: newValue ?? null,
  });
}
