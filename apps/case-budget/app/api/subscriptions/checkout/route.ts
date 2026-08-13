import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  createEmbeddedCheckoutSession,
} from "@/lib/stripe/stripe-checkout";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  isCaseBudgetPlan,
  type CaseBudgetBillingInterval,
  type CaseBudgetPlan,
} from "@/lib/subscriptions/plan-entitlements";

import type {
  CaseBudgetSubscriptionStatus,
} from "@/types/subscription";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

type UnknownRecord =
  Record<
    string,
    unknown
  >;

type CheckoutTheme =
  | "light"
  | "dark";

type CheckoutRequestBody = {
  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;

  theme:
    CheckoutTheme;
};

type ExistingSubscriptionRow = {
  id:
    string;

  user_id:
    string;

  workspace_id:
    string | null;

  plan:
    string;

  billing_provider:
    string;

  billing_interval:
    string | null;

  status:
    string;

  provider_customer_id:
    string | null;

  provider_subscription_id:
    string | null;

  provider_price_id:
    string | null;

  current_period_end:
    string | null;

  cancel_at_period_end:
    boolean;

  updated_at:
    string;
};

type ExistingManagedSubscription = {
  id:
    string;

  userId:
    string;

  workspaceId:
    string;

  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  billingInterval:
    CaseBudgetBillingInterval | null;

  status:
    CaseBudgetSubscriptionStatus;

  providerCustomerId:
    string | null;

  providerSubscriptionId:
    string;

  providerPriceId:
    string | null;

  currentPeriodEnd:
    string | null;

  cancelAtPeriodEnd:
    boolean;
};

type WorkspaceBillingAuthorization =
  | {
      allowed:
        true;

      workspaceId:
        string;

      workspaceName:
        string;

      ownerUserId:
        string;
    }
  | {
      allowed:
        false;

      status:
        number;

      code:
        | "WORKSPACE_NOT_FOUND"
        | "WORKSPACE_INACTIVE"
        | "WORKSPACE_ACCESS_DENIED"
        | "WORKSPACE_BILLING_OWNER_REQUIRED";

      message:
        string;
    };

type WorkspaceRow = {
  id:
    string;

  name:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type WorkspaceMembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    string;

  status:
    string;
};

const SUBSCRIPTION_STATUSES_REQUIRING_MANAGEMENT:
  CaseBudgetSubscriptionStatus[] =
  [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ];

