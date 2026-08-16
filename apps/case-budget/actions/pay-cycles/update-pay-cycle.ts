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
  UpdatePayCycleData,
} from "@/types/pay-cycle";

const PAY_CYCLES_TABLE =
  "case_budget_pay_cycles";

const ACCOUNTS_TABLE =
  "case_budget_accounts";

const PAY_CYCLES_PATH =
  "/dashboard/pay-cycles";

const MAX_NAME_LENGTH =
  120;

const MAX_EMPLOYER_NAME_LENGTH =
  160;

const MAX_NOTES_LENGTH =
  2_000;

export type UpdatePayCycleInput = {
  workspaceId:
    string;

  payCycle:
    UpdatePayCycleData;
};

export type UpdatePayCycleResult =
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

      fieldErrors?:
        Partial<
          Record<
            keyof UpdatePayCycleData,
            string
          >
        >;
    };

type ValidatedUpdatePayCycle = {
  id:
    string;

  name:
    string;

  employerName:
    string | null;

  incomeType:
    UpdatePayCycleData[
      "incomeType"
    ];

  frequency:
    UpdatePayCycleData[
      "frequency"
    ];

  amountType:
    UpdatePayCycleData[
      "amountType"
    ];

  expectedNetAmount:
    number;

  minimumExpectedAmount:
    number | null;

  maximumExpectedAmount:
    number | null;

  startDate:
    string;

  nextPayDate:
    string;

  lastPayDate:
    string | null;

  endDate:
    string | null;

  accountId:
    string | null;

  semimonthlyFirstDay:
    number | null;

  semimonthlySecondDay:
    number | null;

  customIntervalCount:
    number | null;

  customIntervalUnit:
    "day" | "week" | "month" | null;

  dayAdjustment:
    UpdatePayCycleData[
      "dayAdjustment"
    ];

  includeInBillPlanning:
    boolean;

  includeInBudgetIncome:
    boolean;

  notes:
    string | null;

  status:
    UpdatePayCycleData[
      "status"
    ];
};

type UnknownRecord =
  Record<
    string,
    unknown
  >;

/**
 * Updates one existing Pay Cycle inside exactly one authenticated workspace.
 *
 * Security / tenancy boundary:
 *
 * - The caller must be an owner, admin, or member of the requested workspace.
 * - The existing Pay Cycle is fetched by BOTH id and workspace_id.
 * - The update statement is constrained by BOTH id and workspace_id.
 * - updated_by_user_id always comes from the authenticated user.
 * - A linked account must belong to the same workspace and remain active.
 * - Supabase RLS remains enabled as an additional database boundary.
 *
 * This action never reads or writes localStorage.
 */
