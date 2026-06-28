import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

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

function formatRole(value: string | null | undefined) {
  if (!value) return "user";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminCustomerDetailsPage({ params }: PageProps) {
  const supabase = createAdminSupabaseClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, role_id")
    .eq("id", params.id)
    .maybeSingle();

  const { data: authUserResult } = await supabase.auth.admin.getUserById(
    params.id
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
    `
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
    ])
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
    ])
  );

  const activeSubscriptions = safeSubscriptions.filter(
    (subscription: any) =>
      subscription.status === "active" ||
      subscription.status === "trialing"
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
            <p className="mt-1 text-slate-100">{formatRole(role?.name)}</p>
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
    </main>
  );
}