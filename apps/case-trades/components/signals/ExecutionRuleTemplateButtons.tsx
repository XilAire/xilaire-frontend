"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyExecutionTemplate } from "@/app/(app)/dashboard/signals/[signalId]/actions";
import { EXECUTION_RULE_TEMPLATES } from "@/lib/executionRuleTemplates";

type Props = {
  signalId: string;
};

type TemplateName = "SCALP" | "SWING" | "LEAP";
type TradeStyle = "scalp" | "swing" | "leap";

export default function ExecutionRuleTemplateButtons({
  signalId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function applyTemplate(template: TemplateName) {
    startTransition(async () => {
      const style = template.toLowerCase() as TradeStyle;
      const rules = EXECUTION_RULE_TEMPLATES[style].rules;

      try {
        await applyExecutionTemplate(signalId, rules);
        router.refresh();
      } catch (err: any) {
        console.error("Execution template failed", err);
        alert(err?.message ?? "Failed to apply execution template");
      }
    });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="mb-4 text-sm font-semibold uppercase text-slate-400">
        Apply Execution Template
      </h3>

      <div className="flex gap-3">
        <button
          disabled={isPending}
          onClick={() => applyTemplate("SCALP")}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Scalp
        </button>

        <button
          disabled={isPending}
          onClick={() => applyTemplate("SWING")}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply Swing
        </button>

        <button
          disabled={isPending}
          onClick={() => applyTemplate("LEAP")}
          className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Apply LEAP
        </button>
      </div>
    </div>
  );
}
