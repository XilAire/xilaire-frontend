"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireWorkspaceEditor,
} from "@/lib/auth/require-auth";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

const PAY_CYCLES_TABLE =
  "case_budget_pay_cycles";

const PAY_CYCLES_PATH =
  "/dashboard/pay-cycles";

export type DeletePayCycleInput = {
  workspaceId:
    string;

  payCycleId:
    string;
};

export type DeletePayCycleResult =
  | {
      success:
        true;

      workspaceId:
        string;

      payCycleId:
        string;
    }
  | {
      success:
        false;

      workspaceId:
        string | null;

      payCycleId:
        string | null;

      error:
        string;
    };

/**
 * Permanently deletes one Pay Cycle from exactly one authenticated workspace.
 *
 * Security / tenancy boundary:
 *
 * - The caller must be an owner, admin, or member of the requested workspace.
 * - The existing Pay Cycle is fetched by BOTH id and workspace_id.
 * - The delete statement is constrained by BOTH id and workspace_id.
 * - Supabase RLS remains enabled as an additional database boundary.
 *
 * IMPORTANT:
 *
 * This is intentionally different from archivePayCycle().
 *
 * archivePayCycle():
 * - Preserves the database record.
 * - Changes status to "archived".
 *
 * deletePayCycle():
 * - Permanently removes the database record.
 * - The Pay Cycle will no longer appear in Active, Paused, Archived, or All.
 *
 * This action never reads or writes localStorage.
 */
export async function deletePayCycle(
  input:
    DeletePayCycleInput,
): Promise<DeletePayCycleResult> {
  const workspaceId =
    normalizeRequiredText(
      input.workspaceId,
    );

  const payCycleId =
    normalizeRequiredText(
      input.payCycleId,
    );

  if (
    !workspaceId
  ) {
    return {
      success:
        false,

      workspaceId:
        null,

      payCycleId:
        payCycleId ??
        null,

      error:
        "A workspace is required to delete a pay cycle.",
    };
  }

  if (
    !payCycleId
  ) {
    return {
      success:
        false,

      workspaceId,

      payCycleId:
        null,

      error:
        "A valid pay cycle ID is required.",
    };
  }

  try {
    const context =
      await requireWorkspaceEditor(
        workspaceId,
      );

    const workspace =
      context.workspace;

    if (
      !workspace ||
      workspace.id !==
        workspaceId
    ) {
      return {
        success:
          false,

        workspaceId,

        payCycleId,

        error:
          "The requested workspace is not available.",
      };
    }

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "pay-cycles",

        workspaceId:
          workspace.id,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          getPayCyclesFeatureAccessMessage({
            reason:
              featureAccess.access.reason,

            requiredPlan:
              featureAccess.access.requiredPlan,
          }),
      };
    }

    const userId =
      normalizeRequiredText(
        context.user.id,
      );

    if (
      !userId
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          "CASE Budget could not verify the authenticated user.",
      };
    }

    const supabase =
      await createClient();

    /*
     * Verify that the Pay Cycle exists inside the authenticated workspace
     * before attempting the permanent delete.
     */
    const {
      data:
        existingRow,
      error:
        existingError,
    } =
      await supabase
        .from(
          PAY_CYCLES_TABLE,
        )
        .select(
          "id, workspace_id",
        )
        .eq(
          "id",
          payCycleId,
        )
        .eq(
          "workspace_id",
          workspace.id,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          getDatabaseErrorMessage(
            existingError,
            "Unable to load the pay cycle.",
          ),
      };
    }

    if (
      !existingRow
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          "The pay cycle was not found in this workspace.",
      };
    }

    if (
      normalizeRequiredText(
        existingRow.workspace_id,
      ) !==
      workspace.id
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          "The pay cycle does not belong to this workspace.",
      };
    }

    /*
     * Permanently delete the Pay Cycle.
     *
     * This is deliberately NOT an archive operation.
     *
     * Both id and workspace_id are included in the delete predicate so a
     * Pay Cycle from another workspace can never be removed by this action.
     */
    const {
      data:
        deletedRow,
      error:
        deleteError,
    } =
      await supabase
        .from(
          PAY_CYCLES_TABLE,
        )
        .delete()
        .eq(
          "id",
          payCycleId,
        )
        .eq(
          "workspace_id",
          workspace.id,
        )
        .select(
          "id, workspace_id",
        )
        .maybeSingle();

    if (
      deleteError
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          getDatabaseErrorMessage(
            deleteError,
            "Unable to delete the pay cycle.",
          ),
      };
    }

    if (
      !deletedRow
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          "The pay cycle could not be deleted from this workspace.",
      };
    }

    const deletedPayCycleId =
      normalizeRequiredText(
        deletedRow.id,
      );

    const deletedWorkspaceId =
      normalizeRequiredText(
        deletedRow.workspace_id,
      );

    if (
      deletedPayCycleId !==
        payCycleId ||
      deletedWorkspaceId !==
        workspace.id
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycleId,

        error:
          "The pay cycle delete operation returned an unexpected record.",
      };
    }

    revalidatePath(
      PAY_CYCLES_PATH,
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success:
        true,

      workspaceId:
        workspace.id,

      payCycleId,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      workspaceId,

      payCycleId,

      error:
        getUnknownErrorMessage(
          error,
          "Unable to delete the pay cycle.",
        ),
    };
  }
}

function getPayCyclesFeatureAccessMessage({
  reason,
  requiredPlan,
}: {
  reason:
    | "allowed"
    | "requires-plus"
    | "requires-pro"
    | "inactive-subscription";

  requiredPlan:
    | "free"
    | "plus"
    | "pro"
    | null;
}) {
  switch (
    reason
  ) {
    case "inactive-subscription":
      return "Pay Cycles are unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Pay Cycles require the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Pay Cycles require the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Pay Cycles require the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Pay Cycles require the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Pay Cycles are not available for the current workspace subscription.";
    }
  }
}

function normalizeRequiredText(
  value:
    unknown,
) {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized ||
    null;
}

function getDatabaseErrorMessage(
  error: {
    message?:
      string;
  },
  fallback:
    string,
) {
  return (
    normalizeRequiredText(
      error.message,
    ) ??
    fallback
  );
}

function getUnknownErrorMessage(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return fallback;
}