import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

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
  role_id: string | null;
  role_name: string | null;
  role_rank: number | null;
  subscription_status: string | null;
  current_period_end: string | null;
  plan_key: string | null;
  plan_name: string | null;
  organization_name: string | null;
  organization_slug: string | null;
  discord_username: string | null;
  discord_user_id: string | null;
};

type RoleRow = {
  id: string;
  name: string;
  rank: number;
  created_at: string | null;
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

function isMasterAdmin(
  role: Awaited<ReturnType<typeof resolveCurrentUserRole>>,
) {
  return (
    role?.role_name === "master_admin" ||
    role?.role_rank === 4 ||
    String(role?.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com"
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatRoleLabel(value: string | null) {
  if (!value) {
    return "User";
  }

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function roleBadgeClass(roleName: string | null) {
  if (roleName === "master_admin") {
    return "rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-1 text-xs font-medium text-purple-300";
  }

  if (roleName === "super_admin") {
    return "rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-300";
  }

  if (roleName === "admin") {
    return "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300";
  }

  return "rounded-full border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300";
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

async function updateCustomerRole(formData: FormData) {
  "use server";

  const profileId = String(formData.get("profileId") ?? "").trim();
  const roleName = String(formData.get("roleName") ?? "").trim();

  if (!profileId || !roleName) {
    throw new Error("Missing profile or role.");
  }

  const currentRole = await resolveCurrentUserRole();
  const currentUserIsMasterAdmin = isMasterAdmin(currentRole);

  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service configuration.");
  }

  const adminSupabase = createAdminSupabaseClient();

  const { data: targetRole, error: targetRoleError } = await adminSupabase
    .from("roles")
    .select("id, name, rank")
    .eq("name", roleName)
    .maybeSingle<Pick<RoleRow, "id" | "name" | "rank">>();

  if (targetRoleError) {
    throw new Error(`Failed to load target role: ${targetRoleError.message}`);
  }

  if (!targetRole) {
    throw new Error("Selected role does not exist.");
  }

  if (targetRole.name === "master_admin" && !currentUserIsMasterAdmin) {
    throw new Error("Only a master admin can assign the master_admin role.");
  }

  const { error: updateError } = await adminSupabase
    .from("profiles")
    .update({
      role_id: targetRole.id,
    })
    .eq("id", profileId);

  if (updateError) {
    throw new Error(`Failed to update customer role: ${updateError.message}`);
  }

  revalidatePath("/dashboard/admin/customers");
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

  const currentRole = await resolveCurrentUserRole();
  const currentUserIsMasterAdmin = isMasterAdmin(currentRole);

  const adminSupabase = createAdminSupabaseClient();

  const { data: authUsers } = await adminSupabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  const { data: rolesData, error: rolesError } = await adminSupabase
    .from("roles")
    .select("id, name, rank, created_at")
    .order("rank", { ascending: true });

  if (rolesError) {
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
            Failed to load roles: {rolesError.message}
          </p>
        </div>
      </main>
    );
  }

  const roles = (rolesData ?? []) as RoleRow[];

  const selectableRoles = roles.filter((role) => {
    if (role.name === "master_admin") {
      return currentUserIsMasterAdmin;
    }

    return true;
  });

  const { data: customers, error } = await adminSupabase
    .from("profiles")
    .select(
      `
      id,
      email,
      full_name,
      created_at,
      role_id,
      roles (
        id,
        name,
        rank
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
    `,
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
        (item) => item.id === customer.id,
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
        role_id: customer.role_id ?? customerRole?.id ?? null,
        role_name: customerRole?.name ?? null,
        role_rank: customerRole?.rank ?? null,
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
    (row) => row.subscription_status === "active",
  ).length;

  const discordConnectedCount = rows.filter(
    (row) => row.discord_user_id,
  ).length;

  const adminCount = rows.filter((row) =>
    ["admin", "super_admin", "master_admin"].includes(row.role_name ?? ""),
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
            Manage CASE Trades customers, subscriptions, organizations, Discord
            connection status, and platform roles.
          </p>
        </div>

        <Link
          href="/dashboard/admin"
          className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
        >
          Admin Home
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
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
          <p className="text-sm text-slate-400">Platform Admins</p>
          <p className="mt-2 text-2xl font-bold text-sky-300">
            {adminCount}
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
            SaaS owner view only. Use the role selector to promote users to
            admin roles. The master_admin role is only available to existing
            master admins.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Change Role</th>
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
                    colSpan={10}
                    className="px-5 py-10 text-center text-slate-400"
                  >
                    No customers found.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const rowIsMasterAdmin = row.role_name === "master_admin";
                  const canEditRole =
                    !rowIsMasterAdmin || currentUserIsMasterAdmin;

                  return (
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

                      <td className="px-5 py-4">
                        <span className={roleBadgeClass(row.role_name)}>
                          {formatRoleLabel(row.role_name || "user")}
                        </span>

                        {row.role_rank ? (
                          <p className="mt-2 text-xs text-slate-500">
                            Rank {row.role_rank}
                          </p>
                        ) : null}
                      </td>

                      <td className="px-5 py-4">
                        {canEditRole ? (
                          <form
                            action={updateCustomerRole}
                            className="flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="hidden"
                              name="profileId"
                              value={row.id}
                            />

                            <select
                              name="roleName"
                              defaultValue={row.role_name || "user"}
                              className="rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 outline-none transition hover:bg-slate-900 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                            >
                              {selectableRoles.map((role) => (
                                <option key={role.id} value={role.name}>
                                  {formatRoleLabel(role.name)}
                                </option>
                              ))}
                            </select>

                            <button
                              type="submit"
                              className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <div>
                            <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300">
                              Master Admin Locked
                            </span>

                            <p className="mt-2 text-xs text-slate-500">
                              Only a master admin can change this role.
                            </p>
                          </div>
                        )}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}