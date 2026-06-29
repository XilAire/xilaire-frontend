import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: {
    id: string;
  };
};

type VaultMessageRow = {
  id: string;
  org_id: string;
  subject: string | null;
  sender_name: string | null;
  sender_email: string | null;
  received_at: string | null;
  sent_at: string | null;
  attachment_count: number | null;
  has_attachments: boolean | null;
};

type AttachmentRow = {
  id: string;
  message_id: string;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  sha256: string | null;
  created_at: string | null;
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

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value?: number | null) {
  const size = Number(value ?? 0);
  if (!Number.isFinite(size) || size <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];
  let unitIndex = 0;
  let current = size;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
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

async function getMessageAttachments(messageId: string) {
  const { supabase, orgId } = await resolveOrgContext();

  const { data: message, error: messageError } = await supabase
    .from("vault_messages")
    .select(`
      id,
      org_id,
      subject,
      sender_name,
      sender_email,
      received_at,
      sent_at,
      attachment_count,
      has_attachments
    `)
    .eq("org_id", orgId)
    .eq("id", messageId)
    .maybeSingle<VaultMessageRow>();

  if (messageError) {
    throw new Error(messageError.message);
  }

  if (!message) {
    notFound();
  }

  const { data: attachments, error: attachmentsError } = await supabase
    .from("vault_message_attachments")
    .select(`
      id,
      message_id,
      file_name,
      content_type,
      size_bytes,
      storage_path,
      sha256,
      created_at
    `)
    .eq("org_id", orgId)
    .eq("message_id", messageId)
    .order("created_at", { ascending: true });

  if (attachmentsError) {
    throw new Error(attachmentsError.message);
  }

  return {
    message,
    attachments: (attachments ?? []) as AttachmentRow[],
  };
}

export default async function VaultMessageAttachmentsPage({
  params,
}: PageProps) {
  const { message, attachments } = await getMessageAttachments(params.id);

  const totalAttachmentBytes = attachments.reduce(
    (sum, attachment) => sum + (attachment.size_bytes ?? 0),
    0
  );

  const sender =
    message.sender_name && message.sender_email
      ? `${message.sender_name} <${message.sender_email}>`
      : message.sender_email || message.sender_name || "—";

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
                  Message Attachments
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
              <StatCard label="Attachments" value={attachments.length} />
              <StatCard
                label="Expected Count"
                value={message.attachment_count ?? 0}
              />
              <StatCard
                label="Total Size"
                value={formatBytes(totalAttachmentBytes)}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Message Summary">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Subject
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  {message.subject || "—"}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Sender
                </div>
                <div className="mt-2 text-sm text-slate-100">{sender}</div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Received
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  {formatDateTime(message.received_at)}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                  Sent
                </div>
                <div className="mt-2 text-sm text-slate-100">
                  {formatDateTime(message.sent_at)}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={`Attachments (${attachments.length})`}>
            {attachments.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
                No attachments were found for this message.
              </div>
            ) : (
              <div className="space-y-4">
                {attachments.map((attachment, index) => (
                  <div
                    key={attachment.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="text-lg font-semibold text-white">
                            {attachment.file_name || `Attachment ${index + 1}`}
                          </div>
                          <span className="inline-flex rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200">
                            {formatBytes(attachment.size_bytes)}
                          </span>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Content Type
                            </div>
                            <div className="mt-2 break-words text-sm text-slate-100">
                              {attachment.content_type || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Created
                            </div>
                            <div className="mt-2 text-sm text-slate-100">
                              {formatDateTime(attachment.created_at)}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Message ID
                            </div>
                            <div className="mt-2 break-all text-sm text-slate-100">
                              {attachment.message_id}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Attachment ID
                            </div>
                            <div className="mt-2 break-all text-sm text-slate-100">
                              {attachment.id}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 xl:grid-cols-2">
                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              Storage Path
                            </div>
                            <div className="mt-2 break-all text-sm text-slate-100">
                              {attachment.storage_path || "—"}
                            </div>
                          </div>

                          <div>
                            <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                              SHA-256
                            </div>
                            <div className="mt-2 break-all text-sm text-slate-100">
                              {attachment.sha256 || "—"}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-3">
                        <Link
                          href={`/api/vault/attachments/${attachment.id}/download`}
                          className="inline-flex rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
                        >
                          Download
                        </Link>

                        <Link
                          href={`/vault/messages/${message.id}`}
                          className="inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                        >
                          Back to Message
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}