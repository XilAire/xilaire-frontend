import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Customer Management | CASE Trades",
  description:
    "Manage CASE Trades customers, accounts, subscriptions, organizations, licensing, and customer activity from the administrative dashboard.",
};

export const dynamic = "force-dynamic";

type CustomerRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
  role_name: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  plan_key: string | null;
  plan_name: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  discord_username: string | null;
  discord_user_id: string | null;
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

function statusBadge(status: string | null) {
  if (!status) {
    return "rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400";
  }

  if (status === "active") {
    return "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300";
  }

  if (status === "trialing") {
    return "rounded-full bg-sky-500/10 px-2 py-1 text-xs text-sky-300";
  }

  if (status === "past_due" || status === "unpaid") {
    return "rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-300";
  }

  if (status === "canceled" || status === "cancelled") {
    return "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300";
  }

  return "rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300";
}

export default async function AdminCustomersPage() {
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
            Customers
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

  const adminSupabase = createAdminSupabaseClient();

  const { data: authUsers } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const { data: customers, error } = await adminSupabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      created_at,
      roles (
        name
      ),
      subscriptions (
        status,
        current_period_end,
        plans (
          key,
          name
        ),
        organizations (
          name,
          slug
        )
      ),
      discord_accounts (
        discord_username,
        discord_user_id
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
            Customers
          </h1>

          <p className="mt-2 text-sm text-red-300">
            Failed to load customers: {error.message}
          </p>
        </div>
      </main>
    );
  }

  const rows: CustomerRow[] =
    customers?.map((customer: any) => {
      const authUser = authUsers?.users?.find(
        (item) => item.id === customer.id
      );

      const subscription = Array.isArray(customer.subscriptions)
        ? customer.subscriptions[0]
        : customer.subscriptions;

      const discordAccount = Array.isArray(customer.discord_accounts)
        ? customer.discord_accounts[0]
        : customer.discord_accounts;

      const customerRole = Array.isArray(customer.roles)
        ? customer.roles[0]
        : customer.roles;

      return {
        id: customer.id,
        email: customer.email ?? authUser?.email ?? null,
        full_name: customer.full_name ?? null,
        created_at: customer.created_at ?? authUser?.created_at ?? null,
        role_name: customerRole?.name ?? null,
        subscription_status: subscription?.status ?? null,
        current_period_end: subscription?.current_period_end ?? null,
        plan_key: subscription?.plans?.key ?? null,
        plan_name: subscription?.plans?.name ?? null,
        organization_name: subscription?.organizations?.name ?? null,
        organization_slug: subscription?.organizations?.slug ?? null,
        discord_username: discordAccount?.discord_username ?? null,
        discord_user_id: discordAccount?.discord_user_id ?? null,
      };
    }) ?? [];

  const activeCount = rows.filter(
    (row) => row.subscription_status === "active"
  ).length;

  const discordConnectedCount = rows.filter(
    (row) => row.discord_user_id
  ).length;

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Customers
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Manage CASE Trades customers, subscriptions, organizations, and
            Discord connection status.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Admin Home
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Total Customers</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {rows.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Active Subscriptions</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {activeCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Discord Connected</p>
          <p className="mt-2 text-2xl font-bold text-indigo-300">
            {discordConnectedCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Customer Directory
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            SaaS owner view only. Customer organization admins should use
            organization-level pages instead.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Period End</th>
                <th className="px-5 py-3">Discord</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    No customers found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.03]">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-medium text-slate-100">
                          {row.full_name || row.email || "Unnamed Customer"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {row.email || "No email"}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {row.role_name || "user"}
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <p className="text-slate-300">
                          {row.organization_name || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {row.organization_slug || ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        <p className="text-slate-300">
                          {row.plan_name || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {row.plan_key || ""}
                        </p>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className={statusBadge(row.subscription_status)}>
                        {row.subscription_status || "none"}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {formatDate(row.current_period_end)}
                    </td>

                    <td className="px-5 py-4">
                      {row.discord_user_id ? (
                        <div>
                          <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                            Connected
                          </span>

                          <p className="mt-2 text-xs text-slate-500">
                            {row.discord_username || row.discord_user_id}
                          </p>
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                          Not Connected
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-slate-300">
                      {formatDate(row.created_at)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/admin/customers/${row.id}`}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/5"
                        >
                          View
                        </Link>

                        {row.discord_user_id ? (
                          <Link
                            href={`/api/discord/sync-roles?user_id=${row.id}`}
                            className="rounded-lg border border-emerald-500/30 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-500/10"
                          >
                            Sync
                          </Link>
                        ) : (
                          <span className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-600">
                            Sync
                          </span>
                        )}
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