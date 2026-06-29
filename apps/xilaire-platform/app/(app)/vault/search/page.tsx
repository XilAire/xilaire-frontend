import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  q?: string;
  caseId?: string;
  case_id?: string;
  senderEmail?: string;
  recipientEmail?: string;
  subject?: string;
  internetMessageId?: string;
  conversationId?: string;
  onHold?: string;
  hasAttachments?: string;
  exported?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams> | SearchParams;
};

type VaultSourceSummary = {
  id: string;
  display_name: string | null;
  name: string | null;
  source_key: string | null;
  provider: string | null;
  source_type: string | null;
  status: string | null;
};

type VaultCustodianSummary = {
  id: string;
  display_name: string | null;
  primary_email: string | null;
  department: string | null;
  status: string | null;
};

type VaultCaseScope = {
  id: string;
  name: string;
  status: string | null;
  priority: string | null;
  matter_number: string | null;
  custodianCount: number;
};

type VaultSearchRow = {
  id: string;
  org_id: string;
  source_id: string | null;
  custodian_id: string | null;
  provider_message_id: string | null;
  internet_message_id: string | null;
  conversation_id: string | null;
  thread_id: string | null;
  message_direction: string | null;
  message_type: string | null;
  sensitivity: string | null;
  subject: string | null;
  body_preview: string | null;
  sender_name: string | null;
  sender_email: string | null;
  to_recipients: Array<{ email?: string | null; name?: string | null }> | null;
  cc_recipients: Array<{ email?: string | null; name?: string | null }> | null;
  bcc_recipients: Array<{ email?: string | null; name?: string | null }> | null;
  sent_at: string | null;
  received_at: string | null;
  archived_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  export_count: number | null;
  metadata: Record<string, unknown> | null;
  source: VaultSourceSummary | null;
  custodian: VaultCustodianSummary | null;
  occurrence_count: number;
  hold_count?: number | null;
};

type VaultSearchResponse = {
  ok?: boolean;
  items: VaultSearchRow[];
  total: number;
  limit: number;
  offset: number;
  paging: {
    limit: number;
    offset: number;
    total: number;
    hasMore: boolean;
  };
  counts: {
    total: number;
    attachments: number;
    onHold: number;
    exported: number;
  };
  caseScope?: VaultCaseScope | null;
  targetOrgId?: string;
  accessPath?: string;
  error?: string;
};

function getSupabaseServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables for platform.");
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: CookieOptions) {},
      remove(_name: string, _options: CookieOptions) {},
    },
  });
}

async function resolveSessionAccessToken() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    notFound();
  }

  return {
    accessToken: session.access_token,
  };
}

async function resolveBaseUrl() {
  const headerStore = await headers();

  const forwardedProto = headerStore.get("x-forwarded-proto");
  const forwardedHost = headerStore.get("x-forwarded-host");
  const host = forwardedHost || headerStore.get("host");

  if (host) {
    return `${forwardedProto || "http"}://${host}`;
  }

  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000"
  );
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "—";
  }

  if (value === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1,
  );
  const sized = value / Math.pow(1024, index);

  return `${sized.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function getDisplaySender(row: VaultSearchRow) {
  if (row.sender_name && row.sender_email) {
    return `${row.sender_name} <${row.sender_email}>`;
  }

  return row.sender_email || row.sender_name || "—";
}

function getRecipientSummary(
  recipients: Array<{ email?: string | null; name?: string | null }> | null,
) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    return "—";
  }

  const top = recipients.slice(0, 2).map((recipient) => {
    if (recipient?.name && recipient?.email) {
      return `${recipient.name} <${recipient.email}>`;
    }

    return recipient?.email || recipient?.name || "—";
  });

  if (recipients.length > 2) {
    top.push(`+${recipients.length - 2} more`);
  }

  return top.join(", ");
}

function buildSearchHref(filters: Required<SearchParams>, page: number) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.caseId) params.set("caseId", filters.caseId);
  if (filters.senderEmail) params.set("senderEmail", filters.senderEmail);
  if (filters.recipientEmail) params.set("recipientEmail", filters.recipientEmail);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.internetMessageId) {
    params.set("internetMessageId", filters.internetMessageId);
  }
  if (filters.conversationId) {
    params.set("conversationId", filters.conversationId);
  }
  if (filters.onHold) params.set("onHold", filters.onHold);
  if (filters.hasAttachments) params.set("hasAttachments", filters.hasAttachments);
  if (filters.exported) params.set("exported", filters.exported);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/vault/search?${query}` : "/vault/search";
}

