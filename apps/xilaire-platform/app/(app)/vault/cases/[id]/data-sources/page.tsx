"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

type SourceStatus = "connected" | "syncing" | "pending" | "failed" | "disabled";
type SourceType = "mailbox" | "onedrive" | "sharepoint" | "teams" | "manual_upload";

type DataSource = {
  id: string;
  name: string;
  address: string;
  sourceType: SourceType;
  custodian: string;
  department: string;
  status: SourceStatus;
  itemCount: number;
  lastSyncAt: string | null;
  provider: string;
};

const demoSources: DataSource[] = [
  {
    id: "src-001",
    name: "Alex Morgan Mailbox",
    address: "alex.morgan@example.com",
    sourceType: "mailbox",
    custodian: "Alex Morgan",
    department: "Finance",
    status: "connected",
    itemCount: 1248,
    lastSyncAt: "2026-05-26T14:30:00Z",
    provider: "Microsoft 365",
  },
  {
    id: "src-002",
    name: "Finance SharePoint Site",
    address: "sharepoint:/sites/finance",
    sourceType: "sharepoint",
    custodian: "Finance Department",
    department: "Finance",
    status: "syncing",
    itemCount: 583,
    lastSyncAt: "2026-05-26T16:10:00Z",
    provider: "Microsoft Graph",
  },
  {
    id: "src-003",
    name: "Legal Review Uploads",
    address: "manual:/vault/uploads/legal-review",
    sourceType: "manual_upload",
    custodian: "Legal Review",
    department: "Legal",
    status: "pending",
    itemCount: 0,
    lastSyncAt: null,
    provider: "Vault Upload",
  },
];

function normalizeParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
}

function getStatusLabel(status: SourceStatus) {
  if (status === "connected") return "Connected";
  if (status === "syncing") return "Syncing";
  if (status === "pending") return "Pending";
  if (status === "failed") return "Failed";
  return "Disabled";
}

function getSourceTypeLabel(sourceType: SourceType) {
  if (sourceType === "mailbox") return "Mailbox";
  if (sourceType === "onedrive") return "OneDrive";
  if (sourceType === "sharepoint") return "SharePoint";
  if (sourceType === "teams") return "Teams";
  return "Manual Upload";
}

function getStatusClass(status: SourceStatus) {
  if (status === "connected") {
    return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  }

  if (status === "syncing") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  }

  if (status === "pending") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  }

  if (status === "failed") {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function getSourceTypeClass(sourceType: SourceType) {
  if (sourceType === "mailbox") {
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
  }

  if (sourceType === "sharepoint") {
    return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300";
  }

  if (sourceType === "onedrive") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300";
  }

  if (sourceType === "teams") {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export default function VaultCaseDataSourcesPage() {
  const params = useParams();
  const caseId = normalizeParam(params?.id);

  const [statusFilter, setStatusFilter] = useState<SourceStatus | "all">("all");
  const [sourceTypeFilter, setSourceTypeFilter] = useState<SourceType | "all">("all");

  const filteredSources = useMemo(() => {
    return demoSources.filter((source) => {
      const matchesStatus = statusFilter === "all" || source.status === statusFilter;
      const matchesType =
        sourceTypeFilter === "all" || source.sourceType === sourceTypeFilter;

      return matchesStatus && matchesType;
    });
  }, [statusFilter, sourceTypeFilter]);

  const totals = useMemo(() => {
    return demoSources.reduce(
      (summary, source) => {
        summary.sources += 1;
        summary.items += source.itemCount;

        if (source.status === "connected") summary.connected += 1;
        if (source.status === "syncing") summary.syncing += 1;
        if (source.status === "pending") summary.pending += 1;
        if (source.status === "failed") summary.failed += 1;

        return summary;
      },
      {
        sources: 0,
        items: 0,
        connected: 0,
        syncing: 0,
        pending: 0,
        failed: 0,
      }
    );
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault Case Workspace
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Data Sources
            </h1>
            <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
              Track custodians, mailboxes, Microsoft 365 sources, uploads, and ingestion readiness for this case.
            </p>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
              Case ID: {caseId || "—"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/vault/cases/${caseId}`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 dark:bg-white dark:text-slate-900"
            >
              Back to Case
            </Link>

            <Link
              href={`/vault/cases/${caseId}/search`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Search Evidence
            </Link>

            <Link
              href={`/vault/cases/${caseId}/holds`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Holds
            </Link>

            <Link
              href={`/vault/cases/${caseId}/exports`}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Exports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Sources
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.sources}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Connected
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.connected}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Syncing
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.syncing}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Pending
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.pending}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Items
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {totals.items}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Source Filters
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Filter case sources by ingestion status and source type.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as SourceStatus | "all")
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All Statuses</option>
                <option value="connected">Connected</option>
                <option value="syncing">Syncing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Source Type
              </label>
              <select
                value={sourceTypeFilter}
                onChange={(event) =>
                  setSourceTypeFilter(event.target.value as SourceType | "all")
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 dark:border-slate-700 dark:bg-slate-950"
              >
                <option value="all">All Types</option>
                <option value="mailbox">Mailbox</option>
                <option value="onedrive">OneDrive</option>
                <option value="sharepoint">SharePoint</option>
                <option value="teams">Teams</option>
                <option value="manual_upload">Manual Upload</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Case Sources
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredSources.length} source(s) displayed.
          </p>
        </div>

        {filteredSources.length === 0 ? (
          <div className="p-6 text-sm text-slate-500 dark:text-slate-400">
            No data sources matched your filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Source
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Type
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Custodian
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Items
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Last Sync
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    Provider
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredSources.map((source) => (
                  <tr
                    key={source.id}
                    className="align-top transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {source.name}
                        </p>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                          {source.address}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Source ID: {source.id}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getSourceTypeClass(
                          source.sourceType
                        )}`}
                      >
                        {getSourceTypeLabel(source.sourceType)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {source.custodian}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {source.department}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusClass(
                          source.status
                        )}`}
                      >
                        {getStatusLabel(source.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {source.itemCount}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {formatDateTime(source.lastSyncAt)}
                    </td>

                    <td className="px-5 py-4 text-sm text-slate-700 dark:text-slate-200">
                      {source.provider}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Next: Live Custodian Binding
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Replace demo sources with case members from vault_case_members and source mailboxes from vault_source_mailboxes.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Next: Ingestion Jobs
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Add Microsoft Graph ingestion job status, delta sync checkpoints, and failed item counts.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Next: Source Actions
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Add actions for sync now, retry failed source, disable source, and view source audit trail.
          </p>
        </div>
      </section>
    </div>
  );
}