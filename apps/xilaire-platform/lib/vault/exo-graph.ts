type ExoAuthMethod = "oauth_client_credentials" | "delegated_admin";

export type ExoConnectionConfig = {
  tenantId?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  clientSecretEnvVar?: string | null;
  authMethod?: ExoAuthMethod | null;
  connector?: string | null;
  provider?: string | null;
  mailboxDiscoveryEnabled?: boolean | null;
};

export type ExoFolderScope = {
  includeFolders?: string[];
  excludeFolders?: string[];
  includeArchive?: boolean;
};

export type ExoDiscoveredMailbox = {
  externalMailboxId: string;
  mailboxAddress: string;
  displayName: string | null;
  mailboxType: "user";
};

export type ExoGraphRecipient = {
  name: string | null;
  email: string | null;
};

export type ExoGraphAttachment = {
  providerAttachmentId: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number;
  isInline: boolean;
};

export type ExoGraphAttachmentContent = {
  providerAttachmentId: string;
  fileName: string | null;
  contentType: string | null;
  sizeBytes: number;
  isInline: boolean;
  contentBytesBase64: string | null;
};

export type ExoGraphMessage = {
  providerMessageId: string;
  internetMessageId: string | null;
  conversationId: string | null;
  subject: string | null;
  from: ExoGraphRecipient | null;
  toRecipients: ExoGraphRecipient[];
  ccRecipients: ExoGraphRecipient[];
  bccRecipients: ExoGraphRecipient[];
  receivedDateTime: string | null;
  sentDateTime: string | null;
  hasAttachments: boolean;
  bodyPreview: string | null;
  webLink: string | null;
  parentFolderId: string | null;
};

export type ExoGraphListMessagesResult = {
  messages: ExoGraphMessage[];
  nextLink: string | null;
  deltaLink: string | null;
  rawCount: number;
};

type GraphTokenResponse = {
  token_type?: string;
  expires_in?: number;
  ext_expires_in?: number;
  access_token?: string;
};

type GraphUserListItem = {
  id: string;
  displayName?: string | null;
  mail?: string | null;
  userPrincipalName?: string | null;
  accountEnabled?: boolean | null;
};

type GraphRecipient = {
  emailAddress?: {
    name?: string | null;
    address?: string | null;
  } | null;
};

type GraphMessageListItem = {
  id: string;
  internetMessageId?: string | null;
  conversationId?: string | null;
  subject?: string | null;
  from?: GraphRecipient | null;
  toRecipients?: GraphRecipient[] | null;
  ccRecipients?: GraphRecipient[] | null;
  bccRecipients?: GraphRecipient[] | null;
  receivedDateTime?: string | null;
  sentDateTime?: string | null;
  hasAttachments?: boolean | null;
  bodyPreview?: string | null;
  webLink?: string | null;
  parentFolderId?: string | null;
};

type GraphFileAttachmentItem = {
  id: string;
  name?: string | null;
  contentType?: string | null;
  size?: number | null;
  isInline?: boolean | null;
  contentBytes?: string | null;
  "@odata.type"?: string | null;
};

type GraphCollectionResponse<T> = {
  value?: T[];
  "@odata.nextLink"?: string;
  "@odata.deltaLink"?: string;
};

function requireNonEmptyString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value || !value.trim()) {
    return null;
  }

  return value.trim().toLowerCase();
}

function normalizeString(value: string | null | undefined): string | null {
  if (!value || !value.trim()) {
    return null;
  }

  return value.trim();
}

function normalizeRecipients(
  recipients: GraphRecipient[] | null | undefined
): ExoGraphRecipient[] {
  if (!Array.isArray(recipients)) {
    return [];
  }

  return recipients.map((recipient) => ({
    name: normalizeString(recipient?.emailAddress?.name),
    email: normalizeEmail(recipient?.emailAddress?.address),
  }));
}

function normalizeFrom(
  recipient: GraphRecipient | null | undefined
): ExoGraphRecipient | null {
  const name = normalizeString(recipient?.emailAddress?.name);
  const email = normalizeEmail(recipient?.emailAddress?.address);

  if (!name && !email) {
    return null;
  }

  return { name, email };
}

function normalizeFolderNames(input: string[] | undefined): string[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return Array.from(
    new Set(
      input
        .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
        .filter(Boolean)
    )
  );
}

