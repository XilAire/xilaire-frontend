import crypto from "crypto";
import { NextRequest } from "next/server";
import {
  getVaultAdminClient,
  jsonError,
  jsonOk,
  requireVaultAccess,
  writeUnifiedVaultAccessAuditLog,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type IngestRequestBody = {
  mailbox?: string;
  mailboxEmail?: string;
  userPrincipalName?: string;
  custodianId?: string;
  sourceId?: string;
  graphAccessToken?: string;
  limit?: number;
  since?: string;
  includeAttachments?: boolean;
};

type VaultSourceRow = {
  id: string;
  org_id: string;
  display_name: string | null;
  name: string | null;
  source_key: string | null;
  provider: string | null;
  source_type: string | null;
  status: string | null;
};

type VaultCustodianRow = {
  id: string;
  org_id: string;
  display_name: string | null;
  email: string | null;
  department: string | null;
  status: string | null;
};

type GraphEmailAddress = {
  name?: string | null;
  address?: string | null;
};

type GraphRecipient = {
  emailAddress?: GraphEmailAddress | null;
};

type GraphMessage = {
  id: string;
  internetMessageId?: string | null;
  conversationId?: string | null;
  subject?: string | null;
  bodyPreview?: string | null;
  sender?: GraphRecipient | null;
  from?: GraphRecipient | null;
  toRecipients?: GraphRecipient[] | null;
  ccRecipients?: GraphRecipient[] | null;
  bccRecipients?: GraphRecipient[] | null;
  sentDateTime?: string | null;
  receivedDateTime?: string | null;
  hasAttachments?: boolean | null;
  importance?: string | null;
  isRead?: boolean | null;
  parentFolderId?: string | null;
  webLink?: string | null;
  size?: number | null;
};

type GraphAttachment = {
  id: string;
  name?: string | null;
  contentType?: string | null;
  size?: number | null;
  isInline?: boolean | null;
  lastModifiedDateTime?: string | null;
};

type GraphListResponse<T> = {
  value?: T[];
  "@odata.nextLink"?: string;
};

const GRAPH_BASE_URL = "https://graph.microsoft.com/v1.0";

function isLikelyUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
}

function normalizeEmail(value: unknown): string | null {
  const normalized = normalizeString(value)?.toLowerCase();

  if (!normalized) return null;

  return normalized;
}

function buildMessageHash(params: {
  internetMessageId?: string | null;
  providerMessageId?: string | null;
  subject?: string | null;
  senderEmail?: string | null;
  sentAt?: string | null;
  bodyPreview?: string | null;
}) {
  const hashInput = [
    params.internetMessageId ?? "",
    params.providerMessageId ?? "",
    params.subject ?? "",
    params.senderEmail ?? "",
    params.sentAt ?? "",
    params.bodyPreview ?? "",
  ].join("|");

  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

function getAccessOrgId(access: unknown): string {
  const record = access as Record<string, unknown> | null;

  const orgId =
    normalizeString(record?.orgId) ??
    normalizeString(record?.org_id) ??
    normalizeString(record?.targetOrgId) ??
    normalizeString(record?.target_org_id) ??
    normalizeString(
      record?.profile && typeof record.profile === "object"
        ? (record.profile as Record<string, unknown>).org_id
        : null
    ) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).org_id
        : null
    );

  if (!orgId) {
    throw new Error("Unable to resolve Vault org context from access object.");
  }

  return orgId;
}

function getAccessUserId(access: unknown): string | null {
  const record = access as Record<string, unknown> | null;

  return (
    normalizeString(record?.actorUserId) ??
    normalizeString(record?.userId) ??
    normalizeString(record?.user_id) ??
    normalizeString(
      record?.user && typeof record.user === "object"
        ? (record.user as Record<string, unknown>).id
        : null
    ) ??
    null
  );
}

function getSupportContext(request: NextRequest) {
  return {
    supportSessionId:
      request.headers.get("x-support-session-id") ||
      request.headers.get("X-Support-Session-Id") ||
      request.nextUrl.searchParams.get("supportSessionId") ||
      null,

    supportGrantId:
      request.headers.get("x-support-grant-id") ||
      request.headers.get("X-Support-Grant-Id") ||
      request.nextUrl.searchParams.get("supportGrantId") ||
      null,
  };
}

function normalizeLimit(value: unknown) {
  const parsed = Number(value ?? 25);

  if (!Number.isFinite(parsed)) return 25;
  if (parsed < 1) return 1;
  if (parsed > 100) return 100;

  return Math.floor(parsed);
}

