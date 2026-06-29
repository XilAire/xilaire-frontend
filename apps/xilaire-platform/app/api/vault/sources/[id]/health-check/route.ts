import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function getAccessOrgId(access: unknown): string {
  const record = access as Record<string, unknown> | null;

  const orgId =
    normalizeString(record?.orgId) ??
    normalizeString(record?.org_id) ??
    normalizeString(record?.targetOrgId) ??
    normalizeString(record?.target_org_id) ??
    normalizeString(
      record?.profile && typeof record.profile === "object"
        ? (record.profile as Record<string, unknown>).org_id
        : null
    ) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).org_id
        : null
    );

  if (!orgId) {
    throw new Error("Unable to resolve Vault org context from access object.");
  }

  return orgId;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: sourceId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const supabase = await getVaultAdminClient();

    const { data: source, error: sourceError } = await supabase
      .from("vault_sources")
      .select("*")
      .eq("id", sourceId)
      .eq("org_id", orgId)
      .maybeSingle();

    if (sourceError) {
      return jsonError("Failed to load Vault source.", 500, {
        details: sourceError.message,
      });
    }

    if (!source) {
      return jsonError("Vault source was not found.", 404);
    }

    const { data: mailboxes, error: mailboxError } = await supabase
      .from("vault_source_mailboxes")
      .select("id, ingestion_status, deleted_at")
      .eq("org_id", orgId)
      .eq("source_id", sourceId)
      .is("deleted_at", null);

    if (mailboxError) {
      return jsonError("Failed to check source mailboxes.", 500, {
        details: mailboxError.message,
      });
    }

    const mailboxRows = Array.isArray(mailboxes) ? mailboxes : [];

    const failedMailboxCount = mailboxRows.filter(
      (mailbox) =>
        typeof mailbox.ingestion_status === "string" &&
        mailbox.ingestion_status.toLowerCase() === "failed"
    ).length;

    const healthStatus =
      failedMailboxCount > 0
        ? "warning"
        : mailboxRows.length > 0
          ? "healthy"
          : "unknown";

    const authStatus = normalizeString(
      (source as Record<string, unknown>).auth_status
    );

    const nextStatus =
      authStatus === "expired" || authStatus === "disconnected"
        ? "error"
        : healthStatus;

    const { error: updateError } = await supabase
      .from("vault_sources")
      .update({
        health_status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId)
      .eq("org_id", orgId);

    if (updateError) {
      return jsonError("Failed to update source health.", 500, {
        details: updateError.message,
      });
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.source.health_check",
      entityType: "vault_source",
      entityId: sourceId,
      status: "success",
      request,
      details: {
        health_status: nextStatus,
        mailbox_count: mailboxRows.length,
        failed_mailbox_count: failedMailboxCount,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      sourceId,
      health_status: nextStatus,
      mailbox_count: mailboxRows.length,
      failed_mailbox_count: failedMailboxCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error checking source health.";

    return jsonError("Failed to run source health check.", 500, {
      details: message,
    });
  }
}