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

type VaultCaseMemberRow = {
  id: string;
  assignable_type: string | null;
  role: string | null;
  assignable_id: string | null;
};

type VaultMessageRow = {
  id: string;
  source_id: string | null;
  custodian_id: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
};

type VaultHoldMessageRow = {
  hold_id: string;
  message_id: string;
};

type VaultHoldRow = {
  id: string;
  status: string | null;
  deleted_at?: string | null;
};

type VaultExportRow = {
  id: string;
  status: string | null;
  file_count: number | null;
  total_size_bytes: number | null;
  filters: Record<string, unknown> | null;
  deleted_at: string | null;
};

type VaultExportItemRow = {
  id: string;
  export_id: string | null;
  message_id: string | null;
};

type VaultOccurrenceRow = {
  message_id: string;
};

type CaseSummary = {
  members: {
    total: number;
    custodians: number;
    admins: number;
    owners: number;
    reviewers: number;
    viewers: number;
    members: number;
  };
  holds: {
    total: number;
    active: number;
    pending: number;
    released: number;
  };
  exports: {
    total: number;
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    cancelled: number;
    fileCount: number;
    totalSizeBytes: number;
    exportedMessageCount: number;
  };
  evidence: {
    messages: number;
    messagesWithAttachments: number;
    attachments: number;
    attachmentSizeBytes: number;
    occurrences: number;
    uniqueMailboxes: number;
    uniqueSources: number;
    uniqueFolders: number;
  };
  coverage: {
    assignedCustodianCount: number;
    custodiansWithMessages: number;
  };
};

const EMPTY_SUMMARY: CaseSummary = {
  members: {
    total: 0,
    custodians: 0,
    admins: 0,
    owners: 0,
    reviewers: 0,
    viewers: 0,
    members: 0,
  },
  holds: {
    total: 0,
    active: 0,
    pending: 0,
    released: 0,
  },
  exports: {
    total: 0,
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    fileCount: 0,
    totalSizeBytes: 0,
    exportedMessageCount: 0,
  },
  evidence: {
    messages: 0,
    messagesWithAttachments: 0,
    attachments: 0,
    attachmentSizeBytes: 0,
    occurrences: 0,
    uniqueMailboxes: 0,
    uniqueSources: 0,
    uniqueFolders: 0,
  },
  coverage: {
    assignedCustodianCount: 0,
    custodiansWithMessages: 0,
  },
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

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size = size / 1024;
    index += 1;
  }

  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "open":
    case "active":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "closed":
    case "released":
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

function getCoveragePercent(summary: CaseSummary) {
  const assigned = summary.coverage.assignedCustodianCount;
  const withMessages = summary.coverage.custodiansWithMessages;

  if (!assigned) return 0;

  return Math.min(Math.round((withMessages / assigned) * 100), 100);
}

function exportBelongsToCase(
  filters: Record<string, unknown> | null | undefined,
  caseId: string
) {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return false;
  }

  return (
    filters.caseId === caseId ||
    filters.case_id === caseId ||
    filters.vault_case_id === caseId ||
    filters.vaultCaseId === caseId
  );
}

function getFallbackExportMessageCount(caseExports: VaultExportRow[]) {
  return caseExports.reduce((sum, item) => {
    const filters = item.filters ?? {};
    const exportMessageCount =
      typeof filters.exportMessageCount === "number"
        ? filters.exportMessageCount
        : typeof filters.export_message_count === "number"
          ? filters.export_message_count
          : Number(item.file_count ?? 0);

    return sum + (Number.isFinite(exportMessageCount) ? exportMessageCount : 0);
  }, 0);
}

