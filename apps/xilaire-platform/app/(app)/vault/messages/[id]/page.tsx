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

type Recipient = {
  name: string | null;
  email: string | null;
};

type VaultMessageRow = {
  id: string;
  org_id: string | null;
  source_id: string | null;
  custodian_id: string | null;
  retention_policy_id: string | null;
  provider_message_id: string | null;
  internet_message_id: string | null;
  conversation_id: string | null;
  thread_id: string | null;
  message_direction: string | null;
  message_type: string | null;
  sensitivity: string | null;
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  body_preview: string | null;
  sender_name: string | null;
  sender_email: string | null;
  from_domain: string | null;
  recipient_email: string | null;
  to_recipients: unknown;
  cc_recipients: unknown;
  bcc_recipients: unknown;
  reply_to_recipients: unknown;
  sent_at: string | null;
  received_at: string | null;
  indexed_at: string | null;
  archived_at: string | null;
  has_attachments: boolean | null;
  attachment_count: number | null;
  size_bytes: number | null;
  message_hash_sha256: string | null;
  raw_storage_path: string | null;
  normalized_storage_path: string | null;
  retention_expires_at: string | null;
  on_hold: boolean | null;
  disposition_status: string | null;
  export_count: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  source?: VaultSourceRow | null;
  custodian?: VaultCustodianRow | null;
  retention_policy?: VaultRetentionPolicyRow | null;
};

type VaultSourceRow = {
  id: string;
  source_key: string | null;
  source_type: string | null;
  provider: string | null;
  display_name: string | null;
  name: string | null;
  status: string | null;
  sync_mode: string | null;
  mailbox_address: string | null;
};

type VaultCustodianRow = {
  id: string;
  display_name: string | null;
  primary_email: string | null;
  email: string | null;
  employee_id: string | null;
  department: string | null;
  status: string | null;
};

type VaultRetentionPolicyRow = {
  id: string;
  name: string | null;
  policy_key: string | null;
  status: string | null;
  retention_days: number | null;
  description: string | null;
};

type VaultAttachmentStorage = {
  bucket: string | null;
  objectPath: string | null;
  fileName: string | null;
};

type VaultMessageAttachmentRow = {
  id: string;
  org_id: string | null;
  message_id: string | null;
  file_name: string | null;
  display_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  storage_path: string | null;
  sha256: string | null;
  created_at: string | null;
  updated_at: string | null;
  download_url: string | null;
  storage?: VaultAttachmentStorage | null;
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
  org_id: string | null;
  message_id: string | null;
  source_id: string | null;
  mailbox_id: string | null;
  external_folder_id: string | null;
  folder_path: string | null;
  external_occurrence_id: string | null;
  provider_message_id: string | null;
  change_key: string | null;
  occurrence_type: string | null;
  is_deleted_at_source: boolean | null;
  deleted_at_source: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  mailbox: VaultSourceMailboxRow | null;
  mailbox_address: string | null;
};

type VaultHoldRow = {
  id: string;
  name: string | null;
  hold_name: string | null;
  hold_type: string | null;
  status: string | null;
  description: string | null;
  created_at: string | null;
};

type VaultMessageDetailData = {
  item: VaultMessageRow;
  source: VaultSourceRow | null;
  custodian: VaultCustodianRow | null;
  retentionPolicy: VaultRetentionPolicyRow | null;
  attachments: VaultMessageAttachmentRow[];
  occurrences: VaultMessageOccurrenceRow[];
  holds: VaultHoldRow[];
  counts: {
    attachments: number;
    occurrences: number;
    holds: number;
  };
};

type MessageApiPayload = {
  ok?: boolean;
  item?: VaultMessageRow | null;
  message?: VaultMessageRow | null;
  source?: VaultSourceRow | null;
  custodian?: VaultCustodianRow | null;
  retentionPolicy?: VaultRetentionPolicyRow | null;
  retention_policy?: VaultRetentionPolicyRow | null;
  attachments?: VaultMessageAttachmentRow[];
  occurrences?: VaultMessageOccurrenceRow[];
  holds?: VaultHoldRow[];
  counts?: {
    attachments?: number;
    occurrences?: number;
    holds?: number;
  } | null;
  summary?: {
    attachment_count?: number | null;
    occurrence_count?: number | null;
    hold_count?: number | null;
  } | null;
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

function formatBoolean(value: boolean | null | undefined) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "—";
}

function toNonEmptyString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRecipients(input: unknown): Recipient[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Record<string, unknown>;

      return {
        name: typeof record.name === "string" ? record.name : null,
        email: typeof record.email === "string" ? record.email : null,
      };
    })
    .filter((item): item is Recipient => Boolean(item));
}

