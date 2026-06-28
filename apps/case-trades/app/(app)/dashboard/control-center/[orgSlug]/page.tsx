import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BarChart3,
  Building2,
  CreditCard,
  MessageSquare,
  Settings,
  Signal,
  Users,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageOrganization,
  canManageOrganizationBilling,
  canManageOrganizationSignals,
  getUserOrganizationRole,
} from "@/lib/orgs/getUserOrganizationRole";

export const dynamic = "force-dynamic";

type ControlCenterOrgPageProps = {
  params: {
    orgSlug: string;
  };
};

export default async function ControlCenterOrgPage({
  params,
}: ControlCenterOrgPageProps) {
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

  const { count: signalCount } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organization_id);

  const { count: planCount } = await supabase
    .from("plans")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organization_id);

  const { count: subscriberCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", access.organization_id)
    .in("status", ["active", "trialing"]);

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/dashboard/control-center"
          className="text-sm text-slate-400 hover:text-slate-200"
        >
          ← Back to Control Center
        </Link>

        <div className="mt-4 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
            <Building2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              {access.organization_name}
            </h1>
            <p className="text-sm text-slate-400">
              Organization Control Center • Role: {access.role}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <ControlStat title="Signals" value={String(signalCount ?? 0)} icon={<Signal />} />
        <ControlStat title="Subscribers" value={String(subscriberCount ?? 0)} icon={<Users />} />
        <ControlStat title="Plans" value={String(planCount ?? 0)} icon={<CreditCard />} />
        <ControlStat title="Analytics" value="Ready" icon={<BarChart3 />} />
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canManageOrganizationSignals(access.role) && (
          <ControlCard
            href={`/dashboard/control-center/${access.organization_slug}/signals`}
            title="Signals"
            description="Create, manage, and review this organization's trade signals."
            icon={<Signal />}
          />
        )}

        <ControlCard
          href={`/dashboard/control-center/${access.organization_slug}/subscribers`}
          title="Subscribers"
          description="View members with active subscriptions to this organization."
          icon={<Users />}
        />

        <ControlCard
          href={`/dashboard/control-center/${access.organization_slug}/analytics`}
          title="Analytics"
          description="Review signal performance, engagement, and growth metrics."
          icon={<BarChart3 />}
        />

        <ControlCard
          href={`/dashboard/control-center/${access.organization_slug}/discord`}
          title="Discord"
          description="Configure Discord routing, alert channels, and role access."
          icon={<MessageSquare />}
        />

        {canManageOrganizationBilling(access.role) && (
          <ControlCard
            href={`/dashboard/control-center/${access.organization_slug}/products`}
            title="Products & Plans"
            description="Manage products, pricing, subscription plans, and Stripe mappings."
            icon={<CreditCard />}
          />
        )}

        <ControlCard
          href={`/dashboard/control-center/${access.organization_slug}/settings`}
          title="Settings"
          description="Update organization profile, branding, slug, and visibility."
          icon={<Settings />}
        />
      </section>
    </div>
  );
}

function ControlStat({
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

function ControlCard({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-white/10 bg-slate-900/80 p-5 transition hover:border-emerald-500/40 hover:bg-slate-900"
    >
      <div className="mb-4 text-emerald-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon}
      </div>
      <h2 className="font-semibold text-slate-100">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </Link>
  );
}