async function loadCase(caseId: string) {
  const supabase = getVaultAdminClient();

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

async function loadSummary(caseId: string) {
  const supabase = getVaultAdminClient();

  const membersResult = await supabase
    .from("vault_case_members")
    .select("id, assignable_type, role, assignable_id")
    .eq("org_id", FALLBACK_ORG_ID)
    .eq("case_id", caseId);

  if (membersResult.error) {
    return {
      summary: EMPTY_SUMMARY,
      error: membersResult.error.message,
    };
  }

  const members = toRows<VaultCaseMemberRow>(membersResult.data);

  const custodianIds = Array.from(
    new Set(
      members
        .filter((member) => member.assignable_type === "custodian")
        .map((member) => normalizeString(member.assignable_id))
        .filter((id): id is string => Boolean(id))
    )
  );

  let messages: VaultMessageRow[] = [];

  if (custodianIds.length > 0) {
    const messagesResult = await supabase
      .from("vault_messages")
      .select(
        `
          id,
          source_id,
          custodian_id,
          has_attachments,
          attachment_count,
          size_bytes
        `
      )
      .eq("org_id", FALLBACK_ORG_ID)
      .in("custodian_id", custodianIds);

    if (messagesResult.error) {
      return {
        summary: EMPTY_SUMMARY,
        error: messagesResult.error.message,
      };
    }

    messages = toRows<VaultMessageRow>(messagesResult.data);
  }

  const messageIds = messages.map((message) => message.id);
  const messageIdSet = new Set(messageIds);

  let holdMessageRows: VaultHoldMessageRow[] = [];
  let holds: VaultHoldRow[] = [];

  if (messageIds.length > 0) {
    const holdMessagesResult = await supabase
      .from("vault_hold_messages")
      .select("hold_id, message_id")
      .eq("org_id", FALLBACK_ORG_ID)
      .in("message_id", messageIds);

    if (holdMessagesResult.error) {
      return {
        summary: EMPTY_SUMMARY,
        error: holdMessagesResult.error.message,
      };
    }

    holdMessageRows = toRows<VaultHoldMessageRow>(holdMessagesResult.data);

    const holdIds = Array.from(
      new Set(
        holdMessageRows
          .map((row) => normalizeString(row.hold_id))
          .filter((id): id is string => Boolean(id))
      )
    );

    if (holdIds.length > 0) {
      const holdsResult = await supabase
        .from("vault_holds")
        .select("id, status, deleted_at")
        .eq("org_id", FALLBACK_ORG_ID)
        .in("id", holdIds);

      if (holdsResult.error) {
        return {
          summary: EMPTY_SUMMARY,
          error: holdsResult.error.message,
        };
      }

      holds = toRows<VaultHoldRow>(holdsResult.data);
    }
  }

  const exportsResult = await supabase
    .from("vault_exports")
    .select("id, status, file_count, total_size_bytes, filters, deleted_at")
    .eq("org_id", FALLBACK_ORG_ID)
    .is("deleted_at", null);

  if (exportsResult.error) {
    return {
      summary: EMPTY_SUMMARY,
      error: exportsResult.error.message,
    };
  }

  const caseExports = toRows<VaultExportRow>(exportsResult.data).filter((item) =>
    exportBelongsToCase(item.filters, caseId)
  );

  let exportItems: VaultExportItemRow[] = [];
  let exportItemsError: string | null = null;

  if (caseExports.length > 0) {
    const exportItemsResult = await supabase
      .from("vault_export_items")
      .select("id, export_id, message_id")
      .eq("org_id", FALLBACK_ORG_ID)
      .in(
        "export_id",
        caseExports.map((item) => item.id)
      );

    if (exportItemsResult.error) {
      exportItemsError = exportItemsResult.error.message;
    } else {
      exportItems = toRows<VaultExportItemRow>(exportItemsResult.data);
    }
  }

  let occurrences: VaultOccurrenceRow[] = [];

  if (messageIds.length > 0) {
    const occurrencesResult = await supabase
      .from("vault_message_occurrences")
      .select("message_id")
      .eq("org_id", FALLBACK_ORG_ID)
      .in("message_id", messageIds);

    if (!occurrencesResult.error) {
      occurrences = toRows<VaultOccurrenceRow>(occurrencesResult.data);
    }
  }

  const assignedCustodianCount = custodianIds.length;
  const custodiansWithMessages = new Set(
    messages
      .map((message) => normalizeString(message.custodian_id))
      .filter((id): id is string => Boolean(id))
  ).size;

  const uniqueSources = new Set(
    messages
      .map((message) => normalizeString(message.source_id))
      .filter((id): id is string => Boolean(id))
  ).size;

  const exportedMessageCount =
    exportItems.length > 0
      ? new Set(
          exportItems
            .map((item) => normalizeString(item.message_id))
            .filter((id): id is string => Boolean(id))
        ).size
      : getFallbackExportMessageCount(caseExports);

  const summary: CaseSummary = {
    members: {
      total: members.length,
      custodians: members.filter((member) => member.assignable_type === "custodian").length,
      admins: members.filter((member) => member.assignable_type === "admin").length,
      owners: members.filter((member) => member.role === "owner").length,
      reviewers: members.filter((member) => member.role === "reviewer").length,
      viewers: members.filter((member) => member.role === "viewer").length,
      members: members.filter((member) => member.role === "member").length,
    },
    holds: {
      total: holds.length,
      active: holds.filter((hold) => !hold.deleted_at && (!hold.status || hold.status === "active")).length,
      pending: holds.filter((hold) => hold.status === "pending").length,
      released: holds.filter((hold) => hold.status === "released").length,
    },
    exports: {
      total: caseExports.length,
      queued: caseExports.filter((item) => item.status === "queued").length,
      processing: caseExports.filter((item) => item.status === "processing").length,
      completed: caseExports.filter((item) => item.status === "completed").length,
      failed: caseExports.filter((item) => item.status === "failed").length,
      cancelled: caseExports.filter((item) => item.status === "cancelled").length,
      fileCount: caseExports.reduce((sum, item) => sum + Number(item.file_count ?? 0), 0),
      totalSizeBytes: caseExports.reduce((sum, item) => sum + Number(item.total_size_bytes ?? 0), 0),
      exportedMessageCount,
    },
    evidence: {
      messages: messages.length,
      messagesWithAttachments: messages.filter((message) => Boolean(message.has_attachments)).length,
      attachments: messages.reduce((sum, message) => sum + Number(message.attachment_count ?? 0), 0),
      attachmentSizeBytes: messages.reduce((sum, message) => sum + Number(message.size_bytes ?? 0), 0),
      occurrences: occurrences.length,
      uniqueMailboxes: custodiansWithMessages,
      uniqueSources,
      uniqueFolders: 0,
    },
    coverage: {
      assignedCustodianCount,
      custodiansWithMessages,
    },
  };

  return {
    summary,
    error: exportItemsError,
    debug: {
      caseMessageCount: messages.length,
      caseHoldLinkCount: holdMessageRows.filter((row) => messageIdSet.has(row.message_id)).length,
      caseExportCount: caseExports.length,
      caseExportItemCount: exportItems.length,
    },
  };
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string | number;
  subtext?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      {subtext ? <p className="mt-2 text-xs text-slate-400">{subtext}</p> : null}
    </div>
  );
}

