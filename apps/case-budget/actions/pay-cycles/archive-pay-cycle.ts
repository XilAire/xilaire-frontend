"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  requireWorkspaceEditor,
} from "@/lib/auth/require-auth";
import {
  normalizePayCycle,
  validatePayCycleDates,
} from "@/lib/pay-cycles/pay-cycle-utils";
import {
  createClient,
} from "@/lib/supabase/server";

import type {
  PayCycleData,
} from "@/types/pay-cycle";

const PAY_CYCLES_TABLE =
  "case_budget_pay_cycles";

const PAY_CYCLES_PATH =
  "/dashboard/pay-cycles";

export type ArchivePayCycleInput = {
  workspaceId:
    string;

  payCycleId:
    string;
};

export type ArchivePayCycleResult =
  | {
      success:
        true;

      workspaceId:
        string;

      payCycle:
        PayCycleData;
    }
  | {
      success:
        false;

      workspaceId:
        string | null;

      payCycle:
        null;

      error:
        string;
    };

type UnknownRecord =
  Record<
    string,
    unknown
  >;

/**
 * Soft-archives one Pay Cycle inside exactly one authenticated workspace.
 *
 * Security / tenancy boundary:
 *
 * - The caller must be an owner, admin, or member of the requested workspace.
 * - The existing Pay Cycle is fetched by BOTH id and workspace_id.
 * - The update statement is constrained by BOTH id and workspace_id.
 * - updated_by_user_id always comes from the authenticated user.
 * - Supabase RLS remains enabled as an additional database boundary.
 *
 * Archiving is intentionally implemented as status = "archived" rather than
 * deleting the row so historical planning context and auditability are kept.
 *
 * This action never reads or writes localStorage.
 */
export async function archivePayCycle(
  input:
    ArchivePayCycleInput,
): Promise<ArchivePayCycleResult> {
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

      payCycle:
        null,

      error:
        "A workspace is required to archive a pay cycle.",
    };
  }

  if (
    !payCycleId
  ) {
    return {
      success:
        false,

      workspaceId,

      payCycle:
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

        payCycle:
          null,

        error:
          "The requested workspace is not available.",
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

        payCycle:
          null,

        error:
          "CASE Budget could not verify the authenticated user.",
      };
    }

    const supabase =
      await createClient();

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
          "*",
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

        payCycle:
          null,

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

        payCycle:
          null,

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

        payCycle:
          null,

        error:
          "The pay cycle does not belong to this workspace.",
      };
    }

    if (
      existingRow.status ===
      "archived"
    ) {
      const alreadyArchived =
        mapPayCycleRow(
          existingRow,
          workspace.id,
        );

      if (
        !alreadyArchived
      ) {
        return {
          success:
            false,

          workspaceId:
            workspace.id,

          payCycle:
            null,

          error:
            "The pay cycle is already archived, but CASE Budget could not read the saved record.",
        };
      }

      return {
        success:
          true,

        workspaceId:
          workspace.id,

        payCycle:
          alreadyArchived,
      };
    }

    const updatedAt =
      new Date().toISOString();

    const {
      data:
        archivedRow,
      error:
        archiveError,
    } =
      await supabase
        .from(
          PAY_CYCLES_TABLE,
        )
        .update({
          status:
            "archived",

          updated_by_user_id:
            userId,

          updated_at:
            updatedAt,
        })
        .eq(
          "id",
          payCycleId,
        )
        .eq(
          "workspace_id",
          workspace.id,
        )
        .select(
          "*",
        )
        .maybeSingle();

    if (
      archiveError
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycle:
          null,

        error:
          getDatabaseErrorMessage(
            archiveError,
            "Unable to archive the pay cycle.",
          ),
      };
    }

    if (
      !archivedRow
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycle:
          null,

        error:
          "The pay cycle could not be archived in this workspace.",
      };
    }

    const archivedPayCycle =
      mapPayCycleRow(
        archivedRow,
        workspace.id,
      );

    if (
      !archivedPayCycle
    ) {
      return {
        success:
          false,

        workspaceId:
          workspace.id,

        payCycle:
          null,

        error:
          "The pay cycle was archived, but CASE Budget could not read the saved record.",
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

      payCycle:
        archivedPayCycle,
    };
  } catch (
    error
  ) {
    return {
      success:
        false,

      workspaceId,

      payCycle:
        null,

      error:
        getUnknownErrorMessage(
          error,
          "Unable to archive the pay cycle.",
        ),
    };
  }
}

