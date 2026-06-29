/* -------------------------------------------------
   Admin Activity / Audit Types
   SINGLE SOURCE OF TRUTH
------------------------------------------------- */

export type AdminActivityAction =
  | "user_updated"
  | "user_suspended"
  | "user_activated"
  | "role_updated"
  | "password_reset"
  | "user_invited"
  | "user_deleted"
  | "user_restored"
  | string;

/**
 * Value before / after an action.
 * Can be a primitive OR an object diff.
 */
export type AuditValue =
  | string
  | number
  | boolean
  | Record<string, any>
  | null;

/**
 * Canonical admin audit record
 * MUST match database rows
 */
export interface AdminActivity {
  id: string;

  actor_id: string | null;
  target_user_id: string;
  org_id: string | null;

  action: AdminActivityAction;

  old_value: AuditValue;
  new_value: AuditValue;

  created_at: string;
}

/**
 * Backward compatibility alias
 * (prevents breaking older imports)
 */
export type AdminAuditLog = AdminActivity;
