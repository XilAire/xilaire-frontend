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

type IngestionJobRow = {
  id: string;
  org_id?: string | null;
  source_id?: string | null;
  provider?: string | null;
  job_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
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

function normalizeLimit(value: string | null): number {
  const parsed = Number(value ?? "50");

  if (!Number.isFinite(parsed)) return 50;
  if (parsed < 1) return 1;
  if (parsed > 100) return 100;

  return parsed;
}

function normalizeJobRow(row: Record<string, unknown>): IngestionJobRow {
  const id =
    normalizeString(row.id) ??
    normalizeString(row.job_id) ??
    crypto.randomUUID();

  return {
    id,
    org_id: normalizeString(row.org_id),
    source_id: normalizeString(row.source_id),
    provider: normalizeString(row.provider),
    job_type:
      normalizeString(row.job_type) ??
      normalizeString(row.type) ??
      normalizeString(row.kind),
    status: normalizeString(row.status) ?? "unknown",
    created_at:
      normalizeString(row.created_at) ??
      normalizeString(row.inserted_at) ??
      normalizeString(row.created),
    started_at: normalizeString(row.started_at),
    completed_at:
      normalizeString(row.completed_at) ??
      normalizeString(row.finished_at),
    error_message:
      normalizeString(row.error_message) ??
      normalizeString(row.error) ??
      normalizeString(row.last_error),
  };
}

function buildSummary(jobs: IngestionJobRow[]) {
  return {
    totalCount: jobs.length,
    queuedCount: jobs.filter((job) => job.status === "queued").length,
    runningCount: jobs.filter(
      (job) => job.status === "running" || job.status === "processing"
    ).length,
    completedCount: jobs.filter((job) => job.status === "completed").length,
    failedCount: jobs.filter((job) => job.status === "failed").length,
  };
}

async function writeAuditSafe(args: Parameters<typeof writeUnifiedVaultAccessAuditLog>[0]) {
  try {
    await writeUnifiedVaultAccessAuditLog(args);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  try {
    const access = await requireVaultAccess(request, {
      supportScope: "vault_read_only",
    });

    const orgId = getAccessOrgId(access);
    const supabase = await getVaultAdminClient();

    const url = new URL(request.url);

    const status = normalizeString(url.searchParams.get("status"));
    const provider = normalizeString(url.searchParams.get("provider"));
    const sourceId =
      normalizeString(url.searchParams.get("sourceId")) ??
      normalizeString(url.searchParams.get("source_id"));
    const jobType =
      normalizeString(url.searchParams.get("jobType")) ??
      normalizeString(url.searchParams.get("job_type"));
    const limit = normalizeLimit(url.searchParams.get("limit"));

    let query = supabase
      .from("vault_ingestion_jobs")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    if (provider) {
      query = query.eq("provider", provider);
    }

    if (sourceId) {
      query = query.eq("source_id", sourceId);
    }

    if (jobType) {
      query = query.eq("job_type", jobType);
    }

    const { data, error } = await query;

    if (error) {
      await writeAuditSafe({
        access,
        action: "vault.ingest.jobs.list.warning",
        entityType: "vault_ingestion_job",
        entityId: orgId,
        status: "warning",
        request,
        details: {
          error: error.message,
          filters: {
            status,
            provider,
            source_id: sourceId,
            job_type: jobType,
            limit,
          },
          duration_ms: Date.now() - startedAt,
        },
      });

      return jsonOk({
        ok: true,
        jobs: [],
        items: [],
        summary: buildSummary([]),
        warning:
          "Ingestion jobs could not be loaded from vault_ingestion_jobs. Returning an empty job list so the page can continue loading.",
        details: error.message,
      });
    }

    const jobs = toRows<Record<string, unknown>>(data).map(normalizeJobRow);
    const summary = buildSummary(jobs);

    await writeAuditSafe({
      access,
      action: "vault.ingest.jobs.list",
      entityType: "vault_ingestion_job",
      entityId: orgId,
      status: "success",
      request,
      details: {
        returned_count: jobs.length,
        filters: {
          status,
          provider,
          source_id: sourceId,
          job_type: jobType,
          limit,
        },
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      jobs,
      items: jobs,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown error loading ingestion jobs.";

    return jsonError("Failed to load ingestion jobs.", 500, {
      details: message,
    });
  }
}