"use client";

import { useState } from "react";

export default function RiskPanel({
  signal,
  rules,
}: {
  signal: any;
  rules: any[];
}) {
  const stopLoss = rules.find((r) => r.rule_type === "STOP_LOSS");
  const takeProfit = rules.find((r) => r.rule_type === "TAKE_PROFIT");

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900 p-6">
      <h3 className="mb-4 text-lg font-medium text-slate-100">
        Risk Overview
      </h3>

      <div className="space-y-3 text-sm">
        {/* ENTRY */}
        <Row
          label="Entry"
          value={signal.entry_price}
          valueClass="text-slate-200"
        />

        {/* STOP LOSS */}
        <EditableRow
          label="Stop Loss"
          prefix="-"
          value={stopLoss?.value_pct}
          valueClass="text-red-400"
        />

        {/* TAKE PROFIT */}
        <EditableRow
          label="Take Profit"
          prefix="+"
          value={takeProfit?.value_pct}
          valueClass="text-emerald-400"
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------
   STATIC ROW
------------------------------------------------- */
function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: any;
  valueClass: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-medium ${valueClass}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

/* -------------------------------------------------
   INLINE EDIT ROW (UI ONLY — NO SERVER YET)
------------------------------------------------- */
function EditableRow({
  label,
  prefix,
  value,
  valueClass,
}: {
  label: string;
  prefix: string;
  value?: number;
  valueClass: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(
    value?.toString() ?? ""
  );

  return (
    <div className="flex justify-between items-center">
      <span className="text-slate-400">{label}</span>

      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-20 rounded-md border border-white/10 bg-slate-800 px-2 py-1 text-slate-100"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
          />
          <span className="text-slate-400">%</span>

          <button
            onClick={() => setIsEditing(false)}
            className="text-xs text-slate-400 hover:underline"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              // ⛔ server action will be wired next step
              setIsEditing(false);
            }}
            className="text-xs text-emerald-400 hover:underline"
          >
            Save
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsEditing(true)}
          className={`font-medium ${valueClass} hover:underline`}
        >
          {value != null ? `${prefix}${value}%` : "—"}
        </button>
      )}
    </div>
  );
}
