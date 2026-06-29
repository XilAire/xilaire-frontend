import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getVaultAdminClient } from "@/lib/vault/server";

export const dynamic = "force-dynamic";

const FALLBACK_ORG_ID = "276f130f-6f47-44a3-80e5-3cbbf246edf7";

function normalizeString(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function normalizeStatus(value: FormDataEntryValue | null) {
  const status = normalizeString(value)?.toLowerCase();

  switch (status) {
    case "open":
    case "active":
    case "pending":
    case "closed":
    case "archived":
      return status;
    default:
      return "open";
  }
}

function normalizePriority(value: FormDataEntryValue | null) {
  const priority = normalizeString(value)?.toLowerCase();

  switch (priority) {
    case "low":
    case "normal":
    case "medium":
    case "high":
    case "critical":
      return priority;
    default:
      return "normal";
  }
}

function buildDescription(input: {
  description: string | null;
  notes: string | null;
  matterNumber: string | null;
  externalReference: string | null;
}) {
  const parts = [
    input.description,
    input.notes ? `Notes: ${input.notes}` : null,
    input.matterNumber ? `Matter Number: ${input.matterNumber}` : null,
    input.externalReference
      ? `External Reference: ${input.externalReference}`
      : null,
  ].filter(Boolean);

  return parts.length ? parts.join("\n\n") : null;
}

async function createVaultCase(formData: FormData) {
  "use server";

  const name = normalizeString(formData.get("name"));
  const description = normalizeString(formData.get("description"));
  const notes = normalizeString(formData.get("notes"));
  const matterNumber = normalizeString(formData.get("matterNumber"));
  const externalReference = normalizeString(formData.get("externalReference"));
  const status = normalizeStatus(formData.get("status"));
  const priority = normalizePriority(formData.get("priority"));

  if (!name) {
    redirect("/vault/cases/new?error=missing-name");
  }

  const supabase = await getVaultAdminClient();

  const { data, error } = await supabase
    .from("vault_cases")
    .insert({
      org_id: FALLBACK_ORG_ID,
      name,
      description: buildDescription({
        description,
        notes,
        matterNumber,
        externalReference,
      }),
      status,
      priority,
      created_by: null,
      updated_by: null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect(
      `/vault/cases/new?error=create-failed&details=${encodeURIComponent(
        error?.message ?? "No case ID returned."
      )}`
    );
  }

  revalidatePath("/vault/cases");
  redirect(`/vault/cases/${data.id}`);
}

export default async function NewVaultCasePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  const error =
    typeof resolvedSearchParams.error === "string"
      ? resolvedSearchParams.error
      : null;

  const details =
    typeof resolvedSearchParams.details === "string"
      ? resolvedSearchParams.details
      : null;

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-8 text-zinc-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
                Vault Cases
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Create Case
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Create a new eDiscovery case. After the case is created, you can
                add custodians, department mailboxes, and case admins.
              </p>
            </div>

            <Link
              href="/vault/cases"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
            >
              Back to cases
            </Link>
          </div>
        </section>

        {error ? (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-200">
            <p className="font-medium">
              {error === "missing-name"
                ? "Case name is required."
                : "Failed to create Vault case."}
            </p>
            {details ? (
              <p className="mt-2 text-sm text-red-200/80">{details}</p>
            ) : null}
          </section>
        ) : null}

        <form
          action={createVaultCase}
          className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6"
        >
          <div className="grid gap-6">
            <div>
              <label className="text-sm text-zinc-400" htmlFor="name">
                Case name
              </label>
              <input
                id="name"
                name="name"
                required
                placeholder="Example: HR Investigation - April 2026"
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={5}
                placeholder="Describe the purpose of this case."
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm text-zinc-400" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  defaultValue="open"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                >
                  <option value="open">Open</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="closed">Closed</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-400" htmlFor="priority">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="normal"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-blue-500/60"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  className="text-sm text-zinc-400"
                  htmlFor="matterNumber"
                >
                  Matter number
                </label>
                <input
                  id="matterNumber"
                  name="matterNumber"
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                />
              </div>

              <div>
                <label
                  className="text-sm text-zinc-400"
                  htmlFor="externalReference"
                >
                  External reference
                </label>
                <input
                  id="externalReference"
                  name="externalReference"
                  placeholder="Optional"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400" htmlFor="notes">
                Internal notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Optional internal notes."
                className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-blue-500/60"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 pt-6 sm:flex-row sm:justify-end">
              <Link
                href="/vault/cases"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-xl border border-blue-500/40 bg-blue-500/15 px-4 py-2 text-sm font-medium text-blue-200 hover:bg-blue-500/25"
              >
                Create case
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}