function normalizeSince(value: unknown) {
  const normalized = normalizeString(value);

  if (!normalized) return null;

  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error("since must be a valid ISO date value.");
  }

  return date.toISOString();
}

async function getMicrosoftGraphAppOnlyToken() {
  const tenantId = normalizeString(process.env.MICROSOFT_TENANT_ID);
  const clientId = normalizeString(process.env.MICROSOFT_CLIENT_ID);
  const clientSecret = normalizeString(process.env.MICROSOFT_CLIENT_SECRET);

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Microsoft app-only credentials are not configured. Add MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET."
    );
  }

  const body = new URLSearchParams();
  body.set("client_id", clientId);
  body.set("client_secret", clientSecret);
  body.set("scope", "https://graph.microsoft.com/.default");
  body.set("grant_type", "client_credentials");

  const res = await fetch(
    `https://login.microsoftonline.com/${encodeURIComponent(
      tenantId
    )}/oauth2/v2.0/token`,
    {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  const payload = (await res.json().catch(() => null)) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  } | null;

  if (!res.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.error ||
        "Unable to acquire Microsoft Graph app-only token."
    );
  }

  return payload.access_token;
}

async function normalizeBody(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("A valid ingestion payload is required.");
  }

  const input = body as IngestRequestBody;

  const mailboxEmail =
    normalizeEmail(input.mailboxEmail) ??
    normalizeEmail(input.mailbox) ??
    normalizeEmail(input.userPrincipalName);

  if (!mailboxEmail) {
    throw new Error("mailboxEmail is required.");
  }

  const custodianId = normalizeString(input.custodianId);

  if (!custodianId || !isLikelyUuid(custodianId)) {
    throw new Error("A valid custodianId is required.");
  }

  const sourceId = normalizeString(input.sourceId);

  if (!sourceId || !isLikelyUuid(sourceId)) {
    throw new Error("A valid sourceId is required.");
  }

  const manualGraphAccessToken = normalizeString(input.graphAccessToken);

  const graphAccessToken =
    manualGraphAccessToken ?? (await getMicrosoftGraphAppOnlyToken());

  return {
    mailboxEmail,
    custodianId,
    sourceId,
    graphAccessToken,
    tokenMode: manualGraphAccessToken ? "manual_token" : "app_only",
    limit: normalizeLimit(input.limit),
    since: normalizeSince(input.since),
    includeAttachments: input.includeAttachments !== false,
  };
}

function graphRecipientToContact(recipient?: GraphRecipient | null) {
  const email = normalizeEmail(recipient?.emailAddress?.address);
  const name = normalizeString(recipient?.emailAddress?.name);

  if (!email && !name) return null;

  return {
    email,
    name,
  };
}

function graphRecipientsToContacts(recipients?: GraphRecipient[] | null) {
  if (!Array.isArray(recipients)) return [];

  return recipients
    .map((recipient) => graphRecipientToContact(recipient))
    .filter(
      (recipient): recipient is { email: string | null; name: string | null } =>
        Boolean(recipient)
    );
}

function getGraphSender(message: GraphMessage) {
  return (
    graphRecipientToContact(message.from) ??
    graphRecipientToContact(message.sender)
  );
}

function buildGraphMessagesUrl(
  mailboxEmail: string,
  limit: number,
  since: string | null
) {
  const url = new URL(
    `${GRAPH_BASE_URL}/users/${encodeURIComponent(mailboxEmail)}/messages`
  );

  url.searchParams.set("$top", String(limit));
  url.searchParams.set(
    "$select",
    [
      "id",
      "internetMessageId",
      "conversationId",
      "subject",
      "bodyPreview",
      "sender",
      "from",
      "toRecipients",
      "ccRecipients",
      "bccRecipients",
      "sentDateTime",
      "receivedDateTime",
      "hasAttachments",
      "importance",
      "isRead",
      "parentFolderId",
      "webLink",
    ].join(",")
  );
  url.searchParams.set("$orderby", "receivedDateTime desc");

  if (since) {
    url.searchParams.set("$filter", `receivedDateTime ge ${since}`);
  }

  return url.toString();
}

async function graphFetch<T>(url: string, accessToken: string): Promise<T> {
  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    let details = "";

    try {
      const payload = (await res.json()) as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      details =
        payload.error?.message ||
        payload.error?.code ||
        `Microsoft Graph returned ${res.status}.`;
    } catch {
      details = `Microsoft Graph returned ${res.status}.`;
    }

    throw new Error(details);
  }

  return (await res.json()) as T;
}