export async function updatePayCycle(
  input:
    UpdatePayCycleInput,
): Promise<UpdatePayCycleResult> {
  const workspaceId =
    normalizeRequiredText(
      input.workspaceId,
    );

  if (
    !workspaceId
  ) {
    return createFailureResult({
      workspaceId:
        null,

      error:
        "A workspace is required to update a pay cycle.",
    });
  }

  const validation =
    validateUpdatePayCycle(
      input.payCycle,
    );

  if (
    !validation.success
  ) {
    return createFailureResult({
      workspaceId,

      error:
        "Review the pay cycle details and try again.",

      fieldErrors:
        validation.fieldErrors,
    });
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
      return createFailureResult({
        workspaceId,

        error:
          "The requested workspace is not available.",
      });
    }

    const userId =
      normalizeRequiredText(
        context.user.id,
      );

    if (
      !userId
    ) {
      return createFailureResult({
        workspaceId,

        error:
          "CASE Budget could not verify the authenticated user.",
      });
    }

    const validated =
      validation.value;

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
          validated.id,
        )
        .eq(
          "workspace_id",
          workspace.id,
        )
        .maybeSingle();

    if (
      existingError
    ) {
      return createFailureResult({
        workspaceId:
          workspace.id,

        error:
          getDatabaseErrorMessage(
            existingError,
            "Unable to load the pay cycle.",
          ),
      });
    }

    if (
      !existingRow
    ) {
      return createFailureResult({
        workspaceId:
          workspace.id,

        error:
          "The pay cycle was not found in this workspace.",
      });
    }

    if (
      normalizeRequiredText(
        existingRow.workspace_id,
      ) !==
      workspace.id
    ) {
      return createFailureResult({
        workspaceId:
          workspace.id,

        error:
          "The pay cycle does not belong to this workspace.",
      });
    }

    if (
      validated.accountId
    ) {
      const accountValidation =
        await validateDestinationAccount({
          supabase,
          workspaceId:
            workspace.id,
          accountId:
            validated.accountId,
        });

      if (
        !accountValidation.success
      ) {
        return createFailureResult({
          workspaceId:
            workspace.id,

          error:
            accountValidation.error,

          fieldErrors: {
            accountId:
              accountValidation.error,
          },
        });
      }
    }

    const updatedAt =
      new Date().toISOString();

    /*
     * first_pay_date remains synchronized during the migration because the
     * initial persistence schema created it as a required field. The richer
     * Pay Cycle model treats start_date / next_pay_date as canonical.
     */
    const updateRow = {
      updated_by_user_id:
        userId,

      name:
        validated.name,

      employer_name:
        validated.employerName,

      income_type:
        validated.incomeType,

      frequency:
        validated.frequency,

      amount_type:
        validated.amountType,

      expected_amount:
        validated.expectedNetAmount,

      minimum_expected_amount:
        validated.minimumExpectedAmount,

      maximum_expected_amount:
        validated.maximumExpectedAmount,

      first_pay_date:
        validated.nextPayDate,

      start_date:
        validated.startDate,

      next_pay_date:
        validated.nextPayDate,

      last_pay_date:
        validated.lastPayDate,

      end_date:
        validated.endDate,

      account_id:
        validated.accountId,

      semimonthly_first_day:
        validated.semimonthlyFirstDay,

      semimonthly_second_day:
        validated.semimonthlySecondDay,

      custom_interval_count:
        validated.customIntervalCount,

      custom_interval_unit:
        validated.customIntervalUnit,

      day_adjustment:
        validated.dayAdjustment,

      include_in_bill_planning:
        validated.includeInBillPlanning,

      include_in_budget_income:
        validated.includeInBudgetIncome,

      notes:
        validated.notes,

      status:
        validated.status,

      updated_at:
        updatedAt,
    };

    const {
      data:
        updatedRow,
      error:
        updateError,
    } =
      await supabase
        .from(
          PAY_CYCLES_TABLE,
        )
        .update(
          updateRow,
        )
        .eq(
          "id",
          validated.id,
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
      updateError
    ) {
      return createFailureResult({
        workspaceId:
          workspace.id,

        error:
          getDatabaseErrorMessage(
            updateError,
            "Unable to update the pay cycle.",
          ),
      });
    }

    if (
      !updatedRow
    ) {
      return createFailureResult({
        workspaceId:
          workspace.id,

        error:
          "The pay cycle could not be updated in this workspace.",
      });
    }

    const updatedPayCycle =
      mapPayCycleRow(
        updatedRow,
        workspace.id,
      );

    if (
      !updatedPayCycle
    ) {
      return createFailureResult({
        workspaceId:
          workspace.id,

        error:
          "The pay cycle was updated, but CASE Budget could not read the saved record.",
      });
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
        updatedPayCycle,
    };
  } catch (
    error
  ) {
    return createFailureResult({
      workspaceId,

      error:
        getUnknownErrorMessage(
          error,
          "Unable to update the pay cycle.",
        ),
    });
  }
}

type UpdateValidationResult =
  | {
      success:
        true;

      value:
        ValidatedUpdatePayCycle;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof UpdatePayCycleData,
            string
          >
        >;
    };

