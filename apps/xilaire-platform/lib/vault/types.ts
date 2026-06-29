export type VaultRole =
  | "vault_admin"
  | "vault_compliance_admin"
  | "vault_search_user"
  | "vault_export_approver"
  | "vault_auditor";

export type VaultRecipient = {
  name?: string | null;
  email: string;
};

export type VaultIngestAttachment = {
  filename: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  contentHashSha256: string;
  storagePath: string;
  extractedText?: string | null;
  extractedMetadata?: Record<string, unknown> | null;
  isEmbedded?: boolean;
};

export type VaultIngestMessage = {
  sourceKey: string;
  provider?: "microsoft_365" | "exchange_on_prem" | "google_workspace" | "smtp_journal" | "manual_upload" | "api";
  sourceType?:
    | "mailbox"
    | "journal"
    | "shared_mailbox"
    | "distribution_group"
    | "ingestion_api"
    | "future_teams"
    | "future_sharepoint";

  custodianEmail?: string | null;
  custodianDisplayName?: string | null;

  providerMessageId?: string | null;
  internetMessageId?: string | null;
  conversationId?: string | null;
  threadId?: string | null;

  messageDirection?: "inbound" | "outbound" | "internal" | "unknown";
  messageType?: "email" | "calendar" | "future_teams_message" | "future_document";
  sensitivity?: "low" | "normal" | "confidential" | "high";

  subject?: string | null;
  bodyText?: string | null;
  bodyHtml?: string | null;
  bodyPreview?: string | null;

  senderName?: string | null;
  senderEmail?: string | null;
  toRecipients?: VaultRecipient[];
  ccRecipients?: VaultRecipient[];
  bccRecipients?: VaultRecipient[];
  replyToRecipients?: VaultRecipient[];

  sentAt?: string | null;
  receivedAt?: string | null;

  messageHashSha256: string;
  rawStoragePath?: string | null;
  normalizedStoragePath?: string | null;

  sizeBytes?: number | null;
  metadata?: Record<string, unknown> | null;

  attachments?: VaultIngestAttachment[];
};

export type VaultSearchRequest = {
  q?: string;
  senderEmail?: string;
  recipientEmail?: string;
  subject?: string;
  internetMessageId?: string;
  conversationId?: string;
  onHold?: boolean;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
};