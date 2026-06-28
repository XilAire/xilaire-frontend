import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: {
    org?: string;
    connect?: string;
    refresh_connect?: string;
  };
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  stripe_connect_account_id: string | null;
  stripe_connect_onboarding_complete: boolean | null;
  stripe_connect_charges_enabled: boolean | null;
  stripe_connect_payouts_enabled: boolean | null;
  platform_fee_percent: number | null;
};

type RoleRow = {
  name: string;
  rank: number;
};

type MembershipRow = {
  role: string | null;
  active: boolean | null;
  organization_id: string;
  organization:
    | OrganizationRow
    | OrganizationRow[]
    | null;
};

function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_CASE_TRADES!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}

function normalizeSingle<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

export default async function OrganizationBillingPage({
  searchParams,
}: PageProps) {
  const authSupabase = createSupabaseServerClient();
  const serviceSupabase = createServiceSupabaseClient();

  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const { data: profile, error: profileError } = await serviceSupabase
    .from("profiles")
    .select(
      `
      id,
      email,
      role_id,
      roles:roles!profiles_role_id_fkey (
        name,
        rank
      )
      `
    )
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/auth/signin");
  }

  const profileRole = normalizeSingle((profile as any).roles) as RoleRow | null;

  const isMasterAdmin =
    profileRole?.name === "master_admin" ||
    Number(profileRole?.rank ?? 0) >= 4 ||
    String(profile.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com";

  const selectedOrgSlug = searchParams?.org ?? null;

  let organization: OrganizationRow | null = null;
  let membership: MembershipRow | null = null;

  if (selectedOrgSlug) {
    const { data: organizationData, error: organizationError } =
      await serviceSupabase
        .from("organizations")
        .select(
          `
          id,
          name,
          slug,
          stripe_connect_account_id,
          stripe_connect_onboarding_complete,
          stripe_connect_charges_enabled,
          stripe_connect_payouts_enabled,
          platform_fee_percent
          `
        )
        .eq("slug", selectedOrgSlug)
        .maybeSingle();

    if (organizationError || !organizationData) {
      redirect("/dashboard");
    }

    organization = organizationData as OrganizationRow;

    const { data: membershipData, error: membershipError } =
      await serviceSupabase
        .from("organization_members")
        .select(
          `
          role,
          active,
          organization_id
          `
        )
        .eq("user_id", user.id)
        .eq("organization_id", organization.id)
        .eq("active", true)
        .maybeSingle();

    if (membershipError) {
      redirect("/dashboard");
    }

    membership = membershipData
      ? ({
          ...membershipData,
          organization,
        } as MembershipRow)
      : null;
  } else {
    const { data: membershipData, error: membershipError } =
      await serviceSupabase
        .from("organization_members")
        .select(
          `
          role,
          active,
          organization_id,
          organization:organizations (
            id,
            name,
            slug,
            stripe_connect_account_id,
            stripe_connect_onboarding_complete,
            stripe_connect_charges_enabled,
            stripe_connect_payouts_enabled,
            platform_fee_percent
          )
          `
        )
        .eq("user_id", user.id)
        .eq("active", true)
        .limit(1)
        .maybeSingle();

    if (membershipError || !membershipData) {
      redirect("/dashboard");
    }

    membership = membershipData as MembershipRow;
    organization = normalizeSingle(membership.organization);
  }

  if (!organization) {
    redirect("/dashboard");
  }

  const canManageBilling =
    isMasterAdmin ||
    ["owner", "admin"].includes(String(membership?.role ?? "").toLowerCase());

  if (!canManageBilling) {
    redirect("/dashboard");
  }

  const connectReady =
    Boolean(organization.stripe_connect_account_id) &&
    Boolean(organization.stripe_connect_onboarding_complete) &&
    Boolean(organization.stripe_connect_charges_enabled) &&
    Boolean(organization.stripe_connect_payouts_enabled);

  const connectStarted = Boolean(organization.stripe_connect_account_id);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-400">Organization Billing</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-100">
          {organization.name}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Connect Stripe Express so your organization can sell subscriptions on
          CASE Trades, receive payouts, and allow CASE to automatically collect
          the platform fee.
        </p>
      </div>

      {searchParams?.connect === "success" && (
        <Notice
          tone="emerald"
          title="Stripe Connect onboarding returned"
          body="We received your return from Stripe. Refresh your account status to confirm charges and payouts are enabled."
        />
      )}

      {searchParams?.refresh_connect === "true" && (
        <Notice
          tone="orange"
          title="Stripe Connect onboarding needs attention"
          body="Stripe asked you to restart onboarding. Click Complete Onboarding to continue."
        />
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <StatusCard
          icon={<ShieldCheck />}
          title="Onboarding"
          active={Boolean(organization.stripe_connect_onboarding_complete)}
          activeText="Complete"
          inactiveText={connectStarted ? "In progress" : "Not started"}
        />

        <StatusCard
          icon={<CreditCard />}
          title="Charges"
          active={Boolean(organization.stripe_connect_charges_enabled)}
          activeText="Enabled"
          inactiveText="Disabled"
        />

        <StatusCard
          icon={<Wallet />}
          title="Payouts"
          active={Boolean(organization.stripe_connect_payouts_enabled)}
          activeText="Enabled"
          inactiveText="Disabled"
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">
              Stripe Express Account
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Stripe Express handles bank account collection, identity
              verification, tax information, and payouts for your organization.
            </p>

            <div className="mt-4 rounded-lg border border-white/10 bg-slate-950 p-4">
              <p className="text-sm text-slate-400">Platform fee</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-400">
                {organization.platform_fee_percent ?? 20}%
              </p>
              <p className="mt-1 text-xs text-slate-500">
                CASE Trades collects this percentage automatically from each
                subscription payment before the remainder is paid to your
                organization.
              </p>
            </div>
          </div>

          <div className="w-full space-y-3 md:w-72">
            {!connectStarted && (
              <form action="/api/stripe/connect/create-account" method="post">
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  Connect Stripe
                  <ExternalLink className="h-4 w-4" />
                </button>
              </form>
            )}

            {connectStarted && !connectReady && (
              <form action="/api/stripe/connect/create-account" method="post">
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
                  Complete Onboarding
                  <ExternalLink className="h-4 w-4" />
                </button>
              </form>
            )}

            {connectStarted && (
              <form action="/api/stripe/connect/refresh-account" method="post">
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-sky-500/30 px-4 py-2 text-sm font-medium text-sky-300 hover:bg-sky-500/10">
                  Refresh Status
                  <RefreshCw className="h-4 w-4" />
                </button>
              </form>
            )}

            {connectReady && (
              <form action="/api/stripe/connect/dashboard-link" method="post">
                <input
                  type="hidden"
                  name="organization_id"
                  value={organization.id}
                />
                <button className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/10">
                  Open Stripe Dashboard
                  <ExternalLink className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {!connectReady && (
        <Notice
          tone="orange"
          title="Organization cannot sell yet"
          body="Complete Stripe onboarding and enable both charges and payouts before this organization can receive subscription revenue."
        />
      )}

      {connectReady && (
        <Notice
          tone="emerald"
          title="Organization ready to sell"
          body="Stripe Connect is fully enabled. Products from this organization can now collect payments and receive payouts."
        />
      )}

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <h2 className="text-lg font-semibold text-slate-100">Revenue Flow</h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <FlowStep
            number="1"
            title="Customer pays"
            body="A customer subscribes to one of this organization's CASE Trades products."
          />

          <FlowStep
            number="2"
            title="CASE collects fee"
            body={`CASE Trades automatically keeps ${
              organization.platform_fee_percent ?? 20
            }% as the platform fee.`}
          />

          <FlowStep
            number="3"
            title="Org gets payout"
            body="Stripe sends the remaining balance to the organization's connected bank account."
          />
        </div>
      </section>
    </div>
  );
}

function Notice({
  tone,
  title,
  body,
}: {
  tone: "emerald" | "orange";
  title: string;
  body: string;
}) {
  const classes =
    tone === "emerald"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
      : "border-orange-500/20 bg-orange-500/10 text-orange-300";

  const icon =
    tone === "emerald" ? (
      <CheckCircle2 className="h-5 w-5" />
    ) : (
      <AlertTriangle className="h-5 w-5" />
    );

  return (
    <div className={`rounded-xl border p-5 ${classes}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{icon}</div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-slate-300">{body}</p>
        </div>
      </div>
    </div>
  );
}

function StatusCard({
  icon,
  title,
  active,
  activeText,
  inactiveText,
}: {
  icon: React.ReactNode;
  title: string;
  active: boolean;
  activeText: string;
  inactiveText: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 flex items-center gap-3">
        <div
          className={
            active
              ? "text-emerald-400 [&>svg]:h-5 [&>svg]:w-5"
              : "text-slate-500 [&>svg]:h-5 [&>svg]:w-5"
          }
        >
          {icon}
        </div>

        <h2 className="font-semibold text-slate-100">{title}</h2>
      </div>

      <p
        className={
          "text-sm " + (active ? "text-emerald-300" : "text-slate-400")
        }
      >
        {active ? activeText : inactiveText}
      </p>
    </div>
  );
}

function FlowStep({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-5">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-semibold text-emerald-300">
        {number}
      </div>

      <h3 className="font-semibold text-slate-100">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{body}</p>
    </div>
  );
}