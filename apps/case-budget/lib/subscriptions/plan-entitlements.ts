export type CaseBudgetPlan =
  | "free"
  | "plus"
  | "pro";

export type CaseBudgetBillingInterval =
  | "monthly"
  | "annual";

export type CaseBudgetFeature =
  | "monthly-budget"
  | "transactions"
  | "bills"
  | "calendar"
  | "goals"
  | "debts"
  | "pay-cycles"
  | "reports"
  | "manual-accounts"
  | "net-worth"
  | "investments"
  | "bank-connections"
  | "ai-coach"
  | "premium-insights"
  | "premium-automation";

export type CaseBudgetPlanPricing = {
  monthly:
    number;

  annual:
    number;
};

export type CaseBudgetAiEntitlement = {
  enabled:
    boolean;

  monthlyQuestionLimit:
    number;

  canPurchaseAdditionalQuestions:
    boolean;

  additionalQuestionPackSize:
    number | null;

  additionalQuestionPackPrice:
    number | null;
};

export type CaseBudgetWorkspaceEntitlement = {
  includedWorkspaceLimit:
    number;

  allowsAdditionalWorkspacePurchases:
    boolean;
};

export type CaseBudgetPlanEntitlements = {
  plan:
    CaseBudgetPlan;

  name:
    string;

  description:
    string;

  pricing:
    CaseBudgetPlanPricing;

  features:
    Record<
      CaseBudgetFeature,
      boolean
    >;

  ai:
    CaseBudgetAiEntitlement;

  workspaces:
    CaseBudgetWorkspaceEntitlement;
};

export const CASE_BUDGET_PLAN_ENTITLEMENTS: Record<
  CaseBudgetPlan,
  CaseBudgetPlanEntitlements
> = {
  free: {
    plan:
      "free",

    name:
      "Free",

    description:
      "Simple manual monthly budgeting.",

    pricing: {
      monthly:
        0,

      annual:
        0,
    },

    features: {
      "monthly-budget":
        true,

      transactions:
        false,

      bills:
        false,

      calendar:
        false,

      goals:
        false,

      debts:
        false,

      "pay-cycles":
        false,

      reports:
        false,

      "manual-accounts":
        false,

      "net-worth":
        false,

      investments:
        false,

      "bank-connections":
        false,

      "ai-coach":
        false,

      "premium-insights":
        false,

      "premium-automation":
        false,
    },

    ai: {
      enabled:
        false,

      monthlyQuestionLimit:
        0,

      canPurchaseAdditionalQuestions:
        false,

      additionalQuestionPackSize:
        null,

      additionalQuestionPackPrice:
        null,
    },

    workspaces: {
      includedWorkspaceLimit:
        1,

      allowsAdditionalWorkspacePurchases:
        false,
    },
  },

  plus: {
    plan:
      "plus",

    name:
      "Plus",

    description:
      "Complete manual financial management.",

    pricing: {
      monthly:
        5.99,

      annual:
        59.99,
    },

    features: {
      "monthly-budget":
        true,

      transactions:
        true,

      bills:
        true,

      calendar:
        true,

      goals:
        true,

      debts:
        true,

      "pay-cycles":
        true,

      reports:
        true,

      "manual-accounts":
        true,

      "net-worth":
        true,

      investments:
        true,

      "bank-connections":
        false,

      "ai-coach":
        false,

      "premium-insights":
        false,

      "premium-automation":
        false,
    },

    ai: {
      enabled:
        false,

      monthlyQuestionLimit:
        0,

      canPurchaseAdditionalQuestions:
        false,

      additionalQuestionPackSize:
        null,

      additionalQuestionPackPrice:
        null,
    },

    workspaces: {
      includedWorkspaceLimit:
        2,

      allowsAdditionalWorkspacePurchases:
        false,
    },
  },

  pro: {
    plan:
      "pro",

    name:
      "Pro",

    description:
      "Connected financial management with AI-powered coaching and automation.",

    pricing: {
      monthly:
        11.99,

      annual:
        119.00,
    },

    features: {
      "monthly-budget":
        true,

      transactions:
        true,

      bills:
        true,

      calendar:
        true,

      goals:
        true,

      debts:
        true,

      "pay-cycles":
        true,

      reports:
        true,

      "manual-accounts":
        true,

      "net-worth":
        true,

      investments:
        true,

      "bank-connections":
        true,

      "ai-coach":
        true,

      "premium-insights":
        true,

      "premium-automation":
        true,
    },

    ai: {
      enabled:
        true,

      monthlyQuestionLimit:
        200,

      /*
       * Additional AI packs are intentionally disabled
       * for the initial release.
       *
       * We will collect real usage/cost data before
       * deciding whether to enable overage purchases.
       */
      canPurchaseAdditionalQuestions:
        false,

      additionalQuestionPackSize:
        null,

      additionalQuestionPackPrice:
        null,
    },

    workspaces: {
      includedWorkspaceLimit:
        5,

      /*
       * Pro includes up to five workspaces.
       *
       * Purchased workspace capacity is stored separately from this static
       * plan definition so billing can increase capacity without changing
       * what the base Pro plan includes.
       */
      allowsAdditionalWorkspacePurchases:
        true,
    },
  },
};

