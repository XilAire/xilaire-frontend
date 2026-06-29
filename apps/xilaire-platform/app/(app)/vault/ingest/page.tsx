"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabasePlatformClient";

type IngestResultRow = {
  graphMessageId: string;
  vaultMessageId: string | null;
  status: "success" | "failed";
  error?: string;
  attachmentCount?: number;
};

type IngestResponse = {
  ok?: boolean;
  targetOrgId?: string;
  mailboxEmail?: string;
  source?: {
    id: string;
    name: string | null;
    provider: string | null;
    sourceType: string | null;
    status: string | null;
  };
  custodian?: {
    id: string;
    displayName: string | null;
    primaryEmail: string | null;
    department: string | null;
    status: string | null;
  };
  summary?: {
    requestedLimit: number;
    graphReturnedCount: number;
    successCount: number;
    failedCount: number;
    attachmentCount: number;
    totalAttachmentBytes: number;
    hasMore: boolean;
    nextLinkPresent: boolean;
    durationMs: number;
    tokenMode?: "manual_token" | "app_only";
    appOnlyConfigured?: boolean;
  };
  results?: IngestResultRow[];
  error?: string;
  details?: string;
};

type MicrosoftStatusResponse = {
  ok?: boolean;
  targetOrgId?: string;
  microsoftGraph?: {
    operational: boolean;
    mode: "app_only";
    configuration: {
      configured: boolean;
      tenantId: string | null;
      clientId: string | null;
      clientSecretConfigured: boolean;
      missing: {
        tenantId: boolean;
        clientId: boolean;
        clientSecret: boolean;
      };
    };
    token:
      | {
          ok: true;
          tokenType: string | null;
          expiresIn: number | null;
          extExpiresIn: number | null;
        }
      | {
          ok: false;
          error: string;
        };
    graph:
      | {
          ok: true;
          tenantId: string | null;
          displayName: string | null;
          defaultDomain: string | null;
        }
      | {
          ok: false;
          error: string;
        };
  };
  nextSteps?: string[];
  durationMs?: number;
  error?: string;
  details?: string;
};

type VaultCustodianRow = {
  id: string;
  org_id: string;
  display_name: string | null;
  primary_email: string | null;
  department: string | null;
  status: string | null;
  source_id?: string | null;
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
  custodian_count?: number;
  custodians?: VaultCustodianRow[];
};

type MicrosoftSourcesResponse = {
  ok?: boolean;
  items?: VaultSourceRow[];
  fallbackCustodians?: VaultCustodianRow[];
  error?: string;
  details?: string;
};

type IngestionJobRow = {
  id: string;
  org_id?: string | null;
  source_id?: string | null;
  provider?: string | null;
  job_type?: string | null;
  status?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
};

type IngestionJobsResponse = {
  ok?: boolean;
  jobs?: IngestionJobRow[];
  items?: IngestionJobRow[];
  error?: string;
  details?: string;
};

type FormState = {
  mailboxEmail: string;
  custodianId: string;
  sourceId: string;
  graphAccessToken: string;
  limit: string;
  since: string;
  includeAttachments: boolean;
  selectedSourceId: string;
  selectedCustodianId: string;
};

const defaultForm: FormState = {
  mailboxEmail: "",
  custodianId: "",
  sourceId: "",
  graphAccessToken: "",
  limit: "5",
  since: "",
  includeAttachments: true,
  selectedSourceId: "",
  selectedCustodianId: "",
};