function validateUpdatePayCycle(
  input:
    UpdatePayCycleData,
): UpdateValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof UpdatePayCycleData,
        string
      >
    > = {};

  const id =
    normalizeRequiredText(
      input.id,
    );

  if (
    !id
  ) {
    fieldErrors.id =
      "A valid pay cycle ID is required.";
  }

  const name =
    normalizeRequiredText(
      input.name,
    );

  if (
    !name
  ) {
    fieldErrors.name =
      "Pay cycle name is required.";
  } else if (
    name.length >
      MAX_NAME_LENGTH
  ) {
    fieldErrors.name =
      `Pay cycle name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }

  const employerName =
    normalizeOptionalText(
      input.employerName,
    );

  if (
    employerName &&
    employerName.length >
      MAX_EMPLOYER_NAME_LENGTH
  ) {
    fieldErrors.employerName =
      `Employer name must be ${MAX_EMPLOYER_NAME_LENGTH} characters or fewer.`;
  }

  if (
    !isPayCycleIncomeType(
      input.incomeType,
    )
  ) {
    fieldErrors.incomeType =
      "Select a valid income type.";
  }

  if (
    !isPayCycleFrequency(
      input.frequency,
    )
  ) {
    fieldErrors.frequency =
      "Select a valid pay frequency.";
  }

  if (
    !isPayCycleAmountType(
      input.amountType,
    )
  ) {
    fieldErrors.amountType =
      "Select a valid amount type.";
  }

  const expectedNetAmount =
    normalizeNonNegativeMoney(
      input.expectedNetAmount,
    );

  if (
    expectedNetAmount ===
      null
  ) {
    fieldErrors.expectedNetAmount =
      "Expected net amount must be zero or greater.";
  }

  const minimumExpectedAmount =
    normalizeOptionalNonNegativeMoney(
      input.minimumExpectedAmount,
    );

  if (
    input.minimumExpectedAmount !==
      undefined &&
    minimumExpectedAmount ===
      null
  ) {
    fieldErrors.minimumExpectedAmount =
      "Minimum expected amount must be zero or greater.";
  }

  const maximumExpectedAmount =
    normalizeOptionalNonNegativeMoney(
      input.maximumExpectedAmount,
    );

  if (
    input.maximumExpectedAmount !==
      undefined &&
    maximumExpectedAmount ===
      null
  ) {
    fieldErrors.maximumExpectedAmount =
      "Maximum expected amount must be zero or greater.";
  }

  if (
    minimumExpectedAmount !==
      null &&
    maximumExpectedAmount !==
      null &&
    minimumExpectedAmount >
      maximumExpectedAmount
  ) {
    fieldErrors.maximumExpectedAmount =
      "Maximum expected amount must be greater than or equal to the minimum expected amount.";
  }

  const startDate =
    normalizeDate(
      input.startDate,
    );

  if (
    !startDate
  ) {
    fieldErrors.startDate =
      "A valid start date is required.";
  }

  const nextPayDate =
    normalizeDate(
      input.nextPayDate,
    );

  if (
    !nextPayDate
  ) {
    fieldErrors.nextPayDate =
      "A valid next pay date is required.";
  }

  const lastPayDate =
    normalizeOptionalDate(
      input.lastPayDate,
    );

  if (
    input.lastPayDate &&
    !lastPayDate
  ) {
    fieldErrors.lastPayDate =
      "Enter a valid last pay date.";
  }

  const endDate =
    normalizeOptionalDate(
      input.endDate,
    );

  if (
    input.endDate &&
    !endDate
  ) {
    fieldErrors.endDate =
      "Enter a valid end date.";
  }

  if (
    startDate &&
    endDate &&
    endDate <
      startDate
  ) {
    fieldErrors.endDate =
      "End date cannot be earlier than the start date.";
  }

  const accountId =
    normalizeOptionalText(
      input.accountId,
    );

  if (
    input.accountId &&
    !accountId
  ) {
    fieldErrors.accountId =
      "Select a valid destination account.";
  }

  let semimonthlyFirstDay:
    number | null =
    null;

  let semimonthlySecondDay:
    number | null =
    null;

  if (
    input.frequency ===
      "semimonthly"
  ) {
    semimonthlyFirstDay =
      normalizeDayOfMonth(
        input.semimonthlyRule
          ?.firstDayOfMonth,
      );

    semimonthlySecondDay =
      normalizeDayOfMonth(
        input.semimonthlyRule
          ?.secondDayOfMonth,
      );

    if (
      semimonthlyFirstDay ===
        null ||
      semimonthlySecondDay ===
        null
    ) {
      fieldErrors.semimonthlyRule =
        "Semimonthly pay cycles require two valid days of the month.";
    } else if (
      semimonthlyFirstDay ===
      semimonthlySecondDay
    ) {
      fieldErrors.semimonthlyRule =
        "Semimonthly pay days must be different.";
    }
  }

  let customIntervalCount:
    number | null =
    null;

  let customIntervalUnit:
    "day" | "week" | "month" | null =
    null;

  if (
    input.frequency ===
      "custom"
  ) {
    customIntervalCount =
      normalizePositiveInteger(
        input.customRule
          ?.intervalCount,
      );

    customIntervalUnit =
      normalizeCustomIntervalUnit(
        input.customRule
          ?.intervalUnit,
      );

    if (
      customIntervalCount ===
        null ||
      !customIntervalUnit
    ) {
      fieldErrors.customRule =
        "Custom pay cycles require a valid interval.";
    }
  }

  if (
    !isPayCycleDayAdjustment(
      input.dayAdjustment,
    )
  ) {
    fieldErrors.dayAdjustment =
      "Select a valid pay-date adjustment.";
  }

  if (
    typeof input.includeInBillPlanning !==
      "boolean"
  ) {
    fieldErrors.includeInBillPlanning =
      "Choose whether this pay cycle should be included in bill planning.";
  }

  if (
    typeof input.includeInBudgetIncome !==
      "boolean"
  ) {
    fieldErrors.includeInBudgetIncome =
      "Choose whether this pay cycle should be included in budget income.";
  }

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  if (
    notes &&
    notes.length >
      MAX_NOTES_LENGTH
  ) {
    fieldErrors.notes =
      `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`;
  }

  if (
    !isPayCycleStatus(
      input.status,
    )
  ) {
    fieldErrors.status =
      "Select a valid pay cycle status.";
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !id ||
    !name ||
    !isPayCycleIncomeType(
      input.incomeType,
    ) ||
    !isPayCycleFrequency(
      input.frequency,
    ) ||
    !isPayCycleAmountType(
      input.amountType,
    ) ||
    expectedNetAmount ===
      null ||
    !startDate ||
    !nextPayDate ||
    !isPayCycleDayAdjustment(
      input.dayAdjustment,
    ) ||
    !isPayCycleStatus(
      input.status,
    )
  ) {
    return {
      success:
        false,

      fieldErrors,
    };
  }

  const validationCandidate:
    PayCycleData = {
      id,

      name,

      ...(employerName
        ? {
            employerName,
          }
        : {}),

      incomeType:
        input.incomeType,

      frequency:
        input.frequency,

      amountType:
        input.amountType,

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

      ...(semimonthlyFirstDay !==
        null &&
      semimonthlySecondDay !==
        null
        ? {
            semimonthlyRule: {
              firstDayOfMonth:
                semimonthlyFirstDay,

              secondDayOfMonth:
                semimonthlySecondDay,
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
        input.dayAdjustment,

      includeInBillPlanning:
        input.includeInBillPlanning,

      includeInBudgetIncome:
        input.includeInBudgetIncome,

      ...(notes
        ? {
            notes,
          }
        : {}),

      status:
        input.status,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    };

  const normalizedCandidate =
    normalizePayCycle(
      validationCandidate,
    );

  const dateValidation =
    validatePayCycleDates(
      normalizedCandidate,
    );

  if (
    !dateValidation.isValid
  ) {
    fieldErrors.nextPayDate =
      dateValidation.errors.join(
        " ",
      );

    return {
      success:
        false,

      fieldErrors,
    };
  }

  return {
    success:
      true,

    value: {
      id,

      name,

      employerName,

      incomeType:
        input.incomeType,

      frequency:
        input.frequency,

      amountType:
        input.amountType,

      expectedNetAmount,

      minimumExpectedAmount,

      maximumExpectedAmount,

      startDate,

      nextPayDate,

      lastPayDate,

      endDate,

      accountId,

      semimonthlyFirstDay,

      semimonthlySecondDay,

      customIntervalCount,

      customIntervalUnit,

      dayAdjustment:
        input.dayAdjustment,

      includeInBillPlanning:
        input.includeInBillPlanning,

      includeInBudgetIncome:
        input.includeInBudgetIncome,

      notes,

      status:
        input.status,
    },
  };
}

async function validateDestinationAccount({
  supabase,
  workspaceId,
  accountId,
}: {
  supabase:
    Awaited<
      ReturnType<
        typeof createClient
      >
    >;

  workspaceId:
    string;

  accountId:
    string;
}) {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        ACCOUNTS_TABLE,
      )
      .select(
        "id, workspace_id, is_active, is_archived",
      )
      .eq(
        "id",
        accountId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    return {
      success:
        false as const,

      error:
        getDatabaseErrorMessage(
          error,
          "Unable to verify the destination account.",
        ),
    };
  }

  if (
    !data ||
    data.workspace_id !==
      workspaceId
  ) {
    return {
      success:
        false as const,

      error:
        "The selected destination account does not belong to this workspace.",
    };
  }

  if (
    data.is_archived ||
    !data.is_active
  ) {
    return {
      success:
        false as const,

      error:
        "The selected destination account is not active.",
    };
  }

  return {
    success:
      true as const,
  };
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

function createFailureResult({
  workspaceId,
  error,
  fieldErrors,
}: {
  workspaceId:
    string | null;

  error:
    string;

  fieldErrors?:
    Partial<
      Record<
        keyof UpdatePayCycleData,
        string
      >
    >;
}): UpdatePayCycleResult {
  return {
    success:
      false,

    workspaceId,

    payCycle:
      null,

    error,

    ...(fieldErrors
      ? {
          fieldErrors,
        }
      : {}),
  };
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
): value is UpdatePayCycleData[
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
): value is UpdatePayCycleData[
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
): value is UpdatePayCycleData[
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
): value is UpdatePayCycleData[
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
): value is UpdatePayCycleData[
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
