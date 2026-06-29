"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PageProps = {
  params: {
    id: string;
  };
};

type SourceDetail = {
  id: string;
  org_id?: string | null;
  name?: string | null;
  provider?: string | null;
  source_type?: string | null;
  status?: string | null;
  health_status?: string | null;
  auth_status?: string | null;
  last_sync_at?: string | null;
  last_error?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  mailbox_count?: number | null;
  active_mailbox_count?: number | null;
  failed_mailbox_count?: number | null;
};

type MailboxRow = {
  id: string;
  mailbox_address?: string | null;
  display_name?: string | null;
  mailbox_type?: string | null;
  ingestion_status?: string | null;
  last_sync_at?: string | null;
};

type JobRow = {
  id: string;
  status?: string | null;
  provider?: string | null;
  source_id?: string | null;
  job_type?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  error_message?: string | null;
};

type SourceResponse = {
  ok?: boolean;
  source?: SourceDetail;
  item?: SourceDetail;
  mailboxes?: MailboxRow[];
  recentJobs?: JobRow[];
  recent_jobs?: JobRow[];
};

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

function statusClass(value?: string | null) {
  const normalized = value?.toLowerCase();

  if (
    normalized === "healthy" ||
    normalized === "connected" ||
    normalized === "active" ||
    normalized === "completed" ||
    normalized === "success"
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (
    normalized === "warning" ||
    normalized === "pending" ||
    normalized === "queued" ||
    normalized === "running" ||
    normalized === "syncing"
  ) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    normalized === "error" ||
    normalized === "failed" ||
    normalized === "expired" ||
    normalized === "disconnected"
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function Badge({ value }: { value?: string | null }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
        value
      )}`}
    >
      {formatLabel(value)}
    </span>
  );
}

export default function VaultSourceDetailPage({ params }: PageProps) {
  const sourceId = params.id;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<SourceDetail | null>(null);
  const [mailboxes, setMailboxes] = useState<MailboxRow[]>([]);
  const [recentJobs, setRecentJobs] = useState<JobRow[]>([]);

  async function loadSource() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/vault/sources/${sourceId}`, {
        method: "GET",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as SourceResponse | null;

      if (!response.ok) {
        throw new Error(
          (payload as { error?: string; message?: string } | null)?.error ??
            (payload as { error?: string; message?: string } | null)?.message ??
            "Failed to load Vault source."
        );
      }

      setSource(payload?.source ?? payload?.item ?? null);

      setMailboxes(
        Array.isArray(payload?.mailboxes) ? payload.mailboxes : []
      );

      setRecentJobs(
        Array.isArray(payload?.recentJobs)
          ? payload.recentJobs
          : Array.isArray(payload?.recent_jobs)
            ? payload.recent_jobs
            : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Vault source."
      );
    } finally {
      setLoading(false);
    }
  }

  async function runSourceAction(
    action: "sync" | "discover" | "health-check"
  ) {
    setActionLoading(action);
    setError(null);

    try {
      const response = await fetch(
        `/api/vault/sources/${sourceId}/${action}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ?? payload?.message ?? `Failed to run ${action}.`
        );
      }

      await loadSource();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Failed to run ${action}.`
      );
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    loadSource();
  }, [sourceId]);

  const summary = useMemo(() => {
    const totalMailboxes = mailboxes.length;

    const activeMailboxes = mailboxes.filter(
      (mailbox) =>
        mailbox.ingestion_status?.toLowerCase() === "active"
    ).length;

    const failedMailboxes = mailboxes.filter(
      (mailbox) =>
        mailbox.ingestion_status?.toLowerCase() === "failed"
    ).length;

    const runningJobs = recentJobs.filter(
      (job) =>
        job.status?.toLowerCase() === "running" ||
        job.status?.toLowerCase() === "queued"
    ).length;

    return {
      totalMailboxes:
        source?.mailbox_count ??
        source?.active_mailbox_count ??
        totalMailboxes,

      activeMailboxes:
        source?.active_mailbox_count ?? activeMailboxes,

      failedMailboxes:
        source?.failed_mailbox_count ?? failedMailboxes,

      runningJobs,
    };
  }, [mailboxes, recentJobs, source]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/vault/sources"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Back to sources
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Loading source...
          </h1>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading Vault source detail.
          </p>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/vault/sources"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Back to sources
          </Link>

          <h1 className="mt-3 text-2xl font-semibold text-slate-900">
            Source not found
          </h1>
        </div>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {error ?? "This Vault source could not be loaded."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/vault/sources"
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            ← Back to sources
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              {source.name ?? "Vault Source"}
            </h1>

            <Badge value={source.health_status ?? source.status} />
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {formatLabel(source.provider)} /{" "}
            {formatLabel(source.source_type)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => runSourceAction("health-check")}
            disabled={Boolean(actionLoading)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "health-check"
              ? "Checking..."
              : "Health Check"}
          </button>

          <button
            type="button"
            onClick={() => runSourceAction("discover")}
            disabled={Boolean(actionLoading)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "discover"
              ? "Discovering..."
              : "Discover Mailboxes"}
          </button>

          <button
            type="button"
            onClick={() => runSourceAction("sync")}
            disabled={Boolean(actionLoading)}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading === "sync"
              ? "Starting Sync..."
              : "Start Sync"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Mailboxes</p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.totalMailboxes}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Active Mailboxes</p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.activeMailboxes}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Failed Mailboxes</p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.failedMailboxes}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Running Jobs</p>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {summary.runningJobs}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-1">
          <h2 className="text-base font-semibold text-slate-900">
            Source Details
          </h2>

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Provider</dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatLabel(source.provider)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Source Type</dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatLabel(source.source_type)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Status</dt>

              <dd className="mt-1">
                <Badge value={source.status} />
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Health</dt>

              <dd className="mt-1">
                <Badge value={source.health_status} />
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Authentication</dt>

              <dd className="mt-1">
                <Badge value={source.auth_status} />
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Last Sync</dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatDate(source.last_sync_at)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Created</dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatDate(source.created_at)}
              </dd>
            </div>

            <div>
              <dt className="text-slate-500">Updated</dt>

              <dd className="mt-1 font-medium text-slate-900">
                {formatDate(source.updated_at)}
              </dd>
            </div>
          </dl>

          {source.last_error ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-medium">Last Error</p>

              <p className="mt-1">{source.last_error}</p>
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="border-b border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900">
              Mailboxes
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Mailboxes discovered or assigned to this source.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left font-medium text-slate-500">
                    Mailbox
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-slate-500">
                    Type
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-slate-500">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left font-medium text-slate-500">
                    Last Sync
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 bg-white">
                {mailboxes.length ? (
                  mailboxes.map((mailbox) => (
                    <tr key={mailbox.id}>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {mailbox.display_name ??
                            mailbox.mailbox_address ??
                            "Unnamed mailbox"}
                        </p>

                        <p className="text-slate-500">
                          {mailbox.mailbox_address}
                        </p>
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {formatLabel(mailbox.mailbox_type)}
                      </td>

                      <td className="px-6 py-4">
                        <Badge value={mailbox.ingestion_status} />
                      </td>

                      <td className="px-6 py-4 text-slate-700">
                        {formatDate(mailbox.last_sync_at)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-10 text-center text-sm text-slate-500"
                    >
                      No mailboxes found for this source yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Ingestion Jobs
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Latest sync, discovery, and ingestion activity for this connector.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Job
                </th>

                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Type
                </th>

                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Status
                </th>

                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Started
                </th>

                <th className="px-6 py-3 text-left font-medium text-slate-500">
                  Completed
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 bg-white">
              {recentJobs.length ? (
                recentJobs.map((job) => (
                  <tr key={job.id}>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">
                        {job.id}
                      </p>

                      {job.error_message ? (
                        <p className="mt-1 text-xs text-red-600">
                          {job.error_message}
                        </p>
                      ) : null}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {formatLabel(job.job_type)}
                    </td>

                    <td className="px-6 py-4">
                      <Badge value={job.status} />
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(job.started_at ?? job.created_at)}
                    </td>

                    <td className="px-6 py-4 text-slate-700">
                      {formatDate(job.completed_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-sm text-slate-500"
                  >
                    No recent ingestion jobs found for this source yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}