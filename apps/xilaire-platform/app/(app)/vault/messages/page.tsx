import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  q?: string;
  sender?: string;
  attachments?: string;
  hold?: string;
  page?: string;
};

type PageProps = {
  searchParams?: SearchParams;
};

type VaultMessageListRow = {
  id: string;
  org_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  from_domain: string | null;
  body_preview: string | null;
  sent_at: string | null;
  received_at: string | null;
  archived_at: string | null;
  message_type: string | null;
  message_direction: string | null;
  sensitivity: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  export_count: number | null;
  occurrence_count: number;
  size_bytes: number | null;
  created_at: string | null;
};

type VaultMessageListData = {
  items: VaultMessageListRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  counts: {
    total: number;
    attachments: number;
    onHold: number;
    exported: number;
  };
  filters: {
    q: string;
    sender: string;
    attachments: string;
    hold: string;
  };
};

function getSupabaseServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
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

async function resolveOrgContext() {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle<{ org_id: string | null }>();

  if (profileError || !profile?.org_id) {
    notFound();
  }

  return {
    supabase,
    orgId: profile.org_id,
  };
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
    units.length - 1
  );
  const sized = value / Math.pow(1024, index);

  return `${sized.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function buildPageHref(
  filters: VaultMessageListData["filters"],
  page: number
) {
  const params = new URLSearchParams();

  if (filters.q) params.set("q", filters.q);
  if (filters.sender) params.set("sender", filters.sender);
  if (filters.attachments) params.set("attachments", filters.attachments);
  if (filters.hold) params.set("hold", filters.hold);
  if (page > 1) params.set("page", String(page));

  const query = params.toString();
  return query ? `/vault/messages?${query}` : "/vault/messages";
}

function escapeSearchValue(value: string) {
  return value.replace(/[%_,]/g, " ").replace(/,/g, " ").trim();
}

async function getMessages(
  searchParams?: SearchParams
): Promise<VaultMessageListData> {
  const { supabase, orgId } = await resolveOrgContext();

  const q = (searchParams?.q || "").trim();
  const sender = (searchParams?.sender || "").trim();
  const attachments = (searchParams?.attachments || "").trim();
  const hold = (searchParams?.hold || "").trim();

  const parsedPage = Number(searchParams?.page || "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 25;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let listQuery = supabase
    .from("vault_messages")
    .select(
      `
      id,
      org_id,
      subject,
      sender_name,
      sender_email,
      from_domain,
      body_preview,
      sent_at,
      received_at,
      archived_at,
      message_type,
      message_direction,
      sensitivity,
      has_attachments,
      attachment_count,
      on_hold,
      disposition_status,
      export_count,
      size_bytes,
      created_at
    `,
      { count: "exact" }
    )
    .eq("org_id", orgId);

  if (q) {
    const escaped = escapeSearchValue(q);
    listQuery = listQuery.or(
      `subject.ilike.%${escaped}%,sender_email.ilike.%${escaped}%,sender_name.ilike.%${escaped}%,body_preview.ilike.%${escaped}%`
    );
  }

  if (sender) {
    const escapedSender = escapeSearchValue(sender);
    listQuery = listQuery.or(
      `sender_email.ilike.%${escapedSender}%,sender_name.ilike.%${escapedSender}%`
    );
  }

  if (attachments === "yes") {
    listQuery = listQuery.eq("has_attachments", true);
  } else if (attachments === "no") {
    listQuery = listQuery.eq("has_attachments", false);
  }

  if (hold === "yes") {
    listQuery = listQuery.eq("on_hold", true);
  } else if (hold === "no") {
    listQuery = listQuery.eq("on_hold", false);
  }

  const { data: items, error: listError, count } = await listQuery
    .order("received_at", { ascending: false, nullsFirst: false })
    .order("sent_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false, nullsFirst: false })
    .range(from, to);

  if (listError) {
    throw new Error(listError.message);
  }

  const rows = (items ?? []) as Omit<VaultMessageListRow, "occurrence_count">[];
  const messageIds = rows.map((row) => row.id);

  let occurrenceCounts: Record<string, number> = {};

  if (messageIds.length > 0) {
    const { data: occurrences, error: occurrenceError } = await supabase
      .from("vault_message_occurrences")
      .select("message_id")
      .eq("org_id", orgId)
      .in("message_id", messageIds);

    if (occurrenceError) {
      throw new Error(occurrenceError.message);
    }

    occurrenceCounts = ((occurrences ?? []) as { message_id: string }[]).reduce<
      Record<string, number>
    >((acc, row) => {
      acc[row.message_id] = (acc[row.message_id] ?? 0) + 1;
      return acc;
    }, {});
  }

  const enrichedRows: VaultMessageListRow[] = rows.map((row) => ({
    ...row,
    occurrence_count: occurrenceCounts[row.id] ?? 0,
  }));

  const [attachmentsCountResult, onHoldCountResult, exportedCountResult] =
    await Promise.all([
      supabase
        .from("vault_messages")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("has_attachments", true),
      supabase
        .from("vault_messages")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .eq("on_hold", true),
      supabase
        .from("vault_messages")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId)
        .gt("export_count", 0),
    ]);

  if (attachmentsCountResult.error) {
    throw new Error(attachmentsCountResult.error.message);
  }

  if (onHoldCountResult.error) {
    throw new Error(onHoldCountResult.error.message);
  }

  if (exportedCountResult.error) {
    throw new Error(exportedCountResult.error.message);
  }

  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return {
    items: enrichedRows,
    total,
    page,
    pageSize,
    pageCount,
    counts: {
      total,
      attachments: attachmentsCountResult.count ?? 0,
      onHold: onHoldCountResult.count ?? 0,
      exported: exportedCountResult.count ?? 0,
    },
    filters: {
      q,
      sender,
      attachments,
      hold,
    },
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
    <div className="rounded-2xl border border-slate-700 bg-slate-900/70 px-6 py-4 text-center shadow-sm">
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
  children: React.ReactNode;
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
  children: React.ReactNode;
  tone?: "default" | "cyan" | "amber" | "green";
}) {
  const toneClass =
    tone === "cyan"
      ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
      : tone === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : tone === "green"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
      : "border-slate-700 bg-slate-900/70 text-slate-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}

export default async function VaultMessagesPage({ searchParams }: PageProps) {
  const data = await getMessages(searchParams);

  const hasPreviousPage = data.page > 1;
  const hasNextPage = data.page < data.pageCount;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-[#071224] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Vault Messages
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Message Archive
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                  Browse archived messages and jump directly into overview,
                  attachments, or occurrences.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Total" value={data.counts.total} />
              <StatCard label="Attachments" value={data.counts.attachments} />
              <StatCard label="On Hold" value={data.counts.onHold} />
              <StatCard label="Exported" value={data.counts.exported} />
            </div>
          </div>
        </div>

        <SectionCard title="Filters">
          <form method="get" className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Search
              </label>
              <input
                type="text"
                name="q"
                defaultValue={data.filters.q}
                placeholder="Subject, sender, preview..."
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Sender
              </label>
              <input
                type="text"
                name="sender"
                defaultValue={data.filters.sender}
                placeholder="email filter"
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-500/60"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Attachments
              </label>
              <select
                name="attachments"
                defaultValue={data.filters.attachments}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              >
                <option value="">All</option>
                <option value="yes">Has attachments</option>
                <option value="no">No attachments</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.12em] text-slate-400">
                Hold Status
              </label>
              <select
                name="hold"
                defaultValue={data.filters.hold}
                className="w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-500/60"
              >
                <option value="">All</option>
                <option value="yes">On hold</option>
                <option value="no">Not on hold</option>
              </select>
            </div>

            <div className="flex items-end gap-3 lg:col-span-5">
              <button
                type="submit"
                className="inline-flex rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              >
                Apply Filters
              </button>

              <Link
                href="/vault/messages"
                className="inline-flex rounded-2xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                Reset
              </Link>
            </div>
          </form>
        </SectionCard>

        <div className="mt-6">
          <SectionCard title={`Messages (${data.total})`}>
            {data.items.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                No Vault messages matched the current filters.
              </div>
            ) : (
              <div className="space-y-4">
                {data.items.map((message) => {
                  const occurrenceCount = message.occurrence_count ?? 0;

                  return (
                    <div
                      key={message.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/40 hover:bg-slate-900"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">
                              {message.subject || "(No Subject)"}
                            </h3>

                            {message.has_attachments ? (
                              <MessagePill tone="cyan">
                                Attachments {message.attachment_count ?? 0}
                              </MessagePill>
                            ) : null}

                            {occurrenceCount > 0 ? (
                              <MessagePill tone="cyan">
                                Occurrences {occurrenceCount}
                              </MessagePill>
                            ) : null}

                            {message.on_hold ? (
                              <MessagePill tone="amber">On Hold</MessagePill>
                            ) : null}

                            {(message.export_count ?? 0) > 0 ? (
                              <MessagePill tone="green">
                                Exported {message.export_count}
                              </MessagePill>
                            ) : null}
                          </div>

                          <div className="mt-2 text-sm text-slate-300">
                            {message.sender_name && message.sender_email
                              ? `${message.sender_name} <${message.sender_email}>`
                              : message.sender_email || message.sender_name || "—"}
                          </div>

                          <div className="mt-3 line-clamp-2 text-sm text-slate-400">
                            {message.body_preview || "No preview available."}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-400">
                            <span>
                              Received: {formatDateTime(message.received_at)}
                            </span>
                            <span>Sent: {formatDateTime(message.sent_at)}</span>
                            <span>
                              Archived: {formatDateTime(message.archived_at)}
                            </span>
                            <span>Size: {formatBytes(message.size_bytes)}</span>
                            <span>
                              Direction: {message.message_direction || "—"}
                            </span>
                            <span>Type: {message.message_type || "—"}</span>
                            <span>
                              Sensitivity: {message.sensitivity || "—"}
                            </span>
                          </div>
                        </div>

                        <div className="grid min-w-[280px] gap-3 xl:w-[320px]">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-800 bg-[#071224] p-3">
                              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                                From Domain
                              </div>
                              <div className="mt-2 truncate text-sm text-slate-100">
                                {message.from_domain || "—"}
                              </div>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-[#071224] p-3">
                              <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                                Status
                              </div>
                              <div className="mt-2 truncate text-sm text-slate-100">
                                {message.disposition_status || "—"}
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
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-400">
                Page {data.page} of {data.pageCount}
              </div>

              <div className="flex gap-3">
                {hasPreviousPage ? (
                  <Link
                    href={buildPageHref(data.filters, data.page - 1)}
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
                    href={buildPageHref(data.filters, data.page + 1)}
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
          </SectionCard>
        </div>
      </div>
    </div>
  );
}