function mapPayCycleRow(
  value:
    unknown,
  workspaceId:
    string,
): PayCycleData | null {
  if (
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  if (
    normalizeRequiredText(
      value.workspace_id,
    ) !==
    workspaceId
  ) {
    return null;
  }

  const id =
    normalizeRequiredText(
      value.id,
    );

  const name =
    normalizeRequiredText(
      value.name,
    );

  const createdAt =
    normalizeRequiredText(
      value.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      value.updated_at,
    );

  const startDate =
    normalizeDate(
      value.start_date ??
        value.first_pay_date,
    );

  const nextPayDate =
    normalizeDate(
      value.next_pay_date ??
        value.first_pay_date,
    );

  const lastPayDate =
    normalizeOptionalDate(
      value.last_pay_date,
    );

  const expectedNetAmount =
    normalizeNonNegativeMoney(
      value.expected_amount,
    );

  if (
    !id ||
    !name ||
    !createdAt ||
    !updatedAt ||
    !startDate ||
    !nextPayDate ||
    expectedNetAmount ===
      null ||
    !isPayCycleIncomeType(
      value.income_type,
    ) ||
    !isPayCycleFrequency(
      value.frequency,
    ) ||
    !isPayCycleAmountType(
      value.amount_type,
    ) ||
    !isPayCycleDayAdjustment(
      value.day_adjustment,
    ) ||
    !isPayCycleStatus(
      value.status,
    )
  ) {
    return null;
  }

  const minimumExpectedAmount =
    normalizeOptionalNonNegativeMoney(
      value.minimum_expected_amount,
    );

  const maximumExpectedAmount =
    normalizeOptionalNonNegativeMoney(
      value.maximum_expected_amount,
    );

  const employerName =
    normalizeOptionalText(
      value.employer_name,
    );

  const endDate =
    normalizeOptionalDate(
      value.end_date,
    );

  const accountId =
    normalizeOptionalText(
      value.account_id,
    );

  const notes =
    normalizeOptionalText(
      value.notes,
    );

  const firstDay =
    normalizeDayOfMonth(
      value.semimonthly_first_day,
    );

  const secondDay =
    normalizeDayOfMonth(
      value.semimonthly_second_day,
    );

  const customIntervalCount =
    normalizePositiveInteger(
      value.custom_interval_count,
    );

  const customIntervalUnit =
    normalizeCustomIntervalUnit(
      value.custom_interval_unit,
    );

  const payCycle:
    PayCycleData = {
      id,

      name,

      ...(employerName
        ? {
            employerName,
          }
        : {}),

      incomeType:
        value.income_type,

      frequency:
        value.frequency,

      amountType:
        value.amount_type,

      expectedNetAmount,

      ...(minimumExpectedAmount !==
      null
        ? {
            minimumExpectedAmount,
          }
        : {}),

      ...(maximumExpectedAmount !==
      null
        ? {
            maximumExpectedAmount,
          }
        : {}),

      startDate,

      nextPayDate,

      ...(lastPayDate
        ? {
            lastPayDate,
          }
        : {}),

      ...(endDate
        ? {
            endDate,
          }
        : {}),

      ...(accountId
        ? {
            accountId,
          }
        : {}),

      ...(firstDay !==
        null &&
      secondDay !==
        null
        ? {
            semimonthlyRule: {
              firstDayOfMonth:
                firstDay,

              secondDayOfMonth:
                secondDay,
            },
          }
        : {}),

      ...(customIntervalCount !==
        null &&
      customIntervalUnit
        ? {
            customRule: {
              intervalCount:
                customIntervalCount,

              intervalUnit:
                customIntervalUnit,
            },
          }
        : {}),

      dayAdjustment:
        value.day_adjustment,

      includeInBillPlanning:
        normalizeBoolean(
          value.include_in_bill_planning,
          true,
        ),

      includeInBudgetIncome:
        normalizeBoolean(
          value.include_in_budget_income,
          true,
        ),

      ...(notes
        ? {
            notes,
          }
        : {}),

      status:
        value.status,

      createdAt,

      updatedAt,
    };

  const normalized =
    normalizePayCycle(
      payCycle,
    );

  const validation =
    validatePayCycleDates(
      normalized,
    );

  return validation.isValid
    ? normalized
    : null;
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

function normalizeOptionalText(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  return normalizeRequiredText(
    value,
  );
}

function normalizeDate(
  value:
    unknown,
) {
  const normalized =
    normalizeRequiredText(
      value,
    );

  if (
    !normalized ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      normalized,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${normalized}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date
    .toISOString()
    .slice(
      0,
      10,
    ) ===
    normalized
    ? normalized
    : null;
}

function normalizeOptionalDate(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  return normalizeDate(
    value,
  );
}

function normalizeNonNegativeMoney(
  value:
    unknown,
) {
  const number =
    normalizeFiniteNumber(
      value,
    );

  if (
    number ===
      null ||
    number <
      0
  ) {
    return null;
  }

  return roundMoney(
    number,
  );
}

function normalizeOptionalNonNegativeMoney(
  value:
    unknown,
) {
  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  return normalizeNonNegativeMoney(
    value,
  );
}

function normalizeFiniteNumber(
  value:
    unknown,
) {
  if (
    typeof value ===
      "number" &&
    Number.isFinite(
      value,
    )
  ) {
    return value;
  }

  if (
    typeof value ===
      "string" &&
    value.trim()
  ) {
    const parsed =
      Number(
        value,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
}

function normalizePositiveInteger(
  value:
    unknown,
) {
  const number =
    normalizeFiniteNumber(
      value,
    );

  if (
    number ===
      null ||
    !Number.isInteger(
      number,
    ) ||
    number <
      1
  ) {
    return null;
  }

  return number;
}

function normalizeDayOfMonth(
  value:
    unknown,
) {
  const number =
    normalizePositiveInteger(
      value,
    );

  if (
    number ===
      null ||
    number >
      31
  ) {
    return null;
  }

  return number;
}

function normalizeCustomIntervalUnit(
  value:
    unknown,
):
  | "day"
  | "week"
  | "month"
  | null {
  switch (
    value
  ) {
    case "day":
    case "week":
    case "month":
      return value;

    default:
      return null;
  }
}

function isPayCycleIncomeType(
  value:
    unknown,
): value is PayCycleData[
  "incomeType"
] {
  switch (
    value
  ) {
    case "salary":
    case "hourly":
    case "commission":
    case "benefit":
    case "pension":
    case "retirement":
    case "business":
    case "other":
      return true;

    default:
      return false;
  }
}

function isPayCycleFrequency(
  value:
    unknown,
): value is PayCycleData[
  "frequency"
] {
  switch (
    value
  ) {
    case "weekly":
    case "biweekly":
    case "semimonthly":
    case "monthly":
    case "quarterly":
    case "irregular":
    case "custom":
      return true;

    default:
      return false;
  }
}

function isPayCycleAmountType(
  value:
    unknown,
): value is PayCycleData[
  "amountType"
] {
  switch (
    value
  ) {
    case "fixed":
    case "estimated":
    case "variable":
      return true;

    default:
      return false;
  }
}

function isPayCycleDayAdjustment(
  value:
    unknown,
): value is PayCycleData[
  "dayAdjustment"
] {
  switch (
    value
  ) {
    case "none":
    case "previous-business-day":
    case "next-business-day":
      return true;

    default:
      return false;
  }
}

function isPayCycleStatus(
  value:
    unknown,
): value is PayCycleData[
  "status"
] {
  switch (
    value
  ) {
    case "active":
    case "paused":
    case "archived":
      return true;

    default:
      return false;
  }
}

function normalizeBoolean(
  value:
    unknown,
  fallback:
    boolean,
) {
  return typeof value ===
    "boolean"
    ? value
    : fallback;
}

function roundMoney(
  value:
    number,
) {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function isRecord(
  value:
    unknown,
): value is UnknownRecord {
  return Boolean(
    value &&
      typeof value ===
        "object" &&
      !Array.isArray(
        value,
      ),
  );
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
