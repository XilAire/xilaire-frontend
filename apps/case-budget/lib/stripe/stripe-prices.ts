import type {
  CaseBudgetBillingInterval,
  CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

type PaidCaseBudgetPlan =
  Exclude<
    CaseBudgetPlan,
    "free"
  >;

type StripePriceEnvironmentKey =
  | "STRIPE_PLUS_MONTHLY_PRICE_ID_CASE_BUDGET"
  | "STRIPE_PLUS_ANNUAL_PRICE_ID_CASE_BUDGET"
  | "STRIPE_PRO_MONTHLY_PRICE_ID_CASE_BUDGET"
  | "STRIPE_PRO_ANNUAL_PRICE_ID_CASE_BUDGET";

type StripePriceDefinition = {
  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;

  environmentKey:
    StripePriceEnvironmentKey;
};

const STRIPE_PRICE_DEFINITIONS: StripePriceDefinition[] =
  [
    {
      plan:
        "plus",

      interval:
        "monthly",

      environmentKey:
        "STRIPE_PLUS_MONTHLY_PRICE_ID_CASE_BUDGET",
    },

    {
      plan:
        "plus",

      interval:
        "annual",

      environmentKey:
        "STRIPE_PLUS_ANNUAL_PRICE_ID_CASE_BUDGET",
    },

    {
      plan:
        "pro",

      interval:
        "monthly",

      environmentKey:
        "STRIPE_PRO_MONTHLY_PRICE_ID_CASE_BUDGET",
    },

    {
      plan:
        "pro",

      interval:
        "annual",

      environmentKey:
        "STRIPE_PRO_ANNUAL_PRICE_ID_CASE_BUDGET",
    },
  ];

export function getStripePriceId({
  plan,
  interval,
}: {
  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;
}) {
  const definition =
    STRIPE_PRICE_DEFINITIONS.find(
      (
        item,
      ) =>
        item.plan ===
          plan &&
        item.interval ===
          interval,
    );

  if (
    !definition
  ) {
    throw new Error(
      `No Stripe price mapping exists for ${plan}/${interval}.`,
    );
  }

  const priceId =
    process.env[
      definition.environmentKey
    ]
      ?.trim();

  if (
    !priceId
  ) {
    throw new Error(
      `Stripe price configuration is missing. ${definition.environmentKey} is not set.`,
    );
  }

  return priceId;
}

export function getCaseBudgetPlanFromStripePriceId(
  priceId:
    string,
):
  | {
      plan:
        PaidCaseBudgetPlan;

      interval:
        CaseBudgetBillingInterval;
    }
  | null {
  const normalizedPriceId =
    priceId.trim();

  if (
    !normalizedPriceId
  ) {
    return null;
  }

  for (
    const definition
    of STRIPE_PRICE_DEFINITIONS
  ) {
    const configuredPriceId =
      process.env[
        definition.environmentKey
      ]
        ?.trim();

    if (
      !configuredPriceId
    ) {
      continue;
    }

    if (
      configuredPriceId ===
      normalizedPriceId
    ) {
      return {
        plan:
          definition.plan,

        interval:
          definition.interval,
      };
    }
  }

  return null;
}

export function isStripePriceConfigured({
  plan,
  interval,
}: {
  plan:
    PaidCaseBudgetPlan;

  interval:
    CaseBudgetBillingInterval;
}) {
  const definition =
    STRIPE_PRICE_DEFINITIONS.find(
      (
        item,
      ) =>
        item.plan ===
          plan &&
        item.interval ===
          interval,
    );

  if (
    !definition
  ) {
    return false;
  }

  const value =
    process.env[
      definition.environmentKey
    ]
      ?.trim();

  return Boolean(
    value,
  );
}

export function getConfiguredStripePriceMappings() {
  return STRIPE_PRICE_DEFINITIONS.map(
    (
      definition,
    ) => ({
      plan:
        definition.plan,

      interval:
        definition.interval,

      environmentKey:
        definition.environmentKey,

      configured:
        Boolean(
          process.env[
            definition.environmentKey
          ]
            ?.trim(),
        ),
    }),
  );
}