async function readJsonResponse<T>(response: Response): Promise<T | null> {
  const text = await response.text();

  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `Expected JSON but received a non-JSON response from ${response.url}. The API route may be missing or returning an HTML error page.`
    );
  }
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

  return `${current.toFixed(current >= 10 || unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatLabel(value?: string | null) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toIsoFromLocalDateTime(value: string) {
  if (!value.trim()) return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;

  return date.toISOString();
}

function getSourceLabel(source: VaultSourceRow) {
  return source.display_name || source.name || source.source_key || source.id;
}

function getCustodianLabel(custodian: VaultCustodianRow) {
  return custodian.display_name || custodian.primary_email || custodian.id;
}

function getStatusToneClasses(isGood: boolean) {
  return isGood
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
}

function getJobStatusClasses(status?: string | null) {
  const normalized = status?.toLowerCase();

  if (normalized === "completed" || normalized === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300";
  }

  if (
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "processing" ||
    normalized === "retrying"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  }

  if (
    normalized === "failed" ||
    normalized === "error" ||
    normalized === "cancelled"
  ) {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";
  }

  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300";
}

function dedupeCustodians(custodians: VaultCustodianRow[]) {
  const map = new Map<string, VaultCustodianRow>();

  for (const custodian of custodians) {
    if (!custodian?.id) continue;
    map.set(custodian.id, custodian);
  }

  return Array.from(map.values());
}

export default function VaultIngestPage() {
  const [form, setForm] = useState<FormState>(defaultForm);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [sources, setSources] = useState<VaultSourceRow[]>([]);
  const [fallbackCustodians, setFallbackCustodians] = useState<
    VaultCustodianRow[]
  >([]);

  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [microsoftStatus, setMicrosoftStatus] =
    useState<MicrosoftStatusResponse | null>(null);

  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<IngestionJobRow[]>([]);
  const [jobStatusFilter, setJobStatusFilter] = useState("all");
  const [jobProviderFilter, setJobProviderFilter] = useState("all");

  const successfulRows = useMemo(
    () => response?.results?.filter((row) => row.status === "success") ?? [],
    [response]
  );

  const failedRows = useMemo(
    () => response?.results?.filter((row) => row.status === "failed") ?? [],
    [response]
  );

  const selectedSource = useMemo(() => {
    return sources.find((source) => source.id === form.selectedSourceId) ?? null;
  }, [sources, form.selectedSourceId]);

  const availableCustodians = useMemo(() => {
    const sourceCustodians = selectedSource?.custodians ?? [];

    return dedupeCustodians([...sourceCustodians, ...fallbackCustodians]);
  }, [selectedSource, fallbackCustodians]);

  const selectedCustodian = useMemo(() => {
    return (
      availableCustodians.find(
        (custodian) => custodian.id === form.selectedCustodianId
      ) ?? null
    );
  }, [availableCustodians, form.selectedCustodianId]);

  const graphOperational =
    microsoftStatus?.microsoftGraph?.operational === true;

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      if (
        jobStatusFilter !== "all" &&
        (job.status ?? "unknown") !== jobStatusFilter
      ) {
        return false;
      }

      if (
        jobProviderFilter !== "all" &&
        (job.provider ?? "unknown") !== jobProviderFilter
      ) {
        return false;
      }

      return true;
    });
  }, [jobs, jobStatusFilter, jobProviderFilter]);

  const jobStatuses = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.status)
          .filter((status): status is string => Boolean(status))
      )
    );
  }, [jobs]);

  const jobProviders = useMemo(() => {
    return Array.from(
      new Set(
        jobs
          .map((job) => job.provider)
          .filter((provider): provider is string => Boolean(provider))
      )
    );
  }, [jobs]);

  const jobSummary = useMemo(() => {
    return {
      total: filteredJobs.length,
      queued: filteredJobs.filter(
        (job) => job.status?.toLowerCase() === "queued"
      ).length,
      running: filteredJobs.filter(
        (job) =>
          job.status?.toLowerCase() === "running" ||
          job.status?.toLowerCase() === "processing"
      ).length,
      completed: filteredJobs.filter(
        (job) => job.status?.toLowerCase() === "completed"
      ).length,
      failed: filteredJobs.filter(
        (job) => job.status?.toLowerCase() === "failed"
      ).length,
    };
  }, [filteredJobs]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function getSessionAccessToken() {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.access_token) {
      throw new Error("Unable to resolve authenticated session.");
    }

    return session.access_token;
  }

  async function loadMicrosoftStatus() {
    setStatusLoading(true);
    setStatusError(null);

    try {
      const accessToken = await getSessionAccessToken();

      const res = await fetch("/api/vault/ingest/microsoft/status", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const payload = await readJsonResponse<MicrosoftStatusResponse>(res);

      if (!res.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            payload?.details ||
            "Unable to check Microsoft Graph status."
        );
      }

      setMicrosoftStatus(payload);
    } catch (err) {
      setMicrosoftStatus(null);
      setStatusError(
        err instanceof Error
          ? err.message
          : "Unable to check Microsoft Graph status."
      );
    } finally {
      setStatusLoading(false);
    }
  }

  async function loadMicrosoftSources() {
    setSourcesLoading(true);
    setSourcesError(null);

    try {
      const accessToken = await getSessionAccessToken();

      const res = await fetch(
        "/api/vault/ingest/microsoft/sources?includeCustodians=true&includeFallbackCustodians=true&limit=100",
        {
          method: "GET",
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        }
      );

      const payload = await readJsonResponse<MicrosoftSourcesResponse>(res);

      if (!res.ok || !payload?.ok) {
        throw new Error(
          payload?.error ||
            payload?.details ||
            "Unable to load Microsoft ingestion sources."
        );
      }

      const sourceItems = payload.items ?? [];
      const fallbackItems = payload.fallbackCustodians ?? [];

      setSources(sourceItems);
      setFallbackCustodians(fallbackItems);

      setForm((current) => {
        const next = { ...current };

        if (!next.selectedSourceId && sourceItems.length === 1) {
          next.selectedSourceId = sourceItems[0].id;
          next.sourceId = sourceItems[0].id;
        }

        const selectedSourceId =
          next.selectedSourceId || sourceItems[0]?.id || "";

        const sourceCustodians =
          sourceItems.find((source) => source.id === selectedSourceId)
            ?.custodians ?? [];

        const mergedCustodians = dedupeCustodians([
          ...sourceCustodians,
          ...fallbackItems,
        ]);

        if (!next.selectedCustodianId && mergedCustodians.length === 1) {
          const custodian = mergedCustodians[0];

          next.selectedCustodianId = custodian.id;
          next.custodianId = custodian.id;
          next.mailboxEmail = custodian.primary_email || next.mailboxEmail;
        }

        return next;
      });
    } catch (err) {
      setSourcesError(
        err instanceof Error
          ? err.message
          : "Unable to load Microsoft ingestion sources."
      );
    } finally {
      setSourcesLoading(false);
    }
  }

  async function loadIngestionJobs() {
    setJobsLoading(true);
    setJobsError(null);

    try {
      const accessToken = await getSessionAccessToken();

      const res = await fetch("/api/vault/ingest/jobs", {
        method: "GET",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      });

      const payload = await readJsonResponse<IngestionJobsResponse>(res);

      if (!res.ok || !payload?.ok) {
        throw new Error(
          payload?.error || payload?.details || "Unable to load ingestion jobs."
        );
      }

      const items = Array.isArray(payload.jobs)
        ? payload.jobs
        : Array.isArray(payload.items)
          ? payload.items
          : [];

      setJobs(items);
    } catch (err) {
      setJobsError(
        err instanceof Error ? err.message : "Unable to load ingestion jobs."
      );
    } finally {
      setJobsLoading(false);
    }
  }

  useEffect(() => {
    loadMicrosoftStatus();
    loadMicrosoftSources();
    loadIngestionJobs();
  }, []);

  useEffect(() => {
    if (!selectedSource) return;

    setForm((current) => {
      const next = {
        ...current,
        sourceId: selectedSource.id,
      };

      const sourceCustodians = selectedSource.custodians ?? [];
      const mergedCustodians = dedupeCustodians([
        ...sourceCustodians,
        ...fallbackCustodians,
      ]);

      if (!next.selectedCustodianId && mergedCustodians.length === 1) {
        const custodian = mergedCustodians[0];

        next.selectedCustodianId = custodian.id;
        next.custodianId = custodian.id;

        if (custodian.primary_email) {
          next.mailboxEmail = custodian.primary_email;
        }
      }

      return next;
    });
  }, [selectedSource, fallbackCustodians]);

  useEffect(() => {
    if (!selectedCustodian) return;

    setForm((current) => ({
      ...current,
      custodianId: selectedCustodian.id,
      mailboxEmail: selectedCustodian.primary_email || current.mailboxEmail,
    }));
  }, [selectedCustodian]);

  useEffect(() => {
    if (!form.selectedCustodianId && availableCustodians.length === 1) {
      const custodian = availableCustodians[0];

      setForm((current) => ({
        ...current,
        selectedCustodianId: custodian.id,
        custodianId: custodian.id,
        mailboxEmail: custodian.primary_email || current.mailboxEmail,
      }));
    }
  }, [availableCustodians, form.selectedCustodianId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const accessToken = await getSessionAccessToken();

      const payload = {
        mailboxEmail: form.mailboxEmail.trim(),
        custodianId: form.custodianId.trim(),
        sourceId: form.sourceId.trim(),
        graphAccessToken: form.graphAccessToken.trim() || undefined,
        limit: Number(form.limit || "5"),
        since: toIsoFromLocalDateTime(form.since),
        includeAttachments: form.includeAttachments,
      };

      const res = await fetch("/api/vault/ingest/microsoft/mailbox", {
        method: "POST",
        cache: "no-store",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const payloadResponse = await readJsonResponse<IngestResponse>(res);

      if (!res.ok || !payloadResponse?.ok) {
        throw new Error(
          payloadResponse?.error ||
            payloadResponse?.details ||
            "Microsoft mailbox ingestion failed."
        );
      }

      setResponse(payloadResponse);
      await loadMicrosoftStatus();
      await loadIngestionJobs();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Microsoft mailbox ingestion failed."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setForm(defaultForm);
    setResponse(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Ingestion
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Microsoft Mailbox Ingestion
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manually ingest messages from one Microsoft Graph mailbox into Vault
              for testing before scheduled ingestion is enabled.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/vault/search"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Vault Search
            </Link>

            <Link
              href="/vault/cases"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Vault Cases
            </Link>

            <Link
              href="/vault/exports"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Vault Exports
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Microsoft Graph Status
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              App-only ingestion readiness
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              This check uses your authenticated Vault session to test Microsoft
              Graph app-only configuration and connectivity.
            </p>
          </div>

          <button
            type="button"
            onClick={loadMicrosoftStatus}
            disabled={statusLoading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {statusLoading ? "Checking..." : "Refresh Status"}
          </button>
        </div>

        {statusError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {statusError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div
            className={`rounded-xl border p-4 ${getStatusToneClasses(
              graphOperational
            )}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">
              Operational
            </p>
            <p className="mt-2 text-lg font-semibold">
              {statusLoading ? "Checking..." : graphOperational ? "Yes" : "No"}
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${getStatusToneClasses(
              microsoftStatus?.microsoftGraph?.configuration.configured === true
            )}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">
              Env Configured
            </p>
            <p className="mt-2 text-lg font-semibold">
              {microsoftStatus?.microsoftGraph?.configuration.configured
                ? "Yes"
                : "No"}
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${getStatusToneClasses(
              microsoftStatus?.microsoftGraph?.token.ok === true
            )}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">
              Token Test
            </p>
            <p className="mt-2 text-lg font-semibold">
              {microsoftStatus?.microsoftGraph?.token.ok ? "Passed" : "Failed"}
            </p>
          </div>

          <div
            className={`rounded-xl border p-4 ${getStatusToneClasses(
              microsoftStatus?.microsoftGraph?.graph.ok === true
            )}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">
              Graph Test
            </p>
            <p className="mt-2 text-lg font-semibold">
              {microsoftStatus?.microsoftGraph?.graph.ok ? "Passed" : "Failed"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/30">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
            App-only Microsoft Graph ingestion is configured
          </p>
          <p className="text-sm text-emerald-700 dark:text-emerald-200">
            Leave the manual Graph token field blank to use the Azure app
            registration credentials already configured in the environment.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Microsoft Vault Source
                </label>

                <button
                  type="button"
                  onClick={loadMicrosoftSources}
                  disabled={sourcesLoading}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  {sourcesLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>

              <select
                value={form.selectedSourceId}
                onChange={(e) => updateForm("selectedSourceId", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">Select Vault Source</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {getSourceLabel(source)}
                  </option>
                ))}
              </select>

              {selectedSource ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <span className="font-medium">Provider:</span>{" "}
                      {selectedSource.provider || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span>{" "}
                      {selectedSource.source_type || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {selectedSource.status || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Custodians Available:</span>{" "}
                      {availableCustodians.length}
                    </div>
                    <div className="break-all md:col-span-2">
                      <span className="font-medium">Source ID:</span>{" "}
                      {selectedSource.id}
                    </div>
                  </div>
                </div>
              ) : null}

              {sourcesError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  {sourcesError}
                </div>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Custodian
              </label>

              <select
                value={form.selectedCustodianId}
                onChange={(e) =>
                  updateForm("selectedCustodianId", e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="">
                  {sourcesLoading ? "Loading custodians..." : "Select Custodian"}
                </option>
                {availableCustodians.map((custodian) => (
                  <option key={custodian.id} value={custodian.id}>
                    {getCustodianLabel(custodian)}
                  </option>
                ))}
              </select>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Available custodians loaded: {availableCustodians.length}
              </p>

              {selectedCustodian ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-slate-800 dark:bg-slate-950">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {selectedCustodian.primary_email || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Department:</span>{" "}
                      {selectedCustodian.department || "—"}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>{" "}
                      {selectedCustodian.status || "—"}
                    </div>
                    <div className="break-all">
                      <span className="font-medium">Custodian ID:</span>{" "}
                      {selectedCustodian.id}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Mailbox Email
              </label>
              <input
                type="email"
                value={form.mailboxEmail}
                onChange={(e) => updateForm("mailboxEmail", e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Custodian ID
              </label>
              <input
                type="text"
                value={form.custodianId}
                onChange={(e) => updateForm("custodianId", e.target.value)}
                placeholder="vault_custodians.id"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Source ID
              </label>
              <input
                type="text"
                value={form.sourceId}
                onChange={(e) => updateForm("sourceId", e.target.value)}
                placeholder="vault_sources.id"
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Limit
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={form.limit}
                onChange={(e) => updateForm("limit", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Since
              </label>
              <input
                type="datetime-local"
                value={form.since}
                onChange={(e) => updateForm("since", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Optional. Leave blank to ingest the newest messages up to the
                limit.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
              <input
                id="includeAttachments"
                type="checkbox"
                checked={form.includeAttachments}
                onChange={(e) =>
                  updateForm("includeAttachments", e.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              <label
                htmlFor="includeAttachments"
                className="text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                Include attachment metadata
              </label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Microsoft Graph Access Token
              </label>
              <textarea
                value={form.graphAccessToken}
                onChange={(e) =>
                  updateForm("graphAccessToken", e.target.value)
                }
                placeholder="Optional manual Graph access token. Leave blank for app-only auth."
                className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Leave blank to use enterprise app-only Microsoft Graph
                authentication.
              </p>
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-900"
            >
              {loading ? "Ingesting..." : "Start Ingestion"}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Ingestion Jobs
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
              Recent ingestion activity
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Monitor queued, running, completed, and failed ingestion jobs.
            </p>
          </div>

          <button
            type="button"
            onClick={loadIngestionJobs}
            disabled={jobsLoading}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {jobsLoading ? "Refreshing..." : "Refresh Jobs"}
          </button>
        </div>

        {jobsError ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {jobsError}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {jobSummary.total}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Queued
            </p>
            <p className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">
              {jobSummary.queued}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Running
            </p>
            <p className="mt-2 text-2xl font-semibold text-blue-700 dark:text-blue-300">
              {jobSummary.running}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Completed
            </p>
            <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
              {jobSummary.completed}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Failed
            </p>
            <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">
              {jobSummary.failed}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Provider
            </label>
            <select
              value={jobProviderFilter}
              onChange={(e) => setJobProviderFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">All Providers</option>
              {jobProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {formatLabel(provider)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              Status
            </label>
            <select
              value={jobStatusFilter}
              onChange={(e) => setJobStatusFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="all">All Statuses</option>
              {jobStatuses.map((status) => (
                <option key={status} value={status}>
                  {formatLabel(status)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
            <thead className="bg-slate-50 dark:bg-slate-950">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Provider
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Started
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  Completed
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {jobsLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    Loading ingestion jobs...
                  </td>
                </tr>
              ) : filteredJobs.length ? (
                filteredJobs.map((job) => (
                  <tr key={job.id} className="align-top">
                    <td className="px-4 py-4">
                      <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-200">
                        {job.id}
                      </p>
                      {job.source_id ? (
                        <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                          Source: {job.source_id}
                        </p>
                      ) : null}
                      {job.error_message ? (
                        <p className="mt-1 text-xs text-red-700 dark:text-red-300">
                          {job.error_message}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatLabel(job.provider)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatLabel(job.job_type)}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getJobStatusClasses(
                          job.status
                        )}`}
                      >
                        {formatLabel(job.status)}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatDate(job.started_at ?? job.created_at)}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatDate(job.completed_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"
                  >
                    No ingestion jobs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {response ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Ingestion Summary
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Results from the Microsoft mailbox ingestion request.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Graph Returned
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {response.summary?.graphReturnedCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Success
                </p>
                <p className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">
                  {response.summary?.successCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Failed
                </p>
                <p className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">
                  {response.summary?.failedCount ?? 0}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Attachments
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {response.summary?.attachmentCount ?? 0}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(response.summary?.totalAttachmentBytes)}
                </p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}