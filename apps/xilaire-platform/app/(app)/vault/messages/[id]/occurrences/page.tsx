import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type VaultMessageRow = {
  id: string;
  org_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  archived_at?: string | null;
  attachment_count?: number | null;
  on_hold?: boolean | null;
};

type VaultSourceMailboxRow = {
  id: string;
  mailbox_address: string | null;
  external_mailbox_id: string | null;
  display_name: string | null;
  mailbox_type: string | null;
  ingestion_status: string | null;
};

type VaultMessageOccurrenceRow = {
  id: string;
  org_id: string;
  message_id: string;
  source_id: string | null;
  mailbox_id: string | null;
  external_folder_id: string | null;
  folder_path: string | null;
  external_occurrence_id: string | null;
  provider_message_id: string | null;
  change_key: string | null;
  occurrence_type: string | null;
  is_deleted_at_source?: boolean | null;
  deleted_at_source?: boolean;
  created_at: string | null;
  updated_at: string | null;
  mailbox: VaultSourceMailboxRow | null;
  mailbox_address?: string | null;
};

type VaultMessageOccurrencesResponse = {
  ok?: boolean;
  item: VaultMessageRow;
  occurrences: VaultMessageOccurrenceRow[];
  counts: {
    occurrences: number;
  };
  summary: {
    totalCount?: number;
    deletedAtSourceCount: number;
    activeCount?: number;
    uniqueMailboxCount?: number;
    uniqueFolderCount?: number;
  };
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

function formatDateTime(value?: string | null) {
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

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function resolveDeletedAtSource(occurrence: VaultMessageOccurrenceRow) {
  if (typeof occurrence.deleted_at_source === "boolean") {
    return occurrence.deleted_at_source;
  }

  return occurrence.is_deleted_at_source === true;
}

function resolveMailboxAddress(occurrence: VaultMessageOccurrenceRow) {
  return (
    occurrence.mailbox_address ||
    occurrence.mailbox?.mailbox_address ||
    occurrence.mailbox?.display_name ||
    null
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#071224] shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/40 px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {action ?? null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
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

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-[#071224] p-3">
      <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 break-words text-sm text-slate-100">{value}</div>
    </div>
  );
}

function StatusPill({
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

async function getMessageOccurrences(
  messageId: string,
): Promise<VaultMessageOccurrencesResponse> {
  const { accessToken } = await resolveSessionAccessToken();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  const res = await fetch(
    `${baseUrl}/api/vault/messages/${messageId}/occurrences`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  const payload = (await res.json().catch(() => null)) as
    | VaultMessageOccurrencesResponse
    | null;

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to load Vault message occurrences.");
  }

  return {
    item: payload.item as VaultMessageRow,
    occurrences: (payload.occurrences ?? []) as VaultMessageOccurrenceRow[],
    counts:
      (payload.counts as VaultMessageOccurrencesResponse["counts"]) ?? {
        occurrences: 0,
      },
    summary:
      (payload.summary as VaultMessageOccurrencesResponse["summary"]) ?? {
        deletedAtSourceCount: 0,
      },
    ok: true,
  };
}

export default async function VaultMessageOccurrencesPage({
  params,
}: PageProps) {
  const { id } = await params;
  const { item: message, occurrences, counts, summary } =
    await getMessageOccurrences(id);

  const sender =
    message.sender_name && message.sender_email
      ? `${message.sender_name} <${message.sender_email}>`
      : message.sender_email || message.sender_name || "—";

  const totalCount =
    typeof summary.totalCount === "number"
      ? summary.totalCount
      : counts.occurrences;

  const activeCount =
    typeof summary.activeCount === "number"
      ? summary.activeCount
      : totalCount - summary.deletedAtSourceCount;

  const uniqueMailboxCount =
    typeof summary.uniqueMailboxCount === "number"
      ? summary.uniqueMailboxCount
      : Array.from(
          new Set(
            occurrences
              .map((occurrence) => resolveMailboxAddress(occurrence))
              .filter((value): value is string => Boolean(value)),
          ),
        ).length;

  const uniqueFolderCount =
    typeof summary.uniqueFolderCount === "number"
      ? summary.uniqueFolderCount
      : Array.from(
          new Set(
            occurrences
              .map((occurrence) => occurrence.folder_path)
              .filter((value): value is string => Boolean(value)),
          ),
        ).length;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-[#071224] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/vault/messages/${message.id}`}
                  className="inline-flex text-sm text-cyan-300 transition hover:text-cyan-200"
                >
                  ← Back to Message
                </Link>

                <Link
                  href="/vault/search"
                  className="inline-flex text-sm text-slate-400 transition hover:text-slate-200"
                >
                  Back to Search
                </Link>
              </div>

              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Message Occurrences
                </h1>
                <p className="mt-2 text-sm text-slate-300">{sender}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {message.subject || "(No Subject)"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Message ID: {message.id}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Occurrences" value={totalCount} />
              <StatCard
                label="Deleted at Source"
                value={summary.deletedAtSourceCount}
              />
              <StatCard label="Received" value={formatDateTime(message.received_at)} />
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Occurrence Summary">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <InfoCard label="Received" value={formatDateTime(message.received_at)} />
              <InfoCard label="Archived" value={formatDateTime(message.archived_at)} />
              <InfoCard label="Sender" value={sender} />
              <InfoCard label="Occurrence Count" value={totalCount} />
              <InfoCard label="Active Copies" value={activeCount} />
              <InfoCard
                label="Deleted at Source Count"
                value={summary.deletedAtSourceCount}
              />
              <InfoCard label="Unique Mailboxes" value={uniqueMailboxCount} />
              <InfoCard label="Unique Folders" value={uniqueFolderCount} />
              <InfoCard
                label="Attachment Count"
                value={
                  typeof message.attachment_count === "number"
                    ? message.attachment_count
                    : "—"
                }
              />
              <InfoCard label="On Hold" value={formatBoolean(message.on_hold)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone={totalCount > 0 ? "cyan" : "default"}>
                Occurrences {totalCount}
              </StatusPill>

              {summary.deletedAtSourceCount > 0 ? (
                <StatusPill tone="amber">
                  Deleted at Source {summary.deletedAtSourceCount}
                </StatusPill>
              ) : (
                <StatusPill tone="green">No Deleted Source Copies</StatusPill>
              )}

              {activeCount > 0 ? (
                <StatusPill tone="green">Active Copies {activeCount}</StatusPill>
              ) : null}

              {uniqueMailboxCount > 0 ? (
                <StatusPill tone="cyan">
                  Unique Mailboxes {uniqueMailboxCount}
                </StatusPill>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard
            title={`Occurrences (${occurrences.length})`}
            action={
              <Link
                href={`/vault/messages/${message.id}`}
                className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Back to Overview
              </Link>
            }
          >
            {occurrences.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                No occurrences were found for this message.
              </div>
            ) : (
              <div className="space-y-4">
                {occurrences.map((occurrence) => {
                  const deletedAtSource = resolveDeletedAtSource(occurrence);
                  const mailboxAddress = resolveMailboxAddress(occurrence);

                  return (
                    <div
                      key={occurrence.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/30 hover:bg-slate-900"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">
                              {mailboxAddress || "(Unknown Mailbox)"}
                            </h3>

                            {occurrence.occurrence_type ? (
                              <StatusPill tone="cyan">
                                {occurrence.occurrence_type}
                              </StatusPill>
                            ) : null}

                            {deletedAtSource ? (
                              <StatusPill tone="amber">Deleted at Source</StatusPill>
                            ) : (
                              <StatusPill tone="green">Present at Source</StatusPill>
                            )}
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <InfoCard
                              label="Mailbox Display Name"
                              value={occurrence.mailbox?.display_name || "—"}
                            />
                            <InfoCard
                              label="Mailbox Address"
                              value={mailboxAddress || "—"}
                            />
                            <InfoCard
                              label="Mailbox Type"
                              value={occurrence.mailbox?.mailbox_type || "—"}
                            />
                            <InfoCard
                              label="Mailbox Status"
                              value={occurrence.mailbox?.ingestion_status || "—"}
                            />
                            <InfoCard
                              label="Folder Path"
                              value={occurrence.folder_path || "—"}
                            />
                            <InfoCard
                              label="External Folder ID"
                              value={occurrence.external_folder_id || "—"}
                            />
                            <InfoCard
                              label="External Occurrence ID"
                              value={occurrence.external_occurrence_id || "—"}
                            />
                            <InfoCard
                              label="Provider Message ID"
                              value={occurrence.provider_message_id || "—"}
                            />
                            <InfoCard
                              label="Mailbox ID"
                              value={occurrence.mailbox_id || "—"}
                            />
                            <InfoCard
                              label="Source ID"
                              value={occurrence.source_id || "—"}
                            />
                            <InfoCard
                              label="Change Key"
                              value={occurrence.change_key || "—"}
                            />
                            <InfoCard
                              label="Deleted at Source"
                              value={formatBoolean(deletedAtSource)}
                            />
                            <InfoCard
                              label="Created"
                              value={formatDateTime(occurrence.created_at)}
                            />
                            <InfoCard
                              label="Updated"
                              value={formatDateTime(occurrence.updated_at)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}