function normalizeAttachment(
  attachment: GraphFileAttachmentItem | null | undefined
): ExoGraphAttachment | null {
  if (!attachment?.id) {
    return null;
  }

  return {
    providerAttachmentId: attachment.id,
    fileName: normalizeString(attachment.name),
    contentType: normalizeString(attachment.contentType),
    sizeBytes:
      typeof attachment.size === "number" && Number.isFinite(attachment.size)
        ? attachment.size
        : 0,
    isInline: attachment.isInline === true,
  };
}

function normalizeAttachmentContent(
  attachment: GraphFileAttachmentItem | null | undefined
): ExoGraphAttachmentContent | null {
  if (!attachment?.id) {
    return null;
  }

  return {
    providerAttachmentId: attachment.id,
    fileName: normalizeString(attachment.name),
    contentType: normalizeString(attachment.contentType),
    sizeBytes:
      typeof attachment.size === "number" && Number.isFinite(attachment.size)
        ? attachment.size
        : 0,
    isInline: attachment.isInline === true,
    contentBytesBase64:
      typeof attachment.contentBytes === "string" && attachment.contentBytes.trim()
        ? attachment.contentBytes.trim()
        : null,
  };
}

function resolveClientSecret(config: ExoConnectionConfig): string {
  if (typeof config.clientSecret === "string" && config.clientSecret.trim()) {
    return config.clientSecret.trim();
  }

  if (
    typeof config.clientSecretEnvVar === "string" &&
    config.clientSecretEnvVar.trim()
  ) {
    const envValue = process.env[config.clientSecretEnvVar.trim()];
    if (typeof envValue === "string" && envValue.trim()) {
      return envValue.trim();
    }
  }

  if (
    typeof process.env.M365_GRAPH_CLIENT_SECRET === "string" &&
    process.env.M365_GRAPH_CLIENT_SECRET.trim()
  ) {
    return process.env.M365_GRAPH_CLIENT_SECRET.trim();
  }

  throw new Error(
    "Microsoft Graph client secret was not found. Provide connection_config.clientSecret, connection_config.clientSecretEnvVar, or M365_GRAPH_CLIENT_SECRET."
  );
}

async function graphFetch<T>(
  url: string,
  init: RequestInit,
  expectedStatuses: number[] = [200]
): Promise<T> {
  const res = await fetch(url, init);

  if (!expectedStatuses.includes(res.status)) {
    let errorMessage = `Graph request failed with status ${res.status}.`;

    try {
      const errorPayload = (await res.json()) as {
        error?: {
          code?: string;
          message?: string;
        };
      };

      if (errorPayload?.error?.message) {
        errorMessage = `${errorMessage} ${errorPayload.error.message}`;
      }
    } catch {
      // keep default error text
    }

    throw new Error(errorMessage);
  }

  return (await res.json()) as T;
}

export async function getExoGraphAccessToken(
  config: ExoConnectionConfig
): Promise<string> {
  const tenantId = requireNonEmptyString(config.tenantId, "tenantId");
  const clientId = requireNonEmptyString(config.clientId, "clientId");
  const clientSecret = resolveClientSecret(config);

  if (
    config.authMethod &&
    config.authMethod !== "oauth_client_credentials" &&
    config.authMethod !== "delegated_admin"
  ) {
    throw new Error(`Unsupported EXO authMethod: ${String(config.authMethod)}`);
  }

  const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(
    tenantId
  )}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
    grant_type: "client_credentials",
  });

  const token = await graphFetch<GraphTokenResponse>(
    tokenUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      cache: "no-store",
    },
    [200]
  );

  if (!token.access_token) {
    throw new Error("Microsoft Graph token response did not include an access token.");
  }

  return token.access_token;
}