export const CASE_BUDGET_DEFAULT_PLAN:
  CaseBudgetPlan =
  "free";

export const CASE_BUDGET_PRO_AI_MONTHLY_LIMIT =
  CASE_BUDGET_PLAN_ENTITLEMENTS
    .pro
    .ai
    .monthlyQuestionLimit;

export function getCaseBudgetPlanEntitlements(
  plan:
    CaseBudgetPlan,
): CaseBudgetPlanEntitlements {
  return CASE_BUDGET_PLAN_ENTITLEMENTS[
    plan
  ];
}

export function getCaseBudgetPlanName(
  plan:
    CaseBudgetPlan,
) {
  return getCaseBudgetPlanEntitlements(
    plan,
  ).name;
}

export function getCaseBudgetPlanPrice(
  plan:
    CaseBudgetPlan,
  interval:
    CaseBudgetBillingInterval,
) {
  return getCaseBudgetPlanEntitlements(
    plan,
  ).pricing[
    interval
  ];
}

export function hasCaseBudgetFeature(
  plan:
    CaseBudgetPlan,
  feature:
    CaseBudgetFeature,
) {
  return getCaseBudgetPlanEntitlements(
    plan,
  ).features[
    feature
  ];
}

export function getCaseBudgetIncludedWorkspaceLimit(
  plan:
    CaseBudgetPlan,
) {
  return getCaseBudgetPlanEntitlements(
    plan,
  ).workspaces.includedWorkspaceLimit;
}

export function canPurchaseAdditionalCaseBudgetWorkspaces(
  plan:
    CaseBudgetPlan,
) {
  return getCaseBudgetPlanEntitlements(
    plan,
  ).workspaces.allowsAdditionalWorkspacePurchases;
}

export function getCaseBudgetEffectiveWorkspaceLimit({
  plan,
  additionalWorkspaceCount =
    0,
}: {
  plan:
    CaseBudgetPlan;

  additionalWorkspaceCount?:
    number;
}) {
  const includedWorkspaceLimit =
    getCaseBudgetIncludedWorkspaceLimit(
      plan,
    );

  const normalizedAdditionalWorkspaceCount =
    canPurchaseAdditionalCaseBudgetWorkspaces(
      plan,
    )
      ? Math.max(
          0,
          Math.floor(
            additionalWorkspaceCount,
          ),
        )
      : 0;

  return (
    includedWorkspaceLimit +
    normalizedAdditionalWorkspaceCount
  );
}

export function hasAiCoachAccess(
  plan:
    CaseBudgetPlan,
) {
  const entitlements =
    getCaseBudgetPlanEntitlements(
      plan,
    );

  return (
    entitlements.features[
      "ai-coach"
    ] &&
    entitlements.ai.enabled
  );
}

export function getAiCoachMonthlyQuestionLimit(
  plan:
    CaseBudgetPlan,
) {
  return getCaseBudgetPlanEntitlements(
    plan,
  ).ai.monthlyQuestionLimit;
}

export function isPaidCaseBudgetPlan(
  plan:
    CaseBudgetPlan,
) {
  return (
    plan ===
      "plus" ||
    plan ===
      "pro"
  );
}

export function isCaseBudgetPlan(
  value:
    unknown,
): value is CaseBudgetPlan {
  return (
    value ===
      "free" ||
    value ===
      "plus" ||
    value ===
      "pro"
  );
}

export function getMinimumPlanForFeature(
  feature:
    CaseBudgetFeature,
): CaseBudgetPlan | null {
  const plans:
    CaseBudgetPlan[] = [
      "free",
      "plus",
      "pro",
    ];

  for (
    const plan
    of plans
  ) {
    if (
      hasCaseBudgetFeature(
        plan,
        feature,
      )
    ) {
      return plan;
    }
  }

  return null;
}

export function getAiCoachQuestionsRemaining({
  plan,
  used,
}: {
  plan:
    CaseBudgetPlan;

  used:
    number;
}) {
  const limit =
    getAiCoachMonthlyQuestionLimit(
      plan,
    );

  if (
    limit <=
    0
  ) {
    return 0;
  }

  return Math.max(
    0,
    limit -
      Math.max(
        0,
        Math.floor(
          used,
        ),
      ),
  );
}

export function hasAiCoachQuestionsRemaining({
  plan,
  used,
}: {
  plan:
    CaseBudgetPlan;

  used:
    number;
}) {
  return (
    hasAiCoachAccess(
      plan,
    ) &&
    getAiCoachQuestionsRemaining({
      plan,
      used,
    }) >
      0
  );
}

export function getAiCoachUsagePercentage({
  plan,
  used,
}: {
  plan:
    CaseBudgetPlan;

  used:
    number;
}) {
  const limit =
    getAiCoachMonthlyQuestionLimit(
      plan,
    );

  if (
    limit <=
    0
  ) {
    return 0;
  }

  const normalizedUsed =
    Math.max(
      0,
      Math.floor(
        used,
      ),
    );

  return Math.min(
    100,
    Math.round(
      (
        normalizedUsed /
        limit
      ) *
        100,
    ),
  );
}