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
  on_hold: boolean | null;
};

type VaultHoldRow = {
  id: string;
  org_id: string;
  name: string | null;
  hold_name?: string | null;
  hold_type: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
  updated_at?: string | null;
  linked_message_id: string;
};

type VaultMessageHoldsResponse = {
  ok?: boolean;
  item: VaultMessageRow;
  holds: VaultHoldRow[];
  counts: {
    holds: number;
  };
  summary: {
    totalCount?: number;
    activeCount: number;
    inactiveCount?: number;
    uniqueStatusCount?: number;
    uniqueTypeCount?: number;
    byStatus?: Record<string, number>;
    byType?: Record<string, number>;
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

async function getMessageHolds(
  messageId: string,
): Promise<VaultMessageHoldsResponse> {
  const { accessToken } = await resolveSessionAccessToken();

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/vault/messages/${messageId}/holds`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as
    | VaultMessageHoldsResponse
    | null;

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to load Vault message holds.");
  }

  return {
    item: payload.item,
    holds: payload.holds ?? [],
    counts: payload.counts ?? { holds: 0 },
    summary: payload.summary ?? {
      activeCount: 0,
    },
    ok: true,
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

function resolveHoldName(hold: VaultHoldRow) {
  return hold.hold_name || hold.name || hold.id;
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

export default async function VaultMessageHoldsPage({ params }: PageProps) {
  const { id } = await params;
  const { item: message, holds, counts, summary } = await getMessageHolds(id);

  const sender =
    message.sender_name && message.sender_email
      ? `${message.sender_name} <${message.sender_email}>`
      : message.sender_email || message.sender_name || "—";

  const totalCount =
    typeof summary.totalCount === "number"
      ? summary.totalCount
      : counts.holds;

  const activeCount =
    typeof summary.activeCount === "number" ? summary.activeCount : 0;

  const inactiveCount =
    typeof summary.inactiveCount === "number"
      ? summary.inactiveCount
      : totalCount - activeCount;

  const uniqueStatusCount =
    typeof summary.uniqueStatusCount === "number"
      ? summary.uniqueStatusCount
      : Object.keys(summary.byStatus ?? {}).length;

  const uniqueTypeCount =
    typeof summary.uniqueTypeCount === "number"
      ? summary.uniqueTypeCount
      : Object.keys(summary.byType ?? {}).length;

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
                  Message Holds
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
              <StatCard label="Holds" value={totalCount} />
              <StatCard label="Active Holds" value={activeCount} />
              <StatCard label="Received" value={formatDateTime(message.received_at)} />
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Hold Summary">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <InfoCard label="Received" value={formatDateTime(message.received_at)} />
              <InfoCard label="Archived" value={formatDateTime(message.archived_at)} />
              <InfoCard label="Sender" value={sender} />
              <InfoCard label="Total Holds" value={totalCount} />
              <InfoCard label="Active Holds" value={activeCount} />
              <InfoCard label="Inactive Holds" value={inactiveCount} />
              <InfoCard label="Unique Statuses" value={uniqueStatusCount} />
              <InfoCard label="Unique Hold Types" value={uniqueTypeCount} />
              <InfoCard
                label="Attachment Count"
                value={
                  typeof message.attachment_count === "number"
                    ? message.attachment_count
                    : "—"
                }
              />
              <InfoCard label="Message On Hold" value={formatBoolean(message.on_hold)} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <StatusPill tone={totalCount > 0 ? "cyan" : "default"}>
                Holds {totalCount}
              </StatusPill>

              {activeCount > 0 ? (
                <StatusPill tone="green">Active {activeCount}</StatusPill>
              ) : (
                <StatusPill tone="default">No Active Holds</StatusPill>
              )}

              {inactiveCount > 0 ? (
                <StatusPill tone="amber">Inactive {inactiveCount}</StatusPill>
              ) : null}

              {message.on_hold ? (
                <StatusPill tone="green">Message On Hold</StatusPill>
              ) : (
                <StatusPill tone="default">Message Not Marked On Hold</StatusPill>
              )}
            </div>

            {(summary.byStatus && Object.keys(summary.byStatus).length > 0) ||
            (summary.byType && Object.keys(summary.byType).length > 0) ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="mb-3 text-sm font-semibold text-white">
                    By Status
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.byStatus ?? {}).map(([key, value]) => (
                      <StatusPill key={key} tone="cyan">
                        {key}: {value}
                      </StatusPill>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="mb-3 text-sm font-semibold text-white">
                    By Type
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.byType ?? {}).map(([key, value]) => (
                      <StatusPill key={key} tone="amber">
                        {key}: {value}
                      </StatusPill>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </SectionCard>

          <SectionCard
            title={`Holds (${holds.length})`}
            action={
              <Link
                href={`/vault/messages/${message.id}`}
                className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Back to Overview
              </Link>
            }
          >
            {holds.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                No holds are linked to this message.
              </div>
            ) : (
              <div className="space-y-4">
                {holds.map((hold) => {
                  const holdName = resolveHoldName(hold);
                  const normalizedStatus = (hold.status || "").toLowerCase();
                  const tone =
                    normalizedStatus === "active" ||
                    normalizedStatus === "open" ||
                    normalizedStatus === "enabled"
                      ? "green"
                      : normalizedStatus
                        ? "amber"
                        : "default";

                  return (
                    <div
                      key={hold.id}
                      className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-500/30 hover:bg-slate-900"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-lg font-semibold text-white">
                              {holdName}
                            </h3>

                            {hold.hold_type ? (
                              <StatusPill tone="cyan">{hold.hold_type}</StatusPill>
                            ) : null}

                            <StatusPill tone={tone}>
                              {hold.status || "Unknown Status"}
                            </StatusPill>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                            <InfoCard label="Hold Name" value={holdName} />
                            <InfoCard
                              label="Hold Type"
                              value={hold.hold_type || "—"}
                            />
                            <InfoCard label="Status" value={hold.status || "—"} />
                            <InfoCard
                              label="Created"
                              value={formatDateTime(hold.created_at)}
                            />
                            <InfoCard
                              label="Updated"
                              value={formatDateTime(hold.updated_at)}
                            />
                            <InfoCard label="Hold ID" value={hold.id} />
                            <InfoCard
                              label="Linked Message ID"
                              value={hold.linked_message_id || message.id}
                            />
                            <InfoCard
                              label="Org ID"
                              value={hold.org_id || message.org_id}
                            />
                          </div>

                          <div className="mt-4">
                            <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                              Description
                            </div>
                            <div className="rounded-xl border border-slate-800 bg-[#071224] p-3 text-sm text-slate-100">
                              {hold.description || "—"}
                            </div>
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