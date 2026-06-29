import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getVaultAdminClient } from "@/lib/vault/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const FALLBACK_ORG_ID = "276f130f-6f47-44a3-80e5-3cbbf246edf7";

type PageContext = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type VaultSourceRow = {
  id: string;
  org_id: string;
  source_key: string | null;
  source_type: string | null;
  provider: string | null;
  display_name: string | null;
  name: string | null;
  status: string | null;
  auth_method: string | null;
  sync_mode: string | null;
  health_status: string | null;
  config: Record<string, unknown> | null;
  connection_config: Record<string, unknown> | null;
  scope_config: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
};

type VaultSourceMailboxRow = {
  id: string;
  org_id: string;
  source_id: string;
  mailbox_address: string | null;
  display_name: string | null;
  mailbox_type: string | null;
  ingestion_status: string | null;
  external_mailbox_id: string | null;
  deleted_at: string | null;
};

type SourceWithCounts = VaultSourceRow & {
  mailbox_count: number;
  pending_mailboxes: number;
  active_mailboxes: number;
  failed_mailboxes: number;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function toRows<T>(value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value as T[];
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

function titleCase(value: string | null | undefined) {
  if (!value) return "—";

  return value
    .replace(/_/g, " ")
    .replace(/\./g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStatusClass(status: string | null | undefined) {
  switch ((status ?? "").toLowerCase()) {
    case "active":
    case "connected":
    case "success":
    case "healthy":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "pending":
    case "queued":
    case "unknown":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    case "failed":
    case "error":
    case "disabled":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function getSourceTypeLabel(sourceType: string | null | undefined) {
  switch ((sourceType ?? "").toLowerCase()) {
    case "exo":
    case "exo_graph":
    case "exchange_online":
    case "microsoft_exchange_online":
      return "Exchange Online";
    case "graph":
    case "graph_api":
    case "microsoft_graph":
      return "Microsoft Graph API";
    case "exchange_ews":
      return "Exchange On-Prem EWS";
    case "exchange_journal_smtp":
    case "smtp_journal":
      return "SMTP Journal";
    case "gmail_api":
    case "gmail":
    case "google_workspace":
      return "Gmail / Google Workspace";
    case "imap":
      return "IMAP";
    default:
      return titleCase(sourceType ?? "Unknown");
  }
}

function getProviderLabel(provider: string | null | undefined) {
  switch ((provider ?? "").toLowerCase()) {
    case "microsoft":
    case "microsoft_365":
    case "exchange_online":
      return "Microsoft 365";
    case "exchange_on_prem":
      return "Exchange On-Prem";
    case "google":
    case "google_workspace":
      return "Google Workspace";
    case "api":
      return "Generic API / IMAP";
    case "smtp_journal":
      return "SMTP Journal";
    default:
      return titleCase(provider ?? "Unknown");
  }
}

function parseMailboxAddresses(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function parseFolderList(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function parseGraphWorkloads(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return [];

  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

function buildFormErrorRedirect(message: string) {
  redirect(`/vault/sources?error=${encodeURIComponent(message)}`);
}

async function loadSources() {
  const supabase = await getVaultAdminClient();

  const [sourcesResult, mailboxesResult] = await Promise.all([
    supabase
      .from("vault_sources")
      .select(
        [
          "id",
          "org_id",
          "source_key",
          "source_type",
          "provider",
          "display_name",
          "name",
          "status",
          "auth_method",
          "sync_mode",
          "health_status",
          "config",
          "connection_config",
          "scope_config",
          "created_at",
          "updated_at",
        ].join(", ")
      )
      .eq("org_id", FALLBACK_ORG_ID)
      .order("created_at", { ascending: false }),

    supabase
      .from("vault_source_mailboxes")
      .select(
        "id, org_id, source_id, mailbox_address, display_name, mailbox_type, ingestion_status, external_mailbox_id, deleted_at"
      )
      .eq("org_id", FALLBACK_ORG_ID)
      .is("deleted_at", null),
  ]);

  const sourceRows = toRows<VaultSourceRow>(sourcesResult.data);
  const mailboxRows = toRows<VaultSourceMailboxRow>(mailboxesResult.data);

  const mailboxCounts = new Map<
    string,
    {
      total: number;
      pending: number;
      active: number;
      failed: number;
    }
  >();

  for (const mailbox of mailboxRows) {
    const current = mailboxCounts.get(mailbox.source_id) ?? {
      total: 0,
      pending: 0,
      active: 0,
      failed: 0,
    };

    current.total += 1;

    const status = (mailbox.ingestion_status ?? "").toLowerCase();

    if (status === "pending" || status === "queued") current.pending += 1;
    if (status === "active" || status === "connected" || status === "synced") {
      current.active += 1;
    }
    if (status === "failed" || status === "error") current.failed += 1;

    mailboxCounts.set(mailbox.source_id, current);
  }

  const items: SourceWithCounts[] = sourceRows.map((source) => {
    const counts = mailboxCounts.get(source.id) ?? {
      total: 0,
      pending: 0,
      active: 0,
      failed: 0,
    };

    return {
      ...source,
      mailbox_count: counts.total,
      pending_mailboxes: counts.pending,
      active_mailboxes: counts.active,
      failed_mailboxes: counts.failed,
    };
  });

  return {
    items,
    mailboxes: mailboxRows,
    error:
      sourcesResult.error?.message ?? mailboxesResult.error?.message ?? null,
  };
}

async function connectEwsSource(formData: FormData) {
  "use server";

  const name = normalizeString(formData.get("ewsName"));
  const sourceKey = normalizeString(formData.get("ewsSourceKey"));
  const exchangeVersion =
    normalizeString(formData.get("exchangeVersion")) ?? "Exchange2016";
  const ewsUrl = normalizeString(formData.get("ewsUrl"));
  const autodiscoverUrl = normalizeString(formData.get("autodiscoverUrl"));
  const domain = normalizeString(formData.get("ewsDomain"));
  const username = normalizeString(formData.get("ewsUsername"));
  const password = normalizeString(formData.get("ewsPassword"));
  const passwordEnvVar = normalizeString(formData.get("ewsPasswordEnvVar"));

  const tenantId = normalizeString(formData.get("ewsTenantId"));
  const clientId = normalizeString(formData.get("ewsClientId"));
  const clientSecret = normalizeString(formData.get("ewsClientSecret"));
  const clientSecretEnvVar = normalizeString(
    formData.get("ewsClientSecretEnvVar")
  );
  const impersonationUser = normalizeString(
    formData.get("ewsImpersonationUser")
  );

  const authMethodRaw =
    normalizeString(formData.get("ewsAuthMethod")) ?? "basic";

  const authMethod =
    authMethodRaw === "ntlm"
      ? "ntlm"
      : authMethodRaw === "oauth_client_credentials"
        ? "oauth_client_credentials"
        : authMethodRaw === "oauth_delegated"
          ? "oauth_delegated"
          : "basic";

  const discoveryModeRaw =
    normalizeString(formData.get("ewsDiscoveryMode")) ?? "selected_mailboxes";

  const discoveryMode =
    discoveryModeRaw === "autodiscover"
      ? "autodiscover"
      : discoveryModeRaw === "all_mailboxes"
        ? "all_mailboxes"
        : "selected_mailboxes";

  const syncModeRaw =
    normalizeString(formData.get("ewsSyncMode")) ?? "scheduled";

  const syncMode = syncModeRaw === "continuous" ? "continuous" : "scheduled";

  const mailboxAddresses = parseMailboxAddresses(
    formData.get("ewsMailboxAddresses")
  );

  const includeFolders = parseFolderList(formData.get("ewsIncludeFolders"));
  const excludeFolders = parseFolderList(formData.get("ewsExcludeFolders"));
  const includeArchive = formData.get("ewsIncludeArchive") === "true";
  const includeRecoverableItems =
    formData.get("ewsIncludeRecoverableItems") === "true";

  if (!ewsUrl && !autodiscoverUrl) {
    buildFormErrorRedirect("Exchange EWS URL or autodiscover URL is required.");
  }

  if (authMethod === "basic" || authMethod === "ntlm") {
    if (!username) {
      buildFormErrorRedirect("Exchange EWS username is required.");
    }

    if (!password && !passwordEnvVar) {
      buildFormErrorRedirect(
        "Exchange EWS password or password environment variable is required."
      );
    }
  }

  if (
    authMethod === "oauth_client_credentials" ||
    authMethod === "oauth_delegated"
  ) {
    if (!tenantId) {
      buildFormErrorRedirect("Exchange EWS OAuth tenant ID is required.");
    }

    if (!clientId) {
      buildFormErrorRedirect("Exchange EWS OAuth client ID is required.");
    }

    if (!clientSecret && !clientSecretEnvVar) {
      buildFormErrorRedirect(
        "Exchange EWS OAuth client secret or client secret environment variable is required."
      );
    }
  }

  if (discoveryMode === "selected_mailboxes" && mailboxAddresses.length === 0) {
    buildFormErrorRedirect(
      "At least one mailbox address is required for selected Exchange EWS discovery."
    );
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vault/sources/exchange/ews/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        sourceKey,
        exchangeVersion,
        ewsUrl,
        autodiscoverUrl,
        authMethod,
        username,
        password,
        passwordEnvVar,
        domain,
        tenantId,
        clientId,
        clientSecret,
        clientSecretEnvVar,
        impersonationUser,
        mailboxAddresses,
        discoveryMode,
        syncMode,
        folderScope: {
          includeFolders,
          excludeFolders,
          includeArchive,
          includeRecoverableItems,
        },
        batchSize: 100,
      }),
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      normalizeString(payload?.error) ??
      normalizeString(payload?.message) ??
      "Failed to connect Exchange EWS source.";

    buildFormErrorRedirect(message);
  }

  revalidatePath("/vault/sources");
  redirect("/vault/sources?success=ews-connected");
}

async function connectGraphApiSource(formData: FormData) {
  "use server";

  const name = normalizeString(formData.get("graphName"));
  const sourceKey = normalizeString(formData.get("graphSourceKey"));
  const tenantId = normalizeString(formData.get("graphTenantId"));
  const clientId = normalizeString(formData.get("graphClientId"));
  const clientSecret = normalizeString(formData.get("graphClientSecret"));
  const clientSecretEnvVar = normalizeString(
    formData.get("graphClientSecretEnvVar")
  );

  const discoveryModeRaw =
    normalizeString(formData.get("graphDiscoveryMode")) ?? "selected_mailboxes";

  const discoveryMode =
    discoveryModeRaw === "all_tenant"
      ? "all_tenant"
      : discoveryModeRaw === "selected_workloads"
        ? "selected_workloads"
        : "selected_mailboxes";

  const syncModeRaw =
    normalizeString(formData.get("graphSyncMode")) ?? "scheduled";

  const syncMode = syncModeRaw === "continuous" ? "continuous" : "scheduled";

  const selectedMailboxes = parseMailboxAddresses(
    formData.get("graphMailboxAddresses")
  );

  const workloads = parseGraphWorkloads(formData.get("graphWorkloads"));

  const includeTeams = formData.get("graphIncludeTeams") === "true";
  const includeSharePoint = formData.get("graphIncludeSharePoint") === "true";
  const includeOneDrive = formData.get("graphIncludeOneDrive") === "true";
  const includeUsersGroups = formData.get("graphIncludeUsersGroups") === "true";
  const includeAuditLogs = formData.get("graphIncludeAuditLogs") === "true";

  if (!tenantId) {
    buildFormErrorRedirect("Microsoft Graph tenant ID is required.");
  }

  if (!clientId) {
    buildFormErrorRedirect("Microsoft Graph client ID is required.");
  }

  if (!clientSecret && !clientSecretEnvVar) {
    buildFormErrorRedirect(
      "Microsoft Graph client secret or client secret environment variable is required."
    );
  }

  if (discoveryMode === "selected_mailboxes" && selectedMailboxes.length === 0) {
    buildFormErrorRedirect(
      "At least one mailbox address is required for selected Graph mailbox discovery."
    );
  }

  const normalizedWorkloads = Array.from(
    new Set([
      ...workloads,
      "exchange",
      ...(includeTeams ? ["teams"] : []),
      ...(includeSharePoint ? ["sharepoint"] : []),
      ...(includeOneDrive ? ["onedrive"] : []),
      ...(includeUsersGroups ? ["users_groups"] : []),
      ...(includeAuditLogs ? ["audit_logs"] : []),
    ])
  );

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vault/sources/graph/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        sourceKey,
        tenantId,
        clientId,
        clientSecret,
        clientSecretEnvVar,
        authMethod: "oauth_client_credentials",
        discoveryMode,
        syncMode,
        selectedMailboxes,
        workloads: normalizedWorkloads,
        scopeConfig: {
          workloads: normalizedWorkloads,
          selectedMailboxes,
          includeTeams,
          includeSharePoint,
          includeOneDrive,
          includeUsersGroups,
          includeAuditLogs,
        },
        batchSize: 100,
      }),
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      normalizeString(payload?.error) ??
      normalizeString(payload?.message) ??
      "Failed to connect Microsoft Graph API source.";

    buildFormErrorRedirect(message);
  }

  revalidatePath("/vault/sources");
  redirect("/vault/sources?success=graph-connected");
}

async function connectGmailSource(formData: FormData) {
  "use server";

  const workspaceDomain = normalizeString(formData.get("workspaceDomain"));
  const customerId = normalizeString(formData.get("customerId"));
  const name = normalizeString(formData.get("name"));
  const sourceKey = normalizeString(formData.get("sourceKey"));

  const authMethodRaw =
    normalizeString(formData.get("authMethod")) ??
    "service_account_domain_wide_delegation";

  const authMethod =
    authMethodRaw === "oauth_refresh_token"
      ? "oauth_refresh_token"
      : "service_account_domain_wide_delegation";

  const clientEmail = normalizeString(formData.get("clientEmail"));
  const privateKeyEnvVar = normalizeString(formData.get("privateKeyEnvVar"));
  const delegatedAdminEmail = normalizeString(
    formData.get("delegatedAdminEmail")
  );

  const clientId = normalizeString(formData.get("clientId"));
  const clientSecret = normalizeString(formData.get("clientSecret"));
  const refreshTokenEnvVar = normalizeString(formData.get("refreshTokenEnvVar"));

  const discoveryModeRaw =
    normalizeString(formData.get("discoveryMode")) ?? "selected_mailboxes";

  const discoveryMode =
    discoveryModeRaw === "all_mailboxes"
      ? "all_mailboxes"
      : "selected_mailboxes";

  const syncModeRaw = normalizeString(formData.get("syncMode")) ?? "scheduled";
  const syncMode = syncModeRaw === "continuous" ? "continuous" : "scheduled";

  const mailboxAddresses = parseMailboxAddresses(
    formData.get("mailboxAddresses")
  );

  const includeSpamTrash = formData.get("includeSpamTrash") === "true";

  const includeLabels = parseMailboxAddresses(formData.get("includeLabels"));
  const excludeLabels = parseMailboxAddresses(formData.get("excludeLabels"));

  if (!workspaceDomain && !customerId) {
    buildFormErrorRedirect("Workspace domain or customer ID is required.");
  }

  if (
    discoveryMode === "selected_mailboxes" &&
    mailboxAddresses.length === 0
  ) {
    buildFormErrorRedirect(
      "At least one Gmail mailbox address is required when using selected mailbox discovery."
    );
  }

  if (authMethod === "service_account_domain_wide_delegation") {
    if (!clientEmail) {
      buildFormErrorRedirect("Client email is required.");
    }

    if (!privateKeyEnvVar) {
      buildFormErrorRedirect(
        "Private key environment variable name is required."
      );
    }

    if (!delegatedAdminEmail) {
      buildFormErrorRedirect("Delegated admin email is required.");
    }
  }

  if (authMethod === "oauth_refresh_token") {
    if (!clientId) {
      buildFormErrorRedirect("OAuth client ID is required.");
    }

    if (!clientSecret) {
      buildFormErrorRedirect("OAuth client secret is required.");
    }

    if (!refreshTokenEnvVar) {
      buildFormErrorRedirect(
        "OAuth refresh token environment variable name is required."
      );
    }
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vault/sources/gmail/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        sourceKey,
        workspaceDomain,
        customerId,
        authMethod,
        clientEmail,
        privateKeyEnvVar,
        delegatedAdminEmail,
        clientId,
        clientSecret,
        refreshTokenEnvVar,
        discoveryMode,
        syncMode,
        mailboxAddresses,
        labelScope: {
          includeLabels,
          excludeLabels,
          includeSpamTrash,
        },
        batchSize: 100,
      }),
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      normalizeString(payload?.error) ??
      normalizeString(payload?.message) ??
      "Failed to connect Gmail source.";

    buildFormErrorRedirect(message);
  }

  revalidatePath("/vault/sources");
  redirect("/vault/sources?success=gmail-connected");
}

async function connectImapSource(formData: FormData) {
  "use server";

  const name = normalizeString(formData.get("imapName"));
  const sourceKey = normalizeString(formData.get("imapSourceKey"));
  const providerLabel = normalizeString(formData.get("providerLabel"));
  const host = normalizeString(formData.get("host"));
  const username = normalizeString(formData.get("username"));
  const password = normalizeString(formData.get("password"));
  const passwordEnvVar = normalizeString(formData.get("passwordEnvVar"));

  const portRaw = Number(formData.get("port") ?? 993);
  const port = Number.isFinite(portRaw) ? portRaw : 993;

  const secure = formData.get("secure") !== "false";

  const discoveryModeRaw =
    normalizeString(formData.get("imapDiscoveryMode")) ?? "selected_mailboxes";

  const discoveryMode =
    discoveryModeRaw === "single_mailbox"
      ? "single_mailbox"
      : "selected_mailboxes";

  const syncModeRaw =
    normalizeString(formData.get("imapSyncMode")) ?? "scheduled";

  const syncMode = syncModeRaw === "continuous" ? "continuous" : "scheduled";

  const mailboxAddresses = parseMailboxAddresses(
    formData.get("imapMailboxAddresses")
  );

  const includeFolders = parseFolderList(formData.get("includeFolders"));
  const excludeFolders = parseFolderList(formData.get("excludeFolders"));
  const includeSpamTrash = formData.get("imapIncludeSpamTrash") === "true";

  if (!host) {
    buildFormErrorRedirect("IMAP host is required.");
  }

  if (!username) {
    buildFormErrorRedirect("IMAP username is required.");
  }

  if (!password && !passwordEnvVar) {
    buildFormErrorRedirect(
      "IMAP password or password environment variable is required."
    );
  }

  if (discoveryMode === "selected_mailboxes" && mailboxAddresses.length === 0) {
    buildFormErrorRedirect(
      "At least one mailbox address is required for selected IMAP mailbox discovery."
    );
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vault/sources/imap/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        sourceKey,
        providerLabel,
        host,
        port,
        secure,
        username,
        password,
        passwordEnvVar,
        mailboxAddresses,
        discoveryMode,
        syncMode,
        folderScope: {
          includeFolders,
          excludeFolders,
          includeSpamTrash,
        },
        batchSize: 100,
      }),
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      normalizeString(payload?.error) ??
      normalizeString(payload?.message) ??
      "Failed to connect IMAP source.";

    buildFormErrorRedirect(message);
  }

  revalidatePath("/vault/sources");
  redirect("/vault/sources?success=imap-connected");
}

