import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BarChart3,
  Signal,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageOrganization,
  getUserOrganizationRole,
} from "@/lib/orgs/getUserOrganizationRole";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    orgSlug: string;
  };
};

type SignalRow = {
  id: string;
  status: string | null;
  confidence: number | null;
  created_at: string | null;
};

export default async function ControlCenterAnalyticsPage({
  params,
}: PageProps) {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  const access = await getUserOrganizationRole({
    userId: user.id,
    organizationSlug: params.orgSlug,
  });

  if (!access || !canManageOrganization(access.role)) {
    redirect("/dashboard/control-center");
  }

  const { data: signalsData, error: signalsError } = await supabase
    .from("signals")
    .select("id, status, confidence, created_at")
    .eq("organization_id", access.organization_id);

  if (signalsError) {
    console.error("Failed to load analytics signals", signalsError);
    throw new Error("Failed to load analytics signals.");
  }

  const { count: subscriberCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organization_id)
    .in("status", ["active", "trialing"]);

  const signals = (signalsData ?? []) as SignalRow[];

  const totalSignals = signals.length;
  const activeSignals = signals.filter((s) => s.status === "Active").length;
  const closedSignals = signals.filter((s) => s.status === "Closed").length;

  const avgConfidence =
    totalSignals > 0
      ? Math.round(
          signals.reduce((sum, signal) => sum + Number(signal.confidence ?? 0), 0) /
            totalSignals
        )
      : 0;

  const signalsLast30Days = signals.filter((signal) => {
    if (!signal.created_at) return false;

    const createdAt = new Date(signal.created_at).getTime();
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    return createdAt >= thirtyDaysAgo;
  }).length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href={`/dashboard/control-center/${access.organization_slug}`}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {access.organization_name}
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-semibold text-slate-100">
            Analytics
          </h1>
          <p className="text-sm text-slate-400">
            Signal and subscriber analytics for {access.organization_name}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <AnalyticsStat title="Total Signals" value={String(totalSignals)} icon={<Signal />} />
        <AnalyticsStat title="Active Signals" value={String(activeSignals)} icon={<TrendingUp />} />
        <AnalyticsStat title="Closed Signals" value={String(closedSignals)} icon={<Target />} />
        <AnalyticsStat title="30D Signals" value={String(signalsLast30Days)} icon={<BarChart3 />} />
        <AnalyticsStat title="Subscribers" value={String(subscriberCount ?? 0)} icon={<Users />} />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Signal Health
          </h2>

          <div className="mt-5 space-y-3">
            <InfoRow label="Average Confidence" value={`${avgConfidence}%`} />
            <InfoRow label="Active Signal Ratio" value={formatPercent(activeSignals, totalSignals)} />
            <InfoRow label="Closed Signal Ratio" value={formatPercent(closedSignals, totalSignals)} />
            <InfoRow label="New Signals Last 30 Days" value={String(signalsLast30Days)} />
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-slate-100">
            Growth Snapshot
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Revenue analytics, churn, conversion rate, Discord engagement, and
            subscriber growth charts will be added after Stripe webhook sync is
            connected.
          </p>
        </div>
      </section>
    </div>
  );
}

function AnalyticsStat({
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-slate-100">{value}</span>
    </div>
  );
}

function formatPercent(part: number, total: number) {
  if (total === 0) return "0%";

  return `${Math.round((part / total) * 100)}%`;
}