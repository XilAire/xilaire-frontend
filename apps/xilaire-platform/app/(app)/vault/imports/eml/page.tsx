import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageContext = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();

  return trimmed.length ? trimmed : null;
}

function buildFormErrorRedirect(message: string) {
  redirect(`/vault/imports/eml?error=${encodeURIComponent(message)}`);
}

async function createEmlImport(formData: FormData) {
  "use server";

  const name = normalizeString(formData.get("name"));
  const sourceKey = normalizeString(formData.get("sourceKey"));
  const mailboxAddress = normalizeString(formData.get("mailboxAddress"));
  const displayName = normalizeString(formData.get("displayName"));

  const fileName = normalizeString(formData.get("fileName"));
  const storageBucket =
    normalizeString(formData.get("storageBucket")) ?? "vault-imports";
  const storagePath = normalizeString(formData.get("storagePath"));
  const contentType =
    normalizeString(formData.get("contentType")) ?? "message/rfc822";
  const sha256 = normalizeString(formData.get("sha256"));
  const originalPath = normalizeString(formData.get("originalPath"));

  const fileSizeBytesRaw = Number(formData.get("fileSizeBytes") ?? "");
  const fileSizeBytes = Number.isFinite(fileSizeBytesRaw)
    ? fileSizeBytesRaw
    : undefined;

  const importModeRaw =
    normalizeString(formData.get("importMode")) ?? "full_import";

  const importMode =
    importModeRaw === "metadata_only"
      ? "metadata_only"
      : importModeRaw === "dedupe_only"
        ? "dedupe_only"
        : "full_import";

  const syncModeRaw = normalizeString(formData.get("syncMode")) ?? "manual";
  const syncMode = syncModeRaw === "scheduled" ? "scheduled" : "manual";

  const applyDefaultRetention =
    formData.get("applyDefaultRetention") === "true";

  const defaultRetentionDaysRaw = Number(
    formData.get("defaultRetentionDays") ?? ""
  );

  const defaultRetentionDays = Number.isFinite(defaultRetentionDaysRaw)
    ? defaultRetentionDaysRaw
    : undefined;

  const legalHoldByDefault = formData.get("legalHoldByDefault") === "true";

  if (!mailboxAddress) {
    buildFormErrorRedirect("Mailbox address is required for EML import.");
  }

  if (!fileName) {
    buildFormErrorRedirect("EML file name is required.");
  }

  if (!storageBucket) {
    buildFormErrorRedirect("Storage bucket is required.");
  }

  if (!storagePath) {
    buildFormErrorRedirect("Storage path is required.");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/vault/imports/eml`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      body: JSON.stringify({
        name,
        sourceKey,
        mailboxAddress,
        displayName,
        fileName,
        fileSizeBytes,
        storageBucket,
        storagePath,
        contentType,
        sha256,
        originalPath,
        importMode,
        syncMode,
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
      "Failed to create EML import.";

    buildFormErrorRedirect(message);
  }

  revalidatePath("/vault/imports/eml");
  revalidatePath("/vault/sources");
  revalidatePath("/vault/ingestion");

  redirect("/vault/imports/eml?success=eml-import-created");
}

export default async function VaultEmlImportPage({
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

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Vault Imports
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                EML Import
              </h1>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                Register uploaded EML/RFC822 files for Vault ingestion. This
                creates a manual upload source, links the EML file to a mailbox
                target, and queues EML parse/import jobs for processing.
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

        {(error || success) && (
          <section
            className={
              error
                ? "rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200"
                : "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-emerald-200"
            }
          >
            {error ? <p className="text-sm">{error}</p> : null}

            {success === "eml-import-created" ? (
              <p className="text-sm">
                EML import source created successfully and ingestion jobs were
                queued.
              </p>
            ) : null}
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70">
            <div className="border-b border-zinc-800 px-5 py-4">
              <h2 className="text-lg font-semibold text-zinc-100">
                Register EML Import
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Use this after the EML file has already been uploaded into your
                storage bucket.
              </p>
            </div>

            <form action={createEmlImport} className="grid gap-5 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="name"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Import display name
                  </label>

                  <input
                    id="name"
                    name="name"
                    placeholder="EML Import - Evidence Message"
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
                    placeholder="eml-evidence-message"
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="mailboxAddress"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Mailbox address
                  </label>

                  <input
                    id="mailboxAddress"
                    name="mailboxAddress"
                    placeholder="jsmith@company.com"
                    required
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                </div>

                <div>
                  <label
                    htmlFor="displayName"
                    className="text-sm font-medium text-zinc-300"
                  >
                    Mailbox display name
                  </label>

                  <input
                    id="displayName"
                    name="displayName"
                    placeholder="John Smith"
                    className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">
                  EML file location
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="fileName"
                      className="text-sm font-medium text-zinc-300"
                    >
                      File name
                    </label>

                    <input
                      id="fileName"
                      name="fileName"
                      placeholder="evidence-message.eml"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="fileSizeBytes"
                      className="text-sm font-medium text-zinc-300"
                    >
                      File size bytes
                    </label>

                    <input
                      id="fileSizeBytes"
                      name="fileSizeBytes"
                      type="number"
                      placeholder="1048576"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="storageBucket"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Storage bucket
                    </label>

                    <input
                      id="storageBucket"
                      name="storageBucket"
                      defaultValue="vault-imports"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="storagePath"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Storage path
                    </label>

                    <input
                      id="storagePath"
                      name="storagePath"
                      placeholder="org-id/eml/evidence-message.eml"
                      required
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="contentType"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Content type
                    </label>

                    <input
                      id="contentType"
                      name="contentType"
                      defaultValue="message/rfc822"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="sha256"
                      className="text-sm font-medium text-zinc-300"
                    >
                      SHA256 hash
                    </label>

                    <input
                      id="sha256"
                      name="sha256"
                      placeholder="Optional chain-of-custody hash"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label
                      htmlFor="originalPath"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Original path
                    </label>

                    <input
                      id="originalPath"
                      name="originalPath"
                      placeholder="Original workstation/share path, if known"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">
                  Import behavior
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="importMode"
                      className="text-sm font-medium text-zinc-300"
                    >
                      Import mode
                    </label>

                    <select
                      id="importMode"
                      name="importMode"
                      defaultValue="full_import"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="full_import">Full import</option>
                      <option value="metadata_only">Metadata only</option>
                      <option value="dedupe_only">Dedupe only</option>
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
                      defaultValue="manual"
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                    >
                      <option value="manual">Manual</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-sm font-medium text-zinc-200">
                  Retention and hold defaults
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="applyDefaultRetention"
                      value="true"
                    />
                    Apply default retention
                  </label>

                  <label className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      name="legalHoldByDefault"
                      value="true"
                    />
                    Legal hold by default
                  </label>

                  <div className="md:col-span-2">
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
                      className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
              >
                Create EML import
              </button>
            </form>
          </div>

          <aside className="flex flex-col gap-6">
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 className="text-lg font-semibold text-zinc-100">
                EML import workflow
              </h2>

              <div className="mt-4 grid gap-3 text-sm text-zinc-400">
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="font-medium text-zinc-200">1. Upload EML</p>
                  <p className="mt-1">
                    Upload the EML/RFC822 file into your Vault import storage
                    bucket.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="font-medium text-zinc-200">
                    2. Register import
                  </p>
                  <p className="mt-1">
                    Submit the mailbox and storage metadata using this form.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="font-medium text-zinc-200">3. Queue jobs</p>
                  <p className="mt-1">
                    Vault queues eml_parse and eml_import jobs.
                  </p>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="font-medium text-zinc-200">
                    4. Process evidence
                  </p>
                  <p className="mt-1">
                    The ingestion worker parses the EML and imports the
                    normalized message and attachments.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 className="text-lg font-semibold text-zinc-100">
                Required fields
              </h2>

              <div className="mt-4 grid gap-2 text-sm text-zinc-400">
                <p>Mailbox address</p>
                <p>File name</p>
                <p>Storage bucket</p>
                <p>Storage path</p>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
              <h2 className="text-lg font-semibold text-zinc-100">
                After creation
              </h2>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href="/vault/sources"
                  className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  View sources
                </Link>

                <Link
                  href="/vault/ingestion"
                  className="inline-flex rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/20"
                >
                  View jobs
                </Link>

                <Link
                  href="/vault/imports/pst"
                  className="inline-flex rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  PST imports
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}