import {
  NextResponse,
} from "next/server";

import {
  CaseBudgetServerAuthError,
  getCaseBudgetServerAuthErrorResponse,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

import {
  resumeStripeSubscription,
} from "@/lib/stripe/stripe-subscription-lifecycle";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

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
    string;

  billingInterval:
    string | null;

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

const RESUMABLE_STATUSES:
  CaseBudgetSubscriptionStatus[] =
  [
    "active",
    "trialing",
    "past_due",
    "unpaid",
    "incomplete",
    "paused",
  ];

export async function POST() {
  try {
    const auth =
      await requireCaseBudgetServerAuth();

    /*
     * Billing is owned by the active workspace.
     *
     * An invited user can inherit the active workspace's paid
     * entitlements without gaining control of its subscription.
     *
     * Only an active workspace owner may resume that workspace's
     * Stripe subscription.
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

    /*
     * Find the managed subscription attached to the active workspace.
     *
     * This is intentionally workspace-scoped instead of user-scoped so
     * one user can own multiple independent paid workspaces safely.
     */
    const subscription =
      await findResumableSubscription({
        workspaceId:
          billingAuthorization.workspaceId,
      });

    if (
      !subscription
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
     * Validate that the persisted billing relationship is owned by the
     * current workspace owner before touching Stripe.
     *
     * This protects against malformed or legacy subscription rows.
     */
    if (
      subscription.userId !==
      billingAuthorization.ownerUserId
    ) {
      console.error(
        "[CASE Budget Stripe Subscription Resume] Workspace subscription billing owner mismatch.",
        {
          workspaceId:
            billingAuthorization.workspaceId,

          workspaceOwnerUserId:
            billingAuthorization.ownerUserId,

          subscriptionBillingOwnerUserId:
            subscription.userId,

          subscriptionRecordId:
            subscription.id,

          providerSubscriptionId:
            subscription.providerSubscriptionId,
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
      !subscription.cancelAtPeriodEnd
    ) {
      return NextResponse.json(
        {
          success:
            true,

          code:
            "SUBSCRIPTION_ALREADY_RENEWING",

          subscriptionId:
            subscription.providerSubscriptionId,

          status:
            subscription.status,

          cancelAtPeriodEnd:
            false,

          currentPeriodEnd:
            subscription.currentPeriodEnd,

          workspace: {
            id:
              billingAuthorization.workspaceId,

            name:
              billingAuthorization.workspaceName,

            ownerUserId:
              billingAuthorization.ownerUserId,
          },

          message:
            "Your CASE Budget subscription is already set to renew normally.",
        },
      );
    }

    const result =
      await resumeStripeSubscription({
        subscriptionId:
          subscription.providerSubscriptionId,

        userId:
          billingAuthorization.ownerUserId,
      });

    return NextResponse.json(
      {
        success:
          true,

        code:
          "SUBSCRIPTION_RESUMED",

        subscriptionId:
          result.subscriptionId,

        status:
          result.status,

        cancelAtPeriodEnd:
          result.cancelAtPeriodEnd,

        canceledAt:
          result.canceledAt,

        currentPeriodEnd:
          result.currentPeriodEnd,

        workspace: {
          id:
            billingAuthorization.workspaceId,

          name:
            billingAuthorization.workspaceName,

          ownerUserId:
            billingAuthorization.ownerUserId,
        },

        message:
          getResumeMessage(
            result.currentPeriodEnd,
          ),
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
      "[CASE Budget Stripe Subscription Resume] Failed to resume subscription.",
      error,
    );

    return NextResponse.json(
      {
        success:
          false,

        error:
          "CASE Budget could not resume your subscription. Please try again.",
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
      "[CASE Budget Stripe Subscription Resume] Workspace lookup failed.",
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
      "[CASE Budget Stripe Subscription Resume] Workspace membership lookup failed.",
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

async function findResumableSubscription({
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
        RESUMABLE_STATUSES,
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
      "[CASE Budget Stripe Subscription Resume] Workspace subscription lookup failed.",
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

    plan:
      row.plan,

    billingInterval:
      normalizeOptionalString(
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

function getResumeMessage(
  currentPeriodEnd:
    string | null,
) {
  const formattedDate =
    formatDate(
      currentPeriodEnd,
    );

  if (
    formattedDate
  ) {
    return `Your CASE Budget subscription will continue renewing normally. Your current billing period ends on ${formattedDate}.`;
  }

  return "Your CASE Budget subscription will continue renewing normally.";
}

function formatDate(
  value:
    string | null,
) {
  if (
    !value
  ) {
    return null;
  }

  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month:
        "long",

      day:
        "numeric",

      year:
        "numeric",
    },
  ).format(
    date,
  );
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