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

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

export async function GET(request: NextRequest, context: RouteContext) {
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
      await writeUnifiedVaultAccessAuditLog({
        access,
        action: "vault.source.detail.failed",
        entityType: "vault_source",
        entityId: sourceId,
        status: "failure",
        request,
        details: {
          error: sourceError.message,
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonError("Failed to load Vault source.", 500, {
        details: sourceError.message,
      });
    }

    if (!source) {
      return jsonError("Vault source was not found.", 404);
    }

    const [mailboxesResult, jobsResult] = await Promise.all([
      supabase
        .from("vault_source_mailboxes")
        .select("*")
        .eq("org_id", orgId)
        .eq("source_id", sourceId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),

      supabase
        .from("vault_ingestion_jobs")
        .select("*")
        .eq("org_id", orgId)
        .eq("source_id", sourceId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (mailboxesResult.error) {
      return jsonError("Failed to load source mailboxes.", 500, {
        details: mailboxesResult.error.message,
      });
    }

    if (jobsResult.error) {
      return jsonError("Failed to load source ingestion jobs.", 500, {
        details: jobsResult.error.message,
      });
    }

    const mailboxes = toRows<Record<string, unknown>>(mailboxesResult.data);
    const recentJobs = toRows<Record<string, unknown>>(jobsResult.data);

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.source.detail",
      entityType: "vault_source",
      entityId: sourceId,
      status: "success",
      request,
      details: {
        mailbox_count: mailboxes.length,
        recent_job_count: recentJobs.length,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      source,
      mailboxes,
      recentJobs,
      summary: {
        mailboxCount: mailboxes.length,
        recentJobCount: recentJobs.length,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error loading source.";

    return jsonError("Failed to load Vault source.", 500, {
      details: message,
    });
  }
}