async function loadSource(params: {
  orgId: string;
  sourceId: string;
}): Promise<VaultSourceRow> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_sources")
    .select(
      "id, org_id, display_name, name, source_key, provider, source_type, status"
    )
    .eq("org_id", params.orgId)
    .eq("id", params.sourceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Vault source: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vault source was not found.");
  }

  return data as VaultSourceRow;
}

async function loadCustodian(params: {
  orgId: string;
  custodianId: string;
  mailboxEmail: string;
}): Promise<VaultCustodianRow> {
  const supabase = getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_custodians")
    .select("id, org_id, display_name, email, department, status")
    .eq("org_id", params.orgId)
    .eq("id", params.custodianId)
    .maybeSingle();

  if (error) {
    throw new Error(`Unable to load Vault custodian: ${error.message}`);
  }

  if (!data) {
    throw new Error("Vault custodian was not found.");
  }

  const custodian = data as VaultCustodianRow;
  const custodianEmail = normalizeEmail(custodian.email);

  if (custodianEmail && custodianEmail !== params.mailboxEmail) {
    throw new Error("custodianId does not match the requested mailboxEmail.");
  }

  return custodian;
}

function buildVaultMessagePayload(params: {
  orgId: string;
  sourceId: string;
  custodianId: string;
  mailboxEmail: string;
  message: GraphMessage;
}) {
  const sender = getGraphSender(params.message);

  const messageHashSha256 = buildMessageHash({
    internetMessageId: params.message.internetMessageId,
    providerMessageId: params.message.id,
    subject: params.message.subject,
    senderEmail: sender?.email,
    sentAt: params.message.sentDateTime,
    bodyPreview: params.message.bodyPreview,
  });

  return {
    org_id: params.orgId,
    source_id: params.sourceId,
    custodian_id: params.custodianId,
    provider_message_id: params.message.id,
    message_hash_sha256: messageHashSha256,
    internet_message_id: params.message.internetMessageId ?? null,
    conversation_id: params.message.conversationId ?? null,
    thread_id: params.message.conversationId ?? null,
    message_direction: "inbound",
    message_type: "email",
    sensitivity: "normal",
    subject: params.message.subject ?? "(No Subject)",
    body_preview: params.message.bodyPreview ?? null,
    sender_name: sender?.name ?? null,
    sender_email: sender?.email ?? null,
    to_recipients: graphRecipientsToContacts(params.message.toRecipients),
    cc_recipients: graphRecipientsToContacts(params.message.ccRecipients),
    bcc_recipients: graphRecipientsToContacts(params.message.bccRecipients),
    sent_at: params.message.sentDateTime ?? null,
    received_at: params.message.receivedDateTime ?? null,
    archived_at: new Date().toISOString(),
    has_attachments: Boolean(params.message.hasAttachments),
    attachment_count: 0,
    size_bytes: Number(params.message.size ?? 0),
    on_hold: false,
    disposition_status: "retained",
    metadata: {
      provider: "microsoft_graph",
      mailboxEmail: params.mailboxEmail,
      graphMessageId: params.message.id,
      parentFolderId: params.message.parentFolderId ?? null,
      webLink: params.message.webLink ?? null,
      importance: params.message.importance ?? null,
      isRead: params.message.isRead ?? null,
      sensitivityUnavailable: true,
      ingestedAt: new Date().toISOString(),
    },
  };
}

