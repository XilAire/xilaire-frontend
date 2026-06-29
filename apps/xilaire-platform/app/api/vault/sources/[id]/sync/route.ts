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

function getAccessUserId(access: unknown): string | null {
  const record = access as Record<string, unknown> | null;

  return (
    normalizeString(record?.userId) ??
    normalizeString(record?.user_id) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).id
        : null
    ) ??
    null
  );
}

export async function POST(request: NextRequest, context: RouteContext) {
  const startedAt = Date.now();

  try {
    const { id: sourceId } = await context.params;

    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
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

    const sourceRecord = source as Record<string, unknown>;

    const { data: job, error: jobError } = await supabase
      .from("vault_ingestion_jobs")
      .insert({
        org_id: orgId,
        source_id: sourceId,
        provider: normalizeString(sourceRecord.provider),
        job_type: "source_sync",
        status: "queued",
        created_by: actorUserId,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (jobError) {
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.source.sync.failed",
        entityType: "vault_source",
        entityId: sourceId,
        status: "failure",
        request,
        details: {
          error: jobError.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to queue source sync job.", 500, {
        details: jobError.message,
      });
    }

    const { error: updateError } = await supabase
      .from("vault_sources")
      .update({
        status: "sync_queued",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceId)
      .eq("org_id", orgId);

    if (updateError) {
      return jsonError("Sync job was queued, but source status update failed.", 500, {
        details: updateError.message,
        job,
      });
    }

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.source.sync",
      entityType: "vault_source",
      entityId: sourceId,
      status: "success",
      request,
      details: {
        job,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk(
      {
        ok: true,
        sourceId,
        job,
        message: "Source sync job queued.",
      },
      201
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error queueing source sync.";

    return jsonError("Failed to queue source sync.", 500, {
      details: message,
    });
  }
}