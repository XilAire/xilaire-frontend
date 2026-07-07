import Link from "next/link";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Metadata } from "next";

/* -------------------------------------------------
   🧾 METADATA
------------------------------------------------- */
export const metadata: Metadata = {
  title: "Platform Settings | CASE Trades",
  description:
    "Configure global CASE Trades platform settings, system preferences, integrations, feature flags, security options, branding, and administrative controls.",
};

export const dynamic = "force-dynamic";

type SettingCard = {
  label: string;
  value: string;
  status: "ready" | "warning" | "missing";
  description: string;
};

function getSupabaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    ""
  );
}

function getSupabaseAnonKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
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

function getStripeSecretKey() {
  return (
    process.env.STRIPE_SECRET_KEY_CASE_TRADES ||
    process.env.STRIPE_SECRET_KEY ||
    ""
  );
}

function getStripeWebhookSecret() {
  return (
    process.env.STRIPE_WEBHOOK_SECRET_CASE_TRADES ||
    process.env.STRIPE_WEBHOOK_SECRET ||
    ""
  );
}

function getDiscordClientId() {
  return (
    process.env.DISCORD_CLIENT_ID_CASE_TRADES ||
    process.env.DISCORD_CLIENT_ID ||
    ""
  );
}

function getDiscordClientSecret() {
  return (
    process.env.DISCORD_CLIENT_SECRET_CASE_TRADES ||
    process.env.DISCORD_CLIENT_SECRET ||
    ""
  );
}