export async function POST(
  request:
    Request,
) {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    /*
     * Billing authorization is workspace-scoped.
     *
     * A user may belong to many CASE Budget workspaces, but only the owner
     * of the currently active workspace may create or manage that
     * workspace's paid subscription.
     *
     * Admins, members, and viewers inherit the workspace entitlement but
     * cannot establish a second subscription against someone else's
     * workspace.
     */
    const billingAuthorization =
      await authorizeWorkspaceBilling({
        userId:
          auth.userId,

        workspaceId:
          auth.workspaceId,
      });

    if (
      !billingAuthorization.allowed
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            billingAuthorization.code,

          error:
            billingAuthorization.message,
        },
        {
          status:
            billingAuthorization.status,
        },
      );
    }

    const rawBody =
      await readJsonBody(
        request,
      );

    if (
      !rawBody.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            rawBody.error,
        },
        {
          status:
            400,
        },
      );
    }

    const validatedRequest =
      validateCheckoutRequest(
        rawBody.value,
      );

    if (
      !validatedRequest.success
    ) {
      return NextResponse.json(
        {
          success:
            false,

          error:
            validatedRequest.error,
        },
        {
          status:
            400,
        },
      );
    }

    const {
      plan,
      interval,
      theme,
    } =
      validatedRequest.value;

    /*
     * CASE Budget allows one managed paid subscription per workspace.
     *
     * This is intentionally workspace-scoped instead of user-scoped.
     *
     * A single CASE Budget user may own multiple independent workspaces:
     *
     *   Personal Budget -> Pro
     *   Business Budget -> Plus
     *
     * and may simultaneously be an invited member of another paid
     * household workspace.
     *
     * The active workspace is therefore the billing boundary.
     */
    const existingSubscription =
      await findExistingManagedSubscription({
        workspaceId:
          billingAuthorization.workspaceId,
      });

    if (
      existingSubscription
    ) {
      const sameSelection =
        existingSubscription.plan ===
          plan &&
        existingSubscription.billingInterval ===
          interval;

      return NextResponse.json(
        {
          success:
            false,

          code:
            "ACTIVE_WORKSPACE_SUBSCRIPTION_EXISTS",

          error:
            sameSelection
              ? "This workspace already has this CASE Budget subscription. Manage the existing workspace subscription instead of creating another one."
              : "This workspace already has a CASE Budget subscription. Use Billing to change its existing plan or billing interval.",

          existingSubscription: {
            id:
              existingSubscription.id,

            plan:
              existingSubscription.plan,

            interval:
              existingSubscription.billingInterval,

            status:
              existingSubscription.status,

            workspaceId:
              existingSubscription.workspaceId,

            billingOwnerUserId:
              existingSubscription.userId,

            providerSubscriptionId:
              existingSubscription.providerSubscriptionId,

            currentPeriodEnd:
              existingSubscription.currentPeriodEnd,

            cancelAtPeriodEnd:
              existingSubscription.cancelAtPeriodEnd,

            sameSelection,
          },
        },
        {
          status:
            409,
        },
      );
    }

    const returnUrl =
      buildCheckoutReturnUrl({
        request,

        plan,

        interval,

        workspaceId:
          billingAuthorization.workspaceId,
      });

    /*
     * The authenticated workspace owner becomes the billing relationship
     * owner for this new subscription.
     *
     * Stripe metadata and the subsequent webhook synchronization attach the
     * paid plan to the workspace ID.
     */
    const checkout =
      await createEmbeddedCheckoutSession({
        userId:
          auth.userId,

        email:
          normalizeOptionalString(
            auth.user.email,
          ),

        workspaceId:
          billingAuthorization.workspaceId,

        plan,

        interval,

        theme,

        returnUrl,
      });

    return NextResponse.json(
      {
        success:
          true,

        sessionId:
          checkout.sessionId,

        clientSecret:
          checkout.clientSecret,

        plan:
          checkout.plan,

        interval:
          checkout.interval,

        priceId:
          checkout.priceId,

        workspace: {
          id:
            billingAuthorization.workspaceId,

          name:
            billingAuthorization.workspaceName,

          ownerUserId:
            billingAuthorization.ownerUserId,
        },
      },
    );
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      const response =
        getCaseBudgetServerAuthErrorResponse(
          error,
        );

      return NextResponse.json(
        {
          success:
            false,

          error:
            response.body.error.message,

          authError: {
            code:
              response.body.error.code,

            message:
              response.body.error.message,
          },
        },
        {
          status:
            response.status,
        },
      );
    }

    console.error(
      "[CASE Budget Stripe Checkout] Failed to create embedded checkout session.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CASE Budget could not start checkout. Please try again.",
      },
      {
        status:
          500,
      },
    );
  }
}

