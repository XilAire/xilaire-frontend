import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BellRing,
  Hash,
  MessageSquare,
  Radio,
  ShieldCheck,
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

const DISCORD_CHANNELS = [
  "alerts",
  "option-scalps-swings-leaps-watchlist",
  "scalps-swings-leaps-watchlist",
  "stocks",
  "high-risk-play",
  "small-cap-challenge",
  "gains",
  "earnings",
  "news",
  "bot-commands",
];

export default async function ControlCenterDiscordPage({ params }: PageProps) {
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
            Discord Settings
          </h1>
          <p className="text-sm text-slate-400">
            Configure Discord routing and alert delivery for{" "}
            {access.organization_name}.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <DiscordStat title="Bot Status" value="Connected" icon={<Radio />} />
        <DiscordStat title="Alert Routing" value="Ready" icon={<BellRing />} />
        <DiscordStat title="Channels" value={String(DISCORD_CHANNELS.length)} icon={<Hash />} />
        <DiscordStat title="Roles" value="Premium" icon={<ShieldCheck />} />
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Channel Routing
          </h2>
          <p className="text-sm text-slate-400">
            These are the current CASE Trades Discord channels. Later this page
            will store channel IDs per organization.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {DISCORD_CHANNELS.map((channel) => (
            <div
              key={channel}
              className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-950 px-4 py-3"
            >
              <Hash className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-slate-300">{channel}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-4 text-emerald-400">
          <MessageSquare className="h-6 w-6" />
        </div>

        <h2 className="text-lg font-semibold text-slate-100">
          Coming Next
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          We will add per-organization Discord guild IDs, channel mappings,
          paid role mappings, and webhook sync so subscriptions automatically
          grant or remove Discord access.
        </p>
      </section>
    </div>
  );
}

function DiscordStat({
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