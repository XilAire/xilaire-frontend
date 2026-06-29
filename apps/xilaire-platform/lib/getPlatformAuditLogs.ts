import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * PlatformAuditLog
 * - Service-role read
 * - Bypasses RLS intentionally
 * - Admin-only consumption
 */
export type PlatformAuditLog = {
  id: string;
  action: string;
  actor: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
};

/**
 * getPlatformAuditLogs
 * ENTERPRISE-GRADE READ
 */
export async function getPlatformAuditLogs(): Promise<PlatformAuditLog[]> {
  const { data, error } = await supabaseAdmin
    .from("platform_audit_logs")
    .select(
      `
        id,
        action,
        actor,
        target_type,
        target_id,
        metadata,
        created_at
      `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("❌ Failed to fetch platform audit logs", error);
    return [];
  }

  return data ?? [];
}
