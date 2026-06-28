import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import SignalSummaryCard from "../components/SignalSummaryCard";
import RiskPanel from "../components/RiskPanel";
import ExecutionRulesTable from "../components/ExecutionRulesTable";

export const dynamic = "force-dynamic";

export default async function SignalDetailPage({
  params,
}: {
  params: { signalId: string };
}) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_CASE_TRADES!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_TRADES!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  /* -------------------------------------------------
     LOAD SIGNAL (AUTHORITATIVE)
  ------------------------------------------------- */
  const { data: signal, error } = await supabase
    .from("signals")
    .select(`
      id,
      asset,
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
    `)
    .eq("id", params.signalId)
    .single();

  if (error || !signal) {
    notFound();
  }

  /* -------------------------------------------------
     LOAD EXECUTION RULES
  ------------------------------------------------- */
  const { data: rules } = await supabase
    .from("signal_execution_rules")
    .select(`
      id,
      rule_type,
      value_pct,
      quantity_pct,
      is_active
    `)
    .eq("signal_id", signal.id)
    .eq("is_active", true)
    .order("rule_type");

  return (
    <div className="space-y-6">
      <SignalSummaryCard signal={signal} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RiskPanel signal={signal} rules={rules ?? []} />
        <ExecutionRulesTable rules={rules ?? []} />
      </div>
    </div>
  );
}
