"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultAuditRow = {
  id: string;
  org_id: string;
  action: string;
  actor_user_id: string | null;
  actor_email: string | null;
  entity_type: string;
  entity_id: string | null;
  status: "success" | "failure" | "warning";
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type VaultAuditResponse = {
  ok: boolean;
  items?: VaultAuditRow[];
  total?: number;
  limit?: number;
  offset?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type AuditFiltersState = {
  q: string;
  action: string;
  entityType: string;
  actorUserId: string;
  status: "" | "success" | "failure" | "warning";
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_LIMIT = 50;

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function truncate(value: string, max = 120) {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}…`;
}

function parseFilters(searchParams: URLSearchParams): AuditFiltersState {
  const status = searchParams.get("status");

  return {
    q: searchParams.get("q") ?? "",
    action: searchParams.get("action") ?? "",
    entityType: searchParams.get("entityType") ?? "",
    actorUserId: searchParams.get("actorUserId") ?? "",
    status:
      status === "success" || status === "failure" || status === "warning"
        ? status
        : "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

function buildQueryString(filters: AuditFiltersState, offset: number, limit: number) {
  const params = new URLSearchParams();

  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.action.trim()) params.set("action", filters.action.trim());
  if (filters.entityType.trim()) params.set("entityType", filters.entityType.trim());
  if (filters.actorUserId.trim()) params.set("actorUserId", filters.actorUserId.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

function prettyJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return "{}";
  }
}

export default function VaultAuditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = useMemo(() => parseFilters(searchParams), [searchParams]);

  const initialOffset = useMemo(() => {
    const raw = Number(searchParams.get("offset") ?? "0");
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }, [searchParams]);

  const initialLimit = useMemo(() => {
    const raw = Number(searchParams.get("limit") ?? String(DEFAULT_LIMIT));
    if (!Number.isFinite(raw)) return DEFAULT_LIMIT;
    if (raw < 1) return DEFAULT_LIMIT;
    if (raw > 200) return 200;
    return raw;
  }, [searchParams]);

  const [filters, setFilters] = useState<AuditFiltersState>(initialFilters);
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);

  const [rows, setRows] = useState<VaultAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const syncUrl = useCallback(
    (nextFilters: AuditFiltersState, nextOffset: number) => {
      const queryString = buildQueryString(nextFilters, nextOffset, limit);
      router.replace(`/vault/audit?${queryString}`, { scroll: false });
    },
    [router, limit]
  );

  const fetchResults = useCallback(
    async (activeFilters: AuditFiltersState, activeOffset: number) => {
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

        const queryString = buildQueryString(activeFilters, activeOffset, limit);
        const res = await fetch(`/api/vault/audit?${queryString}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await res.json()) as VaultAuditResponse;

        if (!res.ok || !payload.ok) {
          throw new Error(payload.error || "Vault audit lookup failed.");
        }

        setRows(payload.items ?? []);
        setTotal(payload.total ?? 0);
        setTargetOrgId(payload.targetOrgId ?? null);
        setAccessPath(payload.accessPath ?? null);
      } catch (err) {
        setRows([]);
        setTotal(0);
        setTargetOrgId(null);
        setAccessPath(null);
        setError(err instanceof Error ? err.message : "Vault audit lookup failed.");
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    const nextFilters = parseFilters(searchParams);
    const nextOffsetRaw = Number(searchParams.get("offset") ?? "0");
    const nextOffset =
      Number.isFinite(nextOffsetRaw) && nextOffsetRaw >= 0 ? nextOffsetRaw : 0;

    setFilters(nextFilters);
    setOffset(nextOffset);
    fetchResults(nextFilters, nextOffset);
  }, [searchParams, fetchResults]);

  function handleFilterChange<K extends keyof AuditFiltersState>(
    key: K,
    value: AuditFiltersState[K]
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSearch() {
    setOffset(0);
    syncUrl(filters, 0);
  }

  function handleReset() {
    const resetFilters: AuditFiltersState = {
      q: "",
      action: "",
      entityType: "",
      actorUserId: "",
      status: "",
      dateFrom: "",
      dateTo: "",
    };

    setFilters(resetFilters);
    setOffset(0);
    syncUrl(resetFilters, 0);
  }

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const canGoPrevious = offset > 0;
  const canGoNext = offset + limit < total;

  function handlePrevious() {
    if (!canGoPrevious) return;
    const nextOffset = Math.max(0, offset - limit);
    setOffset(nextOffset);
    syncUrl(filters, nextOffset);
  }

  function handleNext() {
    if (!canGoNext) return;
    const nextOffset = offset + limit;
    setOffset(nextOffset);
    syncUrl(filters, nextOffset);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
            Vault
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Audit
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Review audit activity across search, hold, export, and archive operations.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <label htmlFor="audit-q" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Search
            </label>
            <input
              id="audit-q"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="action, entity, actor..."
              value={filters.q}
              onChange={(e) => handleFilterChange("q", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="audit-action" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Action
            </label>
            <input
              id="audit-action"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="vault.export.create"
              value={filters.action}
              onChange={(e) => handleFilterChange("action", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="audit-entity" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Entity Type
            </label>
            <input
              id="audit-entity"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="vault_export"
              value={filters.entityType}
              onChange={(e) => handleFilterChange("entityType", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="audit-actor" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Actor User ID
            </label>
            <input
              id="audit-actor"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="user uuid"
              value={filters.actorUserId}
              onChange={(e) => handleFilterChange("actorUserId", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="audit-status" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
            </label>
            <select
              id="audit-status"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.status}
              onChange={(e) =>
                handleFilterChange("status", e.target.value as AuditFiltersState["status"])
              }
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="audit-datefrom" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Date From
            </label>
            <input
              id="audit-datefrom"
              type="date"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="audit-dateto" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Date To
            </label>
            <input
              id="audit-dateto"
              type="date"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange("dateTo", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSearch}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
          >
            Search
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Reset
          </button>

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Target Org: {targetOrgId ?? "—"}</span>
            <span>Access Path: {accessPath ?? "—"}</span>
            <span>Total: {total}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Audit Events
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Page {currentPage} of {totalPages}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={!canGoPrevious || loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!canGoNext || loading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              Next
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            Loading audit events...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No audit events matched your filters.
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {rows.map((row) => {
              const expanded = expandedId === row.id;

              return (
                <div key={row.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.status === "success"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : row.status === "failure"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {row.status}
                        </span>

                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {row.action}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(row.created_at)}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span>Entity: {row.entity_type}</span>
                        <span>Entity ID: {row.entity_id || "—"}</span>
                        <span>Actor: {row.actor_email || row.actor_user_id || "—"}</span>
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {truncate(prettyJson(row.details), 180)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedId(expanded ? null : row.id)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        {expanded ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>

                  {expanded && (
                    <div className="mt-4 grid gap-4 xl:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Event Details
                        </p>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs text-slate-800 dark:text-slate-200">
                          {prettyJson(row.details)}
                        </pre>
                      </div>

                      <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                          Request Context
                        </p>
                        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-200">
                          <div>
                            <span className="font-medium">Actor User ID:</span> {row.actor_user_id || "—"}
                          </div>
                          <div>
                            <span className="font-medium">Actor Email:</span> {row.actor_email || "—"}
                          </div>
                          <div>
                            <span className="font-medium">IP Address:</span> {row.ip_address || "—"}
                          </div>
                          <div>
                            <span className="font-medium">User Agent:</span> {row.user_agent || "—"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}