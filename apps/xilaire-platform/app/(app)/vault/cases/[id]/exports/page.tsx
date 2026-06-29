"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultExportStatus =
  | "queued"
  | "approved"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

type VaultExportType = "search_result" | "case_export" | "hold_export" | "manual";
type VaultExportFormat = "eml" | "pst" | "zip" | "json" | "csv";

type VaultCaseScope = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number: string | null;
  custodianCount: number;
};

type VaultExportRecord = {
  id: string;
  org_id: string;
  case_id?: string | null;
  name: string;
  export_type: VaultExportType;
  format: VaultExportFormat;
  status: VaultExportStatus;
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
  file_count: number;
  total_size_bytes: number;
  storage_path: string | null;
  manifest_hash_sha256: string | null;
  filters: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  artifact_ready?: boolean;
  artifact_state?: "ready" | "partial" | "missing";
  has_storage_path?: boolean;
  has_manifest_hash?: boolean;
  can_rebuild?: boolean;
};

type VaultExportsResponse = {
  ok?: boolean;
  items?: VaultExportRecord[];
  total?: number;
  limit?: number;
  offset?: number;
  caseScope?: VaultCaseScope | null;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
  message?: string;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function sanitizeLimit(value: number): number {
  if (value < 1) return 25;
  if (value > 100) return 100;
  return value;
}

function sanitizeOffset(value: number): number {
  if (value < 0) return 0;
  return value;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function formatBytes(value?: number | null) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let current = size;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function titleCase(value?: string | null) {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClass(status?: VaultExportStatus | string | null) {
  if (status === "completed") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }

  if (status === "cancelled") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  if (status === "processing") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

function getArtifactState(record: VaultExportRecord) {
  if (record.artifact_state) return record.artifact_state;

  const hasStorage =
    typeof record.has_storage_path === "boolean"
      ? record.has_storage_path
      : Boolean(record.storage_path);

  const hasManifest =
    typeof record.has_manifest_hash === "boolean"
      ? record.has_manifest_hash
      : Boolean(record.manifest_hash_sha256);

  if (hasStorage && hasManifest) return "ready";
  if (hasStorage || hasManifest) return "partial";
  return "missing";
}

function getArtifactBadgeClass(state: "ready" | "partial" | "missing") {
  if (state === "ready") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (state === "partial") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getCaseIdFromFilters(filters?: Record<string, unknown> | null) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return null;
  }

  return (
    normalizeString(filters.caseId) ??
    normalizeString(filters.case_id) ??
    normalizeString(filters.caseID) ??
    null
  );
}

function exportMatchesCase(record: VaultExportRecord, caseId: string) {
  return record.case_id === caseId || getCaseIdFromFilters(record.filters) === caseId;
}

export default function CaseExportsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = useMemo(() => {
    const raw = params?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const [items, setItems] = useState<VaultExportRecord[]>([]);
  const [caseScope, setCaseScope] = useState<VaultCaseScope | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const format = searchParams.get("format")?.trim() ?? "";
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const limit = sanitizeLimit(toInt(searchParams.get("limit"), 25));
  const offset = sanitizeOffset(toInt(searchParams.get("offset"), 0));

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const qs = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          qs.delete(key);
        } else {
          qs.set(key, value);
        }
      }

      qs.set("offset", "0");

      router.push(`/vault/cases/${caseId}/exports?${qs.toString()}`);
    },
    [router, searchParams, caseId]
  );

  const fetchExports = useCallback(async () => {
    if (!caseId) {
      setError("A valid case id is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const qs = new URLSearchParams({
        caseId,
        case_id: caseId,
        exportType: "case_export",
        export_type: "case_export",
        limit: String(limit),
        offset: String(offset),
      });

      if (q) qs.set("q", q);
      if (status) qs.set("status", status);
      if (format) qs.set("format", format);
      if (includeDeleted) qs.set("includeDeleted", "true");

      const res = await fetch(`/api/vault/exports?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as VaultExportsResponse;

      if (!res.ok) {
        throw new Error(payload.error || payload.message || "Unable to load case exports.");
      }

      const rawItems = payload.items ?? [];

      const caseFilteredItems = rawItems.filter((record) =>
        exportMatchesCase(record, caseId)
      );

      setItems(caseFilteredItems);
      setCaseScope(payload.caseScope ?? null);
      setTargetOrgId(payload.targetOrgId ?? null);
      setAccessPath(payload.accessPath ?? null);
    } catch (err) {
      setItems([]);
      setCaseScope(null);
      setTargetOrgId(null);
      setAccessPath(null);
      setError(err instanceof Error ? err.message : "Unable to load case exports.");
    } finally {
      setLoading(false);
    }
  }, [caseId, q, status, format, includeDeleted, limit, offset]);

  useEffect(() => {
    fetchExports();
  }, [fetchExports]);

  const summary = useMemo(() => {
    const total = items.length;
    const completed = items.filter((item) => item.status === "completed").length;
    const processing = items.filter((item) => item.status === "processing").length;
    const failed = items.filter((item) => item.status === "failed").length;
    const ready = items.filter((item) => getArtifactState(item) === "ready").length;
    const totalSizeBytes = items.reduce(
      (sum, item) => sum + Number(item.total_size_bytes ?? 0),
      0
    );
    const totalFileCount = items.reduce(
      (sum, item) => sum + Number(item.file_count ?? 0),
      0
    );

    return {
      total,
      completed,
      processing,
      failed,
      ready,
      totalSizeBytes,
      totalFileCount,
    };
  }, [items]);

  const hasFilters = Boolean(q || status || format || includeDeleted);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Case Workspace
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Case Exports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View exports linked to this case through vault_exports.case_id, with legacy fallback support for filters.caseId / filters.case_id.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Case ID: {caseId}</span>
              {caseScope?.name ? <span>Case: {caseScope.name}</span> : null}
              {caseScope?.matter_number ? <span>Matter: {caseScope.matter_number}</span> : null}
              {caseScope?.status ? <span>Status: {caseScope.status}</span> : null}
              {targetOrgId ? <span>Target Org: {targetOrgId}</span> : null}
              {accessPath ? <span>Access: {accessPath}</span> : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/vault/cases/${caseId}`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to Case
            </Link>

            <Link
              href={`/vault/cases/${caseId}/search`}
              className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
            >
              Case Search
            </Link>

            <Link
              href={`/vault/search?caseId=${encodeURIComponent(caseId)}`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Create Export
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Completed
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
            {summary.completed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Processing
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {summary.processing}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Failed
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">
            {summary.failed}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Ready Artifacts
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.ready}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Export Size
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {formatBytes(summary.totalSizeBytes)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Search
            </label>
            <input
              type="search"
              value={q}
              onChange={(e) => updateQuery({ q: e.target.value })}
              placeholder="Search export name or notes"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => updateQuery({ status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All statuses</option>
              <option value="queued">Queued</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Format
            </label>
            <select
              value={format}
              onChange={(e) => updateQuery({ format: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">All formats</option>
              <option value="eml">EML</option>
              <option value="pst">PST</option>
              <option value="zip">ZIP</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) =>
                  updateQuery({
                    includeDeleted: e.target.checked ? "true" : null,
                  })
                }
              />
              Deleted
            </label>

            {hasFilters ? (
              <button
                type="button"
                onClick={() => router.push(`/vault/cases/${caseId}/exports`)}
                className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading case exports...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
          {error}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No case exports found
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Create a case-scoped export from the case search page. The export will be tied to this case through vault_exports.case_id.
          </p>
          <div className="mt-5">
            <Link
              href={`/vault/search?caseId=${encodeURIComponent(caseId)}`}
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Start Case Export
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Case Export Records
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Showing exports scoped to this case through vault_exports.case_id.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Export
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Artifact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Format
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Files
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((item) => {
                  const artifactState = getArtifactState(item);

                  return (
                    <tr
                      key={item.id}
                      className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <Link
                            href={`/vault/exports/${item.id}?caseId=${encodeURIComponent(caseId)}&includeItems=true`}
                            className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
                          >
                            {item.name}
                          </Link>

                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {item.id}
                          </div>

                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Case Link: {item.case_id ? "Direct" : "Legacy filters"}
                          </div>

                          {item.notes ? (
                            <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                              {item.notes}
                            </div>
                          ) : null}

                          {item.deleted_at ? (
                            <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              Deleted
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                            item.status
                          )}`}
                        >
                          {titleCase(item.status)}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getArtifactBadgeClass(
                            artifactState
                          )}`}
                        >
                          {titleCase(artifactState)}
                        </span>

                        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Storage: {item.storage_path ? "Yes" : "No"} • Manifest:{" "}
                          {item.manifest_hash_sha256 ? "Yes" : "No"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {item.format.toUpperCase()}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        <div>{item.file_count}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {formatBytes(item.total_size_bytes)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        <div>{formatDateTime(item.requested_at)}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Completed: {formatDateTime(item.completed_at)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/vault/exports/${item.id}?caseId=${encodeURIComponent(caseId)}&includeItems=true`}
                            className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                          >
                            Open export
                          </Link>

                          <Link
                            href={`/api/vault/exports/${item.id}/download?caseId=${encodeURIComponent(caseId)}`}
                            className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                          >
                            Download route
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}