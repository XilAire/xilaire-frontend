import Link from "next/link";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ImportCard = {
  title: string;
  description: string;
  href: string;
  status: "Ready" | "Planned";
  sourceType: string;
  provider: string;
};

const importCards: ImportCard[] = [
  {
    title: "PST Import",
    description:
      "Register uploaded Outlook PST files for mailbox archive ingestion, parsing, dedupe, retention, and chain-of-custody processing.",
    href: "/vault/imports/pst",
    status: "Ready",
    sourceType: "pst_import",
    provider: "manual_upload",
  },
  {
    title: "EML Import",
    description:
      "Register individual EML/RFC822 message files for evidence ingestion, parsing, attachment extraction, and retention processing.",
    href: "/vault/imports/eml",
    status: "Ready",
    sourceType: "eml_import",
    provider: "manual_upload",
  },
  {
    title: "MBOX Import",
    description:
      "Future support for mailbox archives exported from Gmail, Thunderbird, Apple Mail, and other MBOX-compatible systems.",
    href: "/vault/imports",
    status: "Planned",
    sourceType: "mbox_import",
    provider: "manual_upload",
  },
  {
    title: "MSG Import",
    description:
      "Future support for Outlook MSG evidence files with message metadata, body, recipients, and attachment extraction.",
    href: "/vault/imports",
    status: "Planned",
    sourceType: "msg_import",
    provider: "manual_upload",
  },
  {
    title: "ZIP Evidence Bundle",
    description:
      "Future support for packaged evidence bundles containing email files, attachments, manifests, hashes, and custody records.",
    href: "/vault/imports",
    status: "Planned",
    sourceType: "zip_bundle_import",
    provider: "manual_upload",
  },
  {
    title: "Manual Upload API",
    description:
      "Future API-driven ingestion for external systems that need to submit files, metadata, hashes, and custody records directly.",
    href: "/vault/imports",
    status: "Planned",
    sourceType: "api_import",
    provider: "api",
  },
];

function getStatusClass(status: ImportCard["status"]) {
  switch (status) {
    case "Ready":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "Planned":
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    default:
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }
}

function ImportTypeCard({ item }: { item: ImportCard }) {
  const isReady = item.status === "Ready";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-zinc-100">
            {item.title}
          </h2>

          <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(
              item.status
            )}`}
          >
            {item.status}
          </span>
        </div>

        <p className="text-sm leading-6 text-zinc-400">{item.description}</p>

        <div className="grid gap-2 text-xs text-zinc-500 sm:grid-cols-2">
          <div>Source type: {item.sourceType}</div>
          <div>Provider: {item.provider}</div>
        </div>

        {isReady ? (
          <Link
            href={item.href}
            className="inline-flex w-fit rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
          >
            Open import
          </Link>
        ) : (
          <span className="inline-flex w-fit rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-500">
            Coming later
          </span>
        )}
      </div>
    </div>
  );
}

export default async function VaultImportsPage() {
  const readyCount = importCards.filter((item) => item.status === "Ready").length;
  const plannedCount = importCards.filter(
    (item) => item.status === "Planned"
  ).length;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Vault Imports
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Manual Evidence Imports
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Register uploaded mailbox archives and individual evidence files
                for Vault ingestion. This area supports historical imports that
                are not pulled directly from live mail systems.
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
                href="/vault/sources"
                className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Sources
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

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Import Types</p>
            <p className="mt-2 text-2xl font-semibold">{importCards.length}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Ready</p>
            <p className="mt-2 text-2xl font-semibold">{readyCount}</p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm text-zinc-500">Planned</p>
            <p className="mt-2 text-2xl font-semibold">{plannedCount}</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {importCards.map((item) => (
            <ImportTypeCard key={item.title} item={item} />
          ))}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            Import workflow
          </h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-medium text-zinc-200">1. Upload file</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Place the evidence file in the Vault import storage bucket.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-medium text-zinc-200">2. Register metadata</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Submit mailbox, file, storage, hash, and retention metadata.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-medium text-zinc-200">3. Queue ingestion</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Vault creates parse/import jobs for the ingestion worker.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
              <p className="font-medium text-zinc-200">4. Process evidence</p>
              <p className="mt-1 text-sm leading-6 text-zinc-500">
                Workers normalize messages, attachments, metadata, and custody
                records.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}