async function upsertMessage(params: {
  orgId: string;
  sourceId: string;
  custodianId: string;
  mailboxEmail: string;
  message: GraphMessage;
}) {
  const supabase = getVaultAdminClient();
  const payload = buildVaultMessagePayload(params);

  const { data: existingRows, error: lookupError } = await supabase
    .from("vault_messages")
    .select("id")
    .eq("org_id", params.orgId)
    .eq("provider_message_id", params.message.id)
    .limit(1);

  if (lookupError) {
    console.error(
      "[VAULT MICROSOFT INGEST LOOKUP FAILURE]",
      JSON.stringify(
        {
          error: lookupError.message,
          code: lookupError.code,
          details: lookupError.details,
          hint: lookupError.hint,
          table: "vault_messages",
          provider_message_id: params.message.id,
        },
        null,
        2
      )
    );

    throw new Error(
      `Unable to check existing Vault message: ${lookupError.message}`
    );
  }

  const existingId = existingRows?.[0]?.id as string | undefined;

  if (existingId) {
    const { data, error } = await supabase
      .from("vault_messages")
      .update(payload)
      .eq("org_id", params.orgId)
      .eq("id", existingId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error(
        "[VAULT MICROSOFT INGEST UPDATE FAILURE]",
        JSON.stringify(
          {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            table: "vault_messages",
            existingId,
            payloadPreview: {
              org_id: payload.org_id,
              source_id: payload.source_id,
              custodian_id: payload.custodian_id,
              provider_message_id: payload.provider_message_id,
              message_hash_sha256: payload.message_hash_sha256,
              internet_message_id: payload.internet_message_id,
              conversation_id: payload.conversation_id,
              subject: payload.subject,
              sender_email: payload.sender_email,
              sent_at: payload.sent_at,
              received_at: payload.received_at,
              has_attachments: payload.has_attachments,
              attachment_count: payload.attachment_count,
              size_bytes: payload.size_bytes,
              sensitivity: payload.sensitivity,
              disposition_status: payload.disposition_status,
              metadata: payload.metadata,
            },
          },
          null,
          2
        )
      );

      throw new Error(`Unable to update Vault message: ${error.message}`);
    }

    if (!data?.id) {
      throw new Error("Vault message update did not return a message id.");
    }

    return data.id as string;
  }

  const { data, error } = await supabase
    .from("vault_messages")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error(
      "[VAULT MICROSOFT INGEST INSERT FAILURE]",
      JSON.stringify(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          table: "vault_messages",
          payloadPreview: {
            org_id: payload.org_id,
            source_id: payload.source_id,
            custodian_id: payload.custodian_id,
            provider_message_id: payload.provider_message_id,
            message_hash_sha256: payload.message_hash_sha256,
            internet_message_id: payload.internet_message_id,
            conversation_id: payload.conversation_id,
            subject: payload.subject,
            sender_email: payload.sender_email,
            sent_at: payload.sent_at,
            received_at: payload.received_at,
            has_attachments: payload.has_attachments,
            attachment_count: payload.attachment_count,
            size_bytes: payload.size_bytes,
            sensitivity: payload.sensitivity,
            disposition_status: payload.disposition_status,
            metadata: payload.metadata,
          },
        },
        null,
        2
      )
    );

    throw new Error(`Unable to insert Vault message: ${error.message}`);
  }

  if (!data?.id) {
    throw new Error("Vault message insert did not return a message id.");
  }

  return data.id as string;
}

async function loadGraphAttachments(params: {
  mailboxEmail: string;
  graphMessageId: string;
  graphAccessToken: string;
}) {
  const url = new URL(
    `${GRAPH_BASE_URL}/users/${encodeURIComponent(
      params.mailboxEmail
    )}/messages/${encodeURIComponent(params.graphMessageId)}/attachments`
  );

  url.searchParams.set(
    "$select",
    "id,name,contentType,size,isInline,lastModifiedDateTime"
  );

  const response = await graphFetch<GraphListResponse<GraphAttachment>>(
    url.toString(),
    params.graphAccessToken
  );

  return response.value ?? [];
}

async function replaceAttachmentMetadata(params: {
  orgId: string;
  sourceId: string;
  custodianId: string;
  vaultMessageId: string;
  graphMessageId: string;
  attachments: GraphAttachment[];
}) {
  const supabase = getVaultAdminClient();

  await supabase
    .from("vault_message_attachments")
    .delete()
    .eq("org_id", params.orgId)
    .eq("message_id", params.vaultMessageId);

  if (params.attachments.length === 0) {
    await supabase
      .from("vault_messages")
      .update({
        has_attachments: false,
        attachment_count: 0,
      })
      .eq("org_id", params.orgId)
      .eq("id", params.vaultMessageId);

    return {
      attachmentCount: 0,
      totalAttachmentBytes: 0,
    };
  }

  const attachmentRows = params.attachments.map((attachment) => ({
    org_id: params.orgId,
    message_id: params.vaultMessageId,
    source_id: params.sourceId,
    custodian_id: params.custodianId,
    provider_attachment_id: attachment.id,
    provider_message_id: params.graphMessageId,
    file_name: attachment.name ?? "attachment",
    content_type: attachment.contentType ?? "application/octet-stream",
    size_bytes: Number(attachment.size ?? 0),
    is_inline: Boolean(attachment.isInline),
    storage_path: null,
    hash_sha256: null,
    metadata: {
      provider: "microsoft_graph",
      graphAttachmentId: attachment.id,
      lastModifiedDateTime: attachment.lastModifiedDateTime ?? null,
    },
  }));

  const { error } = await supabase
    .from("vault_message_attachments")
    .insert(attachmentRows);

  if (error) {
    console.error(
      "[VAULT MICROSOFT INGEST ATTACHMENT FAILURE]",
      JSON.stringify(
        {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          table: "vault_message_attachments",
          graphMessageId: params.graphMessageId,
          vaultMessageId: params.vaultMessageId,
          attachmentCount: attachmentRows.length,
        },
        null,
        2
      )
    );

    throw new Error(`Unable to write attachment metadata: ${error.message}`);
  }

  const totalAttachmentBytes = attachmentRows.reduce(
    (total, attachment) => total + Number(attachment.size_bytes ?? 0),
    0
  );

  await supabase
    .from("vault_messages")
    .update({
      has_attachments: true,
      attachment_count: attachmentRows.length,
    })
    .eq("org_id", params.orgId)
    .eq("id", params.vaultMessageId);

  return {
    attachmentCount: attachmentRows.length,
    totalAttachmentBytes,
  };
}

