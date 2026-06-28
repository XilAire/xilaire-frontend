"use client";

import { useState } from "react";
import { supabaseCaseTrades } from "@/lib/supabase/client";

type RuleType = "STOP_LOSS" | "TAKE_PROFIT";

type ExecutionRule = {
  id?: string;
  rule_type: RuleType;
  value_pct?: number;
  quantity_pct?: number;
};

interface Props {
  signalId: string;
  rules: ExecutionRule[];
}

export default function ExecutionRulesEditor({
  signalId,
  rules,
}: Props) {
  const stopLossRule =
    rules.find((r) => r.rule_type === "STOP_LOSS") ?? null;

  const takeProfitRule =
    rules.find((r) => r.rule_type === "TAKE_PROFIT") ?? null;

  const [stopLossPct, setStopLossPct] = useState<number | "">(
    stopLossRule?.value_pct ?? ""
  );

  const [takeProfitPct, setTakeProfitPct] = useState<number | "">(
    takeProfitRule?.value_pct ?? ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* -------------------------------------------------
     SAVE / UPSERT RULE
  ------------------------------------------------- */
  async function saveRule(
    ruleType: RuleType,
    valuePct: number
  ) {
    const { error } = await supabaseCaseTrades
      .from("signal_execution_rules")
      .upsert(
        {
          signal_id: signalId,
          rule_type: ruleType,
          value_pct: valuePct,
          quantity_pct: 100,
          is_active: true,
        },
        {
          onConflict: "signal_id,rule_type",
        }
      );

    if (error) {
      throw error;
    }
  }

  /* -------------------------------------------------
     SAVE HANDLER
  ------------------------------------------------- */
  async function handleSave() {
    try {
      setSaving(true);
      setError(null);

      if (stopLossPct !== "") {
        await saveRule("STOP_LOSS", Number(stopLossPct));
      }

      if (takeProfitPct !== "") {
        await saveRule("TAKE_PROFIT", Number(takeProfitPct));
      }
    } catch (err) {
      setError("Failed to save execution rules");
    } finally {
      setSaving(false);
    }
  }

  /* -------------------------------------------------
     RENDER
  ------------------------------------------------- */
  return (
    <div className="space-y-4">
      {/* STOP LOSS */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Stop Loss (%)
        </label>
        <input
          type="number"
          value={stopLossPct}
          onChange={(e) =>
            setStopLossPct(
              e.target.value === ""
                ? ""
                : Number(e.target.value)
            )
          }
          className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
          placeholder="-30"
        />
      </div>

      {/* TAKE PROFIT */}
      <div className="space-y-1">
        <label className="text-sm font-medium">
          Take Profit (%)
        </label>
        <input
          type="number"
          value={takeProfitPct}
          onChange={(e) =>
            setTakeProfitPct(
              e.target.value === ""
                ? ""
                : Number(e.target.value)
            )
          }
          className="w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm"
          placeholder="100"
        />
      </div>

      {/* ACTIONS */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save Execution Rules"}
      </button>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