export async function discoverExoMailboxes(
  config: ExoConnectionConfig,
  options?: {
    limit?: number;
    selectedMailboxes?: string[];
  }
): Promise<ExoDiscoveredMailbox[]> {
  const token = await getExoGraphAccessToken(config);

  const selected = Array.isArray(options?.selectedMailboxes)
    ? Array.from(
        new Set(
          options.selectedMailboxes
            .map((value) => normalizeEmail(value))
            .filter((value): value is string => Boolean(value))
        )
      )
    : [];

  if (selected.length > 0) {
    return resolveSelectedExoMailboxes(config, selected, token);
  }

  const limit =
    typeof options?.limit === "number" && options.limit > 0 && options.limit <= 999
      ? Math.floor(options.limit)
      : 100;

  const url =
    "https://graph.microsoft.com/v1.0/users" +
    `?$select=id,displayName,mail,userPrincipalName,accountEnabled` +
    `&$top=${limit}` +
    `&$filter=accountEnabled eq true`;

  const payload = await graphFetch<GraphCollectionResponse<GraphUserListItem>>(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const rows = Array.isArray(payload.value) ? payload.value : [];

  return rows
    .map((user) => {
      const mailboxAddress = normalizeEmail(user.mail) ?? normalizeEmail(user.userPrincipalName);

      if (!mailboxAddress) {
        return null;
      }

      return {
        externalMailboxId: mailboxAddress,
        mailboxAddress,
        displayName: normalizeString(user.displayName),
        mailboxType: "user" as const,
      };
    })
    .filter((row): row is ExoDiscoveredMailbox => Boolean(row));
}

export async function resolveSelectedExoMailboxes(
  config: ExoConnectionConfig,
  selectedMailboxes: string[],
  existingToken?: string
): Promise<ExoDiscoveredMailbox[]> {
  const token = existingToken ?? (await getExoGraphAccessToken(config));
  const results: ExoDiscoveredMailbox[] = [];

  for (const rawMailbox of selectedMailboxes) {
    const mailbox = normalizeEmail(rawMailbox);

    if (!mailbox) {
      continue;
    }

    const url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(mailbox)}` +
      `?$select=id,displayName,mail,userPrincipalName,accountEnabled`;

    const user = await graphFetch<GraphUserListItem>(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const mailboxAddress = normalizeEmail(user.mail) ?? normalizeEmail(user.userPrincipalName);

    if (!mailboxAddress) {
      throw new Error(`Unable to resolve mailbox address for ${mailbox}.`);
    }

    results.push({
      externalMailboxId: mailboxAddress,
      mailboxAddress,
      displayName: normalizeString(user.displayName),
      mailboxType: "user",
    });
  }

  return results;
}

export async function listExoMailboxMessages(
  config: ExoConnectionConfig,
  mailboxAddress: string,
  options?: {
    limit?: number;
    nextLink?: string | null;
    folderScope?: ExoFolderScope | null;
  }
): Promise<ExoGraphListMessagesResult> {
  const token = await getExoGraphAccessToken(config);
  const normalizedMailbox = requireNonEmptyString(mailboxAddress, "mailboxAddress");

  const limit =
    typeof options?.limit === "number" && options.limit > 0 && options.limit <= 999
      ? Math.floor(options.limit)
      : 50;

  const nextLink =
    typeof options?.nextLink === "string" && options.nextLink.trim()
      ? options.nextLink.trim()
      : null;

  let url: string;

  if (nextLink) {
    url = nextLink;
  } else {
    const select = [
      "id",
      "internetMessageId",
      "conversationId",
      "subject",
      "from",
      "toRecipients",
      "ccRecipients",
      "bccRecipients",
      "receivedDateTime",
      "sentDateTime",
      "hasAttachments",
      "bodyPreview",
      "webLink",
      "parentFolderId",
    ].join(",");

    url =
      `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(normalizedMailbox)}/messages` +
      `?$select=${encodeURIComponent(select)}` +
      `&$top=${limit}` +
      `&$orderby=receivedDateTime desc`;
  }

  const payload = await graphFetch<GraphCollectionResponse<GraphMessageListItem>>(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Prefer: 'outlook.body-content-type="text"',
      },
      cache: "no-store",
    }
  );

  const rawMessages = Array.isArray(payload.value) ? payload.value : [];

  const normalizedMessages = rawMessages
    .map((message): ExoGraphMessage | null => {
      if (!message?.id) {
        return null;
      }

      return {
        providerMessageId: message.id,
        internetMessageId: normalizeString(message.internetMessageId),
        conversationId: normalizeString(message.conversationId),
        subject: normalizeString(message.subject),
        from: normalizeFrom(message.from),
        toRecipients: normalizeRecipients(message.toRecipients),
        ccRecipients: normalizeRecipients(message.ccRecipients),
        bccRecipients: normalizeRecipients(message.bccRecipients),
        receivedDateTime: normalizeString(message.receivedDateTime),
        sentDateTime: normalizeString(message.sentDateTime),
        hasAttachments: message.hasAttachments === true,
        bodyPreview: normalizeString(message.bodyPreview),
        webLink: normalizeString(message.webLink),
        parentFolderId: normalizeString(message.parentFolderId),
      };
    })
    .filter((message): message is ExoGraphMessage => Boolean(message));

  const messages = filterMessagesByFolderScope(
    normalizedMessages,
    options?.folderScope ?? null
  );

  return {
    messages,
    nextLink:
      typeof payload["@odata.nextLink"] === "string" && payload["@odata.nextLink"].trim()
        ? payload["@odata.nextLink"]
        : null,
    deltaLink:
      typeof payload["@odata.deltaLink"] === "string" && payload["@odata.deltaLink"].trim()
        ? payload["@odata.deltaLink"]
        : null,
    rawCount: rawMessages.length,
  };
}

export async function getExoGraphMessageAttachments(
  config: ExoConnectionConfig,
  mailboxAddress: string,
  messageId: string
): Promise<ExoGraphAttachment[]> {
  const token = await getExoGraphAccessToken(config);
  const normalizedMailbox = requireNonEmptyString(mailboxAddress, "mailboxAddress");
  const normalizedMessageId = requireNonEmptyString(messageId, "messageId");

  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(normalizedMailbox)}/messages/${encodeURIComponent(normalizedMessageId)}/attachments` +
    `?$select=id,name,contentType,size,isInline`;

  const payload = await graphFetch<GraphCollectionResponse<GraphFileAttachmentItem>>(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const rows = Array.isArray(payload.value) ? payload.value : [];

  return rows
    .map((attachment) => normalizeAttachment(attachment))
    .filter((attachment): attachment is ExoGraphAttachment => Boolean(attachment));
}

export async function getExoGraphMessageAttachmentContent(
  config: ExoConnectionConfig,
  mailboxAddress: string,
  messageId: string,
  attachmentId: string
): Promise<ExoGraphAttachmentContent> {
  const token = await getExoGraphAccessToken(config);
  const normalizedMailbox = requireNonEmptyString(mailboxAddress, "mailboxAddress");
  const normalizedMessageId = requireNonEmptyString(messageId, "messageId");
  const normalizedAttachmentId = requireNonEmptyString(attachmentId, "attachmentId");

  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(normalizedMailbox)}/messages/${encodeURIComponent(normalizedMessageId)}/attachments/${encodeURIComponent(normalizedAttachmentId)}` +
    `?$select=id,name,contentType,size,isInline,contentBytes`;

  const attachment = await graphFetch<GraphFileAttachmentItem>(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  const normalized = normalizeAttachmentContent(attachment);

  if (!normalized) {
    throw new Error("Microsoft Graph did not return a valid attachment.");
  }

  return normalized;
}

function filterMessagesByFolderScope(
  messages: ExoGraphMessage[],
  folderScope: ExoFolderScope | null
): ExoGraphMessage[] {
  if (!folderScope) {
    return messages;
  }

  const includeFolders = normalizeFolderNames(folderScope.includeFolders);
  const excludeFolders = normalizeFolderNames(folderScope.excludeFolders);

  if (includeFolders.length === 0 && excludeFolders.length === 0) {
    return messages;
  }

  void includeFolders;
  void excludeFolders;

  return messages;
}

export async function getExoMailboxMessageById(
  config: ExoConnectionConfig,
  mailboxAddress: string,
  messageId: string
): Promise<ExoGraphMessage> {
  const token = await getExoGraphAccessToken(config);
  const normalizedMailbox = requireNonEmptyString(mailboxAddress, "mailboxAddress");
  const normalizedMessageId = requireNonEmptyString(messageId, "messageId");

  const select = [
    "id",
    "internetMessageId",
    "conversationId",
    "subject",
    "from",
    "toRecipients",
    "ccRecipients",
    "bccRecipients",
    "receivedDateTime",
    "sentDateTime",
    "hasAttachments",
    "bodyPreview",
    "webLink",
    "parentFolderId",
  ].join(",");

  const url =
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(normalizedMailbox)}/messages/${encodeURIComponent(normalizedMessageId)}` +
    `?$select=${encodeURIComponent(select)}`;

  const message = await graphFetch<GraphMessageListItem>(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        Prefer: 'outlook.body-content-type="text"',
      },
      cache: "no-store",
    }
  );

  if (!message?.id) {
    throw new Error("Microsoft Graph did not return a valid message.");
  }

  return {
    providerMessageId: message.id,
    internetMessageId: normalizeString(message.internetMessageId),
    conversationId: normalizeString(message.conversationId),
    subject: normalizeString(message.subject),
    from: normalizeFrom(message.from),
    toRecipients: normalizeRecipients(message.toRecipients),
    ccRecipients: normalizeRecipients(message.ccRecipients),
    bccRecipients: normalizeRecipients(message.bccRecipients),
    receivedDateTime: normalizeString(message.receivedDateTime),
    sentDateTime: normalizeString(message.sentDateTime),
    hasAttachments: message.hasAttachments === true,
    bodyPreview: normalizeString(message.bodyPreview),
    webLink: normalizeString(message.webLink),
    parentFolderId: normalizeString(message.parentFolderId),
  };
}