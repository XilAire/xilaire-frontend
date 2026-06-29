"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

type VaultSearchResponse = {
  ok: boolean;
  items?: Array<{
    id: string;
    subject: string | null;
    sender_email: string | null;
    sent_at: string | null;
    received_at: string | null;
    on_hold: boolean;
    attachment_count: number;
    export_count: number;
  }>;
  total?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultHoldsResponse = {
  ok: boolean;
  items?: Array<{
    id: string;
    name: string;
    status: "active" | "released" | "expired";
    hold_type: "legal" | "investigation" | "regulatory" | "manual";
    scope_type: "org" | "domain" | "custodian" | "mailbox" | "keyword" | "message";
    started_at: string;
    released_at: string | null;
  }>;
  total?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultExportsResponse = {
  ok: boolean;
  items?: Array<{
    id: string;
    name: string;
    status: "queued" | "processing" | "completed" | "failed" | "cancelled";
    export_type: "search_result" | "case_export" | "hold_export" | "manual";
    format: "eml" | "pst" | "zip" | "json" | "csv";
    file_count: number;
    total_size_bytes: number;
    requested_at: string;
    completed_at: string | null;
  }>;
  total?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type VaultAuditResponse = {
  ok: boolean;
  items?: Array<{
    id: string;
    action: string;
    entity_type: string;
    status: "success" | "failure" | "warning";
    actor_email: string | null;
    created_at: string;
  }>;
  total?: number;
  targetOrgId?: string;
  accessPath?: "org_role" | "support_grant";
  error?: string;
};

type OverviewState = {
  targetOrgId: string | null;
  accessPath: "org_role" | "support_grant" | null;
  totalMessages: number;
  activeHolds: number;
  totalExports: number;
  auditEvents: number;
  recentMessages: Array<{
    id: string;
    subject: string | null;
    sender_email: string | null;
    sent_at: string | null;
    received_at: string | null;
    on_hold: boolean;
  }>;
  recentHolds: Array<{
    id: string;
    name: string;
    status: "active" | "released" | "expired";
    hold_type: "legal" | "investigation" | "regulatory" | "manual";
    started_at: string;
  }>;
  recentExports: Array<{
    id: string;
    name: string;
    status: "queued" | "processing" | "completed" | "failed" | "cancelled";
    format: "eml" | "pst" | "zip" | "json" | "csv";
    requested_at: string;
  }>;
  recentAudit: Array<{
    id: string;
    action: string;
    entity_type: string;
    status: "success" | "failure" | "warning";
    actor_email: string | null;
    created_at: string;
  }>;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString();
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

export default function VaultOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewState>({
    targetOrgId: null,
    accessPath: null,
    totalMessages: 0,
    activeHolds: 0,
    totalExports: 0,
    auditEvents: 0,
    recentMessages: [],
    recentHolds: [],
    recentExports: [],
    recentAudit: [],
  });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("Unable to resolve authenticated session.");
      }

      const authHeaders = {
        Authorization: `Bearer ${session.access_token}`,
      };

      const [messagesRes, holdsRes, exportsRes, auditRes] = await Promise.all([
        fetch("/api/vault/search?limit=5&offset=0", {
          method: "GET",
          headers: authHeaders,
        }),
        fetch("/api/vault/holds?limit=5&offset=0", {
          method: "GET",
          headers: authHeaders,
        }),
        fetch("/api/vault/exports?limit=5&offset=0", {
          method: "GET",
          headers: authHeaders,
        }),
        fetch("/api/vault/audit?limit=5&offset=0", {
          method: "GET",
          headers: authHeaders,
        }),
      ]);

      const [messagesPayload, holdsPayload, exportsPayload, auditPayload] =
        (await Promise.all([
          messagesRes.json(),
          holdsRes.json(),
          exportsRes.json(),
          auditRes.json(),
        ])) as [
          VaultSearchResponse,
          VaultHoldsResponse,
          VaultExportsResponse,
          VaultAuditResponse
        ];

      if (!messagesRes.ok || !messagesPayload.ok) {
        throw new Error(messagesPayload.error || "Unable to load Vault messages.");
      }

      if (!holdsRes.ok || !holdsPayload.ok) {
        throw new Error(holdsPayload.error || "Unable to load Vault holds.");
      }

      if (!exportsRes.ok || !exportsPayload.ok) {
        throw new Error(exportsPayload.error || "Unable to load Vault exports.");
      }

      if (!auditRes.ok || !auditPayload.ok) {
        throw new Error(auditPayload.error || "Unable to load Vault audit.");
      }

      const activeHoldsCount =
        (holdsPayload.items ?? []).filter((hold) => hold.status === "active").length;

      setOverview({
        targetOrgId:
          messagesPayload.targetOrgId ??
          holdsPayload.targetOrgId ??
          exportsPayload.targetOrgId ??
          auditPayload.targetOrgId ??
          null,
        accessPath:
          messagesPayload.accessPath ??
          holdsPayload.accessPath ??
          exportsPayload.accessPath ??
          auditPayload.accessPath ??
          null,
        totalMessages: messagesPayload.total ?? 0,
        activeHolds: activeHoldsCount,
        totalExports: exportsPayload.total ?? 0,
        auditEvents: auditPayload.total ?? 0,
        recentMessages:
          (messagesPayload.items ?? []).map((item) => ({
            id: item.id,
            subject: item.subject,
            sender_email: item.sender_email,
            sent_at: item.sent_at,
            received_at: item.received_at,
            on_hold: item.on_hold,
          })) ?? [],
        recentHolds:
          (holdsPayload.items ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            status: item.status,
            hold_type: item.hold_type,
            started_at: item.started_at,
          })) ?? [],
        recentExports:
          (exportsPayload.items ?? []).map((item) => ({
            id: item.id,
            name: item.name,
            status: item.status,
            format: item.format,
            requested_at: item.requested_at,
          })) ?? [],
        recentAudit:
          (auditPayload.items ?? []).map((item) => ({
            id: item.id,
            action: item.action,
            entity_type: item.entity_type,
            status: item.status,
            actor_email: item.actor_email,
            created_at: item.created_at,
          })) ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Vault overview.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const quickLinks = useMemo(
    () => [
      {
        title: "Search Archive",
        description: "Find archived messages, filter by sender, recipient, date, and hold state.",
        href: "/vault/search",
      },
      {
        title: "Manage Holds",
        description: "Create, review, and release preservation holds.",
        href: "/vault/holds",
      },
      {
        title: "Manage Exports",
        description: "Create export requests and track chain-of-custody status.",
        href: "/vault/exports",
      },
      {
        title: "Review Audit",
        description: "Inspect archive, hold, export, and search audit events.",
        href: "/vault/audit",
      },
      {
        title: "Source Connections",
        description: "Manage EXO, Graph API, EWS, Gmail, IMAP, and SMTP journal sources.",
        href: "/vault/sources",
      },
      {
        title: "Ingestion Jobs",
        description: "Track queued, running, completed, failed, and retrying ingestion jobs.",
        href: "/vault/ingestion",
      },
      {
        title: "Manual Imports",
        description: "Open the import center for PST and EML evidence ingestion.",
        href: "/vault/imports",
      },
      {
        title: "PST Import",
        description: "Register uploaded PST files and queue PST parse/import jobs.",
        href: "/vault/imports/pst",
      },
      {
        title: "EML Import",
        description: "Register uploaded EML files and queue EML parse/import jobs.",
        href: "/vault/imports/eml",
      },
    ],
    []
  );

  const sourceImportLinks = useMemo(
    () => [
      {
        title: "Sources",
        description: "Connect EXO, Graph API, EWS, Gmail, IMAP, and SMTP journal sources.",
        href: "/vault/sources",
      },
      {
        title: "Ingestion",
        description: "Monitor connector and import jobs across all source types.",
        href: "/vault/ingestion",
      },
      {
        title: "Imports",
        description: "Open the manual evidence import center.",
        href: "/vault/imports",
      },
      {
        title: "PST",
        description: "Register Outlook PST archive files.",
        href: "/vault/imports/pst",
      },
      {
        title: "EML",
        description: "Register individual EML/RFC822 evidence files.",
        href: "/vault/imports/eml",
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              Vault
            </p>
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Vault Overview
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Archive operations, preservation controls, exports, audit visibility, sources, imports, and ingestion.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span>Target Org: {overview.targetOrgId ?? "—"}</span>
            <span>Access Path: {overview.accessPath ?? "—"}</span>

            <Link
              href="/vault/sources"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Sources
            </Link>

            <Link
              href="/vault/imports"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Imports
            </Link>

            <Link
              href="/vault/ingestion"
              className="rounded-lg border border-sky-300 px-3 py-1.5 text-sm text-sky-700 transition hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/20"
            >
              Ingestion
            </Link>

            <button
              type="button"
              onClick={fetchOverview}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          Loading Vault overview...
        </section>
      ) : error ? (
        <section className="rounded-2xl border border-red-200 bg-white p-6 text-sm text-red-600 dark:border-red-900 dark:bg-slate-900 dark:text-red-400">
          {error}
        </section>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Archived Messages
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {overview.totalMessages}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Total messages currently searchable in Vault.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Active Holds
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {overview.activeHolds}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Holds currently preserving archive content.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Export Requests
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {overview.totalExports}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Recorded export requests in the current org.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Audit Events
              </p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                {overview.auditEvents}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Search, hold, export, and archive activity records.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Source, Import, and Ingestion Navigation
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Use these links to manage connectors, manual evidence imports, and ingestion jobs.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
              {sourceImportLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {item.description}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Quick Actions
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Jump directly into the core Vault workflows.
                </p>
              </div>

              <div className="grid gap-3">
                {quickLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="rounded-xl border border-slate-200 p-4 transition hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {item.description}
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Recent Audit Activity
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Latest tracked Vault events.
                </p>
              </div>

              {overview.recentAudit.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  No recent audit activity found.
                </div>
              ) : (
                <div className="space-y-3">
                  {overview.recentAudit.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-xl border border-slate-200 p-4 dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.status === "success"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : row.status === "failure"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {row.status}
                        </span>
                        <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          {row.action}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.entity_type} • {row.actor_email || "Unknown actor"} • {formatDateTime(row.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Recent Messages
                </p>
              </div>

              {overview.recentMessages.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  No messages available.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {overview.recentMessages.map((row) => (
                    <div key={row.id} className="p-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {row.subject || "(No Subject)"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.sender_email || "—"} • {formatDateTime(row.sent_at || row.received_at)}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.on_hold
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {row.on_hold ? "On Hold" : "Not On Hold"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                <Link
                  href="/vault/search"
                  className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  Open Search
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Recent Holds
                </p>
              </div>

              {overview.recentHolds.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  No holds available.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {overview.recentHolds.map((row) => (
                    <div key={row.id} className="p-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <Link href={`/vault/holds/${row.id}`} className="hover:underline">
                          {row.name}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.hold_type} • {formatDateTime(row.started_at)}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.status === "active"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : row.status === "released"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                <Link
                  href="/vault/holds"
                  className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  Open Holds
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  Recent Exports
                </p>
              </div>

              {overview.recentExports.length === 0 ? (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">
                  No exports available.
                </div>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {overview.recentExports.map((row) => (
                    <div key={row.id} className="p-4">
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        <Link href={`/vault/exports/${row.id}`} className="hover:underline">
                          {row.name}
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {row.format.toUpperCase()} • {formatDateTime(row.requested_at)}
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            row.status === "completed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : row.status === "failed"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                              : row.status === "cancelled"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : row.status === "processing"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
                <Link
                  href="/vault/exports"
                  className="text-sm font-medium text-sky-600 hover:underline dark:text-sky-400"
                >
                  Open Exports
                </Link>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}