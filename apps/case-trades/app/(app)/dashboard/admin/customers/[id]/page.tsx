import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

import { resolveCurrentUserRole } from "@/lib/auth/resolveCurrentUserRole";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Customer Details | CASE Trades",
  description:
    "View and manage CASE Trades customer details, subscriptions, organizations, Discord account status, and platform role administration.",
};

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    id: string;
  };
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

function canManageRoles(
  role: Awaited<ReturnType<typeof resolveCurrentUserRole>>,
) {
  return isMasterAdmin(role) || Number(role?.role_rank ?? 0) >= 2;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function statusBadge(status: string | null | undefined) {
  if (!status) {
    return "rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400";
  }

  if (status === "active" || status === "trialing") {
    return "rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300";
  }

  if (status === "past_due" || status === "unpaid") {
    return "rounded-full bg-orange-500/10 px-2 py-1 text-xs text-orange-300";
  }

  if (status === "canceled" || status === "cancelled") {
    return "rounded-full bg-red-500/10 px-2 py-1 text-xs text-red-300";
  }

  return "rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300";
}

function roleBadgeClass(roleName: string | null | undefined) {
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

function formatRole(value: string | null | undefined) {
  if (!value) return "User";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
  const currentUserCanManageRoles = canManageRoles(currentRole);

  if (!currentUserCanManageRoles) {
    throw new Error("You do not have permission to manage customer roles.");
  }

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

  const { data: currentCustomerProfile, error: currentCustomerProfileError } =
    await adminSupabase
      .from("profiles")
      .select(
        `
        id,
        role_id,
        roles (
          id,
          name,
          rank
        )
        `,
      )
      .eq("id", profileId)
      .maybeSingle();

  if (currentCustomerProfileError) {
    throw new Error(
      `Failed to load current customer role: ${currentCustomerProfileError.message}`,
    );
  }

  const currentCustomerRole = Array.isArray(currentCustomerProfile?.roles)
    ? currentCustomerProfile?.roles[0]
    : currentCustomerProfile?.roles;

  if (currentCustomerRole?.name === "master_admin" && !currentUserIsMasterAdmin) {
    throw new Error("Only a master admin can change a master_admin user.");
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
  revalidatePath(`/dashboard/admin/customers/${profileId}`);
}

export default async function AdminCustomerDetailsPage({ params }: PageProps) {
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
            Customer Details
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Missing Supabase environment variables. Confirm
            NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES and
            SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES exist in .env.local.
          </p>

          <Link
            href="/dashboard/admin/customers"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  const currentRole = await resolveCurrentUserRole();
  const currentUserIsMasterAdmin = isMasterAdmin(currentRole);
  const currentUserCanManageRoles = canManageRoles(currentRole);

  const supabase = createAdminSupabaseClient();

  const { data: rolesData, error: rolesError } = await supabase
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
            Customer Details
          </h1>

          <p className="mt-2 text-sm text-red-300">
            Failed to load roles: {rolesError.message}
          </p>

          <Link
            href="/dashboard/admin/customers"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  const roles = (rolesData ?? []) as RoleRow[];

  const selectableRoles = roles.filter((availableRole) => {
    if (availableRole.name === "master_admin") {
      return currentUserIsMasterAdmin;
    }

    return true;
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, role_id")
    .eq("id", params.id)
    .maybeSingle();

  const { data: authUserResult } = await supabase.auth.admin.getUserById(
    params.id,
  );

  const authUser = authUserResult?.user ?? null;

  if (profileError || (!profile && !authUser)) {
    return (
      <main className="space-y-6">
        <div>
          <p className="text-sm font-medium text-red-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-slate-100">
            Customer Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            No customer was found for ID: {params.id}
          </p>

          <Link
            href="/dashboard/admin/customers"
            className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Customers
          </Link>
        </div>
      </main>
    );
  }

  const userId = profile?.id || authUser?.id || params.id;

  const { data: role } = profile?.role_id
    ? await supabase
        .from("roles")
        .select("id, name, rank")
        .eq("id", profile.role_id)
        .maybeSingle()
    : { data: null };

  const roleIsMasterAdmin = role?.name === "master_admin";
  const canEditCustomerRole =
    currentUserCanManageRoles && (!roleIsMasterAdmin || currentUserIsMasterAdmin);

  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select(
      `
      id,
      status,
      current_period_end,
      created_at,
      plan_id,
      organization_id,
      stripe_customer_id,
      stripe_subscription_id
    `,
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const safeSubscriptions = Array.isArray(subscriptions)
    ? subscriptions
    : [];

  const planIds = safeSubscriptions
    .map((subscription: any) => subscription.plan_id)
    .filter(Boolean);

  const organizationIds = safeSubscriptions
    .map((subscription: any) => subscription.organization_id)
    .filter(Boolean);

  const { data: plans } =
    planIds.length > 0
      ? await supabase
          .from("plans")
          .select("id, key, name")
          .in("id", planIds)
      : { data: [] };

  const { data: organizations } =
    organizationIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name, slug")
          .in("id", organizationIds)
      : { data: [] };

  const planById = new Map((plans ?? []).map((plan: any) => [plan.id, plan]));

  const organizationById = new Map(
    (organizations ?? []).map((organization: any) => [
      organization.id,
      organization,
    ]),
  );

  const { data: discordAccount } = await supabase
    .from("discord_accounts")
    .select("id, user_id, discord_user_id, discord_username, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: organizationMemberships } = await supabase
    .from("organization_members")
    .select("id, organization_id, user_id, role, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  const safeMemberships = Array.isArray(organizationMemberships)
    ? organizationMemberships
    : [];

  const membershipOrganizationIds = safeMemberships
    .map((membership: any) => membership.organization_id)
    .filter(Boolean);

  const { data: membershipOrganizations } =
    membershipOrganizationIds.length > 0
      ? await supabase
          .from("organizations")
          .select("id, name, slug")
          .in("id", membershipOrganizationIds)
      : { data: [] };

  const membershipOrganizationById = new Map(
    (membershipOrganizations ?? []).map((organization: any) => [
      organization.id,
      organization,
    ]),
  );

  const activeSubscriptions = safeSubscriptions.filter(
    (subscription: any) =>
      subscription.status === "active" ||
      subscription.status === "trialing",
  );

  const primarySubscription =
    activeSubscriptions[0] || safeSubscriptions[0] || null;

  const primaryPlan = primarySubscription
    ? planById.get(primarySubscription.plan_id)
    : null;

  const primaryOrganization = primarySubscription
    ? organizationById.get(primarySubscription.organization_id)
    : null;

  const email = profile?.email || authUser?.email || "No email";
  const fullName = profile?.full_name || "Unnamed Customer";
  const createdAt = profile?.created_at || authUser?.created_at || null;

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-100">
            {fullName}
          </h1>

          <p className="mt-2 text-sm text-slate-400">{email}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/customers"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Back to Customers
          </Link>

          {discordAccount?.discord_user_id ? (
            <Link
              href={`/api/discord/sync-roles?user_id=${userId}`}
              className="rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10"
            >
              Force Discord Sync
            </Link>
          ) : (
            <span className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-600">
              Discord Not Connected
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Subscription</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {primarySubscription?.status || "None"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Plan</p>
          <p className="mt-2 truncate text-xl font-bold text-slate-100">
            {primaryPlan?.name || primaryPlan?.key || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Organization</p>
          <p className="mt-2 truncate text-xl font-bold text-slate-100">
            {primaryOrganization?.name || "—"}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Discord</p>
          <p
            className={
              "mt-2 text-2xl font-bold " +
              (discordAccount?.discord_user_id
                ? "text-emerald-300"
                : "text-slate-500")
            }
          >
            {discordAccount?.discord_user_id ? "Connected" : "Missing"}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">Customer Profile</h2>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              User ID
            </p>
            <p className="mt-1 break-all text-slate-100">{userId}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Email
            </p>
            <p className="mt-1 text-slate-100">{email}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Full Name
            </p>
            <p className="mt-1 text-slate-100">{fullName}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Platform Role
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={roleBadgeClass(role?.name)}>
                {formatRole(role?.name)}
              </span>

              {role?.rank ? (
                <span className="rounded-full border border-white/10 bg-slate-950 px-2 py-1 text-xs font-medium text-slate-500">
                  Rank {role.rank}
                </span>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Change Platform Role
            </p>

            <div className="mt-2">
              {canEditCustomerRole ? (
                <form
                  action={updateCustomerRole}
                  className="flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="profileId" value={userId} />

                  <select
                    name="roleName"
                    defaultValue={role?.name || "user"}
                    className="rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-300 outline-none transition hover:bg-slate-900 focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/10"
                  >
                    {selectableRoles.map((availableRole) => (
                      <option key={availableRole.id} value={availableRole.name}>
                        {formatRole(availableRole.name)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="submit"
                    className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
                  >
                    Save Role
                  </button>
                </form>
              ) : roleIsMasterAdmin ? (
                <div>
                  <span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300">
                    Master Admin Locked
                  </span>

                  <p className="mt-2 text-xs text-slate-500">
                    Only a master admin can change this role.
                  </p>
                </div>
              ) : (
                <div>
                  <span className="rounded-full border border-white/10 bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-500">
                    Role Editing Locked
                  </span>

                  <p className="mt-2 text-xs text-slate-500">
                    Your account does not have permission to manage customer
                    roles.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Created
            </p>
            <p className="mt-1 text-slate-100">{formatDate(createdAt)}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Last Sign In
            </p>
            <p className="mt-1 text-slate-100">
              {formatDate(authUser?.last_sign_in_at)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">Discord Account</h2>
        </div>

        <div className="grid gap-6 p-5 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Status
            </p>

            {discordAccount?.discord_user_id ? (
              <span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">
                Connected
              </span>
            ) : (
              <span className="mt-2 inline-flex rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-400">
                Not Connected
              </span>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Discord Username
            </p>
            <p className="mt-1 text-slate-100">
              {discordAccount?.discord_username || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Discord User ID
            </p>
            <p className="mt-1 break-all text-slate-100">
              {discordAccount?.discord_user_id || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Connected Date
            </p>
            <p className="mt-1 text-slate-100">
              {formatDate(discordAccount?.created_at)}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">Subscriptions</h2>

          <p className="mt-1 text-sm text-slate-400">
            Customer subscription history and connected Stripe records.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Current Period End</th>
                <th className="px-5 py-3">Stripe Customer</th>
                <th className="px-5 py-3">Stripe Subscription</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {safeSubscriptions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No subscriptions found.
                  </td>
                </tr>
              ) : (
                safeSubscriptions.map((subscription: any) => {
                  const subscriptionPlan = planById.get(subscription.plan_id);
                  const subscriptionOrganization = organizationById.get(
                    subscription.organization_id,
                  );

                  return (
                    <tr key={subscription.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <p className="text-slate-100">
                          {subscriptionPlan?.name || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {subscriptionPlan?.key || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-slate-100">
                          {subscriptionOrganization?.name || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {subscriptionOrganization?.slug || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <span className={statusBadge(subscription.status)}>
                          {subscription.status || "none"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(subscription.current_period_end)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        <span className="break-all text-xs">
                          {subscription.stripe_customer_id || "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        <span className="break-all text-xs">
                          {subscription.stripe_subscription_id || "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Organization Memberships
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Workspaces this customer belongs to.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Membership Role</th>
                <th className="px-5 py-3">Joined</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {safeMemberships.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-5 py-8 text-center text-slate-400"
                  >
                    No organization memberships found.
                  </td>
                </tr>
              ) : (
                safeMemberships.map((membership: any) => {
                  const membershipOrganization = membershipOrganizationById.get(
                    membership.organization_id,
                  );

                  return (
                    <tr key={membership.id} className="hover:bg-white/[0.03]">
                      <td className="px-5 py-4">
                        <p className="text-slate-100">
                          {membershipOrganization?.name || "—"}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {membershipOrganization?.slug || ""}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatRole(membership.role)}
                      </td>

                      <td className="px-5 py-4 text-slate-300">
                        {formatDate(membership.created_at)}
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