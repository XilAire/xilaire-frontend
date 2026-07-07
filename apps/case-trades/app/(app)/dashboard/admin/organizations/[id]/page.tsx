import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Organization Details | CASE Trades",
  description:
    "View and manage an organization's details, members, subscriptions, entitlements, billing, Discord integration, roles, permissions, and administrative settings within the CASE Trades platform.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
};

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  );
}

function getSupabaseServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

function createAdminSupabaseClient() {
  return createSupabaseClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export default async function OrganizationDetailsPage({ params }: PageProps) {
  const supabase = createAdminSupabaseClient();

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, discord_invite_url, created_at")
    .eq("id", params.id)
    .maybeSingle();

  if (organizationError) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-red-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organization Error
          </h1>

          <p className="mt-2 text-sm text-red-300">
            Failed to load organization: {organizationError.message}
          </p>

          <Link
            href="/dashboard/admin/organizations"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  if (!organization) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-orange-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organization Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            No organization was found for ID: {params.id}
          </p>

          <Link
            href="/dashboard/admin/organizations"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Organizations
          </Link>
        </div>
      </main>
    );
  }

  const { data: members } = await supabase
    .from("organization_members")
    .select(
      `
      id,
      user_id,
      role_id,
      profiles (
        id,
        email,
        full_name
      ),
      roles (
        id,
        name,
        rank
      )
    `
    )
    .eq("organization_id", organization.id);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      current_period_end,
      plans (
        id,
        name,
        key
      )
    `
    )
    .eq("organization_id", organization.id);

  const safeMembers = Array.isArray(members) ? members : [];
  const safeSubscriptions = Array.isArray(subscriptions)
    ? subscriptions
    : [];

  const activeSubscriptions = safeSubscriptions.filter(
    (subscription: any) =>
      subscription.status === "active" ||
      subscription.status === "trialing"
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-100">
            {organization.name}
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Organization ID: {organization.id}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/organizations"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back
          </Link>

          <Link
            href={`/dashboard/admin/organizations/${organization.id}/discord`}
            className="rounded-lg border border-indigo-500/30 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-500/10"
          >
            Discord Settings
          </Link>

          <Link
            href={`/dashboard/admin/organizations/${organization.id}/members`}
            className="rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
          >
            Manage Members
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Members</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {safeMembers.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Subscriptions</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {safeSubscriptions.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Active Plans</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {activeSubscriptions.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Created</p>
          <p className="mt-2 text-lg font-semibold text-slate-100">
            {formatDate(organization.created_at)}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Organization Details
          </h2>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Name
            </p>
            <p className="mt-1 text-slate-100">{organization.name || "—"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Slug
            </p>
            <p className="mt-1 text-slate-100">{organization.slug || "—"}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Discord Invite
            </p>

            {organization.discord_invite_url ? (
              <a
                href={organization.discord_invite_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-sky-300 hover:underline"
              >
                {organization.discord_invite_url}
              </a>
            ) : (
              <p className="mt-1 text-slate-400">Not configured</p>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Created
            </p>
            <p className="mt-1 text-slate-100">
              {formatDate(organization.created_at)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Organization Members
          </h2>

          <Link
            href={`/dashboard/admin/organizations/${organization.id}/members`}
            className="text-sm text-sky-300 hover:text-sky-200"
          >
            View All →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Role</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {safeMembers.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No members found.
                  </td>
                </tr>
              ) : (
                safeMembers.slice(0, 10).map((member: any) => (
                  <tr key={member.id}>
                    <td className="px-5 py-4 text-slate-100">
                      {member.profiles?.full_name || "Unknown User"}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {member.profiles?.email || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                        {member.roles?.name || "member"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">Subscriptions</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Key</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Period End</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {safeSubscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                safeSubscriptions.map((subscription: any) => (
                  <tr key={subscription.id}>
                    <td className="px-5 py-4 text-slate-100">
                      {subscription.plans?.name || "Unknown Plan"}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {subscription.plans?.key || "—"}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                        {subscription.status}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {formatDate(subscription.current_period_end)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}