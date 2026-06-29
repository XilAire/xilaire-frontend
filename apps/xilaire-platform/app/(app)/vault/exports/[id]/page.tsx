"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type ExportMessageRelation =
  | {
      id: string;
      subject: string | null;
      sender_email: string | null;
      sent_at: string | null;
      received_at: string | null;
      on_hold: boolean;
      disposition_status: string;
      has_attachments: boolean;
      attachment_count: number;
      size_bytes: number;
    }
  | null
  | Array<{
      id: string;
      subject: string | null;
      sender_email: string | null;
      sent_at: string | null;
      received_at: string | null;
      on_hold: boolean;
      disposition_status: string;
      has_attachments: boolean;
      attachment_count: number;
      size_bytes: number;
    }>;

type ExportItemRow = {
  id: string;
  org_id: string;
  export_id: string;
  message_id: string;
  included_at?: string | null;
  created_at?: string | null;
  item_hash_sha256: string | null;
  metadata: Record<string, unknown>;
  vault_messages?: ExportMessageRelation;
};

type NormalizedExportItemRow = ExportItemRow & {
  vault_messages:
    | {
        id: string;
        subject: string | null;
        sender_email: string | null;
        sent_at: string | null;
        received_at: string | null;
        on_hold: boolean;
        disposition_status: string;
        has_attachments: boolean;
        attachment_count: number;
        size_bytes: number;
      }
    | null;
  __meta: {
    hasMessage: boolean;
    hasIncludedAt: boolean;
    isValid: boolean;
  };
};

type VaultCaseContext = {
  id: string;
  name: string;
  status: string | null;
} | null;

type VaultExportDetail = {
  id: string;
  org_id: string;
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
  case_id?: string | null;
  case_scoped?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
};

