export const CASE_UNIVERSITY_PAID_PLAN_KEYS = [
  "university_plus_monthly",
  "university_plus_annual",
  "university_pro_monthly",
  "university_pro_annual",
] as const;

export type CaseUniversityPaidPlanKey =
  (typeof CASE_UNIVERSITY_PAID_PLAN_KEYS)[number];

export const CASE_PRODUCT_KEYS = [
  "case_university",
  "case_trades",
  "case_journal",
  "case_budget",
  "case_signals",
] as const;

export type CaseProductKey =
  (typeof CASE_PRODUCT_KEYS)[number];

export function normalizePaidPlanKey(
  value: string | null | undefined,
): CaseUniversityPaidPlanKey | null {
  if (!value) {
    return null;
  }

  return CASE_UNIVERSITY_PAID_PLAN_KEYS.includes(
    value as CaseUniversityPaidPlanKey,
  )
    ? (value as CaseUniversityPaidPlanKey)
    : null;
}

export function normalizeSourceProduct(
  value: string | null | undefined,
): CaseProductKey {
  if (!value) {
    return "case_university";
  }

  return CASE_PRODUCT_KEYS.includes(
    value as CaseProductKey,
  )
    ? (value as CaseProductKey)
    : "case_university";
}

export function buildPostRegistrationRedirect(
  planKey: CaseUniversityPaidPlanKey | null,
): string {
  if (!planKey) {
    return "/dashboard";
  }

  return `/pricing?checkout_plan=${encodeURIComponent(
    planKey,
  )}`;
}

export function buildRegistrationUrl({
  planKey,
  sourceProduct = "case_university",
}: {
  planKey?: CaseUniversityPaidPlanKey | null;
  sourceProduct?: CaseProductKey;
}): string {
  const searchParams =
    new URLSearchParams();

  if (planKey) {
    searchParams.set(
      "plan",
      planKey,
    );
  }

  searchParams.set(
    "source",
    sourceProduct,
  );

  return `/auth/register?${searchParams.toString()}`;
}

export function buildSignInUrl(
  redirectTo: string,
): string {
  return `/auth/signin?redirect=${encodeURIComponent(
    redirectTo,
  )}`;
}
