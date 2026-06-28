export type ExecutionRule = {
  rule_type: "STOP_LOSS" | "TAKE_PROFIT";
  value_pct: number; // e.g. -30, +40
};

export function computeExecutionLevels(
  entryPrice: number,
  rules: ExecutionRule[]
) {
  return rules.map(rule => {
    if (rule.rule_type === "STOP_LOSS") {
      return {
        type: "STOP_LOSS" as const,
        price: entryPrice * (1 + rule.value_pct / 100),
      };
    }

    return {
      type: "TAKE_PROFIT" as const,
      price: entryPrice * (1 + rule.value_pct / 100),
    };
  });
}