function getDiscordBotToken() {
  return (
    process.env.DISCORD_BOT_TOKEN_CASE_TRADES ||
    process.env.DISCORD_BOT_TOKEN ||
    ""
  );
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL_CASE_TRADES ||
    process.env.NEXT_PUBLIC_APP_URL ||
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

function maskSecret(value: string) {
  if (!value) return "Missing";
  if (value.length <= 8) return "Configured";

  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function statusClass(status: SettingCard["status"]) {
  if (status === "ready") {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (status === "warning") {
    return "bg-orange-500/10 text-orange-300";
  }

  return "bg-red-500/10 text-red-300";
}

function statusLabel(status: SettingCard["status"]) {
  if (status === "ready") return "Ready";
  if (status === "warning") return "Review";
  return "Missing";
}

export default async function AdminSettingsPage() {
  const supabaseUrl = getSupabaseUrl();
  const supabaseAnonKey = getSupabaseAnonKey();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  const stripeSecretKey = getStripeSecretKey();
  const stripeWebhookSecret = getStripeWebhookSecret();

  const discordClientId = getDiscordClientId();
  const discordClientSecret = getDiscordClientSecret();
  const discordBotToken = getDiscordBotToken();

  const appUrl = getAppUrl();

  let organizationCount = 0;
  let planCount = 0;
  let roleMappingCount = 0;
  let activeSubscriptionCount = 0;

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createAdminSupabaseClient();

    const [
      organizationsResult,
      plansResult,
      roleMappingsResult,
      subscriptionsResult,
    ] = await Promise.all([
      supabase.from("organizations").select("id", {
        count: "exact",
        head: true,
      }),
      supabase.from("plans").select("id", {
        count: "exact",
        head: true,
      }),
      supabase.from("organization_discord_roles").select("id", {
        count: "exact",
        head: true,
      }),
      supabase
        .from("subscriptions")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("status", "active"),
    ]);

    organizationCount = organizationsResult.count ?? 0;
    planCount = plansResult.count ?? 0;
    roleMappingCount = roleMappingsResult.count ?? 0;
    activeSubscriptionCount = subscriptionsResult.count ?? 0;
  }

  const settings: SettingCard[] = [
    {
      label: "Supabase URL",
      value: supabaseUrl || "Missing",
      status: supabaseUrl ? "ready" : "missing",
      description: "Primary CASE Trades database endpoint.",
    },
    {
      label: "Supabase Anon Key",
      value: maskSecret(supabaseAnonKey),
      status: supabaseAnonKey ? "ready" : "missing",
      description: "Public Supabase client key used by server/client auth.",
    },
    {
      label: "Supabase Service Role",
      value: maskSecret(serviceRoleKey),
      status: serviceRoleKey ? "ready" : "missing",
      description: "Private admin key used only on trusted server routes.",
    },
    {
      label: "Stripe Secret Key",
      value: maskSecret(stripeSecretKey),
      status: stripeSecretKey ? "ready" : "missing",
      description: "Stripe server key used for checkout and subscription APIs.",
    },
    {
      label: "Stripe Webhook Secret",
      value: maskSecret(stripeWebhookSecret),
      status: stripeWebhookSecret ? "ready" : "warning",
      description: "Required for production subscription lifecycle events.",
    },
    {
      label: "Discord Client ID",
      value: discordClientId || "Missing",
      status: discordClientId ? "ready" : "missing",
      description: "Discord OAuth application ID.",
    },
    {
      label: "Discord Client Secret",
      value: maskSecret(discordClientSecret),
      status: discordClientSecret ? "ready" : "missing",
      description: "Discord OAuth secret used for account connection.",
    },
    {
      label: "Discord Bot Token",
      value: maskSecret(discordBotToken),
      status: discordBotToken ? "ready" : "warning",
      description: "Required for automated Discord role assignment.",
    },
    {
      label: "Application URL",
      value: appUrl || "Missing",
      status: appUrl ? "ready" : "warning",
      description: "Base URL used for redirects, callbacks, and webhooks.",
    },
  ];

  const missingCount = settings.filter((item) => item.status === "missing")
    .length;

  const warningCount = settings.filter((item) => item.status === "warning")
    .length;

  const readyCount = settings.filter((item) => item.status === "ready").length;

  const productionReady = missingCount === 0 && warningCount === 0;

  return (
    <main className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-sky-300">
            Platform Administration
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-100">
            Platform Settings
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Review internal CASE Trades platform configuration, environment
            readiness, and production setup status.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/admin/organizations"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Organizations
          </Link>

          <Link
            href="/dashboard/admin/customers"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
          >
            Customers
          </Link>
        </div>
      </div>

      <section
        className={
          "rounded-xl border p-5 " +
          (productionReady
            ? "border-emerald-500/20 bg-emerald-500/10"
            : missingCount > 0
            ? "border-red-500/20 bg-red-500/10"
            : "border-orange-500/20 bg-orange-500/10")
        }
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p
              className={
                "text-sm font-medium " +
                (productionReady
                  ? "text-emerald-300"
                  : missingCount > 0
                  ? "text-red-300"
                  : "text-orange-300")
              }
            >
              Platform Readiness
            </p>

            <h2
              className={
                "mt-1 text-2xl font-bold " +
                (productionReady
                  ? "text-emerald-100"
                  : missingCount > 0
                  ? "text-red-100"
                  : "text-orange-100")
              }
            >
              {productionReady
                ? "Production Ready"
                : missingCount > 0
                ? "Missing Required Configuration"
                : "Needs Production Review"}
            </h2>

            <p className="mt-2 max-w-3xl text-sm text-slate-300">
              {productionReady
                ? "All required platform services are configured."
                : missingCount > 0
                ? "One or more required services are missing. Review the configuration table below before launching."
                : "Core services are configured, but one or more production-level settings should be reviewed before launch."}
            </p>
          </div>

          <div className="grid gap-2 text-sm sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-slate-400">Ready</p>
              <p className="mt-1 text-xl font-bold text-emerald-300">
                {readyCount}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-slate-400">Review</p>
              <p className="mt-1 text-xl font-bold text-orange-300">
                {warningCount}
              </p>
            </div>

            <div className="rounded-lg border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-slate-400">Missing</p>
              <p className="mt-1 text-xl font-bold text-red-300">
                {missingCount}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Organizations</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {organizationCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Plans</p>
          <p className="mt-2 text-2xl font-bold text-slate-100">
            {planCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Discord Role Mappings</p>
          <p className="mt-2 text-2xl font-bold text-indigo-300">
            {roleMappingCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
          <p className="text-sm text-slate-400">Active Subscriptions</p>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {activeSubscriptionCount}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/80">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold text-slate-100">
            Environment Configuration
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Read-only status of critical CASE Trades environment variables.
            Secrets are masked.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Setting</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Description</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {settings.map((setting) => (
                <tr key={setting.label} className="hover:bg-white/[0.03]">
                  <td className="px-5 py-4 font-medium text-slate-100">
                    {setting.label}
                  </td>

                  <td className="px-5 py-4">
                    <code className="rounded bg-slate-950 px-2 py-1 text-xs text-sky-300">
                      {setting.value}
                    </code>
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass(
                        setting.status
                      )}`}
                    >
                      {statusLabel(setting.status)}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-400">
                    {setting.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
        <h2 className="font-semibold text-slate-100">Platform Scope</h2>

        <p className="mt-2 text-sm text-slate-400">
          This page is for CASE Trades internal SaaS administration only.
          Customer organization settings live under organization management and
          customer-facing organization pages.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <p className="font-medium text-slate-100">Platform Settings</p>
            <p className="mt-1 text-sm text-slate-400">
              Internal CASE Trades infrastructure, Stripe, Discord OAuth, and
              environment status.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <p className="font-medium text-slate-100">
              Organization Settings
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Tenant-level Discord, members, products, and role mappings.
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4">
            <p className="font-medium text-slate-100">Customer Settings</p>
            <p className="mt-1 text-sm text-slate-400">
              Billing, subscriptions, Discord connection, and product access.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}