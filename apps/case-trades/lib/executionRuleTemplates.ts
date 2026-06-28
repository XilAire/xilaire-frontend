export type ExecutionRuleTemplate = {
  name: "scalp" | "swing" | "leap";
  rules: Array<{
    rule_type:
      | "STOP_LOSS"
      | "TAKE_PROFIT"
      | "TRAILING_STOP"
      | "BREAKEVEN";
    value_pct?: number;
    quantity_pct?: number;
  }>;
};

export const EXECUTION_RULE_TEMPLATES: Record<
  ExecutionRuleTemplate["name"],
  ExecutionRuleTemplate
> = {
  scalp: {
    name: "scalp",
    rules: [
      {
        rule_type: "STOP_LOSS",
        value_pct: -15,
      },
      {
        rule_type: "TAKE_PROFIT",
        value_pct: 20,
        quantity_pct: 100,
      },
    ],
  },

  swing: {
    name: "swing",
    rules: [
      {
        rule_type: "STOP_LOSS",
        value_pct: -30,
      },
      {
        rule_type: "TAKE_PROFIT",
        value_pct: 40,
        quantity_pct: 100,
      },
    ],
  },

  leap: {
    name: "leap",
    rules: [
      {
        rule_type: "STOP_LOSS",
        value_pct: -50,
      },
      {
        rule_type: "TAKE_PROFIT",
        value_pct: 100,
        quantity_pct: 100,
      },
    ],
  },
};