async function ingestMessages(params: {
  orgId: string;
  sourceId: string;
  custodianId: string;
  mailboxEmail: string;
  graphAccessToken: string;
  limit: number;
  since: string | null;
  includeAttachments: boolean;
}) {
  const messagesUrl = buildGraphMessagesUrl(
    params.mailboxEmail,
    params.limit,
    params.since
  );

  const graphResponse = await graphFetch<GraphListResponse<GraphMessage>>(
    messagesUrl,
    params.graphAccessToken
  );

  const messages = graphResponse.value ?? [];

  const results: Array<{
    graphMessageId: string;
    vaultMessageId: string | null;
    status: "success" | "failed";
    error?: string;
    attachmentCount?: number;
  }> = [];

  let successCount = 0;
  let failedCount = 0;
  let attachmentCount = 0;
  let totalAttachmentBytes = 0;

  for (const message of messages) {
    try {
      const vaultMessageId = await upsertMessage({
        orgId: params.orgId,
        sourceId: params.sourceId,
        custodianId: params.custodianId,
        mailboxEmail: params.mailboxEmail,
        message,
      });

      let messageAttachmentCount = 0;

      if (params.includeAttachments && message.hasAttachments) {
        const attachments = await loadGraphAttachments({
          mailboxEmail: params.mailboxEmail,
          graphMessageId: message.id,
          graphAccessToken: params.graphAccessToken,
        });

        const attachmentResult = await replaceAttachmentMetadata({
          orgId: params.orgId,
          sourceId: params.sourceId,
          custodianId: params.custodianId,
          vaultMessageId,
          graphMessageId: message.id,
          attachments,
        });

        messageAttachmentCount = attachmentResult.attachmentCount;
        attachmentCount += attachmentResult.attachmentCount;
        totalAttachmentBytes += attachmentResult.totalAttachmentBytes;
      }

      results.push({
        graphMessageId: message.id,
        vaultMessageId,
        status: "success",
        attachmentCount: messageAttachmentCount,
      });

      successCount += 1;
    } catch (error) {
      const resolvedError =
        error instanceof Error
          ? error.message
          : "Unknown message ingestion error.";

      console.error(
        "[VAULT MICROSOFT INGEST MESSAGE FAILURE]",
        JSON.stringify(
          {
            graphMessageId: message.id,
            subject: message.subject,
            mailbox: params.mailboxEmail,
            error: resolvedError,
            payloadPreview: {
              internetMessageId: message.internetMessageId,
              conversationId: message.conversationId,
              receivedDateTime: message.receivedDateTime,
              sentDateTime: message.sentDateTime,
              hasAttachments: message.hasAttachments,
              parentFolderId: message.parentFolderId,
              webLink: message.webLink,
            },
          },
          null,
          2
        )
      );

      results.push({
        graphMessageId: message.id,
        vaultMessageId: null,
        status: "failed",
        error: resolvedError,
      });

      failedCount += 1;
    }
  }

  return {
    requestedLimit: params.limit,
    graphReturnedCount: messages.length,
    successCount,
    failedCount,
    attachmentCount,
    totalAttachmentBytes,
    hasMore: Boolean(graphResponse["@odata.nextLink"]),
    nextLink: graphResponse["@odata.nextLink"] ?? null,
    results,
  };
}

