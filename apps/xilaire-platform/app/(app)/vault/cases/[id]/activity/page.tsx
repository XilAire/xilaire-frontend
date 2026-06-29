import Link from "next/link";
import { getVaultAdminClient } from "@/lib/vault/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_ORG_ID = "276f130f-6f47-44a3-80e5-3cbbf246edf7";

type PageContext = {
  params: Promise<{
    id: string;
  }>;
};

type VaultCaseRow = {
  id: string;
  org_id: string;
  name: string | null;
  status: string | null;
  priority: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type VaultAuditLogRow = {
  id: string;
  org_id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  status: string | null;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown> | null;
  created_at: string | null;
};

type VaultCaseMemberRow = {
  id: string;
  org_id?: string | null;
  case_id?: string | null;
  assignable_type: string | null;
  assignable_id: string | null;
  role: string | null;
  created_at: string | null;
  created_by: string | null;
};

type TimelineEvent = {
  id: string;
  type: "audit" | "member" | "case";
  category:
    | "case"
    | "search"
    | "hold"
    | "export"
    | "member"
    | "ingestion"
    | "system"
    | "other";
  title: string;
  actor: string;
  status: string;
  created_at: string | null;
  description: string;
  metadata: Array<{
    label: string;
    value: string;
  }>;
};

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
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

function titleCase(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "success":
    case "completed":
    case "active":
    case "created":
    case "added":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "warning":
    case "pending":
    case "queued":
    case "processing":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "failure":
    case "failed":
    case "error":
    case "deleted":
    case "removed":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function getCaseStatusClass(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "open":
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
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

function getCategoryClass(category: TimelineEvent["category"]) {
  switch (category) {
    case "case":
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";
    case "search":
      return "border-sky-500/30 bg-sky-500/10 text-sky-300";
    case "hold":
      return "border-purple-500/30 bg-purple-500/10 text-purple-300";
    case "export":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "member":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "ingestion":
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
    case "system":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function getDetailsPreview(details: Record<string, unknown> | null) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }

  const parts = Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 8)
    .map(([key, value]) => {
      if (typeof value === "string") return `${key}: ${value}`;
      if (typeof value === "number") return `${key}: ${value}`;
      if (typeof value === "boolean") return `${key}: ${value ? "true" : "false"}`;
      if (Array.isArray(value)) return `${key}: ${value.length} item(s)`;

      return `${key}: ${JSON.stringify(value)}`;
    });

  return parts.length ? parts.join(" · ") : null;
}

function getDetailsMetadata(details: Record<string, unknown> | null) {
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return [];
  }

  return Object.entries(details)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 6)
    .map(([key, value]) => {
      let normalizedValue = "";

      if (typeof value === "string") normalizedValue = value;
      else if (typeof value === "number") normalizedValue = String(value);
      else if (typeof value === "boolean") normalizedValue = value ? "true" : "false";
      else if (Array.isArray(value)) normalizedValue = `${value.length} item(s)`;
      else normalizedValue = JSON.stringify(value);

      return {
        label: titleCase(key),
        value: normalizedValue,
      };
    });
}

function getAuditCategory(action: string | null, entityType: string | null): TimelineEvent["category"] {
  const normalizedAction = (action ?? "").toLowerCase();
  const normalizedEntity = (entityType ?? "").toLowerCase();

  if (normalizedAction.includes("search") || normalizedEntity.includes("search")) {
    return "search";
  }

  if (normalizedAction.includes("hold") || normalizedEntity.includes("hold")) {
    return "hold";
  }

  if (normalizedAction.includes("export") || normalizedEntity.includes("export")) {
    return "export";
  }

  if (
    normalizedAction.includes("member") ||
    normalizedAction.includes("custodian") ||
    normalizedAction.includes("admin") ||
    normalizedEntity.includes("member") ||
    normalizedEntity.includes("custodian")
  ) {
    return "member";
  }

  if (
    normalizedAction.includes("ingest") ||
    normalizedAction.includes("sync") ||
    normalizedEntity.includes("source") ||
    normalizedEntity.includes("mailbox")
  ) {
    return "ingestion";
  }

  if (normalizedAction.includes("case") || normalizedEntity.includes("case")) {
    return "case";
  }

  if (normalizedAction.includes("system") || normalizedEntity.includes("system")) {
    return "system";
  }

  return "other";
}

async function loadCase(caseId: string) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_cases")
    .select("id, org_id, name, status, priority, created_at, updated_at, deleted_at")
    .eq("id", caseId)
    .eq("org_id", FALLBACK_ORG_ID)
    .maybeSingle();

  if (error) {
    return {
      item: null as VaultCaseRow | null,
      error: error.message,
    };
  }

  return {
    item: data as VaultCaseRow | null,
    error: null as string | null,
  };
}