function buildResetHref(filters: Required<SearchParams>) {
  return filters.caseId ? `/vault/search?caseId=${filters.caseId}` : "/vault/search";
}

function getExportTypeForSearch(filters: Required<SearchParams>) {
  return filters.caseId ? "case_export" : "search_result";
}

function buildSearchExportFilters(filters: Required<SearchParams>) {
  return {
    source: "vault_search",
    caseId: filters.caseId || undefined,
    case_id: filters.caseId || undefined,
    caseScoped: Boolean(filters.caseId),
    q: filters.q || undefined,
    senderEmail: filters.senderEmail || undefined,
    recipientEmail: filters.recipientEmail || undefined,
    subject: filters.subject || undefined,
    internetMessageId: filters.internetMessageId || undefined,
    conversationId: filters.conversationId || undefined,
    onHold: filters.onHold || undefined,
    hasAttachments: filters.hasAttachments || undefined,
    exported: filters.exported || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  };
}

function buildCurrentPageExportHref(
  messageIds: string[],
  filters: Required<SearchParams>,
) {
  const params = new URLSearchParams();

  params.set("source", "search");
  params.set("exportType", getExportTypeForSearch(filters));
  params.set("format", "zip");
  params.set("messageIds", messageIds.join("\n"));
  params.set("filtersJson", JSON.stringify(buildSearchExportFilters(filters)));

  if (filters.caseId) {
    params.set("caseId", filters.caseId);
    params.set("case_id", filters.caseId);
  }

  return `/vault/exports?${params.toString()}`;
}

function buildCaseExportHref(filters: Required<SearchParams>) {
  const params = new URLSearchParams();

  if (filters.caseId) params.set("caseId", filters.caseId);
  if (filters.q) params.set("q", filters.q);
  if (filters.senderEmail) params.set("senderEmail", filters.senderEmail);
  if (filters.recipientEmail) params.set("recipientEmail", filters.recipientEmail);
  if (filters.subject) params.set("subject", filters.subject);
  if (filters.internetMessageId) {
    params.set("internetMessageId", filters.internetMessageId);
  }
  if (filters.conversationId) {
    params.set("conversationId", filters.conversationId);
  }
  if (filters.onHold) params.set("onHold", filters.onHold);
  if (filters.hasAttachments) params.set("hasAttachments", filters.hasAttachments);
  if (filters.exported) params.set("exported", filters.exported);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);

  params.set("source", "search");
  params.set("exportType", getExportTypeForSearch(filters));
  params.set("format", "zip");
  params.set("filtersJson", JSON.stringify(buildSearchExportFilters(filters)));

  return `/vault/exports?${params.toString()}`;
}

function buildMessageExportHref(messageId: string, filters: Required<SearchParams>) {
  const params = new URLSearchParams();

  params.set("source", "search");
  params.set("exportType", getExportTypeForSearch(filters));
  params.set("format", "zip");
  params.set("messageIds", messageId);
  params.set(
    "filtersJson",
    JSON.stringify({
      ...buildSearchExportFilters(filters),
      selectedMessageId: messageId,
    }),
  );

  if (filters.caseId) {
    params.set("caseId", filters.caseId);
    params.set("case_id", filters.caseId);
  }

  return `/vault/exports?${params.toString()}`;
}