function WorkspaceLink({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/10 bg-slate-950/60 p-5 transition hover:border-sky-400/50 hover:bg-slate-900"
    >
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{description}</p>
    </Link>
  );
}

export default async function VaultCaseSummaryPage({ params }: PageContext) {
  const { id: caseId } = await params;

  const [{ item: caseRow, error: caseError }, summaryResult] = await Promise.all([
    loadCase(caseId),
    loadSummary(caseId),
  ]);

  const summary = summaryResult.summary;
  const coveragePercent = getCoveragePercent(summary);

  if (caseError || !caseRow) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          Unable to load Vault case: {caseError ?? "Case not found."}
        </section>

        <Link
          href="/vault/cases"
          className="inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
        >
          Back to Cases
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Vault Case Workspace
            </p>

            <div>
              <h1 className="text-3xl font-semibold text-white">
                {caseRow.name ?? "Untitled Case"}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Case summary dashboard for custodians, evidence, holds, exports, and workspace actions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getStatusClass(caseRow.status)}`}>
                Status: {titleCase(caseRow.status)}
              </span>

              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${getPriorityClass(caseRow.priority)}`}>
                Priority: {titleCase(caseRow.priority)}
              </span>

              {caseRow.deleted_at ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
                  Deleted
                </span>
              ) : null}
            </div>

            <div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
              <div>Case ID: {caseRow.id}</div>
              <div>Org ID: {caseRow.org_id}</div>
              <div>Created: {formatDate(caseRow.created_at)}</div>
              <div>Updated: {formatDate(caseRow.updated_at)}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/vault/cases/${caseId}`}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            >
              Case Detail
            </Link>

            <Link
              href={`/vault/cases/${caseId}/activity`}
              className="rounded-lg border border-purple-400/40 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-400/10"
            >
              Activity
            </Link>

            <Link
              href={`/vault/cases/${caseId}/search`}
              className="rounded-lg border border-sky-400/40 px-4 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-400/10"
            >
              Search
            </Link>

            <Link
              href={`/vault/cases/${caseId}/holds`}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/5"
            >
              Holds
            </Link>

            <Link
              href={`/vault/cases/${caseId}/exports`}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:opacity-90"
            >
              Exports
            </Link>
          </div>
        </div>
      </section>

      {summaryResult.error ? (
        <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-200">
          Summary loaded with a warning: {summaryResult.error}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Messages"
          value={summary.evidence.messages}
          subtext={`${summary.evidence.messagesWithAttachments} with attachments`}
        />

        <MetricCard
          label="Holds"
          value={summary.holds.total}
          subtext={`${summary.holds.active} active • ${summary.holds.released} released`}
        />

        <MetricCard
          label="Exports"
          value={summary.exports.total}
          subtext={`${summary.exports.completed} completed • ${summary.exports.processing} processing`}
        />

        <MetricCard
          label="Custodians"
          value={`${summary.coverage.custodiansWithMessages}/${summary.coverage.assignedCustodianCount}`}
          subtext={`${coveragePercent}% have scoped messages`}
        />

        <MetricCard
          label="Evidence Size"
          value={formatBytes(summary.evidence.attachmentSizeBytes)}
          subtext={`${summary.evidence.attachments} attachments`}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
          <h2 className="text-lg font-semibold text-white">Members</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Total</span>
              <span>{summary.members.total}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Custodians</span>
              <span>{summary.members.custodians}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Admins</span>
              <span>{summary.members.admins}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Owners</span>
              <span>{summary.members.owners}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Reviewers</span>
              <span>{summary.members.reviewers}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Viewers</span>
              <span>{summary.members.viewers}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
          <h2 className="text-lg font-semibold text-white">Evidence</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Messages</span>
              <span>{summary.evidence.messages}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Occurrences</span>
              <span>{summary.evidence.occurrences}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Unique Sources</span>
              <span>{summary.evidence.uniqueSources}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Unique Mailboxes</span>
              <span>{summary.evidence.uniqueMailboxes}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Unique Folders</span>
              <span>{summary.evidence.uniqueFolders}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
          <h2 className="text-lg font-semibold text-white">Exports</h2>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between text-slate-300">
              <span>Total</span>
              <span>{summary.exports.total}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Completed</span>
              <span>{summary.exports.completed}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Queued</span>
              <span>{summary.exports.queued}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Failed</span>
              <span>{summary.exports.failed}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Exported Messages</span>
              <span>{summary.exports.exportedMessageCount}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Total Size</span>
              <span>{formatBytes(summary.exports.totalSizeBytes)}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-950/60 p-6">
        <h2 className="text-lg font-semibold text-white">Workspace Actions</h2>
        <p className="mt-2 text-sm text-slate-400">
          Continue case work from the dedicated case-scoped pages.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <WorkspaceLink
            href={`/vault/cases/${caseId}`}
            title="Case Detail"
            description="Review case metadata, assigned custodians, and case administration."
          />

          <WorkspaceLink
            href={`/vault/cases/${caseId}/activity`}
            title="Review Activity"
            description="Review case activity, audit events, and member assignment timeline."
          />

          <WorkspaceLink
            href={`/vault/cases/${caseId}/search`}
            title="Search Case Evidence"
            description="Search messages scoped to assigned case custodians."
          />

          <WorkspaceLink
            href={`/vault/cases/${caseId}/holds`}
            title="Review Holds"
            description="Review holds connected to messages within this case scope."
          />

          <WorkspaceLink
            href={`/vault/cases/${caseId}/exports`}
            title="Review Exports"
            description="Review exports linked through filters.caseId / filters.case_id."
          />
        </div>
      </section>
    </div>
  );
}