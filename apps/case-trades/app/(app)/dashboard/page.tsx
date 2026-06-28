import Link from "next/link";
import {
  Activity,
  BarChart3,
  BellRing,
  ShieldCheck,
  TrendingUp,
  Wallet,
  Building2,
} from "lucide-react";

import { getProfile } from "@/lib/getProfile";

export const dynamic = "force-dynamic";

function withOrgQuery(href: string, organizationSlug?: string | null) {
  if (!organizationSlug) return href;

  const separator = href.includes("?") ? "&" : "?";
  return `${href}${separator}org=${encodeURIComponent(organizationSlug)}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: {
    org?: string;
  };
}) {
  const profile = await getProfile({
    organizationSlug: searchParams?.org,
  });

  const currentOrganization = profile.current_organization;
  const organizationSlug = currentOrganization?.organization_slug ?? null;

  const isMasterAdmin =
    currentOrganization?.is_master_admin === true ||
    profile.roles?.[0]?.name === "master_admin" ||
    profile.roles?.[0]?.rank === 4 ||
    String(profile.email ?? "").toLowerCase() ===
      "csthilaire@xilairetechnologies.com";

  const hasSignalsAccess =
    isMasterAdmin ||
    (currentOrganization?.has_active_subscription === true &&
      currentOrganization?.has_discord_access === true);

  const hasJournalAccess =
    isMasterAdmin || currentOrganization?.has_active_subscription === true;

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-400">
          <Building2 className="h-4 w-4" />
          {currentOrganization?.organization_name ?? "No Organization Selected"}
        </p>

        <h1 className="text-2xl font-semibold text-slate-100">Dashboard</h1>

        <p className="text-sm text-slate-400">
          Trading intelligence and performance overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DashboardStat title="Active Signals" value="3" icon={<Activity />} />
        <DashboardStat title="Open P/L" value="OPEN" icon={<TrendingUp />} />
        <DashboardStat title="Win Rate" value="—" icon={<BarChart3 />} />
        <DashboardStat
          title="Plan"
          value={
            isMasterAdmin
              ? "Admin"
              : currentOrganization?.has_active_subscription
              ? "Active"
              : "Inactive"
          }
          icon={<Wallet />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCard
          icon={<Activity />}
          title="Trading Signals"
          description={
            hasSignalsAccess
              ? "View active and historical trade ideas for the selected organization."
              : "Subscribe and connect Discord to unlock trading signals for this organization."
          }
          href={
            hasSignalsAccess
              ? withOrgQuery("/dashboard/signals", organizationSlug)
              : withOrgQuery("/dashboard/products/signals", organizationSlug)
          }
          button={hasSignalsAccess ? "View Signals" : "Unlock Signals"}
        />

        <DashboardCard
          icon={<BarChart3 />}
          title="Performance"
          description={
            hasJournalAccess
              ? "Track trade results, win rate, and execution history."
              : "Unlock journal access to track performance for this organization."
          }
          href={
            hasJournalAccess
              ? withOrgQuery("/dashboard/performance", organizationSlug)
              : withOrgQuery("/dashboard/products/journal", organizationSlug)
          }
          button={hasJournalAccess ? "View Performance" : "Unlock Journal"}
        />

        <DashboardCard
          icon={<BellRing />}
          title="Discord Alerts"
          description="Send manual posts or automate signal delivery."
          href={withOrgQuery("/dashboard/admin/discord", organizationSlug)}
          button="Open Discord Sender"
        />

        <DashboardCard
          icon={<ShieldCheck />}
          title="Admin"
          description="Create and manage signals with execution rules."
          href={withOrgQuery("/dashboard/admin/signals", organizationSlug)}
          button="Manage Signals"
        />
      </div>
    </div>
  );
}

function DashboardStat({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-5">
      <div className="mb-3 text-emerald-400 [&>svg]:h-5 [&>svg]:w-5">
        {icon}
      </div>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function DashboardCard({
  icon,
  title,
  description,
  href,
  button,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  button: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>

      <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm text-slate-400">{description}</p>

      <Link
        href={href}
        className="mt-5 inline-flex rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        {button}
      </Link>
    </div>
  );
}