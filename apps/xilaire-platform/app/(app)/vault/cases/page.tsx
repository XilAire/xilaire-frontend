import Link from "next/link";
import { getVaultAdminClient } from "@/lib/vault/server";

export const dynamic = "force-dynamic";

type VaultCaseItem = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
  is_deleted: boolean;
  member_count: number;
  custodian_count: number;
  admin_count: number;
  hold_count: number;
  active_hold_count: number;
  export_count: number;
  completed_export_count: number;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
  deleted_by: string | null;
};

type VaultCaseMemberRow = {
  id: string;
  case_id: string;
  assignable_type: string | null;
};

type VaultHoldRow = {
  id: string;
  case_id: string | null;
  status: string | null;
};

type VaultExportRow = {
  id: string;
  case_id: string | null;
  status: string | null;
};

type VaultCasesSummary = {
  totalCount: number;
  returnedCount: number;
  activeCount: number;
  deletedCount: number;
  openCount: number;
  activeStatusCount: number;
  pendingCount: number;
  closedCount: number;
  archivedCount: number;
  highPriorityCount: number;
  withHoldCount: number;
  uniqueOwnerCount: number;
  memberCount: number;
  custodianCount: number;
  adminCount: number;
  holdCount: number;
  activeHoldCount: number;
  exportCount: number;
  completedExportCount: number;
};

type VaultCasesPagination = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};

type LoadCasesResult = {
  ok: boolean;
  items: VaultCaseItem[];
  summary: VaultCasesSummary;
  pagination: VaultCasesPagination;
  error: string | null;
  details: string | null;
};

const EMPTY_SUMMARY: VaultCasesSummary = {
  totalCount: 0,
  returnedCount: 0,
  activeCount: 0,
  deletedCount: 0,
  openCount: 0,
  activeStatusCount: 0,
  pendingCount: 0,
  closedCount: 0,
  archivedCount: 0,
  highPriorityCount: 0,
  withHoldCount: 0,
  uniqueOwnerCount: 0,
  memberCount: 0,
  custodianCount: 0,
  adminCount: 0,
  holdCount: 0,
  activeHoldCount: 0,
  exportCount: 0,
  completedExportCount: 0,
};

