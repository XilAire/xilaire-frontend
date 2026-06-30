import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  PlusCircle,
  Signal,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageOrganizationSignals,
  getUserOrganizationRole,
} from "@/lib/orgs/getUserOrganizationRole";

export const dynamic = "force-dynamic";

type PageProps = {
  params: {
    orgSlug: string;
  };
};

type OrgSignal = {
  id: string;
  underlying: string;
  instrument_type: string;
  action: string;
  option_type: string | null;
  strike_price: number | null;
  expiration_date: string | null;
  entry_price: number | null;
  trade_style: string | null;
  confidence: number | null;
  status: string | null;
  created_at: string | null;
};

export default async function ControlCenterSignalsPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient();

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

  if (!access || !canManageOrganizationSignals(access.role)) {
    redirect("/dashboard/control-center");
  }

  const { data, error } = await supabase
    .from("signals")
    .select(
      `
      id,
      underlying,
      instrument_type,
      action,
      option_type,
      strike_price,
      expiration_date,
      entry_price,
      trade_style,
      confidence,
      status,
      created_at
    `
    )
    .eq("organization_id", access.organization_id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load organization signals", error);
    throw new Error("Failed to load organization signals.");
  }

  const signals = (data ?? []) as OrgSignal[];

  const activeSignals = signals.filter((signal) => signal.status === "Active");
  const closedSignals = signals.filter((signal) => signal.status === "Closed");

  const avgConfidence =
    signals.length > 0
      ? Math.round(
          signals.reduce(
            (sum, signal) => sum + Number(signal.confidence ?? 0),
            0
          ) / signals.length
        )
      : 0;

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

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Organization Signals
            </h1>
            <p className="text-sm text-slate-400">
              Manage signals for {access.organization_name}.
            </p>
          </div>

          <Link
            href={`/dashboard/master-admin/signals/create?org=${access.organization_slug}`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            <PlusCircle className="h-4 w-4" />
            Create Signal
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <SignalStat
          title="Total Signals"
          value={String(signals.length)}
          icon={<Signal />}
        />
        <SignalStat
          title="Active"
          value={String(activeSignals.length)}
          icon={<TrendingUp />}
        />
        <SignalStat
          title="Closed"
          value={String(closedSignals.length)}
          icon={<Target />}
        />
        <SignalStat
          title="Avg Confidence"
          value={`${avgConfidence}%`}
          icon={<BarChart3 />}
        />
      </div>

      <section className="rounded-xl border border-white/10 bg-slate-900/80 p-6">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Signal Directory
          </h2>
          <p className="text-sm text-slate-400">
            Review all signals attached to this organization.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-4 py-3">Signal</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Entry</th>
                <th className="px-4 py-3">Style</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10">
              {signals.map((signal) => (
                <tr key={signal.id} className="text-slate-300">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-100">
                      {signal.action} {signal.underlying}
                    </p>
                    {signal.instrument_type === "OPTION" && (
                      <p className="text-xs text-slate-500">
                        {signal.strike_price ?? "—"} {signal.option_type ?? ""}
                        {signal.expiration_date
                          ? ` • ${signal.expiration_date}`
                          : ""}
                      </p>
                    )}
                  </td>

                  <td className="px-4 py-3">{signal.instrument_type}</td>
                  <td className="px-4 py-3">
                    {formatMoney(signal.entry_price)}
                  </td>
                  <td className="px-4 py-3">
                    {signal.trade_style?.toUpperCase() ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {signal.confidence ?? 0}%
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "rounded-full px-2 py-1 text-xs " +
                        (signal.status === "Active"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-400")
                      }
                    >
                      {signal.status ?? "Unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {formatDate(signal.created_at)}
                  </td>
                </tr>
              ))}

              {signals.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No signals found for this organization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SignalStat({
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

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}