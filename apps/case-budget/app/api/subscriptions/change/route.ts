import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  changeStripeSubscription,
} from "@/lib/stripe/stripe-subscription";

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

type ChangeSubscriptionRequestBody = {
  plan:
    Exclude<
      CaseBudgetPlan,
      "free"
    >;

  interval:
    CaseBudgetBillingInterval;
};

type SubscriptionRow = {
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

type ManagedSubscription = {
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

const MANAGEABLE_STATUSES:
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
     * Subscription management is workspace-scoped.
     *
     * A CASE Budget user can:
     *
     * - own one or more workspaces,
     * - have an independent subscription for each owned workspace,
     * - belong to other paid workspaces as an invited member.
     *
     * Only the active workspace owner may change that workspace's
     * subscription.
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
      validateChangeRequest(
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
    } =
      validatedRequest.value;

    /*
     * Load the managed Stripe subscription for the active workspace,
     * not the authenticated user.
     *
     * This prevents a user who owns multiple subscriptions from changing
     * the wrong workspace subscription.
     */
    const existingSubscription =
      await findManagedSubscription({
        workspaceId:
          billingAuthorization.workspaceId,
      });

    if (
      !existingSubscription
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "NO_ACTIVE_SUBSCRIPTION",

          error:
            "No active CASE Budget subscription was found for this workspace.",
        },
        {
          status:
            404,
        },
      );
    }

    /*
     * The subscription record itself must belong to the current workspace
     * owner.
     *
     * Normally this will always match because only the owner can create a
     * workspace subscription. Keeping this check here protects against
     * malformed or legacy subscription records.
     */
    if (
      existingSubscription.userId !==
      billingAuthorization.ownerUserId
    ) {
      console.error(
        "[CASE Budget Stripe Subscription Change] Workspace subscription billing owner mismatch.",
        {
          workspaceId:
            billingAuthorization.workspaceId,

          workspaceOwnerUserId:
            billingAuthorization.ownerUserId,

          subscriptionBillingOwnerUserId:
            existingSubscription.userId,

          subscriptionId:
            existingSubscription.id,
        },
      );

      return NextResponse.json(
        {
          success:
            false,

          code:
            "WORKSPACE_SUBSCRIPTION_OWNER_MISMATCH",

          error:
            "CASE Budget could not verify the billing owner for this workspace subscription.",
        },
        {
          status:
            409,
        },
      );
    }

    if (
      existingSubscription.plan ===
        plan &&
      existingSubscription.billingInterval ===
        interval
    ) {
      return NextResponse.json(
        {
          success:
            false,

          code:
            "SUBSCRIPTION_ALREADY_MATCHES",

          error:
            "This CASE Budget workspace already uses this plan and billing interval.",

          existingSubscription: {
            id:
              existingSubscription.id,

            workspaceId:
              existingSubscription.workspaceId,

            billingOwnerUserId:
              existingSubscription.userId,

            plan:
              existingSubscription.plan,

            interval:
              existingSubscription.billingInterval,

            status:
              existingSubscription.status,

            providerSubscriptionId:
              existingSubscription.providerSubscriptionId,

            currentPeriodEnd:
              existingSubscription.currentPeriodEnd,

            cancelAtPeriodEnd:
              existingSubscription.cancelAtPeriodEnd,
          },
        },
        {
          status:
            409,
        },
      );
    }

    const result =
      await changeStripeSubscription({
        subscriptionId:
          existingSubscription
            .providerSubscriptionId,

        userId:
          auth.userId,

        workspaceId:
          billingAuthorization.workspaceId,

        plan,

        interval,
      });

    return NextResponse.json(
      {
        success:
          true,

        subscriptionId:
          result.subscriptionId,

        subscriptionItemId:
          result.subscriptionItemId,

        previousPriceId:
          result.previousPriceId,

        newPriceId:
          result.newPriceId,

        plan:
          result.plan,

        interval:
          result.interval,

        status:
          result.status,

        pendingUpdate:
          result.pendingUpdate,

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
      "[CASE Budget Stripe Subscription Change] Failed to change subscription.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CASE Budget could not change your subscription. Please try again.",
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
      "[CASE Budget Stripe Subscription Change] Workspace lookup failed.",
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
      "[CASE Budget Stripe Subscription Change] Workspace membership lookup failed.",
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
        "This workspace's subscription is managed by the workspace owner. Switch to a workspace you own to manage your own CASE Budget subscription.",
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

async function findManagedSubscription({
  workspaceId,
}: {
  workspaceId:
    string;
}): Promise<ManagedSubscription | null> {
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
        MANAGEABLE_STATUSES,
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
      "[CASE Budget Stripe Subscription Change] Existing workspace subscription lookup failed.",
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
      "CASE Budget could not load the existing workspace subscription.",
    );
  }

  if (
    !data
  ) {
    return null;
  }

  return mapSubscriptionRow(
    data as
      SubscriptionRow,
  );
}

function mapSubscriptionRow(
  row:
    SubscriptionRow,
): ManagedSubscription {
  const userId =
    normalizeOptionalString(
      row.user_id,
    );

  if (
    !userId
  ) {
    throw new Error(
      "CASE Budget subscription is missing its billing owner user ID.",
    );
  }

  const workspaceId =
    normalizeOptionalString(
      row.workspace_id,
    );

  if (
    !workspaceId
  ) {
    throw new Error(
      "CASE Budget subscription is missing its workspace ID.",
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
      `Unsupported CASE Budget subscription plan "${row.plan}".`,
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
      `Unsupported CASE Budget subscription status "${row.status}".`,
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
      "CASE Budget subscription is missing its Stripe subscription ID.",
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
        "The subscription change request body must contain valid JSON.",
    };
  }
}

function validateChangeRequest(
  value:
    unknown,
):
  | {
      success:
        true;

      value:
        ChangeSubscriptionRequestBody;
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
        "Invalid CASE Budget subscription change request.",
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

  return {
    success:
      true,

    value: {
      plan:
        planValue,

      interval:
        intervalValue,
    },
  };
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