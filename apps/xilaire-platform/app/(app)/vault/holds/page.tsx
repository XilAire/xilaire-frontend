"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultHoldRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  hold_type: "legal" | "investigation" | "regulatory" | "manual";
  scope_type: "org" | "domain" | "custodian" | "mailbox" | "keyword" | "message";
  scope_value: string | null;
  status: "active" | "released" | "expired";
  reason: string | null;
  started_at: string;
  released_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type VaultCaseScope = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number: string | null;
  custodianCount?: number | null;
};

type VaultHoldsResponse = {
  ok: boolean;
  items?: VaultHoldRow[];
  total?: number;
  limit?: number;
  offset?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  caseScope?: VaultCaseScope | null;
  error?: string;
};

type CreateVaultHoldResponse = {
  ok: boolean;
  item?: VaultHoldRow;
  appliedMessageCount?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type HoldFiltersState = {
  q: string;
  status: "" | "active" | "released" | "expired";
  scopeType: "" | "org" | "domain" | "custodian" | "mailbox" | "keyword" | "message";
};

type CreateHoldState = {
  name: string;
  description: string;
  holdType: "legal" | "investigation" | "regulatory" | "manual";
  scopeType: "org" | "domain" | "custodian" | "mailbox" | "keyword" | "message";
  scopeValue: string;
  reason: string;
  startedAt: string;
  messageIds: string;
};

const DEFAULT_LIMIT = 25;

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function parseFilters(searchParams: URLSearchParams): HoldFiltersState {
  const status = searchParams.get("status");
  const scopeType = searchParams.get("scopeType");

  return {
    q: searchParams.get("q") ?? "",
    status:
      status === "active" || status === "released" || status === "expired"
        ? status
        : "",
    scopeType:
      scopeType === "org" ||
      scopeType === "domain" ||
      scopeType === "custodian" ||
      scopeType === "mailbox" ||
      scopeType === "keyword" ||
      scopeType === "message"
        ? scopeType
        : "",
  };
}

function buildQueryString(
  filters: HoldFiltersState,
  offset: number,
  limit: number,
  caseId?: string | null
) {
  const params = new URLSearchParams();

  if (caseId) params.set("caseId", caseId);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.scopeType) params.set("scopeType", filters.scopeType);

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  return params.toString();
}

function getDefaultCreateState(caseId?: string | null): CreateHoldState {
  return {
    name: "",
    description: "",
    holdType: "legal",
    scopeType: caseId ? "keyword" : "org",
    scopeValue: "",
    reason: "",
    startedAt: "",
    messageIds: "",
  };
}