const FALLBACK_ORG_ID = "276f130f-6f47-44a3-80e5-3cbbf246edf7";

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function toVaultCaseRows(value: unknown): VaultCaseRow[] {
  return toRows<VaultCaseRow>(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getStatusClass(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "open":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "active":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "pending":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "closed":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    case "archived":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function getPriorityClass(priority: string | null | undefined) {
  switch ((priority ?? "").toLowerCase()) {
    case "critical":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    case "high":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "medium":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "normal":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "low":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function buildPaginationParams(input: {
  q: string;
  status: string;
  priority: string;
  includeDeleted: string;
  deletedOnly: string;
  limit: number;
  offset: number;
}) {
  const params = new URLSearchParams();

  if (input.q) params.set("q", input.q);
  if (input.status) params.set("status", input.status);
  if (input.priority) params.set("priority", input.priority);
  if (input.includeDeleted) params.set("includeDeleted", input.includeDeleted);
  if (input.deletedOnly) params.set("deletedOnly", input.deletedOnly);

  params.set("limit", String(input.limit));
  params.set("offset", String(input.offset));

  return params;
}

function normalizeSearchParam(value: string | string[] | undefined) {
  if (typeof value !== "string") return "";
  return value.trim();
}

function deriveCasePayload(
  row: VaultCaseRow,
  members: VaultCaseMemberRow[],
  holds: VaultHoldRow[],
  exports: VaultExportRow[]
): VaultCaseItem {
  const caseMembers = members.filter((member) => member.case_id === row.id);
  const caseHolds = holds.filter((hold) => hold.case_id === row.id);
  const caseExports = exports.filter((exportRow) => exportRow.case_id === row.id);

  return {
    id: row.id,
    org_id: row.org_id,
    name: row.name ?? "Untitled Case",
    description: row.description ?? null,
    status: row.status ?? "open",
    priority: row.priority ?? "normal",
    created_at: row.created_at ?? null,
    updated_at: row.updated_at ?? null,
    created_by: row.created_by ?? null,
    updated_by: row.updated_by ?? null,
    deleted_at: row.deleted_at ?? null,
    deleted_by: row.deleted_by ?? null,
    is_deleted: Boolean(row.deleted_at),
    member_count: caseMembers.length,
    custodian_count: caseMembers.filter(
      (member) => member.assignable_type === "custodian"
    ).length,
    admin_count: caseMembers.filter(
      (member) => member.assignable_type === "admin"
    ).length,
    hold_count: caseHolds.length,
    active_hold_count: caseHolds.filter((hold) => hold.status === "active")
      .length,
    export_count: caseExports.length,
    completed_export_count: caseExports.filter(
      (exportRow) => exportRow.status === "completed"
    ).length,
  };
}

function matchesLocalSearch(row: VaultCaseRow, q: string) {
  if (!q) return true;

  const haystack = [
    row.name ?? "",
    row.description ?? "",
    row.status ?? "",
    row.priority ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(q.toLowerCase());
}

async function loadCases(
  searchParams: Record<string, string | string[] | undefined>
): Promise<LoadCasesResult> {
  const q = normalizeSearchParam(searchParams.q);
  const status = normalizeSearchParam(searchParams.status);
  const priority = normalizeSearchParam(searchParams.priority);
  const includeDeleted = normalizeSearchParam(searchParams.includeDeleted);
  const deletedOnly = normalizeSearchParam(searchParams.deletedOnly);

  const parsedLimit = Number(normalizeSearchParam(searchParams.limit));
  const parsedOffset = Number(normalizeSearchParam(searchParams.offset));

  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(parsedLimit, 100)
      : 25;

  const offset =
    Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;

  try {
    const supabase = await getVaultAdminClient();

    let query = supabase
      .from("vault_cases")
      .select(
        [
          "id",
          "org_id",
          "name",
          "description",
          "status",
          "priority",
          "created_at",
          "updated_at",
          "created_by",
          "updated_by",
          "deleted_at",
          "deleted_by",
        ].join(", "),
        { count: "exact" }
      )
      .eq("org_id", FALLBACK_ORG_ID)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false });

    if (deletedOnly === "true") {
      query = query.not("deleted_at", "is", null);
    } else if (includeDeleted !== "true") {
      query = query.is("deleted_at", null);
    }

    if (status) {
      query = query.eq("status", status);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return {
        ok: false,
        items: [],
        summary: EMPTY_SUMMARY,
        pagination: {
          limit,
          offset,
          total: 0,
          hasMore: false,
        },
        error: "Failed to load Vault cases.",
        details: error.message,
      };
    }

    const rows = toVaultCaseRows(data).filter((row) =>
      matchesLocalSearch(row, q)
    );

    const caseIds = rows.map((row) => row.id);

    const [membersResult, holdsResult, exportsResult] = await Promise.all([
      caseIds.length
        ? supabase
            .from("vault_case_members")
            .select("id, case_id, assignable_type")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("case_id", caseIds)
        : Promise.resolve({ data: [], error: null }),

      caseIds.length
        ? supabase
            .from("vault_holds")
            .select("id, case_id, status")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("case_id", caseIds)
        : Promise.resolve({ data: [], error: null }),

      caseIds.length
        ? supabase
            .from("vault_exports")
            .select("id, case_id, status")
            .eq("org_id", FALLBACK_ORG_ID)
            .in("case_id", caseIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const relatedErrors = [
      membersResult.error?.message,
      holdsResult.error?.message,
      exportsResult.error?.message,
    ].filter(Boolean);

    const members = toRows<VaultCaseMemberRow>(membersResult.data);
    const holds = toRows<VaultHoldRow>(holdsResult.data);
    const exports = toRows<VaultExportRow>(exportsResult.data);

    const items = rows.map((row) =>
      deriveCasePayload(row, members, holds, exports)
    );

    const summary: VaultCasesSummary = {
      totalCount: count ?? items.length,
      returnedCount: items.length,
      activeCount: items.filter((item) => !item.is_deleted).length,
      deletedCount: items.filter((item) => item.is_deleted).length,
      openCount: items.filter((item) => item.status === "open").length,
      activeStatusCount: items.filter((item) => item.status === "active")
        .length,
      pendingCount: items.filter((item) => item.status === "pending").length,
      closedCount: items.filter((item) => item.status === "closed").length,
      archivedCount: items.filter((item) => item.status === "archived").length,
      highPriorityCount: items.filter(
        (item) => item.priority === "high" || item.priority === "critical"
      ).length,
      withHoldCount: items.filter((item) => item.hold_count > 0).length,
      uniqueOwnerCount: 0,
      memberCount: items.reduce((total, item) => total + item.member_count, 0),
      custodianCount: items.reduce(
        (total, item) => total + item.custodian_count,
        0
      ),
      adminCount: items.reduce((total, item) => total + item.admin_count, 0),
      holdCount: items.reduce((total, item) => total + item.hold_count, 0),
      activeHoldCount: items.reduce(
        (total, item) => total + item.active_hold_count,
        0
      ),
      exportCount: items.reduce((total, item) => total + item.export_count, 0),
      completedExportCount: items.reduce(
        (total, item) => total + item.completed_export_count,
        0
      ),
    };

    return {
      ok: relatedErrors.length === 0,
      items,
      summary,
      pagination: {
        limit,
        offset,
        total: count ?? items.length,
        hasMore: typeof count === "number" ? offset + limit < count : false,
      },
      error: relatedErrors.length ? "Vault cases loaded with warnings." : null,
      details: relatedErrors.length ? relatedErrors.join(" | ") : null,
    };
  } catch (error) {
    return {
      ok: false,
      items: [],
      summary: EMPTY_SUMMARY,
      pagination: {
        limit,
        offset,
        total: 0,
        hasMore: false,
      },
      error: "Failed to load Vault cases.",
      details: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-zinc-100">{value}</p>
      {helper ? <p className="mt-1 text-xs text-zinc-600">{helper}</p> : null}
    </div>
  );
}

export default async function VaultCasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const result = await loadCases(resolvedSearchParams);

  const q = normalizeSearchParam(resolvedSearchParams.q);
  const status = normalizeSearchParam(resolvedSearchParams.status);
  const priority = normalizeSearchParam(resolvedSearchParams.priority);
  const includeDeleted = normalizeSearchParam(
    resolvedSearchParams.includeDeleted
  );
  const deletedOnly = normalizeSearchParam(resolvedSearchParams.deletedOnly);

  const limit = result.pagination.limit;
  const offset = result.pagination.offset;
  const previousOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;

  const previousParams = buildPaginationParams({
    q,
    status,
    priority,
    includeDeleted,
    deletedOnly,
    limit,
    offset: previousOffset,
  });

  const nextParams = buildPaginationParams({
    q,
    status,
    priority,
    includeDeleted,
    deletedOnly,
    limit,
    offset: nextOffset,
  });

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Vault
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Case Workspace
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Create and manage eDiscovery cases. Cases group custodians,
                admins, scoped searches, legal holds, evidence, activity, and
                exports into one investigation workspace.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/vault/cases/new"
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
              >
                Create case
              </Link>

              <Link
                href="/vault/search"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Vault search
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Total Cases"
            value={result.summary.totalCount}
            helper={`${result.summary.returnedCount} shown`}
          />
          <MetricCard label="Open" value={result.summary.openCount} />
          <MetricCard label="High Priority" value={result.summary.highPriorityCount} />
          <MetricCard label="Active Holds" value={result.summary.activeHoldCount} />
          <MetricCard label="Exports" value={result.summary.exportCount} />
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Case Members" value={result.summary.memberCount} />
          <MetricCard label="Custodians" value={result.summary.custodianCount} />
          <MetricCard label="Admins" value={result.summary.adminCount} />
          <MetricCard label="Completed Exports" value={result.summary.completedExportCount} />
        </section>

        <section className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-blue-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
                Case workflow
              </p>
              <p className="mt-2 text-sm text-blue-100/80">
                Start by creating a case. After it is created, open it to assign
                custodians/admins, add department members, run scoped searches,
                track activity, review summary KPIs, manage holds, and prepare
                exports.
              </p>
            </div>

            <Link
              href="/vault/cases/new"
              className="inline-flex items-center justify-center rounded-xl border border-blue-400/40 bg-blue-400/10 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-400/20"
            >
              Start new case
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <form className="grid gap-4 lg:grid-cols-5" action="/vault/cases">
            <div className="lg:col-span-2">
              <label className="text-sm text-zinc-400" htmlFor="q">
                Search
              </label>
              <input
                id="q"
                name="q"
                defaultValue={q}
                placeholder="Search case name, description, status, or priority"
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400" htmlFor="status">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={status}
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue={priority}
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
              >
                <option value="">All priorities</option>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-zinc-400" htmlFor="deletedOnly">
                View
              </label>
              <select
                id="deletedOnly"
                name="deletedOnly"
                defaultValue={deletedOnly}
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
              >
                <option value="">Active only</option>
                <option value="true">Deleted only</option>
              </select>
            </div>

            <input type="hidden" name="limit" value={limit} />
            <input type="hidden" name="offset" value="0" />

            <div className="flex items-end gap-3 lg:col-span-5">
              <button
                type="submit"
                className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
              >
                Apply filters
              </button>

              <Link
                href="/vault/cases"
                className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Reset
              </Link>
            </div>
          </form>
        </section>

        {result.error ? (
          <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-yellow-200">
            <p className="font-medium">{result.error}</p>
            {result.details ? (
              <p className="mt-2 text-sm text-yellow-200/80">
                {result.details}
              </p>
            ) : null}
          </section>
        ) : null}

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
          <div className="flex flex-col gap-3 border-b border-zinc-800 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Cases</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Showing {result.items.length} of {result.pagination.total} cases
              </p>
            </div>

            <Link
              href="/vault/cases/new"
              className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
            >
              Create case
            </Link>
          </div>

          {result.items.length ? (
            <div className="grid gap-4 p-5 xl:grid-cols-2">
              {result.items.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 transition hover:border-blue-500/30 hover:bg-zinc-950"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <Link
                        href={`/vault/cases/${item.id}`}
                        className="text-lg font-semibold text-zinc-100 hover:text-blue-300"
                      >
                        {item.name}
                      </Link>

                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-500">
                        {item.description || "No description provided."}
                      </p>

                      {item.is_deleted ? (
                        <p className="mt-2 text-xs text-red-300">
                          Deleted {formatDate(item.deleted_at)}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getPriorityClass(
                          item.priority
                        )}`}
                      >
                        {item.priority}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-xs text-zinc-500">Members</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {item.member_count}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-xs text-zinc-500">Custodians</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {item.custodian_count}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-xs text-zinc-500">Holds</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        {item.active_hold_count}/{item.hold_count}
                      </p>
                    </div>

                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <p className="text-xs text-zinc-500">Exports</p>
                      <p className="mt-1 text-lg font-semibold text-zinc-100">
                        —
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-zinc-600">
                      Updated {formatDate(item.updated_at ?? item.created_at)}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/vault/cases/${item.id}`}
                        className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800"
                      >
                        Open
                      </Link>

                      <Link
                        href={`/vault/cases/${item.id}/summary`}
                        className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200 hover:bg-purple-500/20"
                      >
                        Summary
                      </Link>

                      <Link
                        href={`/vault/cases/${item.id}/activity`}
                        className="rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20"
                      >
                        Activity
                      </Link>

                      <Link
                        href={`/vault/search?caseId=${item.id}`}
                        className="rounded-lg border border-blue-500/40 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-200 hover:bg-blue-500/20"
                      >
                        Search
                      </Link>

                      <Link
                        href={`/vault/exports?caseId=${item.id}`}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-200 hover:bg-emerald-500/20"
                      >
                        Exports
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="px-5 py-16 text-center">
              <h3 className="text-lg font-medium text-zinc-200">
                No cases found
              </h3>
              <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                Create your first Vault case to begin grouping custodians,
                department mailboxes, admins, scoped searches, holds, activity,
                and exports into a single investigation workspace.
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href="/vault/cases/new"
                  className="inline-flex rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
                >
                  Create case
                </Link>

                <Link
                  href="/vault/search"
                  className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Go to Vault search
                </Link>
              </div>
            </div>
          )}
        </section>

        <section className="flex items-center justify-between">
          <Link
            href={`/vault/cases?${previousParams.toString()}`}
            aria-disabled={offset <= 0}
            className={`rounded-xl border px-4 py-2 text-sm ${
              offset <= 0
                ? "pointer-events-none border-zinc-800 text-zinc-700"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            Previous
          </Link>

          <p className="text-sm text-zinc-500">
            Offset {offset} · Limit {limit}
          </p>

          <Link
            href={`/vault/cases?${nextParams.toString()}`}
            aria-disabled={!result.pagination.hasMore}
            className={`rounded-xl border px-4 py-2 text-sm ${
              !result.pagination.hasMore
                ? "pointer-events-none border-zinc-800 text-zinc-700"
                : "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            Next
          </Link>
        </section>
      </div>
    </main>
  );
}