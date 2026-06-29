"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultCaseScope = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number: string | null;
  custodianCount: number;
};

type VaultHoldRecord = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string | null;
  reason: string | null;
  created_by: string | null;
  released_by: string | null;
  released_at: string | null;
  release_reason: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  message_count: number;
  case_message_count: number;
  latest_message_at: string | null;
  case_scoped: boolean;
};

type CaseHoldsResponse = {
  ok?: boolean;
  items?: VaultHoldRecord[];
  total?: number;
  limit?: number;
  offset?: number;
  caseScope?: VaultCaseScope | null;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
  message?: string;
};

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

function titleCase(value?: string | null) {
  if (!value) return "Active";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusBadgeClass(status?: string | null) {
  if (status === "released") {
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }

  if (status === "active" || !status) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (status === "deleted") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }

  return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
}

export default function CaseHoldsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const caseId = useMemo(() => {
    const raw = params?.id;
    return typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : "";
  }, [params]);

  const q = searchParams.get("q")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const includeReleased = searchParams.get("includeReleased") === "true";
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const limit = sanitizeLimit(toInt(searchParams.get("limit"), 25));
  const offset = sanitizeOffset(toInt(searchParams.get("offset"), 0));

  const [items, setItems] = useState<VaultHoldRecord[]>([]);
  const [caseScope, setCaseScope] = useState<VaultCaseScope | null>(null);
  const [targetOrgId, setTargetOrgId] = useState<string | null>(null);
  const [accessPath, setAccessPath] = useState<"org_role" | "support_grant" | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = Boolean(q || status || includeReleased || includeDeleted);

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

      const query = qs.toString();
      router.push(query ? `/vault/cases/${caseId}/holds?${query}` : `/vault/cases/${caseId}/holds`);
    },
    [router, searchParams, caseId]
  );

  const fetchHolds = useCallback(async () => {
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
        limit: String(limit),
        offset: String(offset),
      });

      if (q) qs.set("q", q);
      if (status) qs.set("status", status);
      if (includeReleased) qs.set("includeReleased", "true");
      if (includeDeleted) qs.set("includeDeleted", "true");

      const res = await fetch(`/api/vault/cases/${caseId}/holds?${qs.toString()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const payload = (await res.json()) as CaseHoldsResponse;

      if (!res.ok) {
        throw new Error(payload.error || payload.message || "Unable to load case holds.");
      }

      setItems(payload.items ?? []);
      setCaseScope(payload.caseScope ?? null);
      setTargetOrgId(payload.targetOrgId ?? null);
      setAccessPath(payload.accessPath ?? null);
    } catch (err) {
      setItems([]);
      setCaseScope(null);
      setTargetOrgId(null);
      setAccessPath(null);
      setError(err instanceof Error ? err.message : "Unable to load case holds.");
    } finally {
      setLoading(false);
    }
  }, [caseId, q, status, includeReleased, includeDeleted, limit, offset]);

  useEffect(() => {
    fetchHolds();
  }, [fetchHolds]);

  const summary = useMemo(() => {
    const total = items.length;
    const active = items.filter((item) => item.status === "active" || !item.status).length;
    const released = items.filter((item) => item.status === "released").length;
    const deleted = items.filter((item) => Boolean(item.deleted_at)).length;
    const messageCount = items.reduce(
      (sum, item) => sum + Number(item.case_message_count ?? item.message_count ?? 0),
      0
    );

    return {
      total,
      active,
      released,
      deleted,
      messageCount,
    };
  }, [items]);

  const previousOffset = Math.max(offset - limit, 0);
  const nextOffset = offset + limit;
  const canGoPrevious = offset > 0;
  const canGoNext = items.length >= limit;

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Case Workspace
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Case Holds
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              View preservation holds connected to this case through the case custodian message scope.
            </p>

            <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>Case ID: {caseId}</span>
              {caseScope?.name ? <span>Case: {caseScope.name}</span> : null}
              {caseScope?.matter_number ? <span>Matter: {caseScope.matter_number}</span> : null}
              {caseScope?.status ? <span>Status: {caseScope.status}</span> : null}
              {caseScope?.priority ? <span>Priority: {caseScope.priority}</span> : null}
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
              href={`/vault/cases/${caseId}/search`}
              className="rounded-lg border border-sky-300 px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950/40"
            >
              Case Search
            </Link>

            <Link
              href={`/vault/cases/${caseId}/exports`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Case Exports
            </Link>

            <button
              type="button"
              onClick={fetchHolds}
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Total Holds
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Active
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">
            {summary.active}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Released
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-700 dark:text-slate-300">
            {summary.released}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Deleted
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">
            {summary.deleted}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Case Messages Held
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {summary.messageCount}
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
              placeholder="Search hold name, description, or reason"
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
              <option value="">Default active view</option>
              <option value="active">Active</option>
              <option value="released">Released</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <label className="flex min-h-[38px] items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={includeReleased}
                onChange={(e) =>
                  updateQuery({
                    includeReleased: e.target.checked ? "true" : null,
                  })
                }
              />
              Released
            </label>

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
          </div>

          <div className="flex items-end">
            {hasFilters ? (
              <button
                type="button"
                onClick={() => router.push(`/vault/cases/${caseId}/holds`)}
                className="min-h-[38px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing {items.length} records. Offset {offset}. Limit {limit}.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoPrevious}
              onClick={() => updateQuery({ offset: String(previousOffset) })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Previous
            </button>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => updateQuery({ offset: String(nextOffset) })}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading case holds...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
          {error}
        </section>
      ) : items.length === 0 ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No case holds found
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No holds were found for messages currently scoped to this case’s assigned custodians.
          </p>
          <div className="mt-5">
            <Link
              href={`/vault/cases/${caseId}/search`}
              className="inline-flex rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Search Case Messages
            </Link>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Case Hold Records
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Holds are resolved through vault_hold_messages joined against case-scoped custodian messages.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Hold
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Case Messages
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Released
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {items.map((hold) => (
                  <tr
                    key={hold.id}
                    className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {hold.name}
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {hold.id}
                        </div>

                        {hold.description ? (
                          <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            {hold.description}
                          </div>
                        ) : null}

                        {hold.reason ? (
                          <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                            Reason: {hold.reason}
                          </div>
                        ) : null}

                        {hold.deleted_at ? (
                          <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                            Deleted
                          </span>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(
                          hold.status
                        )}`}
                      >
                        {titleCase(hold.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      <div>{hold.case_message_count}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Hold links: {hold.message_count}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Latest: {formatDateTime(hold.latest_message_at)}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      <div>{formatDateTime(hold.created_at)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        By: {hold.created_by || "—"}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      <div>{formatDateTime(hold.released_at)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        By: {hold.released_by || "—"}
                      </div>
                      {hold.release_reason ? (
                        <div className="line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                          {hold.release_reason}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <Link
                          href={`/vault/holds/${hold.id}?caseId=${encodeURIComponent(caseId)}`}
                          className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                        >
                          Open hold
                        </Link>

                        <Link
                          href={`/vault/cases/${caseId}/search?onHold=true`}
                          className="text-sm text-slate-700 hover:underline dark:text-slate-200"
                        >
                          Search held messages
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}