"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultMessageRecord = {
  id: string;
  org_id: string;
  source_id?: string | null;
  custodian_id: string | null;
  internet_message_id?: string | null;
  conversation_id?: string | null;
  subject: string | null;
  sender_email: string | null;
  sender_name?: string | null;
  recipient_emails?: string[] | null;
  cc_emails?: string[] | null;
  bcc_emails?: string[] | null;
  sent_at: string | null;
  received_at: string | null;
  body_text?: string | null;
  body_html?: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  on_hold?: boolean | null;
  disposition_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type VaultCaseScope = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number: string | null;
  custodianCount: number;
};

type VaultSearchResponse = {
  ok?: boolean;
  items?: VaultMessageRecord[];
  total?: number;
  limit?: number;
  offset?: number;
  caseScope?: VaultCaseScope | null;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
  message?: string;
};

type CreateExportResponse = {
  ok?: boolean;
  item?: {
    id: string;
    name: string;
    status: string;
    format: string;
    file_count?: number;
    total_size_bytes?: number;
  };
  error?: string;
  message?: string;
};

type ExportFormat = "zip" | "json" | "csv" | "eml" | "pst";

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

function getHoldBadgeClass(onHold?: boolean | null) {
  if (onHold) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getDispositionBadgeClass(status?: string | null) {
  if (status === "retained" || status === "preserved") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "eligible_for_deletion" || status === "expired") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }

  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

function getMessageDate(message: VaultMessageRecord) {
  return message.sent_at ?? message.received_at ?? message.created_at ?? null;
}

function getRecipientSummary(message: VaultMessageRecord) {
  const values = [
    ...(message.recipient_emails ?? []),
    ...(message.cc_emails ?? []),
    ...(message.bcc_emails ?? []),
  ].filter(Boolean);

  if (!values.length) return "—";

  const visible = values.slice(0, 3).join(", ");
  const remaining = values.length - 3;

  return remaining > 0 ? `${visible} +${remaining} more` : visible;
}

function buildCsvValue(value: string | number | boolean | null | undefined) {
  const normalized = String(value ?? "");
  return `"${normalized.replace(/"/g, '""')}"`;
}