async function authorizeWorkspaceBilling({
  userId,
  workspaceId,
}: {
  userId:
    string;

  workspaceId:
    string;
}): Promise<WorkspaceBillingAuthorization> {
  const normalizedUserId =
    normalizeRequiredString(
      userId,
      "userId",
    );

  const normalizedWorkspaceId =
    normalizeRequiredString(
      workspaceId,
      "workspaceId",
    );

  const supabase =
    createAdminClient();

  const {
    data:
      workspaceData,
    error:
      workspaceError,
  } =
    await supabase
      .from(
        "workspaces",
      )
      .select(
        `
          id,
          name,
          owner_user_id,
          is_active
        `,
      )
      .eq(
        "id",
        normalizedWorkspaceId,
      )
      .maybeSingle();

  if (
    workspaceError
  ) {
    console.error(
      "[CASE Budget Stripe Checkout] Workspace lookup failed.",
      {
        userId:
          normalizedUserId,

        workspaceId:
          normalizedWorkspaceId,

        code:
          getSupabaseErrorCode(
            workspaceError,
          ),

        message:
          getErrorMessage(
            workspaceError,
          ),
      },
    );

    throw new Error(
      "CASE Budget could not verify the workspace billing owner.",
    );
  }

  if (
    !workspaceData
  ) {
    return {
      allowed:
        false,

      status:
        404,

      code:
        "WORKSPACE_NOT_FOUND",

      message:
        "The active CASE Budget workspace could not be found.",
    };
  }

  const workspace =
    mapWorkspaceRow(
      workspaceData,
    );

  if (
    !workspace.is_active
  ) {
    return {
      allowed:
        false,

      status:
        409,

      code:
        "WORKSPACE_INACTIVE",

      message:
        "Billing cannot be changed for an inactive workspace.",
    };
  }

  /*
   * Verify that the authenticated user has an active membership in this
   * workspace.
   *
   * We intentionally perform this check even for owner_user_id because it
   * keeps workspace billing consistent with the rest of CASE Budget's
   * membership model.
   */
  const {
    data:
      membershipData,
    error:
      membershipError,
  } =
    await supabase
      .from(
        "workspace_members",
      )
      .select(
        `
          id,
          workspace_id,
          user_id,
          role,
          status
        `,
      )
      .eq(
        "workspace_id",
        normalizedWorkspaceId,
      )
      .eq(
        "user_id",
        normalizedUserId,
      )
      .maybeSingle();

  if (
    membershipError
  ) {
    console.error(
      "[CASE Budget Stripe Checkout] Workspace membership lookup failed.",
      {
        userId:
          normalizedUserId,

        workspaceId:
          normalizedWorkspaceId,

        code:
          getSupabaseErrorCode(
            membershipError,
          ),

        message:
          getErrorMessage(
            membershipError,
          ),
      },
    );

    throw new Error(
      "CASE Budget could not verify workspace billing permissions.",
    );
  }

  if (
    !membershipData
  ) {
    return {
      allowed:
        false,

      status:
        403,

      code:
        "WORKSPACE_ACCESS_DENIED",

      message:
        "You do not have access to this CASE Budget workspace.",
    };
  }

  const membership =
    mapWorkspaceMembershipRow(
      membershipData,
    );

  if (
    membership.status !==
    "active"
  ) {
    return {
      allowed:
        false,

      status:
        403,

      code:
        "WORKSPACE_ACCESS_DENIED",

      message:
        "Only active workspace members can access workspace billing.",
    };
  }

  /*
   * Only the workspace owner controls billing.
   *
   * We require both:
   *
   *   workspaces.owner_user_id = authenticated user
   *
   * and:
   *
   *   workspace_members.role = owner
   *
   * This prevents an administrator, member, or viewer from creating a
   * subscription against the workspace they were invited into.
   */
  const isWorkspaceOwner =
    workspace.owner_user_id ===
      normalizedUserId &&
    membership.role ===
      "owner";

  if (
    !isWorkspaceOwner
  ) {
    return {
      allowed:
        false,

      status:
        403,

      code:
        "WORKSPACE_BILLING_OWNER_REQUIRED",

      message:
        "This workspace's subscription is managed by the workspace owner. Switch to a workspace you own to purchase or manage your own CASE Budget subscription.",
    };
  }

  return {
    allowed:
      true,

    workspaceId:
      workspace.id,

    workspaceName:
      workspace.name,

    ownerUserId:
      workspace.owner_user_id,
  };
}

async function findExistingManagedSubscription({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<ExistingManagedSubscription | null> {
  const normalizedWorkspaceId =
    normalizeRequiredString(
      workspaceId,
      "workspaceId",
    );

  const supabase =
    createAdminClient();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "case_budget_subscriptions",
      )
      .select(
        `
          id,
          user_id,
          workspace_id,
          plan,
          billing_provider,
          billing_interval,
          status,
          provider_customer_id,
          provider_subscription_id,
          provider_price_id,
          current_period_end,
          cancel_at_period_end,
          updated_at
        `,
      )
      .eq(
        "workspace_id",
        normalizedWorkspaceId,
      )
      .eq(
        "billing_provider",
        "stripe",
      )
      .neq(
        "plan",
        "free",
      )
      .in(
        "status",
        SUBSCRIPTION_STATUSES_REQUIRING_MANAGEMENT,
      )
      .not(
        "provider_subscription_id",
        "is",
        null,
      )
      .order(
        "updated_at",
        {
          ascending:
            false,
        },
      )
      .limit(
        1,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Stripe Checkout] Existing workspace subscription lookup failed.",
      {
        workspaceId:
          normalizedWorkspaceId,

        code:
          getSupabaseErrorCode(
            error,
          ),

        message:
          getErrorMessage(
            error,
          ),
      },
    );

    throw new Error(
      "CASE Budget could not verify whether this workspace already has an active subscription.",
    );
  }

  if (
    !data
  ) {
    return null;
  }

  return mapExistingSubscriptionRow(
    data,
  );
}