function getHttpStatusForIngestError(message: string) {
  const lower = message.toLowerCase();

  if (
    lower.includes("permission") ||
    lower.includes("support grant") ||
    lower.includes("scope")
  ) {
    return 403;
  }

  if (
    lower.includes("authenticate") ||
    lower.includes("bearer token") ||
    lower.includes("token")
  ) {
    return 401;
  }

  if (
    lower.includes("not found") ||
    lower.includes("custodian was not found") ||
    lower.includes("source was not found")
  ) {
    return 404;
  }

  return 400;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let auditAccess: Awaited<ReturnType<typeof requireVaultAccess>> | null = null;

  try {
    const access = await requireVaultAccess(request, {
      requiredVaultRoles: ["vault_admin", "vault_compliance_admin"],
      supportScope: "export_management",
    });

    auditAccess = access;

    const orgId = getAccessOrgId(access);
    const actorUserId = getAccessUserId(access);
    const supportContext = getSupportContext(request);

    const body = await request.json().catch(() => null);
    const payload = await normalizeBody(body);

    const source = await loadSource({
      orgId,
      sourceId: payload.sourceId,
    });

    const custodian = await loadCustodian({
      orgId,
      custodianId: payload.custodianId,
      mailboxEmail: payload.mailboxEmail,
    });

    const ingestResult = await ingestMessages({
      orgId,
      sourceId: payload.sourceId,
      custodianId: payload.custodianId,
      mailboxEmail: payload.mailboxEmail,
      graphAccessToken: payload.graphAccessToken,
      limit: payload.limit,
      since: payload.since,
      includeAttachments: payload.includeAttachments,
    });

    await writeUnifiedVaultAccessAuditLog({
      access,
      action: "vault.ingest.microsoft.mailbox",
      entityType: "vault_source",
      entityId: payload.sourceId,
      status: ingestResult.failedCount > 0 ? "warning" : "success",
      request,
      details: {
        org_id: orgId,
        actor_user_id: actorUserId,
        source_id: payload.sourceId,
        source_name: source.display_name ?? source.name,
        source_provider: source.provider,
        source_type: source.source_type,
        custodian_id: payload.custodianId,
        custodian_email: custodian.email,
        mailbox_email: payload.mailboxEmail,
        limit: payload.limit,
        since: payload.since,
        include_attachments: payload.includeAttachments,
        token_mode: payload.tokenMode,
        graph_returned_count: ingestResult.graphReturnedCount,
        success_count: ingestResult.successCount,
        failed_count: ingestResult.failedCount,
        attachment_count: ingestResult.attachmentCount,
        total_attachment_bytes: ingestResult.totalAttachmentBytes,
        has_more: ingestResult.hasMore,
        next_link_present: Boolean(ingestResult.nextLink),
        support_context: supportContext,
        duration_ms: Date.now() - startedAt,
      },
    });

    return jsonOk({
      ok: true,
      targetOrgId: orgId,
      source: {
        id: source.id,
        name: source.display_name ?? source.name,
        provider: source.provider,
        sourceType: source.source_type,
        status: source.status,
      },
      custodian: {
        id: custodian.id,
        displayName: custodian.display_name,
        primaryEmail: custodian.email,
        department: custodian.department,
        status: custodian.status,
      },
      mailboxEmail: payload.mailboxEmail,
      summary: {
        requestedLimit: ingestResult.requestedLimit,
        graphReturnedCount: ingestResult.graphReturnedCount,
        successCount: ingestResult.successCount,
        failedCount: ingestResult.failedCount,
        attachmentCount: ingestResult.attachmentCount,
        totalAttachmentBytes: ingestResult.totalAttachmentBytes,
        hasMore: ingestResult.hasMore,
        nextLinkPresent: Boolean(ingestResult.nextLink),
        durationMs: Date.now() - startedAt,
        tokenMode: payload.tokenMode,
        appOnlyConfigured: payload.tokenMode === "app_only",
      },
      results: ingestResult.results,
    });
  } catch (error) {
    if (auditAccess) {
      try {
        await writeUnifiedVaultAccessAuditLog({
          access: auditAccess,
          action: "vault.ingest.microsoft.mailbox",
          entityType: "vault_source",
          entityId: null,
          status: "failure",
          request,
          details: {
            error:
              error instanceof Error ? error.message : "Unknown ingestion error.",
            duration_ms: Date.now() - startedAt,
          },
        });
      } catch {
        // keep original error response
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Microsoft mailbox ingestion failed.";

    return jsonError(message, getHttpStatusForIngestError(message));
  }
}