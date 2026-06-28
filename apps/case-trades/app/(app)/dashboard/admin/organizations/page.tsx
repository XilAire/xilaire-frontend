import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type OrganizationRow = {
  id: string;
  name: string | null;
  slug: string | null;
  discord_invite_url: string | null;
  created_at: string | null;
  member_count: number;
  subscription_count: number;
  active_subscription_count: number;
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

export default async function AdminOrganizationsPage() {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-red-300">
            Configuration Error
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organizations
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Missing Supabase environment variables. Confirm
            NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES and
            SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES exist in .env.local.
          </p>
        </div>
      </main>
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: organizations, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      slug,
      discord_invite_url,
      created_at,
      organization_members (
        id
      ),
      subscriptions (
        id,
        status
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-red-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organizations
          </h1>

          <p className="mt-2 text-sm text-red-300">
            Failed to load organizations: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const rows: OrganizationRow[] =
    organizations?.map((organization: any) => {
      const members = Array.isArray(organization.organization_members)
        ? organization.organization_members
        : [];

      const subscriptions = Array.isArray(organization.subscriptions)
        ? organization.subscriptions
        : [];

      return {
        id: organization.id,
        name: organization.name ?? null,
        slug: organization.slug ?? null,
        discord_invite_url: organization.discord_invite_url ?? null,
        created_at: organization.created_at ?? null,
        member_count: members.length,
        subscription_count: subscriptions.length,
        active_subscription_count: subscriptions.filter(
          (subscription: any) => subscription.status === "active"
        ).length,
      };
    }) ?? [];

  const totalMembers = rows.reduce((sum, row) => sum + row.member_count, 0);

  const totalActiveSubscriptions = rows.reduce(
    (sum, row) => sum + row.active_subscription_count,
    0
  );

  const discordConfiguredCount = rows.filter(
    (row) => row.discord_invite_url
  ).length;

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Organizations
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Manage tenant organizations, customer workspaces, Discord access,
            and subscription ownership across CASE Trades.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
            <Link
                href="/dashboard/admin/organizations/new"
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
            >
                + Create Organization
            </Link>

            <Link
                href="/dashboard/admin/customers"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
                Customers
            </Link>

            <Link
                href="/dashboard/admin"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
            >
                Admin Home
            </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Organizations</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {rows.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Members</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {totalMembers}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Active Subscriptions</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {totalActiveSubscriptions}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Discord Configured</p>
          <p className="mt-2 text-2xl font-bold text-indigo-300">
            {discordConfiguredCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Organization Directory
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            SaaS owner view for all organizations. Customer organization admins
            should manage their own workspace under organization settings.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Members</th>
                <th className="px-5 py-3">Subscriptions</th>
                <th className="px-5 py-3">Discord Invite</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    No organizations found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-100">
                          {row.name || "Unnamed Organization"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {row.id}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {row.slug || "—"}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {row.member_count}
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <p className="text-slate-300">
                          {row.subscription_count}
                        </p>

                        <p className="mt-1 text-xs text-emerald-300">
                          {row.active_subscription_count} active
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {row.discord_invite_url ? (
                        <div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                            Configured
                          </span>

                          <p className="mt-2 max-w-[260px] truncate text-xs text-slate-500">
                            {row.discord_invite_url}
                          </p>
                        </div>
                      ) : (
                        <span className="rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-300">
                          Missing
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {formatDate(row.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/organizations/${row.id}`}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                        >
                          View
                        </Link>

                        <Link
                          href={`/dashboard/admin/organizations/${row.id}/discord`}
                          className="rounded-lg border border-indigo-500/30 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/10"
                        >
                          Discord
                        </Link>
                      </div>
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