function deriveRecipientsFromSingleAddress(
  email: string | null | undefined,
): Recipient[] {
  const normalized = toNonEmptyString(email);
  if (!normalized) return [];

  return [
    {
      name: null,
      email: normalized,
    },
  ];
}

function renderRecipient(recipient: Recipient, index: number) {
  const label =
    recipient.name && recipient.email
      ? `${recipient.name} <${recipient.email}>`
      : recipient.email || recipient.name || `Recipient ${index + 1}`;

  return (
    <div
      key={`${recipient.email ?? recipient.name ?? "recipient"}-${index}`}
      className="rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm text-slate-100 shadow-sm"
    >
      {label}
    </div>
  );
}

function normalizeMessageFromApi(payload: MessageApiPayload): VaultMessageDetailData {
  const message = (payload.item ?? payload.message ?? null) as VaultMessageRow | null;

  if (!message) {
    throw new Error("Vault message payload was missing the message record.");
  }

  const attachments = Array.isArray(payload.attachments) ? payload.attachments : [];
  const occurrences = Array.isArray(payload.occurrences) ? payload.occurrences : [];
  const holds = Array.isArray(payload.holds) ? payload.holds : [];

  const countsFromCounts = payload.counts ?? null;
  const countsFromSummary = payload.summary ?? null;

  return {
    item: message,
    source:
      (payload.source ?? message.source ?? null) as VaultSourceRow | null,
    custodian:
      (payload.custodian ?? message.custodian ?? null) as VaultCustodianRow | null,
    retentionPolicy:
      (payload.retentionPolicy ??
        payload.retention_policy ??
        message.retention_policy ??
        null) as VaultRetentionPolicyRow | null,
    attachments,
    occurrences,
    holds,
    counts: {
      attachments:
        typeof countsFromCounts?.attachments === "number"
          ? countsFromCounts.attachments
          : typeof countsFromSummary?.attachment_count === "number"
            ? countsFromSummary.attachment_count
            : attachments.length,
      occurrences:
        typeof countsFromCounts?.occurrences === "number"
          ? countsFromCounts.occurrences
          : typeof countsFromSummary?.occurrence_count === "number"
            ? countsFromSummary.occurrence_count
            : occurrences.length,
      holds:
        typeof countsFromCounts?.holds === "number"
          ? countsFromCounts.holds
          : typeof countsFromSummary?.hold_count === "number"
            ? countsFromSummary.hold_count
            : holds.length,
    },
  };
}