function mapExistingSubscriptionRow(
  row:
    ExistingSubscriptionRow,
): ExistingManagedSubscription {
  const workspaceId =
    normalizeOptionalString(
      row.workspace_id,
    );

  if (
    !workspaceId
  ) {
    throw new Error(
      "CASE Budget found a workspace subscription without a workspace ID.",
    );
  }

  const userId =
    normalizeOptionalString(
      row.user_id,
    );

  if (
    !userId
  ) {
    throw new Error(
      "CASE Budget found a workspace subscription without a billing owner user ID.",
    );
  }

  const plan =
    parsePaidPlan(
      row.plan,
    );

  if (
    !plan
  ) {
    throw new Error(
      `CASE Budget found an unsupported paid subscription plan "${row.plan}".`,
    );
  }

  const status =
    parseSubscriptionStatus(
      row.status,
    );

  if (
    !status
  ) {
    throw new Error(
      `CASE Budget found an unsupported subscription status "${row.status}".`,
    );
  }

  const providerSubscriptionId =
    normalizeOptionalString(
      row.provider_subscription_id,
    );

  if (
    !providerSubscriptionId
  ) {
    throw new Error(
      "CASE Budget found a managed Stripe subscription without a Stripe subscription ID.",
    );
  }

  return {
    id:
      row.id,

    userId,

    workspaceId,

    plan,

    billingInterval:
      parseBillingInterval(
        row.billing_interval,
      ),

    status,

    providerCustomerId:
      normalizeOptionalString(
        row.provider_customer_id,
      ),

    providerSubscriptionId,

    providerPriceId:
      normalizeOptionalString(
        row.provider_price_id,
      ),

    currentPeriodEnd:
      normalizeOptionalString(
        row.current_period_end,
      ),

    cancelAtPeriodEnd:
      Boolean(
        row.cancel_at_period_end,
      ),
  };
}

function mapWorkspaceRow(
  value:
    unknown,
): WorkspaceRow {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    throw new Error(
      "CASE Budget received an invalid workspace record.",
    );
  }

  const id =
    normalizeOptionalString(
      record.id,
    );

  const name =
    normalizeOptionalString(
      record.name,
    );

  const ownerUserId =
    normalizeOptionalString(
      record.owner_user_id,
    );

  if (
    !id ||
    !name ||
    !ownerUserId
  ) {
    throw new Error(
      "CASE Budget received an incomplete workspace record.",
    );
  }

  return {
    id,

    name,

    owner_user_id:
      ownerUserId,

    is_active:
      record.is_active ===
      true,
  };
}

function mapWorkspaceMembershipRow(
  value:
    unknown,
): WorkspaceMembershipRow {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    throw new Error(
      "CASE Budget received an invalid workspace membership record.",
    );
  }

  const id =
    normalizeOptionalString(
      record.id,
    );

  const workspaceId =
    normalizeOptionalString(
      record.workspace_id,
    );

  const userId =
    normalizeOptionalString(
      record.user_id,
    );

  const role =
    normalizeOptionalString(
      record.role,
    );

  const status =
    normalizeOptionalString(
      record.status,
    );

  if (
    !id ||
    !workspaceId ||
    !userId ||
    !role ||
    !status
  ) {
    throw new Error(
      "CASE Budget received an incomplete workspace membership record.",
    );
  }

  return {
    id,

    workspace_id:
      workspaceId,

    user_id:
      userId,

    role,

    status,
  };
}

async function readJsonBody(
  request:
    Request,
):
  Promise<
    | {
        success:
          true;

        value:
          unknown;
      }
    | {
        success:
          false;

        error:
          string;
      }
  > {
  try {
    return {
      success:
        true,

      value:
        await request.json(),
    };
  } catch {
    return {
      success:
        false,

      error:
        "The checkout request body must contain valid JSON.",
    };
  }
}

function validateCheckoutRequest(
  value:
    unknown,
):
  | {
      success:
        true;

      value:
        CheckoutRequestBody;
    }
  | {
      success:
        false;

      error:
        string;
    } {
  const record =
    asRecord(
      value,
    );

  if (
    !record
  ) {
    return {
      success:
        false,

      error:
        "Invalid CASE Budget checkout request.",
    };
  }

  const planValue =
    getString(
      record.plan,
    );

  if (
    !planValue ||
    !isCaseBudgetPlan(
      planValue,
    ) ||
    planValue ===
      "free"
  ) {
    return {
      success:
        false,

      error:
        "Choose either CASE Budget Plus or CASE Budget Pro.",
    };
  }

  const intervalValue =
    getString(
      record.interval,
    );

  if (
    intervalValue !==
      "monthly" &&
    intervalValue !==
      "annual"
  ) {
    return {
      success:
        false,

      error:
        "Choose either monthly or annual billing.",
    };
  }

  const themeValue =
    getString(
      record.theme,
    );

  if (
    themeValue !==
      "light" &&
    themeValue !==
      "dark"
  ) {
    return {
      success:
        false,

      error:
        "Invalid CASE Budget checkout theme.",
    };
  }

  return {
    success:
      true,

    value: {
      plan:
        planValue,

      interval:
        intervalValue,

      theme:
        themeValue,
    },
  };
}