async function loadCaseMembers(caseId: string) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_case_members")
    .select("id, org_id, case_id, assignable_type, assignable_id, role, created_at, created_by")
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      items: [] as VaultCaseMemberRow[],
      error: error.message,
    };
  }

  return {
    items: toRows<VaultCaseMemberRow>(data),
    error: null as string | null,
  };
}

async function loadCaseAuditLogs(caseId: string) {
  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_audit_logs")
    .select(
      "id, org_id, actor_user_id, actor_email, action, entity_type, entity_id, status, ip_address, user_agent, details, created_at"
    )
    .eq("org_id", FALLBACK_ORG_ID)
    .or(
      [
        `entity_id.eq.${caseId}`,
        `details->>caseId.eq.${caseId}`,
        `details->>case_id.eq.${caseId}`,
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .limit(150);

  if (error) {
    return {
      items: [] as VaultAuditLogRow[],
      error: error.message,
    };
  }

  return {
    items: toRows<VaultAuditLogRow>(data),
    error: null as string | null,
  };
}

function buildTimelineEvents(params: {
  caseRow: VaultCaseRow | null;
  auditLogs: VaultAuditLogRow[];
  members: VaultCaseMemberRow[];
}) {
  const events: TimelineEvent[] = [];

  if (params.caseRow) {
    events.push({
      id: `case-created-${params.caseRow.id}`,
      type: "case",
      category: "case",
      title: "Case Created",
      actor: "Vault System",
      status: params.caseRow.status ?? "created",
      created_at: params.caseRow.created_at,
      description: `Case workspace was created for ${params.caseRow.name ?? "Untitled Case"}.`,
      metadata: [
        {
          label: "Case ID",
          value: params.caseRow.id,
        },
        {
          label: "Status",
          value: titleCase(params.caseRow.status),
        },
        {
          label: "Priority",
          value: titleCase(params.caseRow.priority),
        },
      ],
    });

    if (params.caseRow.updated_at && params.caseRow.updated_at !== params.caseRow.created_at) {
      events.push({
        id: `case-updated-${params.caseRow.id}`,
        type: "case",
        category: "case",
        title: "Case Updated",
        actor: "Vault System",
        status: "updated",
        created_at: params.caseRow.updated_at,
        description: `Case metadata was updated for ${params.caseRow.name ?? "Untitled Case"}.`,
        metadata: [
          {
            label: "Case ID",
            value: params.caseRow.id,
          },
          {
            label: "Status",
            value: titleCase(params.caseRow.status),
          },
          {
            label: "Priority",
            value: titleCase(params.caseRow.priority),
          },
        ],
      });
    }
  }

  for (const member of params.members) {
    events.push({
      id: `member-${member.id}`,
      type: "member",
      category: "member",
      title:
        member.assignable_type === "custodian"
          ? "Custodian Added"
          : member.assignable_type === "admin"
            ? "Case Admin Added"
            : "Case Member Added",
      actor: member.created_by ?? "Vault System",
      status: "added",
      created_at: member.created_at,
      description: `${titleCase(member.assignable_type)} ${member.assignable_id ?? "unknown"} was added to the case.`,
      metadata: [
        {
          label: "Assignable Type",
          value: titleCase(member.assignable_type),
        },
        {
          label: "Assignable ID",
          value: member.assignable_id ?? "—",
        },
        {
          label: "Role",
          value: titleCase(member.role),
        },
        {
          label: "Created By",
          value: member.created_by ?? "—",
        },
      ],
    });
  }

  for (const log of params.auditLogs) {
    const category = getAuditCategory(log.action, log.entity_type);
    const preview = getDetailsPreview(log.details);

    events.push({
      id: `audit-${log.id}`,
      type: "audit",
      category,
      title: titleCase(log.action) || "Vault Activity",
      actor: log.actor_email ?? log.actor_user_id ?? "Vault System",
      status: log.status ?? "logged",
      created_at: log.created_at,
      description:
        preview ??
        `${titleCase(log.entity_type)} activity was logged for this case.`,
      metadata: [
        {
          label: "Entity Type",
          value: titleCase(log.entity_type),
        },
        {
          label: "Entity ID",
          value: log.entity_id ?? "—",
        },
        {
          label: "IP Address",
          value: log.ip_address ?? "—",
        },
        ...getDetailsMetadata(log.details),
      ],
    });
  }

  return events.sort((a, b) => {
    const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
    const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
    return bTime - aTime;
  });
}

function buildSummary(events: TimelineEvent[]) {
  return events.reduce(
    (summary, event) => {
      summary.total += 1;

      if (event.category === "search") summary.search += 1;
      if (event.category === "hold") summary.hold += 1;
      if (event.category === "export") summary.export += 1;
      if (event.category === "member") summary.member += 1;
      if (event.category === "ingestion") summary.ingestion += 1;

      if (["failure", "failed", "error"].includes(event.status.toLowerCase())) {
        summary.failed += 1;
      }

      return summary;
    },
    {
      total: 0,
      search: 0,
      hold: 0,
      export: 0,
      member: 0,
      ingestion: 0,
      failed: 0,
    }
  );
}

export default async function VaultCaseActivityPage({ params }: PageContext) {
  const { id: caseId } = await params;

  const [caseResult, membersResult, auditResult] = await Promise.all([
    loadCase(caseId),
    loadCaseMembers(caseId),
    loadCaseAuditLogs(caseId),
  ]);

  const caseRow = caseResult.item;
  const timelineEvents = buildTimelineEvents({
    caseRow,
    members: membersResult.items,
    auditLogs: auditResult.items,
  });

  const summary = buildSummary(timelineEvents);

  const errors = [
    caseResult.error ? `Case: ${caseResult.error}` : null,
    membersResult.error ? `Members: ${membersResult.error}` : null,
    auditResult.error ? `Audit Logs: ${auditResult.error}` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Vault Case Workspace
            </p>

            <h1 className="text-2xl font-semibold text-zinc-100">
              Case Activity
            </h1>

            <p className="max-w-3xl text-sm text-zinc-400">
              Review case audit activity, member changes, search events, hold actions, export events, ingestion activity, and system history.
            </p>

            <p className="font-mono text-xs text-zinc-500">
              Case ID: {caseId}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/vault/cases/${caseId}`}
              className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white"
            >
              Back to Case
            </Link>

            <Link
              href={`/vault/cases/${caseId}/search`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900"
            >
              Search
            </Link>

            <Link
              href={`/vault/cases/${caseId}/holds`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900"
            >
              Holds
            </Link>

            <Link
              href={`/vault/cases/${caseId}/exports`}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-zinc-900"
            >
              Exports
            </Link>
          </div>
        </div>
      </section>

      {caseRow ? (
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                {caseRow.name ?? "Untitled Case"}
              </h2>

              <p className="mt-1 text-sm text-zinc-400">
                Created {formatDate(caseRow.created_at)} · Updated {formatDate(caseRow.updated_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getCaseStatusClass(
                  caseRow.status
                )}`}
              >
                {titleCase(caseRow.status)}
              </span>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClass(
                  caseRow.priority
                )}`}
              >
                {titleCase(caseRow.priority)}
              </span>

              {caseRow.deleted_at ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                  Deleted
                </span>
              ) : null}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-red-900/60 bg-red-950/30 p-5 text-sm text-red-300">
          Case was not found for this organization.
        </section>
      )}

      {errors.length > 0 ? (
        <section className="rounded-2xl border border-yellow-900/60 bg-yellow-950/30 p-5">
          <h2 className="text-sm font-semibold text-yellow-200">
            Some activity data could not be loaded
          </h2>

          <div className="mt-3 space-y-1 text-sm text-yellow-300">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Total Events
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.total}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Searches
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.search}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Holds
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.hold}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Exports
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.export}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Members
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.member}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Failures
          </p>
          <p className="mt-2 text-2xl font-semibold text-zinc-100">
            {summary.failed}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <h2 className="text-lg font-semibold text-zinc-100">
            Activity Timeline
          </h2>
          <p className="text-sm text-zinc-400">
            {timelineEvents.length} event(s) found for this case.
          </p>
        </div>

        {timelineEvents.length === 0 ? (
          <div className="p-6 text-sm text-zinc-400">
            No activity has been recorded for this case yet.
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {timelineEvents.map((event) => (
              <div key={event.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getCategoryClass(
                          event.category
                        )}`}
                      >
                        {titleCase(event.category)}
                      </span>

                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          event.status
                        )}`}
                      >
                        {titleCase(event.status)}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-zinc-100">
                      {event.title}
                    </h3>

                    <p className="max-w-4xl text-sm text-zinc-400">
                      {event.description}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-zinc-500">
                      <span>Actor: {event.actor}</span>
                      <span>Time: {formatDate(event.created_at)}</span>
                      <span>Source: {titleCase(event.type)}</span>
                    </div>
                  </div>

                  <div className="min-w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 lg:min-w-[360px]">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                      Metadata
                    </p>

                    {event.metadata.length === 0 ? (
                      <p className="text-sm text-zinc-500">
                        No metadata available.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {event.metadata.map((item) => (
                          <div
                            key={`${event.id}-${item.label}`}
                            className="grid gap-1 text-xs sm:grid-cols-[120px_1fr]"
                          >
                            <span className="text-zinc-500">
                              {item.label}
                            </span>
                            <span className="break-all text-zinc-300">
                              {item.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}