async function getMessageDetail(id: string): Promise<VaultMessageDetailData> {
  const cookieStore = await cookies();
  const supabase = getSupabaseServerClient(cookieStore);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    notFound();
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/vault/messages/${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => null)) as MessageApiPayload | null;

  if (res.status === 404) {
    notFound();
  }

  if (!res.ok || !payload?.ok) {
    throw new Error(payload?.error || "Failed to load Vault message detail.");
  }

  return normalizeMessageFromApi(payload);
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
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function FieldGrid({
  items,
}: {
  items: Array<{
    label: string;
    value: React.ReactNode;
  }>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm"
        >
          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
            {item.label}
          </div>
          <div className="mt-2 break-words text-sm text-slate-100">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniStatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function ActionButton({
  href,
  children,
  tone = "secondary",
}: {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "secondary";
}) {
  return (
    <Link
      href={href}
      className={
        tone === "primary"
          ? "inline-flex rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400"
          : "inline-flex rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
      }
    >
      {children}
    </Link>
  );
}

export default async function VaultMessageDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getMessageDetail(id);

  const message = data.item;

  const toRecipients =
    normalizeRecipients(message.to_recipients).length > 0
      ? normalizeRecipients(message.to_recipients)
      : deriveRecipientsFromSingleAddress(message.recipient_email);

  const ccRecipients = normalizeRecipients(message.cc_recipients);
  const bccRecipients = normalizeRecipients(message.bcc_recipients);
  const replyToRecipients = normalizeRecipients(message.reply_to_recipients);

  const attachments = data.attachments ?? [];
  const occurrences = data.occurrences ?? [];
  const holds = data.holds ?? [];

  const sender =
    message.sender_name && message.sender_email
      ? `${message.sender_name} <${message.sender_email}>`
      : message.sender_email || message.sender_name || "—";

  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6 rounded-3xl border border-slate-800 bg-[#071224] p-6 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  Overview
                </h1>
                <p className="mt-2 text-sm text-slate-300">{sender}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {message.subject || "(No Subject)"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Message ID: {message.id}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <MiniStatCard label="Attachments" value={data.counts.attachments} />
                <MiniStatCard label="Occurrences" value={data.counts.occurrences} />
                <MiniStatCard label="Holds" value={data.counts.holds} />
                <MiniStatCard label="Size" value={formatBytes(message.size_bytes)} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3 xl:max-w-[620px] xl:justify-end">
              <ActionButton
                href={`/vault/messages/${message.id}/attachments`}
                tone="primary"
              >
                Open Attachments
              </ActionButton>
              <ActionButton href={`/vault/messages/${message.id}/occurrences`}>
                Open Occurrences
              </ActionButton>
              <ActionButton href={`/vault/messages/${message.id}/holds`}>
                Open Holds
              </ActionButton>
              <ActionButton href={`/vault/exports?messageId=${message.id}`}>
                View Exports
              </ActionButton>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <SectionCard title="Message Overview">
            <FieldGrid
              items={[
                { label: "Subject", value: message.subject || "—" },
                { label: "Sender", value: sender },
                { label: "Primary Recipient", value: message.recipient_email || "—" },
                { label: "From Domain", value: message.from_domain || "—" },
                { label: "Sent", value: formatDateTime(message.sent_at) },
                { label: "Received", value: formatDateTime(message.received_at) },
                { label: "Archived", value: formatDateTime(message.archived_at) },
                { label: "Message Type", value: message.message_type || "—" },
                { label: "Direction", value: message.message_direction || "—" },
                { label: "Sensitivity", value: message.sensitivity || "—" },
                {
                  label: "Has Attachments",
                  value: formatBoolean(message.has_attachments),
                },
                {
                  label: "Attachment Count",
                  value:
                    typeof message.attachment_count === "number"
                      ? String(message.attachment_count)
                      : String(data.counts.attachments),
                },
                { label: "Size", value: formatBytes(message.size_bytes) },
                { label: "On Hold", value: formatBoolean(message.on_hold) },
                {
                  label: "Disposition Status",
                  value: message.disposition_status || "—",
                },
                {
                  label: "Export Count",
                  value:
                    typeof message.export_count === "number"
                      ? String(message.export_count)
                      : "—",
                },
                {
                  label: "Provider Message ID",
                  value: message.provider_message_id || "—",
                },
                {
                  label: "Internet Message ID",
                  value: message.internet_message_id || "—",
                },
                {
                  label: "Conversation ID",
                  value: message.conversation_id || "—",
                },
                { label: "Thread ID", value: message.thread_id || "—" },
                { label: "Indexed At", value: formatDateTime(message.indexed_at) },
                {
                  label: "Retention Expires",
                  value: formatDateTime(message.retention_expires_at),
                },
                { label: "Created", value: formatDateTime(message.created_at) },
                { label: "Updated", value: formatDateTime(message.updated_at) },
              ]}
            />
          </SectionCard>

          <SectionCard title="Related Records">
            <FieldGrid
              items={[
                {
                  label: "Source",
                  value:
                    data.source?.display_name ||
                    data.source?.name ||
                    data.source?.source_key ||
                    "—",
                },
                { label: "Source Type", value: data.source?.source_type || "—" },
                { label: "Provider", value: data.source?.provider || "—" },
                { label: "Source Status", value: data.source?.status || "—" },
                { label: "Sync Mode", value: data.source?.sync_mode || "—" },
                {
                  label: "Mailbox Address",
                  value: data.source?.mailbox_address || "—",
                },
                {
                  label: "Custodian",
                  value:
                    data.custodian?.display_name ||
                    data.custodian?.primary_email ||
                    data.custodian?.email ||
                    "—",
                },
                {
                  label: "Custodian Email",
                  value:
                    data.custodian?.primary_email || data.custodian?.email || "—",
                },
                {
                  label: "Custodian Department",
                  value: data.custodian?.department || "—",
                },
                {
                  label: "Retention Policy",
                  value: data.retentionPolicy?.name || "—",
                },
                {
                  label: "Retention Policy Key",
                  value: data.retentionPolicy?.policy_key || "—",
                },
                {
                  label: "Retention Days",
                  value:
                    typeof data.retentionPolicy?.retention_days === "number"
                      ? String(data.retentionPolicy.retention_days)
                      : "—",
                },
                {
                  label: "Message Hash",
                  value: message.message_hash_sha256 || "—",
                },
              ]}
            />
          </SectionCard>

          <SectionCard title="Recipients">
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-3 text-sm font-medium text-slate-200">To</div>
                <div className="grid gap-2">
                  {toRecipients.length > 0 ? (
                    toRecipients.map(renderRecipient)
                  ) : (
                    <div className="text-sm text-slate-400">No recipients</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-slate-200">CC</div>
                <div className="grid gap-2">
                  {ccRecipients.length > 0 ? (
                    ccRecipients.map(renderRecipient)
                  ) : (
                    <div className="text-sm text-slate-400">No recipients</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-slate-200">BCC</div>
                <div className="grid gap-2">
                  {bccRecipients.length > 0 ? (
                    bccRecipients.map(renderRecipient)
                  ) : (
                    <div className="text-sm text-slate-400">No recipients</div>
                  )}
                </div>
              </div>

              <div>
                <div className="mb-3 text-sm font-medium text-slate-200">
                  Reply-To
                </div>
                <div className="grid gap-2">
                  {replyToRecipients.length > 0 ? (
                    replyToRecipients.map(renderRecipient)
                  ) : (
                    <div className="text-sm text-slate-400">No recipients</div>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Message Body">
            <div className="space-y-4">
              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">
                  Preview
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
                  {message.body_preview || "—"}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">
                  Body Text
                </div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
                  {message.body_text || "—"}
                </pre>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">
                  Raw Storage Path
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
                  {message.raw_storage_path || "—"}
                </div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium text-slate-200">
                  Normalized Storage Path
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
                  {message.normalized_storage_path || "—"}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Attachments"
            action={
              <ActionButton href={`/vault/messages/${message.id}/attachments`}>
                View All
              </ActionButton>
            }
          >
            {attachments.length === 0 ? (
              <div className="text-sm text-slate-400">No attachments found.</div>
            ) : (
              <div className="space-y-4">
                {attachments.slice(0, 3).map((attachment) => (
                  <div
                    key={attachment.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          File Name
                        </div>
                        <div className="mt-2 break-words text-sm text-slate-100">
                          {attachment.display_name || attachment.file_name || "—"}
                        </div>
                      </div>

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
                          Size
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {formatBytes(attachment.size_bytes)}
                        </div>
                      </div>

                      <div className="flex items-end justify-start gap-3 xl:justify-end">
                        <ActionButton
                          href={
                            attachment.download_url ||
                            `/api/vault/attachments/${attachment.id}/download`
                          }
                        >
                          Download
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                ))}

                {attachments.length > 3 ? (
                  <div className="text-sm text-slate-400">
                    Showing 3 of {attachments.length} attachments.
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Occurrences"
            action={
              <ActionButton href={`/vault/messages/${message.id}/occurrences`}>
                View All
              </ActionButton>
            }
          >
            {occurrences.length === 0 ? (
              <div className="text-sm text-slate-400">No occurrences found.</div>
            ) : (
              <div className="space-y-4">
                {occurrences.slice(0, 3).map((occurrence) => (
                  <div
                    key={occurrence.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Occurrence Type
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {occurrence.occurrence_type || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Mailbox
                        </div>
                        <div className="mt-2 break-words text-sm text-slate-100">
                          {occurrence.mailbox?.mailbox_address ||
                            occurrence.mailbox?.display_name ||
                            occurrence.mailbox_address ||
                            "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Folder Path
                        </div>
                        <div className="mt-2 break-words text-sm text-slate-100">
                          {occurrence.folder_path || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Deleted at Source
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {formatBoolean(
                            occurrence.is_deleted_at_source ??
                              occurrence.deleted_at_source,
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {occurrences.length > 3 ? (
                  <div className="text-sm text-slate-400">
                    Showing 3 of {occurrences.length} occurrences.
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Holds"
            action={
              <ActionButton href={`/vault/messages/${message.id}/holds`}>
                View All
              </ActionButton>
            }
          >
            {holds.length === 0 ? (
              <div className="text-sm text-slate-400">
                No holds linked to this message.
              </div>
            ) : (
              <div className="space-y-4">
                {holds.slice(0, 3).map((hold) => (
                  <div
                    key={hold.id}
                    className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Hold Name
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {hold.name || hold.hold_name || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Hold Type
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {hold.hold_type || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Status
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {hold.status || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Created
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {formatDateTime(hold.created_at)}
                        </div>
                      </div>

                      <div className="md:col-span-2 xl:col-span-3">
                        <div className="text-xs uppercase tracking-[0.12em] text-slate-400">
                          Description
                        </div>
                        <div className="mt-2 text-sm text-slate-100">
                          {hold.description || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {holds.length > 3 ? (
                  <div className="text-sm text-slate-400">
                    Showing 3 of {holds.length} holds.
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Metadata">
            <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-100">
              {message.metadata
                ? JSON.stringify(message.metadata, null, 2)
                : "—"}
            </pre>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}