function CaseScopeBanner({
  caseId,
  caseScope,
}: {
  caseId: string;
  caseScope: VaultCaseScope | null;
}) {
  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Case-Scoped Holds
          </p>
          <h2 className="mt-2 text-lg font-semibold text-emerald-950 dark:text-emerald-100">
            {caseScope?.name ?? "Selected Vault Case"}
          </h2>
          <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200/80">
            This view is scoped from the case detail page. Holds shown here should relate to this case flow.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {caseScope?.matter_number ? (
            <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Matter: {caseScope.matter_number}
            </span>
          ) : null}

          {caseScope?.status ? (
            <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Status: {caseScope.status}
            </span>
          ) : null}

          {caseScope?.priority ? (
            <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Priority: {caseScope.priority}
            </span>
          ) : null}

          {typeof caseScope?.custodianCount === "number" ? (
            <span className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
              Custodians: {caseScope.custodianCount}
            </span>
          ) : null}

          <Link
            href={`/vault/cases/${caseId}`}
            className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          >
            Open Case
          </Link>

          <Link
            href={`/vault/search?caseId=${caseId}`}
            className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          >
            Search Case
          </Link>

          <Link
            href={`/vault/exports?caseId=${caseId}`}
            className="rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
          >
            Case Exports
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function VaultHoldsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const caseId = useMemo(() => {
    const raw = searchParams.get("caseId") ?? "";
    const trimmed = raw.trim();
    return trimmed.length ? trimmed : null;
  }, [searchParams]);

  const initialFilters = useMemo(() => parseFilters(searchParams), [searchParams]);

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

  const [filters, setFilters] = useState<HoldFiltersState>(initialFilters);
  const [offset, setOffset] = useState(initialOffset);
  const [limit] = useState(initialLimit);

  const [rows, setRows] = useState<VaultHoldRow[]>([]);
  const [total, setTotal] = useState(0);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);
  const [caseScope, setCaseScope] = useState<VaultCaseScope | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateHoldState>(
    getDefaultCreateState(caseId)
  );
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const syncUrl = useCallback(
    (nextFilters: HoldFiltersState, nextOffset: number) => {
      const queryString = buildQueryString(nextFilters, nextOffset, limit, caseId);
      router.replace(`/vault/holds?${queryString}`, { scroll: false });
    },
    [router, limit, caseId]
  );

  const fetchResults = useCallback(
    async (activeFilters: HoldFiltersState, activeOffset: number) => {
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

        const queryString = buildQueryString(
          activeFilters,
          activeOffset,
          limit,
          caseId
        );

        const res = await fetch(`/api/vault/holds?${queryString}`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const payload = (await res.json()) as VaultHoldsResponse;

        if (!res.ok || !payload.ok) {
          throw new Error(payload.error || "Vault holds lookup failed.");
        }

        setRows(payload.items ?? []);
        setTotal(payload.total ?? 0);
        setTargetOrgId(payload.targetOrgId ?? null);
        setAccessPath(payload.accessPath ?? null);
        setCaseScope(payload.caseScope ?? null);
      } catch (err) {
        setRows([]);
        setTotal(0);
        setTargetOrgId(null);
        setAccessPath(null);
        setCaseScope(null);
        setError(err instanceof Error ? err.message : "Vault holds lookup failed.");
      } finally {
        setLoading(false);
      }
    },
    [limit, caseId]
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

  useEffect(() => {
    setCreateForm((current) => {
      if (!caseId) return current;

      return {
        ...current,
        scopeType: current.scopeType === "org" ? "keyword" : current.scopeType,
      };
    });
  }, [caseId]);

  function handleFilterChange<K extends keyof HoldFiltersState>(
    key: K,
    value: HoldFiltersState[K]
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleCreateChange<K extends keyof CreateHoldState>(
    key: K,
    value: CreateHoldState[K]
  ) {
    setCreateForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSearch() {
    setOffset(0);
    syncUrl(filters, 0);
  }

  function handleReset() {
    const resetFilters: HoldFiltersState = {
      q: "",
      status: "",
      scopeType: "",
    };

    setFilters(resetFilters);
    setOffset(0);
    syncUrl(resetFilters, 0);
  }

  async function handleCreateHold(e: React.FormEvent) {
    e.preventDefault();

    setCreating(true);
    setCreateError(null);
    setCreateSuccess(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const messageIds =
        createForm.scopeType === "message"
          ? createForm.messageIds
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean)
          : [];

      const payload = {
        name: createForm.name.trim(),
        description: createForm.description.trim() || undefined,
        holdType: createForm.holdType,
        scopeType: createForm.scopeType,
        scopeValue:
          createForm.scopeType === "org"
            ? undefined
            : createForm.scopeValue.trim() || undefined,
        reason: createForm.reason.trim() || undefined,
        startedAt: createForm.startedAt || undefined,
        messageIds,
        caseId: caseId ?? undefined,
      };

      const res = await fetch("/api/vault/holds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = (await res.json()) as CreateVaultHoldResponse;

      if (!res.ok || !response.ok) {
        throw new Error(response.error || "Unable to create Vault hold.");
      }

      setCreateForm(getDefaultCreateState(caseId));
      setCreateSuccess(
        response.appliedMessageCount && response.appliedMessageCount > 0
          ? `Hold created successfully. Applied to ${response.appliedMessageCount} message(s).`
          : "Hold created successfully."
      );

      fetchResults(filters, offset);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create Vault hold.");
    } finally {
      setCreating(false);
    }
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

  function openHoldDetail(holdId: string) {
    const suffix = caseId ? `?caseId=${encodeURIComponent(caseId)}` : "";
    router.push(`/vault/holds/${holdId}${suffix}`);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Holds
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage legal, investigation, regulatory, and manual preservation holds.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/vault/cases"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cases
            </Link>

            {caseId ? (
              <>
                <Link
                  href={`/vault/cases/${caseId}`}
                  className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 dark:hover:bg-emerald-900/60"
                >
                  Open Case
                </Link>

                <Link
                  href={`/vault/search?caseId=${caseId}`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Search Case
                </Link>

                <Link
                  href={`/vault/exports?caseId=${caseId}`}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  Case Exports
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {caseId ? <CaseScopeBanner caseId={caseId} caseScope={caseScope} /> : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label htmlFor="holds-q" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Search
            </label>
            <input
              id="holds-q"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              placeholder="name, description, reason..."
              value={filters.q}
              onChange={(e) => handleFilterChange("q", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="holds-status" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
            </label>
            <select
              id="holds-status"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.status}
              onChange={(e) =>
                handleFilterChange("status", e.target.value as HoldFiltersState["status"])
              }
            >
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="released">Released</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="holds-scope" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Scope Type
            </label>
            <select
              id="holds-scope"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              value={filters.scopeType}
              onChange={(e) =>
                handleFilterChange(
                  "scopeType",
                  e.target.value as HoldFiltersState["scopeType"]
                )
              }
            >
              <option value="">All</option>
              <option value="org">Org</option>
              <option value="domain">Domain</option>
              <option value="custodian">Custodian</option>
              <option value="mailbox">Mailbox</option>
              <option value="keyword">Keyword</option>
              <option value="message">Message</option>
            </select>
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

          {caseId ? (
            <Link
              href="/vault/holds"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear Case Scope
            </Link>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            {caseId ? <span>Case: {caseScope?.name ?? caseId}</span> : null}
            <span>Target Org: {targetOrgId ?? "—"}</span>
            <span>Access Path: {accessPath ?? "—"}</span>
            <span>Total: {total}</span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Create Hold
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {caseId
              ? "Create a new preservation hold from this case context."
              : "Create a new preservation hold for your archive."}
          </p>
        </div>

        {caseId ? (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            This hold will be submitted with caseId: {caseId}
          </div>
        ) : null}

        <form onSubmit={handleCreateHold} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Hold Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.name}
                onChange={(e) => handleCreateChange("name", e.target.value)}
                placeholder="Acme Litigation Hold"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Hold Type
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.holdType}
                onChange={(e) =>
                  handleCreateChange(
                    "holdType",
                    e.target.value as CreateHoldState["holdType"]
                  )
                }
              >
                <option value="legal">Legal</option>
                <option value="investigation">Investigation</option>
                <option value="regulatory">Regulatory</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Scope Type
              </label>
              <select
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.scopeType}
                onChange={(e) =>
                  handleCreateChange(
                    "scopeType",
                    e.target.value as CreateHoldState["scopeType"]
                  )
                }
              >
                <option value="org">Org</option>
                <option value="domain">Domain</option>
                <option value="custodian">Custodian</option>
                <option value="mailbox">Mailbox</option>
                <option value="keyword">Keyword</option>
                <option value="message">Message</option>
              </select>
            </div>

            {createForm.scopeType !== "org" && createForm.scopeType !== "message" && (
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Scope Value
                </label>
                <input
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                  value={createForm.scopeValue}
                  onChange={(e) => handleCreateChange("scopeValue", e.target.value)}
                  placeholder="example.com or user@company.com or keyword"
                  required
                />
              </div>
            )}

            {createForm.scopeType === "message" && (
              <div className="space-y-2 md:col-span-2 xl:col-span-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Message IDs
                </label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                  value={createForm.messageIds}
                  onChange={(e) => handleCreateChange("messageIds", e.target.value)}
                  placeholder={"One message id per line"}
                  required
                />
              </div>
            )}

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Description
              </label>
              <textarea
                className="min-h-[100px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.description}
                onChange={(e) => handleCreateChange("description", e.target.value)}
                placeholder="Optional hold description"
              />
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-3">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Reason
              </label>
              <textarea
                className="min-h-[80px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.reason}
                onChange={(e) => handleCreateChange("reason", e.target.value)}
                placeholder="Reason for preservation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Started At
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
                value={createForm.startedAt}
                onChange={(e) => handleCreateChange("startedAt", e.target.value)}
              />
            </div>
          </div>

          {createError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {createError}
            </div>
          )}

          {createSuccess && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">
              {createSuccess}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {creating ? "Creating..." : "Create Hold"}
            </button>

            <button
              type="button"
              onClick={() => {
                setCreateForm(getDefaultCreateState(caseId));
                setCreateError(null);
                setCreateSuccess(null);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Hold Records
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
            Loading hold records...
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No hold records matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Hold
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Scope
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Started
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Released
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    onClick={() => openHoldDetail(row.id)}
                  >
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          <Link
                            href={
                              caseId
                                ? `/vault/holds/${row.id}?caseId=${caseId}`
                                : `/vault/holds/${row.id}`
                            }
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
                          {row.description || row.reason || "—"}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {row.hold_type}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      <div>{row.scope_type}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.scope_value || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          row.status === "active"
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                            : row.status === "released"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatDateTime(row.started_at)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatDateTime(row.released_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}