async function resolveSearchParams(
  rawSearchParams?: Promise<SearchParams> | SearchParams,
) {
  if (!rawSearchParams) return undefined;

  if (typeof (rawSearchParams as Promise<SearchParams>).then === "function") {
    return await (rawSearchParams as Promise<SearchParams>);
  }

  return rawSearchParams as SearchParams;
}

async function getSearchResults(
  rawSearchParams?: Promise<SearchParams> | SearchParams,
): Promise<{
  response: VaultSearchResponse;
  filters: Required<SearchParams>;
  page: number;
  pageSize: number;
  pageCount: number;
}> {
  const { accessToken } = await resolveSessionAccessToken();
  const searchParams = await resolveSearchParams(rawSearchParams);

  const resolvedCaseId = (
    searchParams?.caseId ||
    searchParams?.case_id ||
    ""
  ).trim();

  const filters: Required<SearchParams> = {
    q: (searchParams?.q || "").trim(),
    caseId: resolvedCaseId,
    case_id: resolvedCaseId,
    senderEmail: (searchParams?.senderEmail || "").trim(),
    recipientEmail: (searchParams?.recipientEmail || "").trim(),
    subject: (searchParams?.subject || "").trim(),
    internetMessageId: (searchParams?.internetMessageId || "").trim(),
    conversationId: (searchParams?.conversationId || "").trim(),
    onHold: (searchParams?.onHold || "").trim(),
    hasAttachments: (searchParams?.hasAttachments || "").trim(),
    exported: (searchParams?.exported || "").trim(),
    dateFrom: (searchParams?.dateFrom || "").trim(),
    dateTo: (searchParams?.dateTo || "").trim(),
    page: (searchParams?.page || "1").trim(),
  };

  const parsedPage = Number(filters.page || "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 25;
  const offset = (page - 1) * pageSize;

  const qs = new URLSearchParams();

  if (filters.q) qs.set("q", filters.q);
  if (filters.caseId) qs.set("caseId", filters.caseId);
  if (filters.senderEmail) qs.set("senderEmail", filters.senderEmail);
  if (filters.recipientEmail) qs.set("recipientEmail", filters.recipientEmail);
  if (filters.subject) qs.set("subject", filters.subject);
  if (filters.internetMessageId) qs.set("internetMessageId", filters.internetMessageId);
  if (filters.conversationId) qs.set("conversationId", filters.conversationId);
  if (filters.onHold) qs.set("onHold", filters.onHold);
  if (filters.hasAttachments) qs.set("hasAttachments", filters.hasAttachments);
  if (filters.exported) qs.set("exported", filters.exported);
  if (filters.dateFrom) qs.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) qs.set("dateTo", filters.dateTo);
  qs.set("limit", String(pageSize));
  qs.set("offset", String(offset));

  const baseUrl = await resolveBaseUrl();

  const res = await fetch(`${baseUrl}/api/vault/search?${qs.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as
    | VaultSearchResponse
    | null;

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || "Vault search failed.");
  }

  const response = payload;
  const total = response.paging?.total ?? response.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    response,
    filters,
    page,
    pageSize,
    pageCount,
  };
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[90px] rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-4 text-center shadow-sm">
      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#071224] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="border-b border-slate-800 bg-slate-950/40 px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MessagePill({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "cyan" | "amber" | "green" | "purple";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
        : tone === "green"
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
          : tone === "purple"
            ? "border-purple-500/30 bg-purple-500/10 text-purple-200"
            : "border-slate-700 bg-slate-900/70 text-slate-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

function CaseScopeBanner({
  caseScope,
  caseId,
}: {
  caseScope: VaultCaseScope | null | undefined;
  caseId: string;
}) {
  return (
    <div className="mb-6 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.20)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Case-Scoped Search Active
          </div>

          <h2 className="mt-3 text-lg font-semibold text-white">
            {caseScope?.name || "Selected Vault Case"}
          </h2>

          <p className="mt-1 text-sm text-emerald-100/80">
            Search results are limited to custodians assigned to this case.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {caseScope?.matter_number ? (
            <MessagePill tone="green">Matter {caseScope.matter_number}</MessagePill>
          ) : null}

          {caseScope?.status ? (
            <MessagePill tone="green">Status {caseScope.status}</MessagePill>
          ) : null}

          {caseScope?.priority ? (
            <MessagePill tone="amber">Priority {caseScope.priority}</MessagePill>
          ) : null}

          <MessagePill tone="cyan">
            Custodians {caseScope?.custodianCount ?? "—"}
          </MessagePill>

          <Link
            href={`/vault/cases/${caseId}`}
            className="inline-flex rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200 transition hover:bg-emerald-500/20"
          >
            Open Case
          </Link>

          <Link
            href={`/vault/holds?caseId=${caseId}`}
            className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200 transition hover:bg-amber-500/20"
          >
            Case Holds
          </Link>

          <Link
            href={`/vault/exports?caseId=${caseId}`}
            className="inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-200 transition hover:bg-purple-500/20"
          >
            Case Exports
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function VaultSearchPage({ searchParams }: PageProps) {
  const { response, filters, page, pageCount } = await getSearchResults(searchParams);

  const hasPreviousPage = page > 1;
  const hasNextPage = page < pageCount;
  const items = response.items ?? [];
  const isCaseScoped = Boolean(filters.caseId);
  const pageMessageIds = items.map((item) => item.id);
  const exportTypeForSearch = getExportTypeForSearch(filters);
  const exportFiltersJson = JSON.stringify(buildSearchExportFilters(filters));

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-[#071224] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Vault Search
                </div>

                {isCaseScoped ? (
                  <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Case Scoped
                  </div>
                ) : null}
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Message Search
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Search archived communications and open message overview,
                  attachments, occurrences, or holds directly from the result set.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                <span>Access Path: {response.accessPath || "—"}</span>
                <span>Org: {response.targetOrgId || "—"}</span>
                <span>Page: {page}</span>
                {isCaseScoped ? <span>Case ID: {filters.caseId}</span> : null}
              </div>
            </div>

            <div className="space-y-4 lg:w-auto lg:min-w-[420px]">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:justify-end">
                <StatCard label="Results" value={response.counts?.total ?? 0} />
                <StatCard
                  label="Attachments"
                  value={response.counts?.attachments ?? 0}
                />
                <StatCard label="On Hold" value={response.counts?.onHold ?? 0} />
                <StatCard
                  label="Exported"
                  value={response.counts?.exported ?? 0}
                />
              </div>

              <div className="flex flex-wrap justify-start gap-3 lg:justify-end">
                <Link
                  href={buildCurrentPageExportHref(pageMessageIds, filters)}
                  className={`inline-flex rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                    pageMessageIds.length > 0
                      ? "bg-purple-500 text-white hover:bg-purple-400"
                      : "pointer-events-none cursor-not-allowed bg-slate-800 text-slate-500"
                  }`}
                  aria-disabled={pageMessageIds.length === 0}
                >
                  Export Current Page
                </Link>

                <Link
                  href={buildCaseExportHref(filters)}
                  className="inline-flex rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20"
                >
                  Open Export Builder
                </Link>
              </div>
            </div>
          </div>
        </div>

        {isCaseScoped ? (
          <CaseScopeBanner caseScope={response.caseScope} caseId={filters.caseId} />
        ) : null}

        <SectionCard title="Filters">
          <form method="get" className="grid gap-4 lg:grid-cols-5">
            {filters.caseId ? (
              <input type="hidden" name="caseId" value={filters.caseId} />
            ) : null}

            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Keyword Search
              </label>
              <input
                type="text"
                name="q"
                defaultValue={filters.q}
                placeholder="subject, sender, body, ids..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Sender Email
              </label>
              <input
                type="text"
                name="senderEmail"
                defaultValue={filters.senderEmail}
                placeholder="sender@example.com"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Recipient Email
              </label>
              <input
                type="text"
                name="recipientEmail"
                defaultValue={filters.recipientEmail}
                placeholder="recipient@example.com"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Subject
              </label>
              <input
                type="text"
                name="subject"
                defaultValue={filters.subject}
                placeholder="subject contains..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Internet Message ID
              </label>
              <input
                type="text"
                name="internetMessageId"
                defaultValue={filters.internetMessageId}
                placeholder="&lt;message-id&gt;"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Conversation ID
              </label>
              <input
                type="text"
                name="conversationId"
                defaultValue={filters.conversationId}
                placeholder="conversation id"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Hold Status
              </label>
              <select
                name="onHold"
                defaultValue={filters.onHold}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              >
                <option value="">All</option>
                <option value="true">On Hold</option>
                <option value="false">Not On Hold</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Attachments
              </label>
              <select
                name="hasAttachments"
                defaultValue={filters.hasAttachments}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              >
                <option value="">All</option>
                <option value="true">Has Attachments</option>
                <option value="false">No Attachments</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Export Status
              </label>
              <select
                name="exported"
                defaultValue={filters.exported}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              >
                <option value="">All</option>
                <option value="true">Exported</option>
                <option value="false">Not Exported</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Date From
              </label>
              <input
                type="datetime-local"
                name="dateFrom"
                defaultValue={filters.dateFrom}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Date To
              </label>
              <input
                type="datetime-local"
                name="dateTo"
                defaultValue={filters.dateTo}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              />
            </div>

            <div className="flex flex-wrap items-end gap-3 lg:col-span-5">
              <button
                type="submit"
                className="inline-flex rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Search
              </button>

              <Link
                href={buildResetHref(filters)}
                className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Reset
              </Link>

              {filters.caseId ? (
                <>
                  <Link
                    href="/vault/search"
                    className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                  >
                    Clear Case Scope
                  </Link>

                  <Link
                    href={buildCaseExportHref(filters)}
                    className="inline-flex rounded-2xl border border-purple-500/30 bg-purple-500/10 px-5 py-3 text-sm font-medium text-purple-200 transition hover:bg-purple-500/20"
                  >
                    Export Case Search
                  </Link>
                </>
              ) : null}
            </div>
          </form>
        </SectionCard>

        <div className="mt-6">
          <SectionCard title={`Results (${response.paging?.total ?? 0})`}>
            <form method="get" action="/vault/exports" className="space-y-4">
              <input type="hidden" name="source" value="search" />
              <input type="hidden" name="exportType" value={exportTypeForSearch} />
              <input type="hidden" name="format" value="zip" />
              <input type="hidden" name="filtersJson" value={exportFiltersJson} />
              {filters.caseId ? (
                <>
                  <input type="hidden" name="caseId" value={filters.caseId} />
                  <input type="hidden" name="case_id" value={filters.caseId} />
                </>
              ) : null}

              <div className="flex flex-col gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-purple-100">
                    Export selected search results
                  </div>
                  <p className="mt-1 text-xs text-purple-100/70">
                    Select message checkboxes below, then send them to the export page.
                    {isCaseScoped
                      ? " This will preserve caseId and create a case_export request."
                      : " This will create a search_result export request."}
                  </p>
                </div>

                <button
                  type="submit"
                  className="inline-flex rounded-2xl bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-400"
                >
                  Export Selected
                </button>
              </div>

              {items.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                  No Vault messages matched the current search filters.
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((message) => (
                    <div
                      key={message.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/40 hover:bg-slate-900"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-200">
                              <input
                                type="checkbox"
                                name="messageIds"
                                value={message.id}
                                className="h-4 w-4 rounded border-slate-600 bg-slate-950"
                              />
                              Select
                            </label>

                            <h3 className="truncate text-lg font-semibold text-white">
                              {message.subject || "(No Subject)"}
                            </h3>

                            {isCaseScoped ? (
                              <MessagePill tone="green">Case Result</MessagePill>
                            ) : null}

                            {message.has_attachments ? (
                              <MessagePill tone="cyan">
                                Attachments {message.attachment_count ?? 0}
                              </MessagePill>
                            ) : null}

                            {(message.occurrence_count ?? 0) > 0 ? (
                              <MessagePill tone="cyan">
                                Occurrences {message.occurrence_count ?? 0}
                              </MessagePill>
                            ) : null}

                            {message.on_hold ? (
                              <MessagePill tone="amber">On Hold</MessagePill>
                            ) : null}

                            {(message.export_count ?? 0) > 0 ? (
                              <MessagePill tone="green">
                                Exported {message.export_count ?? 0}
                              </MessagePill>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm text-slate-300">
                            {getDisplaySender(message)}
                          </div>

                          <div className="mt-3 line-clamp-2 text-sm text-slate-400">
                            {message.body_preview || "No preview available."}
                          </div>

                          <div className="mt-4 grid gap-2 text-xs text-slate-400 md:grid-cols-2 xl:grid-cols-3">
                            <span>Received: {formatDateTime(message.received_at)}</span>
                            <span>Sent: {formatDateTime(message.sent_at)}</span>
                            <span>Archived: {formatDateTime(message.archived_at)}</span>
                            <span>To: {getRecipientSummary(message.to_recipients)}</span>
                            <span>CC: {getRecipientSummary(message.cc_recipients)}</span>
                            <span>Direction: {message.message_direction || "—"}</span>
                            <span>Type: {message.message_type || "—"}</span>
                            <span>Sensitivity: {message.sensitivity || "—"}</span>
                            <span>Status: {message.disposition_status || "—"}</span>
                            <span>Size: {formatBytes(message.size_bytes)}</span>
                            <span>
                              Source:{" "}
                              {message.source?.display_name ||
                                message.source?.name ||
                                "—"}
                            </span>
                            <span>
                              Custodian:{" "}
                              {message.custodian?.display_name ||
                                message.custodian?.primary_email ||
                                "—"}
                            </span>
                            <span>
                              Department: {message.custodian?.department || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="grid min-w-[280px] gap-3 xl:w-[360px]">
                          <div className="grid grid-cols-1 gap-3">
                            <div className="rounded-xl border border-slate-800 bg-[#071224] p-3">
                              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                                Source
                              </div>
                              <div className="mt-2 truncate text-sm text-slate-100">
                                {message.source?.display_name ||
                                  message.source?.name ||
                                  "—"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-[#071224] p-3">
                              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                                Custodian
                              </div>
                              <div className="mt-2 truncate text-sm text-slate-100">
                                {message.custodian?.display_name ||
                                  message.custodian?.primary_email ||
                                  "—"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-[#071224] p-3">
                              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                                Internet Message ID
                              </div>
                              <div className="mt-2 truncate text-sm text-slate-100">
                                {message.internet_message_id || "—"}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/vault/messages/${message.id}`}
                              className="inline-flex rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
                            >
                              Overview
                            </Link>

                            <Link
                              href={`/vault/messages/${message.id}/attachments`}
                              className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                            >
                              Attachments
                            </Link>

                            <Link
                              href={`/vault/messages/${message.id}/occurrences`}
                              className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                            >
                              Occurrences
                            </Link>

                            <Link
                              href={`/vault/messages/${message.id}/holds`}
                              className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                            >
                              Holds
                            </Link>

                            <Link
                              href={buildMessageExportHref(message.id, filters)}
                              className="inline-flex rounded-2xl border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-100 transition hover:bg-purple-500/20"
                            >
                              Export Message
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-400">
                  Page {page} of {pageCount}
                </div>

                <div className="flex gap-3">
                  {hasPreviousPage ? (
                    <Link
                      href={buildSearchHref(filters, page - 1)}
                      className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-600">
                      Previous
                    </span>
                  )}

                  {hasNextPage ? (
                    <Link
                      href={buildSearchHref(filters, page + 1)}
                      className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="inline-flex cursor-not-allowed rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-600">
                      Next
                    </span>
                  )}
                </div>
              </div>
            </form>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}