"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultExportRow = {
  id: string;
  org_id: string;
  case_id?: string | null;
  name: string;
  export_type: "search_result" | "case_export" | "hold_export" | "manual";
  format: "eml" | "pst" | "zip" | "json" | "csv";
  status: "queued" | "approved" | "processing" | "completed" | "failed" | "cancelled";
  requested_by: string | null;
  approved_by: string | null;
  requested_at: string;
  completed_at: string | null;
  expires_at: string | null;
  file_count: number;
  total_size_bytes: number;
  storage_path: string | null;
  manifest_hash_sha256: string | null;
  filters: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  artifact_ready?: boolean;
  artifact_state?: "ready" | "partial" | "missing";
  has_storage_path?: boolean;
  has_manifest_hash?: boolean;
  can_rebuild?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type VaultCaseScope = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number?: string | null;
  custodianCount?: number;
};

type VaultExportsResponse = {
  ok: boolean;
  items?: VaultExportRow[];
  total?: number;
  limit?: number;
  offset?: number;
  caseScope?: VaultCaseScope | null;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultExportUpdateResponse = {
  ok: boolean;
  item?: VaultExportRow;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type CreateVaultExportResponse = {
  ok?: boolean;
  success?: boolean;
  item?: VaultExportRow;
  export?: {
    id: string;
    name: string | null;
    status: string | null;
    format: string | null;
    exportType?: string | null;
    export_type?: string | null;
    createdAt?: string | null;
    created_at?: string | null;
  };
  messageCount?: number;
  summary?: {
    requestedCount?: number;
    linkedCount?: number;
    cachedExportCountUpdatedCount?: number;
    cachedExportCountFailedCount?: number;
  };
  caseScope?: VaultCaseScope | null;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultExportRebuildResponse = {
  ok: boolean;
  item?: VaultExportRow;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  rebuild?: {
    success?: boolean;
    storageBucket?: string;
    storagePath?: string;
    manifestHashSha256?: string;
    format?: string;
    contentType?: string;
    fileCount?: number;
    totalSizeBytes?: number;
  };
  error?: string;
};

type VaultExportDeleteResponse = {
  ok?: boolean;
  success?: boolean;
  deletedId?: string;
  deletedName?: string;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultExportBulkActionResponse = {
  ok?: boolean;
  success?: boolean;
  action?: "approve" | "cancel" | "rebuild" | "delete" | "restore";
  requestedIds?: string[];
  foundIds?: string[];
  missingIds?: string[];
  processedIds?: string[];
  processedCount?: number;
  skipped?: Array<{ id: string; name: string; reason: string }>;
  skippedCount?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type ExportFiltersState = {
  q: string;
  status: "" | "queued" | "approved" | "processing" | "completed" | "failed" | "cancelled";
  exportType: "" | "search_result" | "case_export" | "hold_export" | "manual";
  format: "" | "eml" | "pst" | "zip" | "json" | "csv";
};

type CreateExportState = {
  name: string;
  exportType: "search_result" | "case_export" | "hold_export" | "manual";
  format: "eml" | "pst" | "zip" | "json" | "csv";
  notes: string;
  expiresAt: string;
  filtersJson: string;
  messageIds: string;
};

type CreateExportSeed = {
  source: string | null;
  name: string | null;
  exportType: CreateExportState["exportType"] | null;
  format: CreateExportState["format"] | null;
  notes: string | null;
  filtersJson: string | null;
  messageIds: string | null;
};

type BulkActionName = "approve" | "cancel" | "rebuild" | "delete" | "restore";
type ExportViewMode = "active" | "all" | "deleted";

const DEFAULT_LIMIT = 25;

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function parseCaseId(searchParams: URLSearchParams) {
  return (
    normalizeString(searchParams.get("caseId")) ??
    normalizeString(searchParams.get("case_id")) ??
    null
  );
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

function getCaseIdFromExport(row: VaultExportRow) {
  return normalizeString(row.case_id) ?? getCaseIdFromFilters(row.filters);
}

function getCaseNameFromExport(row: VaultExportRow) {
  const filters = row.filters;

  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return null;
  }

  return (
    normalizeString(filters.caseName) ??
    normalizeString(filters.case_name) ??
    normalizeString(filters.caseTitle) ??
    null
  );
}

function isCaseScopedExport(row: VaultExportRow) {
  return row.export_type === "case_export" || Boolean(getCaseIdFromExport(row));
}

function normalizeExportType(
  value: unknown,
  fallback: CreateExportState["exportType"] | null = null
): CreateExportState["exportType"] | null {
  const normalized = normalizeString(value);

  if (
    normalized === "search_result" ||
    normalized === "case_export" ||
    normalized === "hold_export" ||
    normalized === "manual"
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeFormat(
  value: unknown,
  fallback: CreateExportState["format"] | null = null
): CreateExportState["format"] | null {
  const normalized = normalizeString(value);

  if (
    normalized === "eml" ||
    normalized === "pst" ||
    normalized === "zip" ||
    normalized === "json" ||
    normalized === "csv"
  ) {
    return normalized;
  }

  return fallback;
}

function normalizeMessageIdsForTextarea(value: string | null) {
  if (!value) return "";

  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
    .join("\n");
}

function safeDecodeMaybe(value: string | null) {
  if (!value) return null;

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCreateSeed(searchParams: URLSearchParams, caseId?: string | null): CreateExportSeed {
  const source = normalizeString(searchParams.get("source"));
  const rawName = normalizeString(searchParams.get("name"));
  const rawNotes = normalizeString(searchParams.get("notes"));
  const rawMessageIds =
    normalizeString(searchParams.get("messageIds")) ??
    normalizeString(searchParams.get("message_ids")) ??
    null;

  const rawFiltersJson =
    normalizeString(searchParams.get("filtersJson")) ??
    normalizeString(searchParams.get("filters_json")) ??
    null;

  const exportType = normalizeExportType(
    searchParams.get("exportType") ?? searchParams.get("export_type"),
    caseId ? "case_export" : null
  );

  const format = normalizeFormat(searchParams.get("format"), null);

  return {
    source,
    name: rawName,
    exportType,
    format,
    notes: rawNotes,
    filtersJson: safeDecodeMaybe(rawFiltersJson),
    messageIds: normalizeMessageIdsForTextarea(safeDecodeMaybe(rawMessageIds)),
  };
}

function mergeCaseIntoFiltersJson(filtersJson: string, caseId: string) {
  let parsedFilters: Record<string, unknown> = {};

  if (filtersJson.trim()) {
    try {
      const parsed = JSON.parse(filtersJson);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        parsedFilters = parsed as Record<string, unknown>;
      }
    } catch {
      parsedFilters = {};
    }
  }

  const nextFilters = {
    ...parsedFilters,
    caseId,
    case_id: caseId,
    caseScoped: true,
    case_scoped: true,
  };

  return JSON.stringify(nextFilters, null, 2);
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

function parseFilters(searchParams: URLSearchParams, caseId?: string | null): ExportFiltersState {
  const status = searchParams.get("status");
  const exportType = searchParams.get("exportType");
  const format = searchParams.get("format");

  return {
    q: searchParams.get("q") ?? "",
    status:
      status === "queued" ||
      status === "approved" ||
      status === "processing" ||
      status === "completed" ||
      status === "failed" ||
      status === "cancelled"
        ? status
        : "",
    exportType: caseId
      ? "case_export"
      : exportType === "search_result" ||
          exportType === "case_export" ||
          exportType === "hold_export" ||
          exportType === "manual"
        ? exportType
        : "",
    format:
      format === "eml" ||
      format === "pst" ||
      format === "zip" ||
      format === "json" ||
      format === "csv"
        ? format
        : "",
  };
}

function parseViewMode(searchParams: URLSearchParams): ExportViewMode {
  const deletedOnly = searchParams.get("deletedOnly") === "true";
  const includeDeleted = searchParams.get("includeDeleted") === "true";

  if (deletedOnly) return "deleted";
  if (includeDeleted) return "all";
  return "active";
}

function buildQueryString(
  filters: ExportFiltersState,
  offset: number,
  limit: number,
  viewMode: ExportViewMode,
  caseId?: string | null
) {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.exportType) params.set("exportType", filters.exportType);
  if (filters.format) params.set("format", filters.format);

  if (caseId) {
    params.set("caseId", caseId);
  }

  if (viewMode === "all") {
    params.set("includeDeleted", "true");
  }

  if (viewMode === "deleted") {
    params.set("deletedOnly", "true");
  }

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

function getDefaultCreateState(
  caseId?: string | null,
  seed?: CreateExportSeed | null
): CreateExportState {
  const seededExportType = seed?.exportType ?? null;
  const resolvedExportType = caseId ? "case_export" : seededExportType ?? "manual";
  const resolvedFormat = seed?.format ?? "zip";

  const fallbackFiltersJson = caseId
    ? JSON.stringify(
        {
          caseId,
          case_id: caseId,
          caseScoped: true,
          case_scoped: true,
        },
        null,
        2
      )
    : "";

  const seededFiltersJson = seed?.filtersJson ?? fallbackFiltersJson;
  const resolvedFiltersJson =
    caseId && seededFiltersJson
      ? mergeCaseIntoFiltersJson(seededFiltersJson, caseId)
      : seededFiltersJson;

  return {
    name: seed?.name ?? "",
    exportType: resolvedExportType,
    format: resolvedFormat,
    notes: seed?.notes ?? "",
    expiresAt: "",
    filtersJson: resolvedFiltersJson,
    messageIds: seed?.messageIds ?? "",
  };
}

function getNormalizedListError(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("vault export not found for the target org") ||
    lower.includes("valid export id is required")
  ) {
    return "Unable to load export requests.";
  }

  return message;
}

function normalizeCreatedExport(
  response: CreateVaultExportResponse,
  fallback: {
    name: string;
    exportType: CreateExportState["exportType"];
    format: CreateExportState["format"];
    notes?: string;
    expiresAt?: string;
    filters?: Record<string, unknown>;
    caseId?: string | null;
  }
): VaultExportRow | null {
  if (response.item?.id) {
    return response.item;
  }

  if (!response.export?.id) {
    return null;
  }

  const nowIso = new Date().toISOString();

  const exportType =
    response.export.export_type ??
    response.export.exportType ??
    fallback.exportType;

  const format = response.export.format ?? fallback.format;
  const status = response.export.status ?? "queued";
  const createdAt = response.export.created_at ?? response.export.createdAt ?? nowIso;
  const resolvedName = response.export.name ?? fallback.name ?? "New Export";

  if (
    exportType !== "search_result" &&
    exportType !== "case_export" &&
    exportType !== "hold_export" &&
    exportType !== "manual"
  ) {
    return null;
  }

  if (
    format !== "eml" &&
    format !== "pst" &&
    format !== "zip" &&
    format !== "json" &&
    format !== "csv"
  ) {
    return null;
  }

  if (
    status !== "queued" &&
    status !== "approved" &&
    status !== "processing" &&
    status !== "completed" &&
    status !== "failed" &&
    status !== "cancelled"
  ) {
    return null;
  }

  return {
    id: response.export.id,
    org_id: response.targetOrgId ?? "",
    case_id: fallback.caseId ?? null,
    name: resolvedName,
    export_type: exportType,
    format,
    status,
    requested_by: null,
    approved_by: null,
    requested_at: createdAt,
    completed_at: null,
    expires_at: fallback.expiresAt ?? null,
    file_count: response.summary?.linkedCount ?? response.messageCount ?? 0,
    total_size_bytes: 0,
    storage_path: null,
    manifest_hash_sha256: null,
    filters: fallback.filters ?? {},
    notes: fallback.notes ?? null,
    created_at: createdAt,
    updated_at: createdAt,
    artifact_ready: false,
    artifact_state: "missing",
    has_storage_path: false,
    has_manifest_hash: false,
    can_rebuild: false,
    deleted_at: null,
    deleted_by: null,
  };
}

async function postCreateExport(
  accessToken: string,
  payload: {
    name: string;
    exportType: CreateExportState["exportType"];
    format: CreateExportState["format"];
    notes?: string;
    expiresAt?: string;
    filters?: Record<string, unknown>;
    messageIds: string[];
    caseId?: string;
    case_id?: string;
  }
) {
  const res = await fetch("/api/vault/exports", {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const response = (await res.json()) as CreateVaultExportResponse;

  if (!res.ok || (!response.ok && !response.success)) {
    throw new Error(response.error || "Unable to create Vault export.");
  }

  return response;
}

function getStatusBadgeClass(status: VaultExportRow["status"]) {
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

function getArtifactBadgeClass(hasStoragePath: boolean, hasManifest: boolean) {
  if (hasStoragePath && hasManifest) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (hasStoragePath || hasManifest) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getArtifactBadgeLabel(hasStoragePath: boolean, hasManifest: boolean) {
  if (hasStoragePath && hasManifest) return "Ready";
  if (hasStoragePath || hasManifest) return "Partial";
  return "Missing";
}

function canRebuildExport(row: VaultExportRow) {
  if (row.deleted_at) {
    return false;
  }

  if (typeof row.can_rebuild === "boolean") {
    return row.can_rebuild;
  }

  return (
    row.format !== "pst" &&
    (row.status === "completed" || row.status === "failed" || row.status === "cancelled")
  );
}

function canApproveExport(row: VaultExportRow) {
  return !row.deleted_at && (row.status === "queued" || row.status === "processing");
}

function canCancelExport(row: VaultExportRow) {
  return !row.deleted_at && (row.status === "queued" || row.status === "approved" || row.status === "processing");
}

function isArtifactReady(row: VaultExportRow) {
  if (typeof row.artifact_ready === "boolean") {
    return row.artifact_ready;
  }

  const hasStoragePath =
    typeof row.has_storage_path === "boolean"
      ? row.has_storage_path
      : Boolean(row.storage_path);

  const hasManifest =
    typeof row.has_manifest_hash === "boolean"
      ? row.has_manifest_hash
      : Boolean(row.manifest_hash_sha256);

  return row.status === "completed" && hasStoragePath && hasManifest;
}

function isExpired(row: VaultExportRow) {
  if (!row.expires_at) {
    return false;
  }

  const expiresAt = new Date(row.expires_at).getTime();
  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return expiresAt <= Date.now();
}

function canDownloadExport(row: VaultExportRow) {
  return !row.deleted_at && isArtifactReady(row) && !isExpired(row);
}

function canRestoreExport(row: VaultExportRow) {
  return Boolean(row.deleted_at);
}

function getDownloadDisabledReason(row: VaultExportRow) {
  if (row.deleted_at) {
    return "Deleted";
  }

  if (isExpired(row)) {
    return "Expired";
  }

  if (row.status !== "completed") {
    return "Not completed";
  }

  const hasStoragePath =
    typeof row.has_storage_path === "boolean"
      ? row.has_storage_path
      : Boolean(row.storage_path);

  const hasManifest =
    typeof row.has_manifest_hash === "boolean"
      ? row.has_manifest_hash
      : Boolean(row.manifest_hash_sha256);

  if (!hasStoragePath && !hasManifest) {
    return "Artifact missing";
  }

  if (!hasStoragePath || !hasManifest) {
    return "Artifact partial";
  }

  return "Unavailable";
}

function getViewTabClass(active: boolean) {
  return active
    ? "rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition dark:bg-white dark:text-slate-900"
    : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800";
}

function getPageSummary(from: number, to: number, total: number) {
  if (total === 0) {
    return "Showing 0 exports";
  }

  return `Showing ${from}-${to} of ${total} exports`;
}

function VaultExportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const latestRequestIdRef = useRef(0);

  const caseId = useMemo(() => parseCaseId(searchParams), [searchParams]);
  const createSeed = useMemo(() => parseCreateSeed(searchParams, caseId), [searchParams, caseId]);

  const initialFilters = useMemo(() => parseFilters(searchParams, caseId), [searchParams, caseId]);
  const initialViewMode = useMemo(() => parseViewMode(searchParams), [searchParams]);

  const initialOffset = useMemo(() => {
    const raw = Number(searchParams.get("offset") ?? "0");
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }, [searchParams]);

  const initialLimit = useMemo(() => {
    const raw = Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT));
    if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
    if (raw < 1) return DEFAULT_LIMIT;
    if (raw > 100) return 100;
    return raw;
  }, [searchParams]);

  const [filters, setFilters] = useState<ExportFiltersState>(initialFilters);
  const [viewMode, setViewMode] = useState<ExportViewMode>(initialViewMode);
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);

  const [rows, setRows] = useState<VaultExportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [caseScope, setCaseScope] = useState<VaultCaseScope | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateExportState>(
    getDefaultCreateState(caseId, createSeed)
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [rebuildingId, setRebuildingId] = useState<string | null>(null);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildSuccess, setRebuildSuccess] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState<null | BulkActionName>(null);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [bulkActionSuccess, setBulkActionSuccess] = useState<string | null>(null);

  const hasSearchPrefill =
    Boolean(createSeed.source) ||
    Boolean(createSeed.messageIds) ||
    Boolean(createSeed.filtersJson) ||
    Boolean(createSeed.exportType);

  const syncUrl = useCallback(
    (nextFilters: ExportFiltersState, nextOffset: number, nextViewMode: ExportViewMode) => {
      const safeFilters = caseId
        ? {
            ...nextFilters,
            exportType: "case_export" as ExportFiltersState["exportType"],
          }
        : nextFilters;

      const queryString = buildQueryString(safeFilters, nextOffset, limit, nextViewMode, caseId);
      router.replace(`/vault/exports?${queryString}`, { scroll: false });
    },
    [router, limit, caseId]
  );

  const fetchResults = useCallback(
    async (activeFilters: ExportFiltersState, activeOffset: number, activeViewMode: ExportViewMode) => {
      const requestId = ++latestRequestIdRef.current;
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

        const safeFilters = caseId
          ? {
              ...activeFilters,
              exportType: "case_export" as ExportFiltersState["exportType"],
            }
          : activeFilters;

        const queryString = buildQueryString(safeFilters, activeOffset, limit, activeViewMode, caseId);
        const res = await fetch(`/api/vault/exports?${queryString}`, {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await res.json()) as VaultExportsResponse;

        if (!res.ok || !payload.ok) {
          throw new Error(payload.error || "Vault exports lookup failed.");
        }

        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        setRows(payload.items ?? []);
        setTotal(payload.total ?? 0);
        setCaseScope(payload.caseScope ?? null);
        setTargetOrgId(payload.targetOrgId ?? null);
        setAccessPath(payload.accessPath ?? null);
        setSelectedIds((current) =>
          current.filter((id) => (payload.items ?? []).some((row) => row.id === id))
        );
      } catch (err) {
        if (requestId !== latestRequestIdRef.current) {
          return;
        }

        setRows([]);
        setTotal(0);
        setCaseScope(null);
        setTargetOrgId(null);
        setAccessPath(null);
        setSelectedIds([]);

        const rawMessage =
          err instanceof Error ? err.message : "Vault exports lookup failed.";

        setError(getNormalizedListError(rawMessage));
      } finally {
        if (requestId === latestRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [limit, caseId]
  );

  useEffect(() => {
    const nextCaseId = parseCaseId(searchParams);
    const nextFilters = parseFilters(searchParams, nextCaseId);
    const nextViewMode = parseViewMode(searchParams);
    const nextOffsetRaw = Number(searchParams.get("offset") ?? "0");
    const nextOffset =
      Number.isFinite(nextOffsetRaw) && nextOffsetRaw >= 0 ? nextOffsetRaw : 0;

    setFilters(nextFilters);
    setViewMode(nextViewMode);
    setOffset(nextOffset);
    fetchResults(nextFilters, nextOffset, nextViewMode);
  }, [searchParams, fetchResults]);

  useEffect(() => {
    setCreateForm((current) => {
      const seededState = getDefaultCreateState(caseId, createSeed);

      if (hasSearchPrefill) {
        return seededState;
      }

      if (!caseId) {
        return current;
      }

      return {
        ...current,
        exportType: "case_export",
        filtersJson: mergeCaseIntoFiltersJson(current.filtersJson, caseId),
      };
    });
  }, [caseId, createSeed, hasSearchPrefill]);

  function handleFilterChange<K extends keyof ExportFiltersState>(
    key: K,
    value: ExportFiltersState[K]
  ) {
    setFilters((current) => ({
      ...current,
      [key]: caseId && key === "exportType" ? "case_export" : value,
    }));
  }

  function handleCreateChange<K extends keyof CreateExportState>(
    key: K,
    value: CreateExportState[K]
  ) {
    setCreateForm((current) => ({
      ...current,
      [key]: caseId && key === "exportType" ? "case_export" : value,
    }));
  }

  function handleSearch() {
    const nextFilters = caseId
      ? {
          ...filters,
          exportType: "case_export" as ExportFiltersState["exportType"],
        }
      : filters;

    setOffset(0);
    syncUrl(nextFilters, 0, viewMode);
  }

  function handleReset() {
    const resetFilters: ExportFiltersState = {
      q: "",
      status: "",
      exportType: caseId ? "case_export" : "",
      format: "",
    };

    setFilters(resetFilters);
    setOffset(0);
    syncUrl(resetFilters, 0, viewMode);
  }

  function handleViewModeChange(nextViewMode: ExportViewMode) {
    setViewMode(nextViewMode);
    setOffset(0);
    setSelectedIds([]);
    syncUrl(filters, 0, nextViewMode);
  }

  function toggleSelectedId(exportId: string) {
    setSelectedIds((current) =>
      current.includes(exportId)
        ? current.filter((id) => id !== exportId)
        : [...current, exportId]
    );
  }

  function toggleSelectAllCurrentPage() {
    const currentPageIds = rows.map((row) => row.id);
    const allSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !currentPageIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...currentPageIds])));
  }

  async function handleCreateExport(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);
    setDeleteSuccess(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setBulkActionError(null);
    setBulkActionSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const messageIds = createForm.messageIds
        .split("\n")
        .map((value) => value.trim())
        .filter(Boolean);

      if (messageIds.length === 0) {
        throw new Error("At least one message id is required.");
      }

      let parsedFilters: Record<string, unknown> = {};
      if (createForm.filtersJson.trim()) {
        try {
          const parsed = JSON.parse(createForm.filtersJson);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("Filters JSON must be an object.");
          }
          parsedFilters = parsed as Record<string, unknown>;
        } catch (err) {
          throw new Error(
            err instanceof Error ? err.message : "Invalid filters JSON."
          );
        }
      }

      const resolvedFilters = caseId
        ? {
            ...parsedFilters,
            caseId,
            case_id: caseId,
            caseScoped: true,
            case_scoped: true,
          }
        : parsedFilters;

      const payload = {
        name: createForm.name.trim(),
        exportType: caseId ? "case_export" : createForm.exportType,
        format: createForm.format,
        notes: createForm.notes.trim() || undefined,
        expiresAt: createForm.expiresAt || undefined,
        filters: resolvedFilters,
        messageIds,
        ...(caseId
          ? {
              caseId,
              case_id: caseId,
            }
          : {}),
      };

      const response = await postCreateExport(session.access_token, payload);

      const linkedCount =
        response.summary?.linkedCount ??
        response.messageCount ??
        0;

      const optimisticRow = normalizeCreatedExport(response, {
        name: payload.name,
        exportType: payload.exportType,
        format: payload.format,
        notes: payload.notes,
        expiresAt: payload.expiresAt,
        filters: payload.filters,
        caseId,
      });

      setCreateForm(getDefaultCreateState(caseId));
      setCreateSuccess(
        linkedCount > 0
          ? `Export request created successfully for ${linkedCount} message(s).`
          : "Export request created successfully."
      );

      if (optimisticRow && offset === 0 && viewMode !== "deleted") {
        setRows((current) => {
          const withoutDuplicate = current.filter((row) => row.id !== optimisticRow.id);
          return [optimisticRow, ...withoutDuplicate].slice(0, limit);
        });
        setTotal((current) => current + 1);

        if (response.caseScope) {
          setCaseScope(response.caseScope);
        }

        if (response.targetOrgId) {
          setTargetOrgId(response.targetOrgId);
        }

        if (response.accessPath) {
          setAccessPath(response.accessPath);
        }
      }

      await fetchResults(filters, offset, viewMode);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create Vault export.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRebuildExport(row: VaultExportRow) {
    if (!canRebuildExport(row)) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to rebuild the artifact for "${row.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setRebuildingId(row.id);
    setRebuildError(null);
    setRebuildSuccess(null);
    setCreateError(null);
    setCreateSuccess(null);
    setDeleteError(null);
    setDeleteSuccess(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setBulkActionError(null);
    setBulkActionSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const res = await fetch(`/api/vault/exports/${row.id}/rebuild`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Manual rebuild requested from exports list page.",
          ...(caseId ? { caseId, case_id: caseId } : {}),
        }),
      });

      const payload = (await res.json()) as VaultExportRebuildResponse;

      if (!res.ok || !payload.ok || !payload.item) {
        throw new Error(payload.error || "Unable to rebuild export artifact.");
      }

      setRows((current) =>
        current.map((existing) => (existing.id === payload.item?.id ? payload.item : existing))
      );

      if (payload.targetOrgId) {
        setTargetOrgId(payload.targetOrgId);
      }

      if (payload.accessPath) {
        setAccessPath(payload.accessPath);
      }

      setRebuildSuccess(
        `Export artifact rebuilt successfully for "${payload.item.name}".`
      );

      await fetchResults(filters, offset, viewMode);
    } catch (err) {
      setRebuildError(
        err instanceof Error ? err.message : "Unable to rebuild export artifact."
      );
    } finally {
      setRebuildingId(null);
    }
  }

  async function handleDownloadExport(row: VaultExportRow) {
    if (!canDownloadExport(row)) {
      setDownloadError(`Export "${row.name}" is not ready for download.`);
      setDownloadSuccess(null);
      return;
    }

    setDownloadingId(row.id);
    setDownloadError(null);
    setDownloadSuccess(null);
    setCreateError(null);
    setCreateSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);
    setDeleteSuccess(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setBulkActionError(null);
    setBulkActionSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const rowCaseId = getCaseIdFromExport(row);
      const queryString = rowCaseId ? `?caseId=${encodeURIComponent(rowCaseId)}` : "";

      const res = await fetch(`/api/vault/exports/${row.id}/download${queryString}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        let errorMessage = "Unable to download export artifact.";

        try {
          const payload = (await res.json()) as { error?: string };
          errorMessage = payload.error || errorMessage;
        } catch {
          // keep default
        }

        throw new Error(errorMessage);
      }

      const blob = await res.blob();

      const contentDisposition = res.headers.get("Content-Disposition") ?? "";
      const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i);

      const fileName = utf8Match?.[1]
        ? decodeURIComponent(utf8Match[1])
        : asciiMatch?.[1] || `${row.name || `vault-export-${row.id}`}.${row.format}`;

      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);

      setDownloadSuccess(`Download started for "${row.name}".`);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Unable to download export artifact."
      );
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDeleteExport(row: VaultExportRow) {
    if (row.deleted_at) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to delete "${row.name}"? This will soft-delete the export so it can be restored later.`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(row.id);
    setDeleteError(null);
    setDeleteSuccess(null);
    setCreateError(null);
    setCreateSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setBulkActionError(null);
    setBulkActionSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const rowCaseId = getCaseIdFromExport(row);
      const queryString = rowCaseId ? `?caseId=${encodeURIComponent(rowCaseId)}` : "";

      const res = await fetch(`/api/vault/exports/${row.id}${queryString}`, {
        method: "DELETE",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as VaultExportDeleteResponse;

      if (!res.ok || (!payload.ok && !payload.success)) {
        throw new Error(payload.error || "Unable to delete Vault export.");
      }

      if (viewMode === "active") {
        setRows((current) => current.filter((existing) => existing.id !== row.id));
        setSelectedIds((current) => current.filter((id) => id !== row.id));
        setTotal((current) => Math.max(0, current - 1));
      } else {
        await fetchResults(filters, offset, viewMode);
      }

      if (payload.targetOrgId) {
        setTargetOrgId(payload.targetOrgId);
      }

      if (payload.accessPath) {
        setAccessPath(payload.accessPath);
      }

      setDeleteSuccess(`Export deleted successfully: "${payload.deletedName || row.name}".`);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete Vault export."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRestoreExport(row: VaultExportRow) {
    if (!canRestoreExport(row)) {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to restore "${row.name}"?`
    );

    if (!confirmed) {
      return;
    }

    setRestoringId(row.id);
    setRestoreError(null);
    setRestoreSuccess(null);
    setCreateError(null);
    setCreateSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);
    setDeleteSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setBulkActionError(null);
    setBulkActionSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const rowCaseId = getCaseIdFromExport(row);

      const res = await fetch(`/api/vault/exports/${row.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "restore",
          ...(rowCaseId ? { caseId: rowCaseId, case_id: rowCaseId } : {}),
        }),
      });

      const payload = (await res.json()) as VaultExportUpdateResponse;

      if (!res.ok || !payload.ok || !payload.item) {
        throw new Error(payload.error || "Unable to restore export.");
      }

      if (payload.targetOrgId) {
        setTargetOrgId(payload.targetOrgId);
      }

      if (payload.accessPath) {
        setAccessPath(payload.accessPath);
      }

      setRestoreSuccess(`Export restored successfully: "${payload.item.name}".`);

      if (viewMode === "deleted") {
        setRows((current) => current.filter((existing) => existing.id !== row.id));
        setSelectedIds((current) => current.filter((id) => id !== row.id));
        setTotal((current) => Math.max(0, current - 1));
      } else {
        await fetchResults(filters, offset, viewMode);
      }
    } catch (err) {
      setRestoreError(
        err instanceof Error ? err.message : "Unable to restore export."
      );
    } finally {
      setRestoringId(null);
    }
  }

  async function handleBulkAction(action: BulkActionName) {
    if (selectedIds.length === 0) {
      setBulkActionError("Select at least one export first.");
      return;
    }

    let confirmText = "";

    if (action === "approve") {
      confirmText = `Are you sure you want to approve ${selectedIds.length} export(s)?`;
    }

    if (action === "cancel") {
      confirmText = `Are you sure you want to cancel ${selectedIds.length} export(s)?`;
    }

    if (action === "rebuild") {
      confirmText = `Are you sure you want to rebuild ${selectedIds.length} export artifact(s)?`;
    }

    if (action === "delete") {
      confirmText = `Are you sure you want to delete ${selectedIds.length} export(s)? This will soft-delete them so they can be restored later.`;
    }

    if (action === "restore") {
      confirmText = `Are you sure you want to restore ${selectedIds.length} export(s)?`;
    }

    const confirmed = window.confirm(confirmText);
    if (!confirmed) {
      return;
    }

    setBulkActionLoading(action);
    setBulkActionError(null);
    setBulkActionSuccess(null);
    setCreateError(null);
    setCreateSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);
    setDeleteSuccess(null);
    setRestoreError(null);
    setRestoreSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const res = await fetch("/api/vault/exports/bulk", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          ...(caseId ? { caseId, case_id: caseId } : {}),
        }),
      });

      const payload = (await res.json()) as VaultExportBulkActionResponse;

      if (!res.ok || (!payload.ok && !payload.success)) {
        throw new Error(payload.error || "Unable to process bulk action.");
      }

      const processedIds = payload.processedIds ?? [];
      const skipped = payload.skipped ?? [];
      const missingIds = payload.missingIds ?? [];

      if (payload.targetOrgId) {
        setTargetOrgId(payload.targetOrgId);
      }

      if (payload.accessPath) {
        setAccessPath(payload.accessPath);
      }

      if (action === "delete" && viewMode === "active") {
        setRows((current) => current.filter((row) => !processedIds.includes(row.id)));
        setTotal((current) => Math.max(0, current - processedIds.length));
      }

      if (action === "restore" && viewMode === "deleted") {
        setRows((current) => current.filter((row) => !processedIds.includes(row.id)));
        setTotal((current) => Math.max(0, current - processedIds.length));
      }

      setSelectedIds((current) =>
        current.filter((id) => !processedIds.includes(id) && !missingIds.includes(id))
      );

      const skippedSuffix = skipped.length > 0 ? ` ${skipped.length} skipped.` : "";

      setBulkActionSuccess(
        `Bulk ${action} completed for ${processedIds.length} export(s).${skippedSuffix}`
      );

      await fetchResults(filters, offset, viewMode);
    } catch (err) {
      setBulkActionError(
        err instanceof Error ? err.message : "Unable to process bulk action."
      );
    } finally {
      setBulkActionLoading(null);
    }
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canGoPrevious = offset > 0;
  const canGoNext = offset + limit < total;

  const hasBlockingAction =
    creating ||
    rebuildingId !== null ||
    deletingId !== null ||
    restoringId !== null ||
    downloadingId !== null ||
    bulkActionLoading !== null;

  const selectedCount = selectedIds.length;
  const currentPageIds = rows.map((row) => row.id);
  const allCurrentPageSelected =
    currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id));

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds]
  );

  const selectedApproveEligibleCount = selectedRows.filter(canApproveExport).length;
  const selectedCancelEligibleCount = selectedRows.filter(canCancelExport).length;
  const selectedRebuildEligibleCount = selectedRows.filter(canRebuildExport).length;
  const selectedRestoreEligibleCount = selectedRows.filter(canRestoreExport).length;

  const readyCount = useMemo(
    () => rows.filter((row) => isArtifactReady(row) && !row.deleted_at).length,
    [rows]
  );

  const deletedCount = useMemo(
    () => rows.filter((row) => Boolean(row.deleted_at)).length,
    [rows]
  );

  const caseScopedVisibleCount = useMemo(
    () => rows.filter((row) => isCaseScopedExport(row)).length,
    [rows]
  );

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + rows.length, total);

  function handlePrevious() {
    if (!canGoPrevious) return;
    const nextOffset = Math.max(0, offset - limit);
    setOffset(nextOffset);
    syncUrl(filters, nextOffset, viewMode);
  }

  function handleNext() {
    if (!canGoNext) return;
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    syncUrl(filters, nextOffset, viewMode);
  }

  function buildDetailQuery(row?: VaultExportRow) {
    const params = new URLSearchParams();

    if (viewMode !== "active") {
      params.set("includeDeleted", "true");
    }

    const rowCaseId = row ? getCaseIdFromExport(row) : caseId;

    if (rowCaseId) {
      params.set("caseId", rowCaseId);
    }

    const query = params.toString();
    return query ? `?${query}` : "";
  }

  function openExportDetail(row: VaultExportRow) {
    if (!row.id || row.id === "undefined" || row.id === "null") {
      return;
    }

    router.push(`/vault/exports/${row.id}${buildDetailQuery(row)}`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Exports
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage evidence export requests, chain-of-custody tracking, and export status.
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Target Org: {targetOrgId ?? "—"}</span>
              <span>Access Path: {accessPath ?? "—"}</span>
              <span>{getPageSummary(pageStart, pageEnd, total)}</span>
              {caseId ? <span>Case Context: {caseScope?.name ?? caseId}</span> : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {total}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Ready
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {readyCount}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Case Linked
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {caseScopedVisibleCount}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Selected
              </div>
              <div className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {selectedCount}
              </div>
            </div>
          </div>
        </div>
      </section>

      {caseId ? (
        <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                Case Export Context
              </p>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {caseScope?.name ?? "This export view is scoped to a Vault case."}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Case tracking now uses vault_exports.case_id when available and falls back to filters.caseId / filters.case_id for older exports.
              </p>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-mono">{caseId}</span>
                {caseScope?.status ? <span>Status: {caseScope.status}</span> : null}
                {caseScope?.priority ? <span>Priority: {caseScope.priority}</span> : null}
                {typeof caseScope?.custodianCount === "number" ? (
                  <span>Custodians: {caseScope.custodianCount}</span>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/vault/cases/${caseId}`}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
              >
                Back to Case
              </Link>

              <Link
                href={`/vault/cases/${caseId}/search`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Case Search
              </Link>

              <Link
                href={`/vault/cases/${caseId}/holds`}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Case Holds
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleViewModeChange("active")}
            className={getViewTabClass(viewMode === "active")}
          >
            Active
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange("all")}
            className={getViewTabClass(viewMode === "all")}
          >
            All
          </button>

          <button
            type="button"
            onClick={() => handleViewModeChange("deleted")}
            className={getViewTabClass(viewMode === "deleted")}
          >
            Deleted
          </button>

          <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            Current View: {viewMode === "active" ? "Active Only" : viewMode === "all" ? "All Exports" : "Deleted Only"}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="exports-q" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Search
            </label>
            <input
              id="exports-q"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="name or notes..."
              value={filters.q}
              onChange={(e) => handleFilterChange("q", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="exports-status" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
            </label>
            <select
              id="exports-status"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.status}
              onChange={(e) =>
                handleFilterChange("status", e.target.value as ExportFiltersState["status"])
              }
            >
              <option value="">All</option>
              <option value="queued">Queued</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="exports-type" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Export Type
            </label>
            <select
              id="exports-type"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              value={filters.exportType}
              onChange={(e) =>
                handleFilterChange("exportType", e.target.value as ExportFiltersState["exportType"])
              }
              disabled={Boolean(caseId)}
            >
              <option value="">All</option>
              <option value="search_result">Search Result</option>
              <option value="case_export">Case Export</option>
              <option value="hold_export">Hold Export</option>
              <option value="manual">Manual</option>
            </select>
            {caseId ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Case context forces export type to case_export.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="exports-format" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Format
            </label>
            <select
              id="exports-format"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.format}
              onChange={(e) =>
                handleFilterChange("format", e.target.value as ExportFiltersState["format"])
              }
            >
              <option value="">All</option>
              <option value="eml">EML</option>
              <option value="pst">PST</option>
              <option value="zip">ZIP</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSearch}
            disabled={hasBlockingAction}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={hasBlockingAction}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {caseId ? <span>Case exports on page: {caseScopedVisibleCount}</span> : null}
            <span>Page {currentPage} of {totalPages}</span>
            <span>Limit: {limit}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-sm text-slate-700 dark:text-slate-200">
            Selected: {selectedCount}
          </div>

          <button
            type="button"
            onClick={() => handleBulkAction("approve")}
            disabled={hasBlockingAction || selectedCount === 0 || selectedApproveEligibleCount === 0}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkActionLoading === "approve" ? "Approving..." : `Bulk Approve (${selectedApproveEligibleCount})`}
          </button>

          <button
            type="button"
            onClick={() => handleBulkAction("cancel")}
            disabled={hasBlockingAction || selectedCount === 0 || selectedCancelEligibleCount === 0}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkActionLoading === "cancel" ? "Cancelling..." : `Bulk Cancel (${selectedCancelEligibleCount})`}
          </button>

          <button
            type="button"
            onClick={() => handleBulkAction("rebuild")}
            disabled={hasBlockingAction || selectedCount === 0 || selectedRebuildEligibleCount === 0}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkActionLoading === "rebuild" ? "Queueing..." : `Bulk Rebuild (${selectedRebuildEligibleCount})`}
          </button>

          <button
            type="button"
            onClick={() => handleBulkAction("restore")}
            disabled={hasBlockingAction || selectedCount === 0 || selectedRestoreEligibleCount === 0}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkActionLoading === "restore" ? "Restoring..." : `Bulk Restore (${selectedRestoreEligibleCount})`}
          </button>

          <button
            type="button"
            onClick={() => handleBulkAction("delete")}
            disabled={hasBlockingAction || selectedCount === 0}
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bulkActionLoading === "delete" ? "Deleting..." : `Bulk Delete (${selectedCount})`}
          </button>

          {selectedCount > 0 ? (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={hasBlockingAction}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear Selection
            </button>
          ) : null}
        </div>

        {bulkActionError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {bulkActionError}
          </div>
        ) : null}

        {bulkActionSuccess ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {bulkActionSuccess}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Create Export Request
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a new export request for selected archived messages.
          </p>
          {caseId ? (
            <p className="mt-2 text-sm text-sky-700 dark:text-sky-300">
              This create form is in case mode. The export type is locked to case_export, and the export will be saved with vault_exports.case_id.
            </p>
          ) : null}
        </div>

        <form onSubmit={handleCreateExport} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Export Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.name}
                onChange={(e) => handleCreateChange("name", e.target.value)}
                placeholder={caseId ? "Case Investigation Export" : "April Investigation Export"}
                required
                disabled={viewMode === "deleted"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Export Type
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.exportType}
                onChange={(e) =>
                  handleCreateChange("exportType", e.target.value as CreateExportState["exportType"])
                }
                disabled={viewMode === "deleted" || Boolean(caseId)}
              >
                <option value="search_result">Search Result</option>
                <option value="case_export">Case Export</option>
                <option value="hold_export">Hold Export</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Format
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.format}
                onChange={(e) =>
                  handleCreateChange("format", e.target.value as CreateExportState["format"])
                }
                disabled={viewMode === "deleted"}
              >
                <option value="eml">EML</option>
                <option value="pst">PST</option>
                <option value="zip">ZIP</option>
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Notes
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.notes}
                onChange={(e) => handleCreateChange("notes", e.target.value)}
                placeholder="Why this export is being requested"
                disabled={viewMode === "deleted"}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Expires At
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.expiresAt}
                onChange={(e) => handleCreateChange("expiresAt", e.target.value)}
                disabled={viewMode === "deleted"}
              />
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Filters JSON
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.filtersJson}
                onChange={(e) => handleCreateChange("filtersJson", e.target.value)}
                placeholder={`{\n  "matter": "April Investigation",\n  "requestedBy": "legal"\n}`}
                disabled={viewMode === "deleted"}
              />
              {caseId ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The API will save the real case_id column and keep caseId / case_id inside filters for backward compatibility.
                </p>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Message IDs
              </label>
              <textarea
                className="min-h-[140px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.messageIds}
                onChange={(e) => handleCreateChange("messageIds", e.target.value)}
                placeholder="One message id per line"
                required
                disabled={viewMode === "deleted"}
              />
            </div>
          </div>

          {createError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {createError}
            </div>
          ) : null}

          {createSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {createSuccess}
            </div>
          ) : null}

          {rebuildError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {rebuildError}
            </div>
          ) : null}

          {rebuildSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {rebuildSuccess}
            </div>
          ) : null}

          {restoreError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {restoreError}
            </div>
          ) : null}

          {restoreSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {restoreSuccess}
            </div>
          ) : null}

          {downloadError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {downloadError}
            </div>
          ) : null}

          {downloadSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {downloadSuccess}
            </div>
          ) : null}

          {deleteError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {deleteError}
            </div>
          ) : null}

          {deleteSuccess ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {deleteSuccess}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={viewMode === "deleted" || hasBlockingAction}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {creating ? "Creating..." : caseId ? "Create Case Export" : "Create Export"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateForm(getDefaultCreateState(caseId));
                setCreateError(null);
                setCreateSuccess(null);
              }}
              disabled={hasBlockingAction}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Export Requests
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious || hasBlockingAction || loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext || hasBlockingAction || loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Next
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Loading export requests...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No export requests matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allCurrentPageSelected}
                      onChange={toggleSelectAllCurrentPage}
                      className="h-4 w-4 rounded border-slate-300"
                      aria-label="Select all exports on current page"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Export
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Case
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Format
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Artifact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Files
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Size
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
                {rows.map((row) => {
                  const hasStoragePath =
                    typeof row.has_storage_path === "boolean"
                      ? row.has_storage_path
                      : !!row.storage_path;

                  const hasManifest =
                    typeof row.has_manifest_hash === "boolean"
                      ? row.has_manifest_hash
                      : !!row.manifest_hash_sha256;

                  const rowCaseId = getCaseIdFromExport(row);
                  const rowCaseName = getCaseNameFromExport(row);
                  const eligibleForRebuild = canRebuildExport(row);
                  const eligibleForDownload = canDownloadExport(row);
                  const eligibleForRestore = canRestoreExport(row);
                  const downloadDisabledReason = getDownloadDisabledReason(row);
                  const isRebuilding = rebuildingId === row.id;
                  const isDeleting = deletingId === row.id;
                  const isRestoring = restoringId === row.id;
                  const isDownloading = downloadingId === row.id;
                  const isSelected = selectedIds.includes(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`cursor-pointer align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        row.deleted_at ? "bg-red-50/40 dark:bg-red-950/10" : ""
                      }`}
                      onClick={() => {
                        if (!isDeleting && !isRebuilding && !isRestoring && !isDownloading) {
                          openExportDetail(row);
                        }
                      }}
                    >
                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectedId(row.id)}
                          className="h-4 w-4 rounded border-slate-300"
                          aria-label={`Select export ${row.name}`}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            <Link
                              href={`/vault/exports/${row.id}${buildDetailQuery(row)}`}
                              className="hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.name}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {row.id}
                          </div>
                          <div className="max-w-xl text-xs text-slate-600 dark:text-slate-300">
                            {row.notes || "—"}
                          </div>
                          {row.deleted_at ? (
                            <div className="text-xs text-red-600 dark:text-red-400">
                              Deleted: {formatDateTime(row.deleted_at)}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {rowCaseId ? (
                          <div className="space-y-2">
                            <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                              Case Linked
                            </span>
                            <div className="text-sm text-slate-700 dark:text-slate-200">
                              {rowCaseName ?? caseScope?.name ?? "Vault Case"}
                            </div>
                            <div className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              {rowCaseId}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Link
                                href={`/vault/cases/${rowCaseId}`}
                                className="text-xs text-sky-700 hover:underline dark:text-sky-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Open Case
                              </Link>
                              <Link
                                href={`/vault/cases/${rowCaseId}/exports`}
                                className="text-xs text-sky-700 hover:underline dark:text-sky-300"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Case Exports
                              </Link>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {row.export_type}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {row.format}
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                              row.status
                            )}`}
                          >
                            {row.status}
                          </span>
                          {row.deleted_at ? (
                            <div className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              Deleted
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getArtifactBadgeClass(
                              hasStoragePath,
                              hasManifest
                            )}`}
                          >
                            {row.artifact_state
                              ? row.artifact_state.charAt(0).toUpperCase() + row.artifact_state.slice(1)
                              : getArtifactBadgeLabel(hasStoragePath, hasManifest)}
                          </span>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Storage: {hasStoragePath ? "Yes" : "No"}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Manifest: {hasManifest ? "Yes" : "No"}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {row.file_count}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {formatBytes(row.total_size_bytes)}
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {formatDateTime(row.requested_at)}
                      </td>

                      <td className="px-4 py-4">
                        <div
                          className="flex flex-col items-start gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/vault/exports/${row.id}${buildDetailQuery(row)}`}
                            className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                          >
                            Open
                          </Link>

                          {eligibleForRestore ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreExport(row)}
                              disabled={hasBlockingAction}
                              className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Restore this deleted export"
                            >
                              {isRestoring ? "Restoring..." : "Restore"}
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => handleDownloadExport(row)}
                            disabled={!eligibleForDownload || hasBlockingAction}
                            className="rounded-lg bg-sky-700 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              eligibleForDownload
                                ? "Download the completed export artifact"
                                : downloadDisabledReason
                            }
                          >
                            {isDownloading ? "Downloading..." : "Download"}
                          </button>

                          {!eligibleForDownload ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {downloadDisabledReason}
                            </span>
                          ) : null}

                          {eligibleForRebuild ? (
                            <button
                              type="button"
                              onClick={() => handleRebuildExport(row)}
                              disabled={hasBlockingAction}
                              className="rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Rebuild the stored export artifact"
                            >
                              {isRebuilding ? "Rebuilding..." : "Rebuild"}
                            </button>
                          ) : row.format === "pst" ? (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              PST only
                            </span>
                          ) : (
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              Not eligible
                            </span>
                          )}

                          {!row.deleted_at ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteExport(row)}
                              disabled={hasBlockingAction}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Soft-delete this export"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function VaultExportsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
          Loading exports...
        </div>
      }
    >
      <VaultExportsPageContent />
    </Suspense>
  );
}