export default function CaseSearchPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = useMemo(() => {
    const raw = params?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const q = searchParams.get("q")?.trim() ?? "";
  const sender = searchParams.get("sender")?.trim() ?? "";
  const recipient = searchParams.get("recipient")?.trim() ?? "";
  const hasAttachments = searchParams.get("hasAttachments") ?? "";
  const onHold = searchParams.get("onHold") ?? "";
  const dispositionStatus = searchParams.get("dispositionStatus") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const limit = sanitizeLimit(toInt(searchParams.get("limit"), 25));
  const offset = sanitizeOffset(toInt(searchParams.get("offset"), 0));

  const [items, setItems] = useState<VaultMessageRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [caseScope, setCaseScope] = useState<VaultCaseScope | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<
    "org_role" | "support_grant" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("zip");
  const [exportName, setExportName] = useState("");
  const [exportNotes, setExportNotes] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const hasFilters = Boolean(
    q ||
      sender ||
      recipient ||
      hasAttachments ||
      onHold ||
      dispositionStatus ||
      dateFrom ||
      dateTo
  );

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

      if (!Object.prototype.hasOwnProperty.call(updates, "offset")) {
        qs.set("offset", "0");
      }

      const query = qs.toString();
      router.push(
        query
          ? `/vault/cases/${caseId}/search?${query}`
          : `/vault/cases/${caseId}/search`
      );
    },
    [router, searchParams, caseId]
  );

  const fetchMessages = useCallback(async () => {
    if (!caseId) {
      setError("A valid case id is required.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setExportError(null);
    setExportSuccess(null);

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
        limit: String(limit),
        offset: String(offset),
      });

      if (q) qs.set("q", q);
      if (sender) qs.set("sender", sender);
      if (recipient) qs.set("recipient", recipient);
      if (hasAttachments) qs.set("hasAttachments", hasAttachments);
      if (onHold) qs.set("onHold", onHold);
      if (dispositionStatus) qs.set("dispositionStatus", dispositionStatus);
      if (dateFrom) qs.set("dateFrom", dateFrom);
      if (dateTo) qs.set("dateTo", dateTo);

      const res = await fetch(`/api/vault/search?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as VaultSearchResponse;

      if (!res.ok) {
        throw new Error(
          payload.error || payload.message || "Unable to load case search results."
        );
      }

      const nextItems = payload.items ?? [];

      setItems(nextItems);
      setTotal(Number(payload.total ?? nextItems.length));
      setCaseScope(payload.caseScope ?? null);
      setTargetOrgId(payload.targetOrgId ?? null);
      setAccessPath(payload.accessPath ?? null);
      setSelectedIds((current) =>
        current.filter((id) => nextItems.some((item) => item.id === id))
      );
    } catch (err) {
      setItems([]);
      setTotal(0);
      setCaseScope(null);
      setTargetOrgId(null);
      setAccessPath(null);
      setError(
        err instanceof Error ? err.message : "Unable to load case search results."
      );
    } finally {
      setLoading(false);
    }
  }, [
    caseId,
    q,
    sender,
    recipient,
    hasAttachments,
    onHold,
    dispositionStatus,
    dateFrom,
    dateTo,
    limit,
    offset,
  ]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const summary = useMemo(() => {
    const pageTotal = items.length;
    const withAttachments = items.filter((item) =>
      Boolean(item.has_attachments)
    ).length;
    const onHoldCount = items.filter((item) => Boolean(item.on_hold)).length;
    const totalSizeBytes = items.reduce(
      (sum, item) => sum + Number(item.size_bytes ?? 0),
      0
    );
    const attachmentCount = items.reduce(
      (sum, item) => sum + Number(item.attachment_count ?? 0),
      0
    );

    return {
      pageTotal,
      total,
      withAttachments,
      onHoldCount,
      totalSizeBytes,
      attachmentCount,
    };
  }, [items, total]);

  const selectedMessages = useMemo(() => {
    const selected = new Set(selectedIds);
    return items.filter((item) => selected.has(item.id));
  }, [items, selectedIds]);

  const selectedSizeBytes = useMemo(() => {
    return selectedMessages.reduce(
      (sum, item) => sum + Number(item.size_bytes ?? 0),
      0
    );
  }, [selectedMessages]);

  const allVisibleSelected = useMemo(() => {
    if (!items.length) return false;
    return items.every((item) => selectedIds.includes(item.id));
  }, [items, selectedIds]);

  function toggleMessage(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    );
  }

  function toggleVisibleMessages() {
    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !items.some((item) => item.id === id))
      );
      return;
    }

    setSelectedIds((current) =>
      Array.from(new Set([...current, ...items.map((item) => item.id)]))
    );
  }

  function clearSelectedMessages() {
    setSelectedIds([]);
  }

  function handleDownloadVisibleCsv() {
    if (!items.length) return;

    const header = [
      "Message ID",
      "Subject",
      "Sender Name",
      "Sender Email",
      "Recipients",
      "Date",
      "On Hold",
      "Disposition",
      "Attachments",
      "Attachment Count",
      "Size Bytes",
    ];

    const rows = items.map((message) => [
      message.id,
      message.subject ?? "",
      message.sender_name ?? "",
      message.sender_email ?? "",
      getRecipientSummary(message),
      formatDateTime(getMessageDate(message)),
      message.on_hold ? "Yes" : "No",
      message.disposition_status ?? "active",
      message.has_attachments ? "Yes" : "No",
      message.attachment_count ?? 0,
      message.size_bytes ?? 0,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => buildCsvValue(value)).join(","))
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `vault-case-${caseId}-visible-search-results.csv`;
    anchor.click();

    URL.revokeObjectURL(url);
  }

  async function handleCreateExport() {
    if (!caseId) return;

    setExportError(null);
    setExportSuccess(null);

    if (!selectedIds.length) {
      setExportError("Select at least one message before creating a case export.");
      return;
    }

    setExporting(true);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const now = new Date().toISOString();
      const name =
        exportName.trim() ||
        `${caseScope?.name || "Case"} Export ${now.replace(/[:.]/g, "-")}`;

      const res = await fetch("/api/vault/exports", {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          caseId,
          case_id: caseId,
          exportType: "case_export",
          export_type: "case_export",
          format: exportFormat,
          notes: exportNotes.trim() || null,
          messageIds: selectedIds,
          message_ids: selectedIds,
          filters: {
            caseId,
            case_id: caseId,
            caseName: caseScope?.name ?? null,
            case_name: caseScope?.name ?? null,
            caseMatterNumber: caseScope?.matter_number ?? null,
            case_matter_number: caseScope?.matter_number ?? null,
            source: "case_search_page",
            q: q || null,
            sender: sender || null,
            recipient: recipient || null,
            hasAttachments: hasAttachments || null,
            onHold: onHold || null,
            dispositionStatus: dispositionStatus || null,
            dateFrom: dateFrom || null,
            dateTo: dateTo || null,
            selectedCount: selectedIds.length,
          },
        }),
      });

      const payload = (await res.json()) as CreateExportResponse;

      if (!res.ok || !payload.item?.id) {
        throw new Error(
          payload.error || payload.message || "Unable to create case export."
        );
      }

      setExportSuccess(`Case export created successfully: ${payload.item.name}`);
      setSelectedIds([]);
      setExportName("");
      setExportNotes("");

      router.push(
        `/vault/exports/${payload.item.id}?caseId=${encodeURIComponent(
          caseId
        )}&includeItems=true`
      );
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Unable to create case export."
      );
    } finally {
      setExporting(false);
    }
  }

  const previousOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;
  const canGoPrevious = offset > 0;
  const canGoNext = items.length >= limit;
  const currentPage = Math.floor(offset / limit) + 1;
  const visibleStart = items.length ? offset + 1 : 0;
  const visibleEnd = offset + items.length;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Case Workspace
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Case Search
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Search messages scoped to this case’s assigned custodians. This
              page does not query vault_messages.case_id.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Case ID: {caseId}</span>
              {caseScope?.name ? <span>Case: {caseScope.name}</span> : null}
              {caseScope?.matter_number ? (
                <span>Matter: {caseScope.matter_number}</span>
              ) : null}
              {caseScope?.status ? (
                <span>Status: {caseScope.status}</span>
              ) : null}
              {caseScope?.priority ? (
                <span>Priority: {caseScope.priority}</span>
              ) : null}
              {typeof caseScope?.custodianCount === "number" ? (
                <span>Custodians: {caseScope.custodianCount}</span>
              ) : null}
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
              href={`/vault/cases/${caseId}/holds`}
              className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-950/40"
            >
              Case Holds
            </Link>

            <Link
              href={`/vault/cases/${caseId}/exports`}
              className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
            >
              Case Exports
            </Link>

            <button
              type="button"
              onClick={fetchMessages}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total Results
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.total}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Page {currentPage}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Visible
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.pageTotal}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {visibleStart}-{visibleEnd}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Selected
          </p>
          <p className="mt-2 text-2xl font-semibold text-sky-700 dark:text-sky-300">
            {selectedIds.length}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {formatBytes(selectedSizeBytes)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            On Hold
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {summary.onHoldCount}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Attachments
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.attachmentCount}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {summary.withAttachments} messages
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Visible Size
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {formatBytes(summary.totalSizeBytes)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 md:grid-cols-7">
          <div className="md:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Keyword
            </label>
            <input
              type="search"
              value={q}
              onChange={(e) => updateQuery({ q: e.target.value })}
              placeholder="Subject, sender, body text"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sender
            </label>
            <input
              type="search"
              value={sender}
              onChange={(e) => updateQuery({ sender: e.target.value })}
              placeholder="sender@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Recipient
            </label>
            <input
              type="search"
              value={recipient}
              onChange={(e) => updateQuery({ recipient: e.target.value })}
              placeholder="recipient@example.com"
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Attachments
            </label>
            <select
              value={hasAttachments}
              onChange={(e) => updateQuery({ hasAttachments: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Any</option>
              <option value="true">Has attachments</option>
              <option value="false">No attachments</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Hold
            </label>
            <select
              value={onHold}
              onChange={(e) => updateQuery({ onHold: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Any</option>
              <option value="true">On hold</option>
              <option value="false">Not on hold</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Disposition
            </label>
            <select
              value={dispositionStatus}
              onChange={(e) =>
                updateQuery({ dispositionStatus: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="">Any</option>
              <option value="active">Active</option>
              <option value="retained">Retained</option>
              <option value="preserved">Preserved</option>
              <option value="eligible_for_deletion">
                Eligible for deletion
              </option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => updateQuery({ dateFrom: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => updateQuery({ dateTo: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Page Size
            </label>
            <select
              value={String(limit)}
              onChange={(e) => updateQuery({ limit: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div className="flex items-end">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => router.push(`/vault/cases/${caseId}/search`)}
                className="min-h-[38px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset Filters
              </button>
            ) : (
              <button
                type="button"
                onClick={fetchMessages}
                className="min-h-[38px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Run Search
              </button>
            )}
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleDownloadVisibleCsv}
              disabled={!items.length}
              className="min-h-[38px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Download Visible CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing {visibleStart}-{visibleEnd} of {summary.total} results.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoPrevious}
              onClick={() => updateQuery({ offset: String(previousOffset) })}
              className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => updateQuery({ offset: String(nextOffset) })}
              className="min-h-[38px] rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_260px]">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Export Name
            </label>
            <input
              type="text"
              value={exportName}
              onChange={(e) => setExportName(e.target.value)}
              placeholder={`${caseScope?.name || "Case"} Export`}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as ExportFormat)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="zip">ZIP</option>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="eml">EML</option>
              <option value="pst">PST</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={handleCreateExport}
              disabled={exporting || selectedIds.length === 0}
              className="min-h-[38px] w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {exporting
                ? "Creating Export..."
                : `Create Export (${selectedIds.length})`}
            </button>
          </div>
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Export Notes
          </label>
          <textarea
            value={exportNotes}
            onChange={(e) => setExportNotes(e.target.value)}
            placeholder="Optional export notes"
            className="mt-1 min-h-[72px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleVisibleMessages}
            disabled={!items.length}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {allVisibleSelected ? "Clear Visible" : "Select Visible"}
          </button>

          <button
            type="button"
            onClick={clearSelectedMessages}
            disabled={!selectedIds.length}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Clear Selected
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selected size: {formatBytes(selectedSizeBytes)}
          </p>
        </div>

        {exportError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {exportError}
          </div>
        ) : null}

        {exportSuccess ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
            {exportSuccess}
          </div>
        ) : null}
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading case search results...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
          {error}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No case messages found
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Try adjusting your filters or confirm this case has assigned
            custodians with ingested messages.
          </p>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Case Search Results
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Showing messages returned from the case-scoped search API.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleVisibleMessages}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {allVisibleSelected ? "Clear Visible" : "Select Visible"}
              </button>

              <button
                type="button"
                onClick={handleDownloadVisibleCsv}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="w-12 px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Select
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Message
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Sender
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Recipients
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Hold / Disposition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Attachments
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((message) => {
                  const isSelected = selectedIds.includes(message.id);

                  return (
                    <tr
                      key={message.id}
                      className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleMessage(message.id)}
                          aria-label={`Select message ${message.id}`}
                        />
                      </td>

                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <Link
                            href={`/vault/messages/${
                              message.id
                            }?caseId=${encodeURIComponent(caseId)}`}
                            className="text-sm font-medium text-slate-900 hover:underline dark:text-slate-100"
                          >
                            {message.subject || "(No Subject)"}
                          </Link>

                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {message.id}
                          </div>

                          {message.internet_message_id ? (
                            <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                              Internet Message ID:{" "}
                              {message.internet_message_id}
                            </div>
                          ) : null}

                          {message.conversation_id ? (
                            <div className="line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
                              Conversation: {message.conversation_id}
                            </div>
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        <div>{message.sender_name || "—"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {message.sender_email || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        <div className="max-w-[260px] truncate">
                          {getRecipientSummary(message)}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        {formatDateTime(getMessageDate(message))}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${getHoldBadgeClass(
                              message.on_hold
                            )}`}
                          >
                            {message.on_hold ? "On Hold" : "Not On Hold"}
                          </span>

                          <span
                            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-medium ${getDispositionBadgeClass(
                              message.disposition_status
                            )}`}
                          >
                            {titleCase(message.disposition_status || "active")}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                        <div>{message.has_attachments ? "Yes" : "No"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Count: {message.attachment_count ?? 0}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Size: {formatBytes(message.size_bytes)}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-2">
                          <Link
                            href={`/vault/messages/${
                              message.id
                            }?caseId=${encodeURIComponent(caseId)}`}
                            className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                          >
                            Open message
                          </Link>

                          <button
                            type="button"
                            onClick={() => toggleMessage(message.id)}
                            className="text-left text-sm text-slate-700 hover:underline dark:text-slate-200"
                          >
                            {isSelected ? "Remove from export" : "Add to export"}
                          </button>
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