async function connectJournalSource(formData: FormData) {
  "use server";

  const name = normalizeString(formData.get("journalName"));
  const sourceKey = normalizeString(formData.get("journalSourceKey"));
  const journalAddress = normalizeString(formData.get("journalAddress"));
  const journalDomain = normalizeString(formData.get("journalDomain"));
  const inboundHost = normalizeString(formData.get("inboundHost"));

  const inboundPortRaw = Number(formData.get("inboundPort") ?? 25);
  const inboundPort = Number.isFinite(inboundPortRaw) ? inboundPortRaw : 25;

  const requireTls = formData.get("requireTls") === "true";

  const acceptedSenderDomains = parseMailboxAddresses(
    formData.get("acceptedSenderDomains")
  );

  const allowedRelayIps = parseFolderList(formData.get("allowedRelayIps"));

  const authMethodRaw =
    normalizeString(formData.get("journalAuthMethod")) ?? "none";

  const authMethod =
    authMethodRaw === "smtp_basic"
      ? "smtp_basic"
      : authMethodRaw === "mta_tls"
        ? "mta_tls"
        : "none";

  const username = normalizeString(formData.get("journalUsername"));
  const password = normalizeString(formData.get("journalPassword"));
  const passwordEnvVar = normalizeString(formData.get("journalPasswordEnvVar"));

  const captureInbound = formData.get("captureInbound") !== "false";
  const captureOutbound = formData.get("captureOutbound") !== "false";
  const captureInternal = formData.get("captureInternal") !== "false";
  const captureBccEnvelope = formData.get("captureBccEnvelope") === "true";
  const preserveJournalEnvelope =
    formData.get("preserveJournalEnvelope") !== "false";

  const applyDefaultRetention =
    formData.get("applyDefaultRetention") === "true";

  const defaultRetentionDaysRaw = Number(
    formData.get("defaultRetentionDays") ?? ""
  );

  const defaultRetentionDays = Number.isFinite(defaultRetentionDaysRaw)
    ? defaultRetentionDaysRaw
    : undefined;

  const legalHoldByDefault = formData.get("legalHoldByDefault") === "true";

  if (!journalAddress && !journalDomain) {
    buildFormErrorRedirect(
      "SMTP journal address or journal domain is required."
    );
  }

  if (authMethod === "smtp_basic") {
    if (!username) {
      buildFormErrorRedirect(
        "SMTP journal username is required when using SMTP basic auth."
      );
    }

    if (!password && !passwordEnvVar) {
      buildFormErrorRedirect(
        "SMTP journal password or password environment variable is required when using SMTP basic auth."
      );
    }
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vault/sources/journal/connect`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        sourceKey,
        journalAddress,
        journalDomain,
        inboundHost,
        inboundPort,
        requireTls,
        acceptedSenderDomains,
        allowedRelayIps,
        authMethod,
        username,
        password,
        passwordEnvVar,
        syncMode: "continuous",
        captureScope: {
          captureInbound,
          captureOutbound,
          captureInternal,
          captureBccEnvelope,
          preserveJournalEnvelope,
        },
        retentionScope: {
          applyDefaultRetention,
          defaultRetentionDays,
          legalHoldByDefault,
        },
        batchSize: 100,
      }),
    }
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      normalizeString(payload?.error) ??
      normalizeString(payload?.message) ??
      "Failed to connect SMTP journal source.";

    buildFormErrorRedirect(message);
  }

  revalidatePath("/vault/sources");
  redirect("/vault/sources?success=journal-connected");
}

function SourceCard({ source }: { source: SourceWithCounts }) {
  const displayName =
    normalizeString(source.display_name) ??
    normalizeString(source.name) ??
    normalizeString(source.source_key) ??
    "Unnamed source";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold text-zinc-100">
              {displayName}
            </h3>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                source.status
              )}`}
            >
              {source.status ?? "unknown"}
            </span>

            <span
              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
                source.health_status
              )}`}
            >
              Health: {source.health_status ?? "unknown"}
            </span>
          </div>

          <p className="mt-2 text-sm text-zinc-500">
            {getSourceTypeLabel(source.source_type)} ·{" "}
            {getProviderLabel(source.provider)}
          </p>

          <div className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-2 xl:grid-cols-4">
            <div>Source ID: {source.id}</div>
            <div>Source Key: {source.source_key ?? "—"}</div>
            <div>Auth: {titleCase(source.auth_method)}</div>
            <div>Sync: {titleCase(source.sync_mode)}</div>
            <div>Mailboxes: {source.mailbox_count}</div>
            <div>Pending: {source.pending_mailboxes}</div>
            <div>Active: {source.active_mailboxes}</div>
            <div>Failed: {source.failed_mailboxes}</div>
            <div>Created: {formatDate(source.created_at)}</div>
            <div>Updated: {formatDate(source.updated_at)}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/vault/sources/${source.id}`}
            className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
          >
            View source
          </Link>

          <Link
            href={`/vault/ingestion?sourceId=${source.id}`}
            className="inline-flex rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
          >
            Ingestion jobs
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function VaultSourcesPage({
  searchParams,
}: PageContext) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  const success =
    typeof resolvedSearchParams.success === "string"
      ? resolvedSearchParams.success
      : null;

  const { items, error: loadError } = await loadSources();

  const gmailSources = items.filter(
    (item) =>
      item.source_type === "gmail_api" ||
      item.provider === "google_workspace"
  );

  const exoSources = items.filter(
    (item) =>
      item.source_type === "exo" ||
      item.source_type === "exo_graph" ||
      item.source_type === "exchange_online" ||
      item.provider === "microsoft_365" ||
      item.provider === "exchange_online"
  );

  const graphSources = items.filter(
    (item) =>
      item.source_type === "graph_api" ||
      item.source_type === "microsoft_graph"
  );

  const ewsSources = items.filter(
    (item) =>
      item.source_type === "exchange_ews" ||
      item.provider === "exchange_on_prem"
  );

  const imapSources = items.filter(
    (item) => item.source_type === "imap" || item.provider === "api"
  );

  const journalSources = items.filter(
    (item) =>
      item.source_type === "exchange_journal_smtp" ||
      item.source_type === "smtp_journal"
  );

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Vault Sources
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Source Connections
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Connect and manage Microsoft Exchange Online, Microsoft Graph
                API, Exchange On-Prem EWS, SMTP journaling, Gmail, Google
                Workspace, IMAP, Yahoo, AOL, hosted mail, and other mailbox
                sources for Vault ingestion.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/vault"
                className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Vault overview
              </Link>

              <Link
                href="/vault/ingestion"
                className="inline-flex rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
              >
                Ingestion jobs
              </Link>
            </div>
          </div>
        </section>

        {(error || success || loadError) && (
          <section
            className={
              error || loadError
                ? "rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200"
                : "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-200"
            }
          >
            {error ? <p className="text-sm">{error}</p> : null}
            {loadError ? <p className="text-sm">{loadError}</p> : null}

            {success === "journal-connected" ? (
              <p className="text-sm">
                SMTP journal source connected successfully.
              </p>
            ) : null}

            {success === "ews-connected" ? (
              <p className="text-sm">
                Exchange EWS source connected successfully.
              </p>
            ) : null}

            {success === "graph-connected" ? (
              <p className="text-sm">
                Microsoft Graph API source connected successfully.
              </p>
            ) : null}

            {success === "gmail-connected" ? (
              <p className="text-sm">Gmail source connected successfully.</p>
            ) : null}

            {success === "imap-connected" ? (
              <p className="text-sm">IMAP source connected successfully.</p>
            ) : null}
          </section>
        )}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Total Sources</p>
            <p className="mt-2 text-2xl font-semibold">{items.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">EXO Sources</p>
            <p className="mt-2 text-2xl font-semibold">{exoSources.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Graph Sources</p>
            <p className="mt-2 text-2xl font-semibold">
              {graphSources.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">EWS Sources</p>
            <p className="mt-2 text-2xl font-semibold">{ewsSources.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Journal Sources</p>
            <p className="mt-2 text-2xl font-semibold">
              {journalSources.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Gmail Sources</p>
            <p className="mt-2 text-2xl font-semibold">
              {gmailSources.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">IMAP Sources</p>
            <p className="mt-2 text-2xl font-semibold">
              {imapSources.length}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Mailboxes</p>
            <p className="mt-2 text-2xl font-semibold">
              {items.reduce((total, item) => total + item.mailbox_count, 0)}
            </p>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Add Exchange On-Prem EWS Source
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Connect business on-prem Exchange mailboxes using Exchange Web
                  Services, basic/NTLM/OAuth authentication, selected mailbox
                  discovery, and folder scope controls.
                </p>
              </div>

              <form action={connectEwsSource} className="grid gap-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="ewsName"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Display name
                    </label>
                    <input
                      id="ewsName"
                      name="ewsName"
                      placeholder="Exchange On-Prem - Client"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ewsSourceKey"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Source key
                    </label>
                    <input
                      id="ewsSourceKey"
                      name="ewsSourceKey"
                      placeholder="ews-client-domain"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="exchangeVersion"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Exchange version
                    </label>
                    <select
                      id="exchangeVersion"
                      name="exchangeVersion"
                      defaultValue="Exchange2016"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="Exchange2010">Exchange 2010</option>
                      <option value="Exchange2010_SP1">Exchange 2010 SP1</option>
                      <option value="Exchange2010_SP2">Exchange 2010 SP2</option>
                      <option value="Exchange2013">Exchange 2013</option>
                      <option value="Exchange2013_SP1">Exchange 2013 SP1</option>
                      <option value="Exchange2016">Exchange 2016</option>
                      <option value="Exchange2019">Exchange 2019</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ewsAuthMethod"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Auth method
                    </label>
                    <select
                      id="ewsAuthMethod"
                      name="ewsAuthMethod"
                      defaultValue="basic"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="basic">Basic</option>
                      <option value="ntlm">NTLM</option>
                      <option value="oauth_client_credentials">
                        OAuth client credentials
                      </option>
                      <option value="oauth_delegated">OAuth delegated</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="ewsUrl"
                      className="text-sm font-medium text-zinc-300"
                    >
                      EWS URL
                    </label>
                    <input
                      id="ewsUrl"
                      name="ewsUrl"
                      placeholder="https://mail.company.com/EWS/Exchange.asmx"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="autodiscoverUrl"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Autodiscover URL
                    </label>
                    <input
                      id="autodiscoverUrl"
                      name="autodiscoverUrl"
                      placeholder="https://autodiscover.company.com/autodiscover/autodiscover.xml"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ewsDomain"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Domain
                    </label>
                    <input
                      id="ewsDomain"
                      name="ewsDomain"
                      placeholder="COMPANY"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ewsUsername"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Username
                    </label>
                    <input
                      id="ewsUsername"
                      name="ewsUsername"
                      placeholder="svc_vault_ingest@company.com"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ewsPassword"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Password
                    </label>
                    <input
                      id="ewsPassword"
                      name="ewsPassword"
                      type="password"
                      placeholder="Password or use env var"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="ewsPasswordEnvVar"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Password env var
                    </label>
                    <input
                      id="ewsPasswordEnvVar"
                      name="ewsPasswordEnvVar"
                      placeholder="EXCHANGE_EWS_PASSWORD"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    OAuth / impersonation
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ewsTenantId"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Tenant ID
                      </label>
                      <input
                        id="ewsTenantId"
                        name="ewsTenantId"
                        placeholder="Optional for OAuth EWS"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ewsClientId"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Client ID
                      </label>
                      <input
                        id="ewsClientId"
                        name="ewsClientId"
                        placeholder="Optional for OAuth EWS"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ewsClientSecret"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Client secret
                      </label>
                      <input
                        id="ewsClientSecret"
                        name="ewsClientSecret"
                        type="password"
                        placeholder="Optional for OAuth EWS"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ewsClientSecretEnvVar"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Client secret env var
                      </label>
                      <input
                        id="ewsClientSecretEnvVar"
                        name="ewsClientSecretEnvVar"
                        placeholder="EXCHANGE_EWS_CLIENT_SECRET"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label
                        htmlFor="ewsImpersonationUser"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Impersonation user
                      </label>
                      <input
                        id="ewsImpersonationUser"
                        name="ewsImpersonationUser"
                        placeholder="svc_vault_ingest@company.com"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    Discovery and folder scope
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ewsDiscoveryMode"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Discovery mode
                      </label>
                      <select
                        id="ewsDiscoveryMode"
                        name="ewsDiscoveryMode"
                        defaultValue="selected_mailboxes"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                      >
                        <option value="selected_mailboxes">
                          Selected mailboxes
                        </option>
                        <option value="autodiscover">Autodiscover</option>
                        <option value="all_mailboxes">All mailboxes</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="ewsSyncMode"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Sync mode
                      </label>
                      <select
                        id="ewsSyncMode"
                        name="ewsSyncMode"
                        defaultValue="scheduled"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="continuous">Continuous</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="ewsMailboxAddresses"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Selected Exchange mailboxes
                    </label>
                    <textarea
                      id="ewsMailboxAddresses"
                      name="ewsMailboxAddresses"
                      rows={5}
                      placeholder={"user1@company.com\nuser2@company.com"}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      Enter one mailbox per line, or separate addresses with
                      commas.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="ewsIncludeFolders"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Include folders
                      </label>
                      <input
                        id="ewsIncludeFolders"
                        name="ewsIncludeFolders"
                        placeholder="Inbox, Sent Items, Archive"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="ewsExcludeFolders"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Exclude folders
                      </label>
                      <input
                        id="ewsExcludeFolders"
                        name="ewsExcludeFolders"
                        placeholder="Junk Email, Deleted Items"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        name="ewsIncludeArchive"
                        value="true"
                      />
                      Include archive mailbox
                    </label>

                    <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        name="ewsIncludeRecoverableItems"
                        value="true"
                      />
                      Include recoverable items
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-medium text-orange-200 hover:bg-orange-500/25"
                >
                  Connect Exchange EWS source
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Add Microsoft Graph API Source
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Connect broader Microsoft 365 workloads through Graph API,
                  including Exchange, Teams, SharePoint, OneDrive, users,
                  groups, and audit data.
                </p>
              </div>

              <form action={connectGraphApiSource} className="grid gap-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="graphName"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Display name
                    </label>
                    <input
                      id="graphName"
                      name="graphName"
                      placeholder="Microsoft Graph - XilAire"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="graphSourceKey"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Source key
                    </label>
                    <input
                      id="graphSourceKey"
                      name="graphSourceKey"
                      placeholder="graph-xilaire"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="graphTenantId"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Tenant ID
                    </label>
                    <input
                      id="graphTenantId"
                      name="graphTenantId"
                      placeholder="00000000-0000-0000-0000-000000000000"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="graphClientId"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Client ID
                    </label>
                    <input
                      id="graphClientId"
                      name="graphClientId"
                      placeholder="App registration client ID"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="graphClientSecret"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Client secret
                    </label>
                    <input
                      id="graphClientSecret"
                      name="graphClientSecret"
                      type="password"
                      placeholder="Paste secret or use env var"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="graphClientSecretEnvVar"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Client secret env var
                    </label>
                    <input
                      id="graphClientSecretEnvVar"
                      name="graphClientSecretEnvVar"
                      placeholder="MICROSOFT_GRAPH_CLIENT_SECRET"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="graphDiscoveryMode"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Discovery mode
                    </label>
                    <select
                      id="graphDiscoveryMode"
                      name="graphDiscoveryMode"
                      defaultValue="selected_mailboxes"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="selected_mailboxes">
                        Selected mailboxes
                      </option>
                      <option value="selected_workloads">
                        Selected workloads
                      </option>
                      <option value="all_tenant">All tenant</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="graphSyncMode"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Sync mode
                    </label>
                    <select
                      id="graphSyncMode"
                      name="graphSyncMode"
                      defaultValue="scheduled"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="continuous">Continuous</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="graphMailboxAddresses"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Selected Exchange Online mailboxes
                  </label>
                  <textarea
                    id="graphMailboxAddresses"
                    name="graphMailboxAddresses"
                    rows={5}
                    placeholder={"user1@company.com\nuser2@company.com"}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                  <p className="mt-2 text-xs text-zinc-600">
                    Enter one mailbox per line, or separate addresses with
                    commas.
                  </p>
                </div>

                <div>
                  <label
                    htmlFor="graphWorkloads"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Workloads
                  </label>
                  <input
                    id="graphWorkloads"
                    name="graphWorkloads"
                    placeholder="exchange, teams, sharepoint, onedrive, users_groups, audit_logs"
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="graphIncludeTeams"
                      value="true"
                    />
                    Include Teams
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="graphIncludeSharePoint"
                      value="true"
                    />
                    Include SharePoint
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="graphIncludeOneDrive"
                      value="true"
                    />
                    Include OneDrive
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="graphIncludeUsersGroups"
                      value="true"
                    />
                    Include Users / Groups
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 md:col-span-2">
                    <input
                      type="checkbox"
                      name="graphIncludeAuditLogs"
                      value="true"
                    />
                    Include audit logs
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
                >
                  Connect Microsoft Graph API source
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Add Gmail / Google Workspace Source
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Register a Gmail connector and queue discovery or selected
                  mailbox ingestion jobs.
                </p>
              </div>

              <form action={connectGmailSource} className="grid gap-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="name"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Display name
                    </label>
                    <input
                      id="name"
                      name="name"
                      placeholder="Google Workspace - XilAire"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sourceKey"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Source key
                    </label>
                    <input
                      id="sourceKey"
                      name="sourceKey"
                      placeholder="gmail-xilaire"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="workspaceDomain"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Workspace domain
                    </label>
                    <input
                      id="workspaceDomain"
                      name="workspaceDomain"
                      placeholder="xilairetechnologies.com"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customerId"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Google customer ID
                    </label>
                    <input
                      id="customerId"
                      name="customerId"
                      placeholder="Optional"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    Authentication
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="authMethod"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Auth method
                      </label>
                      <select
                        id="authMethod"
                        name="authMethod"
                        defaultValue="service_account_domain_wide_delegation"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                      >
                        <option value="service_account_domain_wide_delegation">
                          Service account domain-wide delegation
                        </option>
                        <option value="oauth_refresh_token">
                          OAuth refresh token
                        </option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="delegatedAdminEmail"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Delegated admin email
                      </label>
                      <input
                        id="delegatedAdminEmail"
                        name="delegatedAdminEmail"
                        placeholder="admin@xilairetechnologies.com"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="clientEmail"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Service account client email
                      </label>
                      <input
                        id="clientEmail"
                        name="clientEmail"
                        placeholder="vault-ingest@project.iam.gserviceaccount.com"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="privateKeyEnvVar"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Private key env var
                      </label>
                      <input
                        id="privateKeyEnvVar"
                        name="privateKeyEnvVar"
                        placeholder="GOOGLE_VAULT_PRIVATE_KEY"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="clientId"
                        className="text-sm font-medium text-zinc-300"
                      >
                        OAuth client ID
                      </label>
                      <input
                        id="clientId"
                        name="clientId"
                        placeholder="Only needed for OAuth refresh token mode"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="clientSecret"
                        className="text-sm font-medium text-zinc-300"
                      >
                        OAuth client secret
                      </label>
                      <input
                        id="clientSecret"
                        name="clientSecret"
                        type="password"
                        placeholder="Only needed for OAuth refresh token mode"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="refreshTokenEnvVar"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Refresh token env var
                      </label>
                      <input
                        id="refreshTokenEnvVar"
                        name="refreshTokenEnvVar"
                        placeholder="GOOGLE_VAULT_REFRESH_TOKEN"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="text-sm font-medium text-zinc-200">
                    Discovery and mailbox scope
                  </p>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="discoveryMode"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Discovery mode
                      </label>
                      <select
                        id="discoveryMode"
                        name="discoveryMode"
                        defaultValue="selected_mailboxes"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                      >
                        <option value="selected_mailboxes">
                          Selected mailboxes
                        </option>
                        <option value="all_mailboxes">All mailboxes</option>
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="syncMode"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Sync mode
                      </label>
                      <select
                        id="syncMode"
                        name="syncMode"
                        defaultValue="scheduled"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="continuous">Continuous</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label
                      htmlFor="mailboxAddresses"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Selected Gmail mailboxes
                    </label>
                    <textarea
                      id="mailboxAddresses"
                      name="mailboxAddresses"
                      rows={5}
                      placeholder={"user1@gmail.com\nuser2@company.com"}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                    <p className="mt-2 text-xs text-zinc-600">
                      Enter one mailbox per line, or separate addresses with
                      commas.
                    </p>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor="includeLabels"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Include labels
                      </label>
                      <input
                        id="includeLabels"
                        name="includeLabels"
                        placeholder="INBOX, SENT"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="excludeLabels"
                        className="text-sm font-medium text-zinc-300"
                      >
                        Exclude labels
                      </label>
                      <input
                        id="excludeLabels"
                        name="excludeLabels"
                        placeholder="SPAM, TRASH"
                        className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                      />
                    </div>
                  </div>

                  <label className="mt-4 flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="includeSpamTrash"
                      value="true"
                    />
                    Include spam and trash
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/25"
                >
                  Connect Gmail source
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Add IMAP Source
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Connect Yahoo, AOL, hosted mail, cPanel mail, Rackspace,
                  GoDaddy mail, or any standard IMAP mailbox.
                </p>
              </div>

              <form action={connectImapSource} className="grid gap-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="imapName"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Display name
                    </label>
                    <input
                      id="imapName"
                      name="imapName"
                      placeholder="Yahoo Executive Mail"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="imapSourceKey"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Source key
                    </label>
                    <input
                      id="imapSourceKey"
                      name="imapSourceKey"
                      placeholder="imap-yahoo-executive"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="providerLabel"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Provider label
                    </label>
                    <input
                      id="providerLabel"
                      name="providerLabel"
                      placeholder="Yahoo / AOL / Rackspace"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="host"
                      className="text-sm font-medium text-zinc-300"
                    >
                      IMAP host
                    </label>
                    <input
                      id="host"
                      name="host"
                      placeholder="imap.mail.yahoo.com"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="port"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Port
                    </label>
                    <input
                      id="port"
                      name="port"
                      type="number"
                      defaultValue={993}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="secure"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SSL/TLS
                    </label>
                    <select
                      id="secure"
                      name="secure"
                      defaultValue="true"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="true">Secure IMAP / SSL / TLS</option>
                      <option value="false">Plain IMAP</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="username"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      name="username"
                      placeholder="executive@yahoo.com"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Password / app password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="IMAP password or app password"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="passwordEnvVar"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Password env var
                    </label>
                    <input
                      id="passwordEnvVar"
                      name="passwordEnvVar"
                      placeholder="IMAP_YAHOO_APP_PASSWORD"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="imapDiscoveryMode"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Discovery mode
                    </label>
                    <select
                      id="imapDiscoveryMode"
                      name="imapDiscoveryMode"
                      defaultValue="selected_mailboxes"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="selected_mailboxes">
                        Selected mailboxes
                      </option>
                      <option value="single_mailbox">
                        Single mailbox from username
                      </option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="imapSyncMode"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Sync mode
                    </label>
                    <select
                      id="imapSyncMode"
                      name="imapSyncMode"
                      defaultValue="scheduled"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="continuous">Continuous</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="imapMailboxAddresses"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Selected IMAP mailboxes
                  </label>
                  <textarea
                    id="imapMailboxAddresses"
                    name="imapMailboxAddresses"
                    rows={5}
                    placeholder={"executive@yahoo.com\nlegal@yahoo.com\narchive@aol.com"}
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                  <p className="mt-2 text-xs text-zinc-600">
                    Enter one mailbox per line, or separate addresses with
                    commas. For Yahoo/AOL, use an app password when available.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="includeFolders"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Include folders
                    </label>
                    <input
                      id="includeFolders"
                      name="includeFolders"
                      placeholder="INBOX, Sent, Archive"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="excludeFolders"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Exclude folders
                    </label>
                    <input
                      id="excludeFolders"
                      name="excludeFolders"
                      placeholder="Spam, Trash, Junk"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                  <input
                    type="checkbox"
                    name="imapIncludeSpamTrash"
                    value="true"
                  />
                  Include spam and trash folders
                </label>

                <button
                  type="submit"
                  className="rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/25"
                >
                  Connect IMAP source
                </button>
              </form>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
              <div className="border-b border-zinc-800 px-5 py-4">
                <h2 className="text-lg font-semibold text-zinc-100">
                  Add SMTP Journal Source
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Connect enterprise SMTP journaling systems including Exchange
                  Journal Rules, Proofpoint, Mimecast, Barracuda, Cisco ESA,
                  Postfix, and SMTP relay journaling pipelines.
                </p>
              </div>

              <form action={connectJournalSource} className="grid gap-5 p-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="journalName"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Display name
                    </label>
                    <input
                      id="journalName"
                      name="journalName"
                      placeholder="Enterprise Journal Feed"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="journalSourceKey"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Source key
                    </label>
                    <input
                      id="journalSourceKey"
                      name="journalSourceKey"
                      placeholder="smtp-journal-primary"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="journalAddress"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Journal mailbox address
                    </label>
                    <input
                      id="journalAddress"
                      name="journalAddress"
                      placeholder="journal@company.com"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="journalDomain"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Journal domain
                    </label>
                    <input
                      id="journalDomain"
                      name="journalDomain"
                      placeholder="company.com"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="inboundHost"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SMTP inbound host
                    </label>
                    <input
                      id="inboundHost"
                      name="inboundHost"
                      placeholder="mail.company.com"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="inboundPort"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SMTP port
                    </label>
                    <input
                      id="inboundPort"
                      name="inboundPort"
                      type="number"
                      defaultValue={25}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="journalAuthMethod"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SMTP auth method
                    </label>
                    <select
                      id="journalAuthMethod"
                      name="journalAuthMethod"
                      defaultValue="none"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-500/60"
                    >
                      <option value="none">None</option>
                      <option value="smtp_basic">SMTP basic</option>
                      <option value="mta_tls">MTA TLS</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="journalUsername"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SMTP username
                    </label>
                    <input
                      id="journalUsername"
                      name="journalUsername"
                      placeholder="smtp-user"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="journalPassword"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SMTP password
                    </label>
                    <input
                      id="journalPassword"
                      name="journalPassword"
                      type="password"
                      placeholder="SMTP password"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="journalPasswordEnvVar"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Password env var
                    </label>
                    <input
                      id="journalPasswordEnvVar"
                      name="journalPasswordEnvVar"
                      placeholder="SMTP_JOURNAL_PASSWORD"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="acceptedSenderDomains"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Accepted sender domains
                    </label>
                    <textarea
                      id="acceptedSenderDomains"
                      name="acceptedSenderDomains"
                      rows={4}
                      placeholder={"company.com\nsubsidiary.com"}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="allowedRelayIps"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Allowed relay IPs
                    </label>
                    <textarea
                      id="allowedRelayIps"
                      name="allowedRelayIps"
                      rows={4}
                      placeholder={"10.0.0.5\n10.0.0.6"}
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="captureInbound"
                      value="true"
                      defaultChecked
                    />
                    Capture inbound
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="captureOutbound"
                      value="true"
                      defaultChecked
                    />
                    Capture outbound
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="captureInternal"
                      value="true"
                      defaultChecked
                    />
                    Capture internal
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="captureBccEnvelope"
                      value="true"
                    />
                    Capture BCC envelope
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 md:col-span-2">
                    <input
                      type="checkbox"
                      name="preserveJournalEnvelope"
                      value="true"
                      defaultChecked
                    />
                    Preserve journal envelope
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="requireTls"
                      value="true"
                      defaultChecked
                    />
                    Require SMTP TLS
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="applyDefaultRetention"
                      value="true"
                    />
                    Apply default retention
                  </label>

                  <div>
                    <label
                      htmlFor="defaultRetentionDays"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Default retention days
                    </label>
                    <input
                      id="defaultRetentionDays"
                      name="defaultRetentionDays"
                      type="number"
                      placeholder="2555"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-orange-500/60"
                    />
                  </div>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="legalHoldByDefault"
                      value="true"
                    />
                    Legal hold by default
                  </label>
                </div>

                <button
                  type="submit"
                  className="rounded-xl border border-orange-500/40 bg-orange-500/15 px-4 py-2 text-sm font-medium text-orange-200 hover:bg-orange-500/25"
                >
                  Connect SMTP journal source
                </button>
              </form>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-zinc-100">
                Existing Sources
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                Current Vault sources registered for this organization.
              </p>
            </div>

            {items.length ? (
              <div className="grid gap-4 p-5">
                {items.map((source) => (
                  <SourceCard key={source.id} source={source} />
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <p className="text-sm text-zinc-500">
                  No Vault sources have been connected yet.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}