function buildCheckoutReturnUrl({
  request,
  plan,
  interval,
  workspaceId,
}: {
  request:
    Request;

  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;

  workspaceId:
    string;
}) {
  const requestUrl =
    new URL(
      request.url,
    );

  const returnUrl =
    new URL(
      "/dashboard/settings/billing/checkout/return",
      requestUrl.origin,
    );

  /*
   * These values are informational only on the return page.
   *
   * Plan entitlements are not granted from query-string values.
   * Stripe Price IDs + webhook synchronization remain authoritative.
   */
  returnUrl.searchParams.set(
    "plan",
    plan,
  );

  returnUrl.searchParams.set(
    "interval",
    interval,
  );

  returnUrl.searchParams.set(
    "workspaceId",
    workspaceId,
  );

  /*
   * IMPORTANT:
   *
   * Do not use URLSearchParams.set() for CHECKOUT_SESSION_ID.
   *
   * Doing so encodes:
   *
   *   {CHECKOUT_SESSION_ID}
   *
   * as:
   *
   *   %7BCHECKOUT_SESSION_ID%7D
   *
   * Stripe requires the literal template token so it can replace it
   * with the actual cs_test_... / cs_live_... Checkout Session ID
   * before returning the customer to CASE Budget.
   */
  const separator =
    returnUrl.search
      ? "&"
      : "?";

  return (
    `${returnUrl.toString()}${separator}` +
    "session_id={CHECKOUT_SESSION_ID}"
  );
}

function parsePaidPlan(
  value:
    string,
):
  | Exclude<
      CaseBudgetPlan,
      "free"
    >
  | null {
  if (
    value ===
      "plus" ||
    value ===
      "pro"
  ) {
    return value;
  }

  return null;
}

function parseBillingInterval(
  value:
    string | null,
): CaseBudgetBillingInterval | null {
  if (
    value ===
      "monthly" ||
    value ===
      "annual"
  ) {
    return value;
  }

  return null;
}

function parseSubscriptionStatus(
  value:
    string,
): CaseBudgetSubscriptionStatus | null {
  if (
    value ===
      "active" ||
    value ===
      "trialing" ||
    value ===
      "past_due" ||
    value ===
      "unpaid" ||
    value ===
      "canceled" ||
    value ===
      "incomplete" ||
    value ===
      "incomplete_expired" ||
    value ===
      "paused" ||
    value ===
      "none"
  ) {
    return value;
  }

  return null;
}

function asRecord(
  value:
    unknown,
): UnknownRecord | null {
  if (
    typeof value !==
      "object" ||
    value ===
      null ||
    Array.isArray(
      value,
    )
  ) {
    return null;
  }

  return value as
    UnknownRecord;
}

function getString(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function normalizeRequiredString(
  value:
    string,
  fieldName:
    string,
) {
  const normalizedValue =
    value.trim();

  if (
    !normalizedValue
  ) {
    throw new Error(
      `${fieldName} is required.`,
    );
  }

  return normalizedValue;
}

function normalizeOptionalString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return (
    normalizedValue ||
    null
  );
}

function getSupabaseErrorCode(
  error:
    unknown,
) {
  if (
    typeof error !==
      "object" ||
    error ===
      null
  ) {
    return null;
  }

  const code =
    (
      error as {
        code?:
          unknown;
      }
    ).code;

  return typeof code ===
    "string"
      ? code
      : null;
}

function getErrorMessage(
  error:
    unknown,
) {
  if (
    error instanceof
      Error
  ) {
    const message =
      error.message
        .trim();

    if (
      message
    ) {
      return message;
    }
  }

  if (
    typeof error ===
      "object" &&
    error !==
      null
  ) {
    const message =
      (
        error as {
          message?:
            unknown;
        }
      ).message;

    if (
      typeof message ===
        "string" &&
      message.trim()
    ) {
      return message.trim();
    }
  }

  return "Unknown error.";
}