type VaultExportDetailResponse = {
  ok: boolean;
  item?: VaultExportDetail;
  exportItems?: ExportItemRow[];
  caseContext?: VaultCaseContext;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultExportUpdateResponse = {
  ok: boolean;
  item?: VaultExportDetail;
  caseContext?: VaultCaseContext;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultExportRebuildResponse = {
  ok: boolean;
  item?: VaultExportDetail;
  caseContext?: VaultCaseContext;
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
  item?: VaultExportDetail;
  caseContext?: VaultCaseContext;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type EditFormState = {
  notes: string;
  expiresAt: string;
  storagePath: string;
  manifestHashSha256: string;
};

type ExportAction =
  | "approve"
  | "cancel"
  | "mark_processing"
  | "mark_completed"
  | "mark_failed"
  | "restore";

type ExportActivityItem = {
  key: string;
  label: string;
  timestamp: string | null;
  tone: "default" | "success" | "warning" | "danger" | "info";
  detail?: string | null;
};

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

function buildEditState(item: VaultExportDetail | null): EditFormState {
  if (!item) {
    return {
      notes: "",
      expiresAt: "",
      storagePath: "",
      manifestHashSha256: "",
    };
  }

  let expiresAt = "";
  if (item.expires_at) {
    const date = new Date(item.expires_at);
    if (!Number.isNaN(date.getTime())) {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      expiresAt = local.toISOString().slice(0, 16);
    }
  }

  return {
    notes: item.notes ?? "",
    expiresAt,
    storagePath: item.storage_path ?? "",
    manifestHashSha256: item.manifest_hash_sha256 ?? "",
  };
}

function tryFormatJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

function normalizeMessageRelation(value: ExportMessageRelation) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getIncludedAt(row: ExportItemRow) {
  return row.included_at ?? null;
}

function isValidExportItem(row: ExportItemRow) {
  return !!row.id && !!row.message_id;
}

function hasValidIncludedAt(row: ExportItemRow) {
  return !!row.included_at;
}

function getStatusBadgeClass(status: VaultExportDetail["status"]) {
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

function getArtifactStateBadgeClass(hasArtifact: boolean, hasManifest: boolean) {
  if (hasArtifact && hasManifest) {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (hasArtifact || hasManifest) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getArtifactStateLabel(
  hasArtifact: boolean,
  hasManifest: boolean,
  backendState?: VaultExportDetail["artifact_state"]
) {
  if (backendState) {
    return backendState.charAt(0).toUpperCase() + backendState.slice(1);
  }

  if (hasArtifact && hasManifest) return "Ready";
  if (hasArtifact || hasManifest) return "Partial";
  return "Missing";
}

function getActionLabel(action: ExportAction) {
  if (action === "approve") return "Approve Export";
  if (action === "cancel") return "Cancel Export";
  if (action === "mark_processing") return "Mark Processing";
  if (action === "mark_completed") return "Mark Completed";
  if (action === "mark_failed") return "Mark Failed";
  return "Restore Export";
}

function getActionLoadingLabel(action: ExportAction) {
  if (action === "approve") return "Approving...";
  if (action === "cancel") return "Cancelling...";
  if (action === "mark_processing") return "Marking Processing...";
  if (action === "mark_completed") return "Marking Completed...";
  if (action === "mark_failed") return "Marking Failed...";
  return "Restoring...";
}

function getActionSuccessLabel(action: ExportAction) {
  if (action === "approve") return "Export approved successfully.";
  if (action === "cancel") return "Export cancelled successfully.";
  if (action === "mark_processing") return "Export marked processing successfully.";
  if (action === "mark_completed") return "Export marked completed successfully.";
  if (action === "mark_failed") return "Export marked failed successfully.";
  return "Export restored successfully.";
}

function getActionErrorLabel(action: ExportAction) {
  if (action === "approve") return "Unable to approve export.";
  if (action === "cancel") return "Unable to cancel export.";
  if (action === "mark_processing") return "Unable to mark export processing.";
  if (action === "mark_completed") return "Unable to mark export completed.";
  if (action === "mark_failed") return "Unable to mark export failed.";
  return "Unable to restore export.";
}

function getActionConfirmText(action: ExportAction) {
  if (action === "approve") return "Are you sure you want to approve this export?";
  if (action === "cancel") return "Are you sure you want to cancel this export?";
  if (action === "mark_processing") return "Are you sure you want to mark this export as processing?";
  if (action === "mark_completed") return "Are you sure you want to mark this export as completed?";
  if (action === "mark_failed") return "Are you sure you want to mark this export as failed?";
  return "Are you sure you want to restore this deleted export?";
}

function getActivityToneClass(tone: ExportActivityItem["tone"]) {
  if (tone === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  }

  if (tone === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  }

  if (tone === "danger") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  }

  if (tone === "info") {
    return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false;

  const timestamp = new Date(expiresAt).getTime();
  if (Number.isNaN(timestamp)) return false;

  return timestamp <= Date.now();
}

function getSafeExportFileName(item: VaultExportDetail) {
  const safeBase =
    (item.name || "vault-export")
      .trim()
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "vault-export";

  return `${safeBase}.${item.format}`;
}

function getDownloadFileNameFromHeaders(
  contentDisposition: string | null,
  fallback: string
) {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallback;
    }
  }

  const asciiMatch = contentDisposition.match(/filename="([^"]+)"/i);
  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallback;
}

export default function VaultExportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const exportId = useMemo(() => {
    const raw = params?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const includeDeleted = useMemo(() => {
    return searchParams.get("includeDeleted") === "true";
  }, [searchParams]);

  const urlCaseId = useMemo(() => parseCaseId(searchParams), [searchParams]);

  const [item, setItem] = useState<VaultExportDetail | null>(null);
  const [exportItems, setExportItems] = useState<ExportItemRow[]>([]);
  const [caseContext, setCaseContext] = useState<VaultCaseContext>(null);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<EditFormState>({
    notes: "",
    expiresAt: "",
    storagePath: "",
    manifestHashSha256: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<null | ExportAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const [rebuildLoading, setRebuildLoading] = useState(false);
  const [rebuildError, setRebuildError] = useState<string | null>(null);
  const [rebuildSuccess, setRebuildSuccess] = useState<string | null>(null);

  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const exportCaseId = useMemo(() => {
    return urlCaseId ?? item?.case_id ?? getCaseIdFromFilters(item?.filters) ?? null;
  }, [urlCaseId, item?.case_id, item?.filters]);

  const isCaseExport = useMemo(() => {
    return item?.export_type === "case_export" || Boolean(item?.case_scoped) || Boolean(exportCaseId);
  }, [item?.export_type, item?.case_scoped, exportCaseId]);

  const buildCaseQueryString = useCallback(
    (options?: { includeDeleted?: boolean; includeItems?: boolean }) => {
      const qs = new URLSearchParams();

      if (options?.includeDeleted || includeDeleted) {
        qs.set("includeDeleted", "true");
      }

      if (exportCaseId) {
        qs.set("caseId", exportCaseId);
      }

      if (options?.includeItems) {
        qs.set("includeItems", "true");
      }

      const query = qs.toString();
      return query ? `?${query}` : "";
    },
    [includeDeleted, exportCaseId]
  );

  const exportsBackHref = useMemo(() => {
    if (exportCaseId) {
      return `/vault/cases/${exportCaseId}/exports`;
    }

    const qs = new URLSearchParams();

    if (includeDeleted) {
      qs.set("includeDeleted", "true");
    }

    const query = qs.toString();
    return query ? `/vault/exports?${query}` : "/vault/exports";
  }, [includeDeleted, exportCaseId]);

  const fetchExport = useCallback(async () => {
    if (!exportId) {
      setError("A valid export id is required.");
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

      const includeItems = searchParams.get("includeItems") ?? "true";
      const limit = searchParams.get("limit") ?? "100";
      const offset = searchParams.get("offset") ?? "0";

      const qs = new URLSearchParams({
        includeItems,
        limit,
        offset,
      });

      if (includeDeleted) {
        qs.set("includeDeleted", "true");
      }

      if (urlCaseId) {
        qs.set("caseId", urlCaseId);
      }

      const res = await fetch(`/api/vault/exports/${exportId}?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as VaultExportDetailResponse;

      if (!res.ok || !payload.ok || !payload.item) {
        throw new Error(payload.error || "Unable to load export details.");
      }

      setItem(payload.item);
      setExportItems(payload.exportItems ?? []);
      setCaseContext(payload.caseContext ?? null);
      setTargetOrgId(payload.targetOrgId ?? null);
      setAccessPath(payload.accessPath ?? null);
      setEditForm(buildEditState(payload.item));
    } catch (err) {
      setItem(null);
      setExportItems([]);
      setCaseContext(null);
      setTargetOrgId(null);
      setAccessPath(null);
      setError(err instanceof Error ? err.message : "Unable to load export details.");
    } finally {
      setLoading(false);
    }
  }, [exportId, searchParams, includeDeleted, urlCaseId]);

  useEffect(() => {
    fetchExport();
  }, [fetchExport]);

  function handleEditChange<K extends keyof EditFormState>(
    key: K,
    value: EditFormState[K]
  ) {
    setEditForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!item || isDeleted) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    setActionError(null);
    setActionSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const payload = {
        notes: editForm.notes.trim() || null,
        expiresAt: editForm.expiresAt ? new Date(editForm.expiresAt).toISOString() : null,
        storagePath: editForm.storagePath.trim() || null,
        manifestHashSha256: editForm.manifestHashSha256.trim() || null,
        ...(exportCaseId ? { caseId: exportCaseId, case_id: exportCaseId } : {}),
      };

      const res = await fetch(`/api/vault/exports/${item.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = (await res.json()) as VaultExportUpdateResponse;

      if (!res.ok || !response.ok || !response.item) {
        throw new Error(response.error || "Unable to update export.");
      }

      setItem(response.item);
      setCaseContext(response.caseContext ?? caseContext);
      setEditForm(buildEditState(response.item));
      setTargetOrgId(response.targetOrgId ?? targetOrgId);
      setAccessPath(response.accessPath ?? accessPath);
      setSaveSuccess("Export updated successfully.");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to update export.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload() {
    if (!item || isDeleted) return;

    setDownloadError(null);
    setDownloadSuccess(null);
    setActionError(null);
    setActionSuccess(null);
    setSaveError(null);
    setSaveSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);

    if (item.status !== "completed") {
      setDownloadError("Export must be completed before downloading.");
      return;
    }

    if (!artifactReady) {
      setDownloadError("Export artifact is not ready for download.");
      return;
    }

    if (isExportExpired) {
      setDownloadError("This export has expired and can no longer be downloaded.");
      return;
    }

    setDownloadLoading(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const qs = new URLSearchParams();

      if (exportCaseId) {
        qs.set("caseId", exportCaseId);
      }

      const query = qs.toString();
      const downloadUrl = query
        ? `/api/vault/exports/${item.id}/download?${query}`
        : `/api/vault/exports/${item.id}/download`;

      const res = await fetch(downloadUrl, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        let errorMessage = "Unable to download export.";

        try {
          const errorPayload = (await res.json()) as {
            error?: string;
            message?: string;
          };
          errorMessage = errorPayload?.error || errorPayload?.message || errorMessage;
        } catch {
          // leave default error message
        }

        throw new Error(errorMessage);
      }

      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const fileName = getDownloadFileNameFromHeaders(
        res.headers.get("Content-Disposition"),
        getSafeExportFileName(item)
      );

      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(objectUrl);
      setDownloadSuccess(`Download started for "${item.name}".`);
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Unable to download export."
      );
    } finally {
      setDownloadLoading(false);
    }
  }

  async function handleRebuild() {
    if (!item || isDeleted) return;

    const confirmed = window.confirm(
      "Are you sure you want to rebuild this export artifact? This will regenerate the stored file for this export."
    );
    if (!confirmed) return;

    setRebuildLoading(true);
    setRebuildError(null);
    setRebuildSuccess(null);
    setActionError(null);
    setActionSuccess(null);
    setSaveError(null);
    setSaveSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setDeleteError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const res = await fetch(`/api/vault/exports/${item.id}/rebuild`, {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "Manual rebuild requested from export detail page.",
          ...(exportCaseId ? { caseId: exportCaseId, case_id: exportCaseId } : {}),
        }),
      });

      const response = (await res.json()) as VaultExportRebuildResponse;

      if (!res.ok || !response.ok || !response.item) {
        throw new Error(response.error || "Unable to rebuild export artifact.");
      }

      setItem(response.item);
      setCaseContext(response.caseContext ?? caseContext);
      setEditForm(buildEditState(response.item));
      setTargetOrgId(response.targetOrgId ?? targetOrgId);
      setAccessPath(response.accessPath ?? accessPath);

      const rebuiltPath = response.rebuild?.storagePath || response.item.storage_path || "—";
      setRebuildSuccess(`Export artifact rebuilt successfully. Storage path: ${rebuiltPath}`);

      await fetchExport();
    } catch (err) {
      setRebuildError(
        err instanceof Error ? err.message : "Unable to rebuild export artifact."
      );
    } finally {
      setRebuildLoading(false);
    }
  }

  async function handleDelete() {
    if (!item || isDeleted) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${item.name}"? This will soft-delete the export so it can be restored later from the deleted exports workflow.`
    );
    if (!confirmed) return;

    setDeleteLoading(true);
    setDeleteError(null);
    setActionError(null);
    setActionSuccess(null);
    setSaveError(null);
    setSaveSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const qs = new URLSearchParams();

      if (exportCaseId) {
        qs.set("caseId", exportCaseId);
      }

      const query = qs.toString();
      const deleteUrl = query
        ? `/api/vault/exports/${item.id}?${query}`
        : `/api/vault/exports/${item.id}`;

      const res = await fetch(deleteUrl, {
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

      router.push(
        exportCaseId
          ? `/vault/cases/${encodeURIComponent(exportCaseId)}/exports?includeDeleted=true`
          : "/vault/exports?includeDeleted=true"
      );
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Unable to delete Vault export."
      );
    } finally {
      setDeleteLoading(false);
    }
  }

  async function runAction(action: ExportAction) {
    if (!item) return;

    const confirmed = window.confirm(getActionConfirmText(action));
    if (!confirmed) return;

    setActionLoading(action);
    setActionError(null);
    setActionSuccess(null);
    setSaveError(null);
    setSaveSuccess(null);
    setDownloadError(null);
    setDownloadSuccess(null);
    setRebuildError(null);
    setRebuildSuccess(null);
    setDeleteError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const payload: Record<string, unknown> = {};

      if (action === "approve") {
        payload.action = "approve";
      }

      if (action === "cancel") {
        payload.action = "cancel";
        payload.notes = editForm.notes.trim() || item.notes || null;
      }

      if (action === "mark_processing") {
        payload.action = "mark_processing";
      }

      if (action === "mark_completed") {
        payload.action = "mark_completed";
        payload.notes = editForm.notes.trim() || item.notes || null;
        payload.storagePath = editForm.storagePath.trim() || null;
        payload.manifestHashSha256 = editForm.manifestHashSha256.trim() || null;
      }

      if (action === "mark_failed") {
        payload.action = "mark_failed";
        payload.notes = editForm.notes.trim() || item.notes || null;
      }

      if (action === "restore") {
        payload.action = "restore";
      }

      if (exportCaseId) {
        payload.caseId = exportCaseId;
        payload.case_id = exportCaseId;
      }

      const res = await fetch(`/api/vault/exports/${item.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = (await res.json()) as VaultExportUpdateResponse;

      if (!res.ok || !response.ok || !response.item) {
        throw new Error(response.error || getActionErrorLabel(action));
      }

      setItem(response.item);
      setCaseContext(response.caseContext ?? caseContext);
      setEditForm(buildEditState(response.item));
      setTargetOrgId(response.targetOrgId ?? targetOrgId);
      setAccessPath(response.accessPath ?? accessPath);
      setActionSuccess(getActionSuccessLabel(action));

      if (action === "restore") {
        router.replace(`/vault/exports/${response.item.id}${buildCaseQueryString()}`);
      }

      await fetchExport();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : getActionErrorLabel(action)
      );
    } finally {
      setActionLoading(null);
    }
  }

  const normalizedItems = useMemo<NormalizedExportItemRow[]>(
    () =>
      exportItems.map((row) => {
        const normalizedMessage = normalizeMessageRelation(row.vault_messages);

        return {
          ...row,
          vault_messages: normalizedMessage,
          __meta: {
            hasMessage: !!normalizedMessage,
            hasIncludedAt: hasValidIncludedAt(row),
            isValid: isValidExportItem(row),
          },
        };
      }),
    [exportItems]
  );

  const linkedMessageCount = normalizedItems.length;

  const exportDataHealth = useMemo(() => {
    if (!item) return null;

    const actualCount = normalizedItems.length;
    const expectedCount = item.file_count;

    return {
      expectedCount,
      actualCount,
      isMismatch: expectedCount !== actualCount,
    };
  }, [item, normalizedItems]);

  const invalidRowCount = useMemo(
    () => normalizedItems.filter((row) => !row.__meta.isValid).length,
    [normalizedItems]
  );

  const missingIncludedAtCount = useMemo(
    () => normalizedItems.filter((row) => !row.__meta.hasIncludedAt).length,
    [normalizedItems]
  );

  const missingMessageCount = useMemo(
    () => normalizedItems.filter((row) => !row.__meta.hasMessage).length,
    [normalizedItems]
  );

  const latestIncludedAt = useMemo(() => {
    const values = normalizedItems
      .map((row) => getIncludedAt(row))
      .filter((value): value is string => !!value)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return values[0] ?? null;
  }, [normalizedItems]);

  const earliestIncludedAt = useMemo(() => {
    const values = normalizedItems
      .map((row) => getIncludedAt(row))
      .filter((value): value is string => !!value)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return values[0] ?? null;
  }, [normalizedItems]);

  const isDeleted = Boolean(item?.deleted_at);

  const hasDownloadArtifact =
    typeof item?.has_storage_path === "boolean"
      ? item.has_storage_path
      : !!item?.storage_path;

  const hasManifest =
    typeof item?.has_manifest_hash === "boolean"
      ? item.has_manifest_hash
      : !!item?.manifest_hash_sha256;

  const artifactReady =
    typeof item?.artifact_ready === "boolean"
      ? item.artifact_ready
      : !!item && item.status === "completed" && hasDownloadArtifact && hasManifest;

  const isExportExpired = isExpired(item?.expires_at);

  const canApprove = !isDeleted && (item?.status === "queued" || item?.status === "processing");
  const canCancel =
    !isDeleted &&
    (item?.status === "queued" || item?.status === "approved" || item?.status === "processing");
  const canMarkProcessing =
    !isDeleted && (item?.status === "queued" || item?.status === "approved");
  const canMarkCompleted =
    !isDeleted &&
    (item?.status === "queued" || item?.status === "approved" || item?.status === "processing");
  const canMarkFailed =
    !isDeleted &&
    (item?.status === "queued" || item?.status === "approved" || item?.status === "processing");
  const canDownload = !isDeleted && item?.status === "completed" && artifactReady && !isExportExpired;
  const canRebuild =
    !isDeleted &&
    (typeof item?.can_rebuild === "boolean"
      ? item.can_rebuild
      : item?.format !== "pst" &&
        (item?.status === "completed" || item?.status === "failed" || item?.status === "cancelled"));
  const canRestore = isDeleted;

  const hasBlockingAction =
    saving ||
    downloadLoading ||
    rebuildLoading ||
    deleteLoading ||
    actionLoading !== null;

  const downloadDisabledReason = useMemo(() => {
    if (!item) return "Unavailable";
    if (isDeleted) return "Deleted";
    if (isExportExpired) return "Expired";
    if (item.status !== "completed") return "Not completed";
    if (!hasDownloadArtifact && !hasManifest) return "Artifact missing";
    if (!hasDownloadArtifact || !hasManifest) return "Artifact partial";
    if (!artifactReady) return "Not ready";
    return null;
  }, [item, isDeleted, isExportExpired, hasDownloadArtifact, hasManifest, artifactReady]);

  const activityItems = useMemo<ExportActivityItem[]>(() => {
    if (!item) return [];

    const timeline: ExportActivityItem[] = [
      {
        key: "created",
        label: "Export created",
        timestamp: item.created_at ?? item.requested_at ?? null,
        tone: "info",
        detail: item.requested_by ? `Requested by ${item.requested_by}` : "Request recorded",
      },
      {
        key: "requested",
        label: "Export requested",
        timestamp: item.requested_at ?? null,
        tone: "default",
        detail: `Current status: ${item.status}`,
      },
    ];

    if (exportCaseId) {
      timeline.push({
        key: "case_context",
        label: "Case context preserved",
        timestamp: item.created_at ?? item.requested_at ?? null,
        tone: "info",
        detail: caseContext?.name
          ? `${caseContext.name} (${exportCaseId})`
          : `Case ID: ${exportCaseId}`,
      });
    }

    if (item.approved_by) {
      timeline.push({
        key: "approved",
        label: "Export approved",
        timestamp: item.updated_at ?? null,
        tone: "success",
        detail: `Approved by ${item.approved_by}`,
      });
    }

    if (item.status === "processing") {
      timeline.push({
        key: "processing",
        label: "Export processing",
        timestamp: item.updated_at ?? null,
        tone: "warning",
        detail: "Export has moved into processing state.",
      });
    }

    if (item.status === "completed") {
      timeline.push({
        key: "completed",
        label: "Export completed",
        timestamp: item.completed_at ?? item.updated_at ?? null,
        tone: "success",
        detail:
          item.storage_path || item.manifest_hash_sha256
            ? "Completion metadata recorded."
            : "Completed without storage metadata.",
      });
    }

    if (item.status === "failed") {
      timeline.push({
        key: "failed",
        label: "Export failed",
        timestamp: item.updated_at ?? null,
        tone: "danger",
        detail: item.notes ? "Failure details may be present in notes." : "No failure note recorded.",
      });
    }

    if (item.status === "cancelled") {
      timeline.push({
        key: "cancelled",
        label: "Export cancelled",
        timestamp: item.updated_at ?? null,
        tone: "danger",
        detail: item.notes ? "Cancellation note recorded." : "Cancelled without note.",
      });
    }

    if (item.deleted_at) {
      timeline.push({
        key: "deleted",
        label: "Export soft-deleted",
        timestamp: item.deleted_at,
        tone: "danger",
        detail: item.deleted_by ? `Deleted by ${item.deleted_by}` : "Deleted export record retained for restore.",
      });
    }

    if (item.storage_path || item.manifest_hash_sha256) {
      timeline.push({
        key: "artifact_metadata",
        label: "Artifact metadata present",
        timestamp: item.updated_at ?? item.completed_at ?? null,
        tone: artifactReady ? "success" : "warning",
        detail: artifactReady
          ? "Storage path and manifest hash are both present."
          : "Artifact metadata is only partially populated.",
      });
    }

    if (item.expires_at) {
      timeline.push({
        key: "expiration",
        label: isExportExpired ? "Export expired" : "Export expiration set",
        timestamp: item.expires_at,
        tone: isExportExpired ? "danger" : "warning",
        detail: isExportExpired
          ? "Download access is blocked because this export has expired."
          : "This export has a future expiration date.",
      });
    }

    if (earliestIncludedAt) {
      timeline.push({
        key: "first_included",
        label: "First linked item included",
        timestamp: earliestIncludedAt,
        tone: "default",
        detail: `${linkedMessageCount} linked item${linkedMessageCount === 1 ? "" : "s"} attached.`,
      });
    }

    if (latestIncludedAt && latestIncludedAt !== earliestIncludedAt) {
      timeline.push({
        key: "latest_included",
        label: "Latest linked item included",
        timestamp: latestIncludedAt,
        tone: "default",
        detail: "Latest evidence timestamp from linked export items.",
      });
    }

    if (exportDataHealth?.isMismatch) {
      timeline.push({
        key: "health_mismatch",
        label: "Data health mismatch detected",
        timestamp: item.updated_at ?? null,
        tone: "warning",
        detail: `Expected ${exportDataHealth.expectedCount}, found ${exportDataHealth.actualCount}.`,
      });
    }

    return timeline.sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [
    item,
    exportCaseId,
    caseContext?.name,
    earliestIncludedAt,
    latestIncludedAt,
    linkedMessageCount,
    exportDataHealth,
    artifactReady,
    isExportExpired,
  ]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Export Details
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View export status, linked evidence items, and request metadata.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={exportsBackHref}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Back to Exports
            </Link>

            {exportCaseId ? (
              <>
                <Link
                  href={`/vault/cases/${exportCaseId}`}
                  className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
                >
                  Back to Case
                </Link>

                <Link
                  href={`/vault/cases/${exportCaseId}/search`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Case Search
                </Link>
              </>
            ) : null}

            {canRestore ? (
              <button
                type="button"
                onClick={() => runAction("restore")}
                disabled={hasBlockingAction}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "restore"
                  ? getActionLoadingLabel("restore")
                  : getActionLabel("restore")}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleDownload}
              disabled={!canDownload || downloadLoading || actionLoading !== null || rebuildLoading || deleteLoading || saving}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50 ${
                canDownload
                  ? "bg-indigo-600 hover:opacity-90 disabled:cursor-not-allowed"
                  : "cursor-not-allowed bg-slate-400"
              }`}
              title={
                canDownload
                  ? "Download the completed export artifact"
                  : downloadDisabledReason || "No export artifact is available yet"
              }
            >
              {downloadLoading
                ? "Downloading..."
                : canDownload
                  ? "Download Export"
                  : downloadDisabledReason || "Unavailable"}
            </button>

            {canRebuild ? (
              <button
                type="button"
                onClick={handleRebuild}
                disabled={rebuildLoading || actionLoading !== null || downloadLoading || saving || deleteLoading}
                className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                title="Regenerate the stored export artifact"
              >
                {rebuildLoading ? "Rebuilding..." : "Rebuild Export"}
              </button>
            ) : null}

            {canApprove ? (
              <button
                type="button"
                onClick={() => runAction("approve")}
                disabled={actionLoading !== null || downloadLoading || rebuildLoading || deleteLoading}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "approve"
                  ? getActionLoadingLabel("approve")
                  : getActionLabel("approve")}
              </button>
            ) : null}

            {canCancel ? (
              <button
                type="button"
                onClick={() => runAction("cancel")}
                disabled={actionLoading !== null || downloadLoading || rebuildLoading || deleteLoading}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "cancel"
                  ? getActionLoadingLabel("cancel")
                  : getActionLabel("cancel")}
              </button>
            ) : null}

            {canMarkProcessing ? (
              <button
                type="button"
                onClick={() => runAction("mark_processing")}
                disabled={actionLoading !== null || downloadLoading || rebuildLoading || deleteLoading}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "mark_processing"
                  ? getActionLoadingLabel("mark_processing")
                  : getActionLabel("mark_processing")}
              </button>
            ) : null}

            {canMarkCompleted ? (
              <button
                type="button"
                onClick={() => runAction("mark_completed")}
                disabled={actionLoading !== null || downloadLoading || rebuildLoading || deleteLoading}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "mark_completed"
                  ? getActionLoadingLabel("mark_completed")
                  : getActionLabel("mark_completed")}
              </button>
            ) : null}

            {canMarkFailed ? (
              <button
                type="button"
                onClick={() => runAction("mark_failed")}
                disabled={actionLoading !== null || downloadLoading || rebuildLoading || deleteLoading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === "mark_failed"
                  ? getActionLoadingLabel("mark_failed")
                  : getActionLabel("mark_failed")}
              </button>
            ) : null}

            {!isDeleted ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={hasBlockingAction}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                title="Soft-delete this export"
              >
                {deleteLoading ? "Deleting..." : "Delete Export"}
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading export details...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
          {error}
        </section>
      ) : !item ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Export not found.
        </section>
      ) : (
        <>
          {isCaseExport && exportCaseId ? (
            <section className="rounded-2xl border border-sky-200 bg-sky-50 p-5 dark:border-sky-900/60 dark:bg-sky-950/30">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">
                    Case Export Context
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {caseContext?.name || "This export is linked to a Vault case."}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Case tracking is being preserved through filters.caseId / filters.case_id until the future vault_exports.case_id schema migration is added.
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{exportCaseId}</span>
                    {caseContext?.status ? <span>Status: {caseContext.status}</span> : null}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/vault/cases/${exportCaseId}`}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
                  >
                    Open Case
                  </Link>

                  <Link
                    href={`/vault/cases/${exportCaseId}/search`}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Case Search
                  </Link>

                  <Link
                    href={`/vault/cases/${exportCaseId}/holds`}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Case Holds
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          {isDeleted ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  This export is currently deleted.
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Deleted at: {formatDateTime(item.deleted_at)} • Deleted by: {item.deleted_by || "—"}
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  Most edit, lifecycle, rebuild, and download actions are blocked until this export is restored.
                </p>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Export Status
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                      item.status
                    )}`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Artifact State
                </p>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getArtifactStateBadgeClass(
                      hasDownloadArtifact,
                      hasManifest
                    )}`}
                  >
                    {getArtifactStateLabel(hasDownloadArtifact, hasManifest, item.artifact_state)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Storage: {hasDownloadArtifact ? "Yes" : "No"} • Manifest: {hasManifest ? "Yes" : "No"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Export Type
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {item.export_type}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Format: {item.format}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  File Count
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {item.file_count}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Size: {formatBytes(item.total_size_bytes)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Requested
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {formatDateTime(item.requested_at)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Completed: {formatDateTime(item.completed_at)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Linked Items
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {linkedMessageCount}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Requested By
                </p>
                <p className="mt-2 break-all text-sm text-slate-900 dark:text-slate-100">
                  {item.requested_by || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Approved By
                </p>
                <p className="mt-2 break-all text-sm text-slate-900 dark:text-slate-100">
                  {item.approved_by || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Expires
                </p>
                <p className="mt-2 text-sm text-slate-900 dark:text-slate-100">
                  {formatDateTime(item.expires_at)}
                </p>
                {isExportExpired ? (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                    Expired
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Storage Path
                </p>
                <p className="mt-2 break-all text-sm text-slate-900 dark:text-slate-100">
                  {item.storage_path || "—"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Manifest Hash
                </p>
                <p className="mt-2 break-all text-sm text-slate-900 dark:text-slate-100">
                  {item.manifest_hash_sha256 || "—"}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Target Org: {targetOrgId ?? "—"}</span>
              <span>Access Path: {accessPath ?? "—"}</span>
              <span>Export ID: {item.id}</span>
              {exportCaseId ? <span>Case ID: {exportCaseId}</span> : null}
              {caseContext?.name ? <span>Case: {caseContext.name}</span> : null}
            </div>

            {item.format === "pst" ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                PST rebuild is not supported yet. Leave PST exports on the current manual or deferred pipeline.
              </div>
            ) : null}

            {item.status === "completed" && !artifactReady ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
                This export is completed, but the downloadable artifact is not fully ready yet.
              </div>
            ) : null}

            {isExportExpired ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                This export has expired. Download access is blocked until the expiration is extended or the export is rebuilt under a new lifecycle.
              </div>
            ) : null}

            {(hasDownloadArtifact && !hasManifest) || (!hasDownloadArtifact && hasManifest) ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Artifact metadata is only partially populated. Rebuild Export is recommended to bring the stored file and manifest metadata back into sync.
              </div>
            ) : null}

            {!canDownload && canRebuild ? (
              <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-700 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300">
                This export can be rebuilt even though it is not currently downloadable. A successful rebuild should regenerate the artifact and restore a clean completed state.
              </div>
            ) : null}

            {exportDataHealth?.isMismatch && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                Data mismatch detected: export file_count ({exportDataHealth.expectedCount}) does not match linked items ({exportDataHealth.actualCount})
              </div>
            )}

            {(invalidRowCount > 0 || missingIncludedAtCount > 0 || missingMessageCount > 0) && (
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Invalid Rows
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {invalidRowCount}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Missing Included At
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {missingIncludedAtCount}
                  </p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Missing Message Links
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                    {missingMessageCount}
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,1fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Edit Export
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Update notes, export expiration, and completion metadata.
                </p>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Notes
                    </label>
                    <textarea
                      className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-50"
                      value={editForm.notes}
                      onChange={(e) => handleEditChange("notes", e.target.value)}
                      placeholder="Export notes"
                      disabled={isDeleted}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Expires At
                    </label>
                    <input
                      type="datetime-local"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-50"
                      value={editForm.expiresAt}
                      onChange={(e) => handleEditChange("expiresAt", e.target.value)}
                      disabled={isDeleted}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Storage Path
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-50"
                      value={editForm.storagePath}
                      onChange={(e) => handleEditChange("storagePath", e.target.value)}
                      placeholder="Optional completion storage path"
                      disabled={isDeleted}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Manifest Hash SHA256
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950 disabled:opacity-50"
                      value={editForm.manifestHashSha256}
                      onChange={(e) => handleEditChange("manifestHashSha256", e.target.value)}
                      placeholder="Optional manifest hash for completion"
                      disabled={isDeleted}
                    />
                  </div>
                </div>

                {saveError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {saveError}
                  </div>
                )}

                {saveSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {saveSuccess}
                  </div>
                )}

                {actionError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {actionError}
                  </div>
                )}

                {actionSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {actionSuccess}
                  </div>
                )}

                {downloadError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {downloadError}
                  </div>
                )}

                {downloadSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {downloadSuccess}
                  </div>
                )}

                {rebuildError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {rebuildError}
                  </div>
                )}

                {rebuildSuccess && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {rebuildSuccess}
                  </div>
                )}

                {deleteError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={isDeleted || saving || downloadLoading || rebuildLoading || deleteLoading}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm(buildEditState(item))}
                    disabled={isDeleted || saving || downloadLoading || rebuildLoading || deleteLoading}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Activity
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Derived lifecycle timeline for this export.
                </p>
              </div>

              {activityItems.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                  No activity available.
                </div>
              ) : (
                <div className="space-y-3">
                  {activityItems.map((activity) => (
                    <div
                      key={activity.key}
                      className={`rounded-xl border px-4 py-3 ${getActivityToneClass(activity.tone)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">{activity.label}</p>
                          <p className="text-xs opacity-80">{activity.detail || "—"}</p>
                        </div>
                        <div className="text-right text-xs opacity-80">
                          {formatDateTime(activity.timestamp)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Request Metadata
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Captured filters and request metadata for this export.
              </p>
            </div>

            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              {tryFormatJson(item.filters)}
            </pre>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Linked Export Items
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Evidence items included in this export request.
              </p>
            </div>

            {normalizedItems.length === 0 ? (
              <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
                No export items are attached to this request.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Message
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Sender
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Included
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Hold State
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Attachments
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Size
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {normalizedItems.map((row) => {
                      const message = row.vault_messages;

                      return (
                        <tr
                          key={row.id}
                          className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {message?.subject || "(No Subject)"}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {row.message_id}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                Included: {formatDateTime(getIncludedAt(row))}
                              </div>

                              {exportCaseId ? (
                                <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-800 dark:bg-sky-900/30 dark:text-sky-300">
                                  Case Evidence
                                </span>
                              ) : null}

                              {!row.__meta.hasIncludedAt && (
                                <div className="text-xs text-amber-600 dark:text-amber-400">
                                  Missing included_at
                                </div>
                              )}

                              {!row.__meta.hasMessage && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  Message not found
                                </div>
                              )}

                              {!row.__meta.isValid && (
                                <div className="text-xs text-red-600 dark:text-red-400">
                                  Invalid export item row
                                </div>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                            {message?.sender_email || "—"}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                            {formatDateTime(getIncludedAt(row))}
                          </td>

                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                message?.on_hold
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              }`}
                            >
                              {message?.on_hold ? "On Hold" : "Not On Hold"}
                            </span>
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                            {message?.has_attachments ? message.attachment_count : 0}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                            {formatBytes(message?.size_bytes)}
                          </td>

                          <td className="px-4 py-4">
                            <Link
                              href={`/vault/messages/${row.message_id}${
                                exportCaseId ? `?caseId=${encodeURIComponent(exportCaseId)}` : ""
                              }`}
                              className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                            >
                              Open message
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}