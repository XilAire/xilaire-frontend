"use server";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";


import {
  resolveAuthenticatedFeatureAccess,
} from "@/lib/subscriptions/subscription-access";

import {
  createWorkspaceAdminClient,
} from "@/lib/supabase/admin";

import type {
  CaseBudgetCalendarEventDatabaseRow,
  Json,
  WorkspaceMembershipStatusDatabaseEnum,
  WorkspaceRoleDatabaseEnum,
} from "@/types/database";

import type {
  FinancialCalendarEvent,
  FinancialCalendarEventPriority,
  FinancialCalendarEventStatus,
  FinancialCalendarEventType,
  FinancialCalendarRecurrenceEndType,
  FinancialCalendarRecurrenceFrequency,
  FinancialCalendarRecurrenceRule,
  FinancialCalendarReminder,
  FinancialCalendarReminderUnit,
  FinancialCalendarWeekday,
  GetFinancialCalendarEventsResult,
} from "@/types/calendar";

type WorkspaceRow = {
  id:
    string;

  owner_user_id:
    string;

  is_active:
    boolean;
};

type MembershipRow = {
  id:
    string;

  workspace_id:
    string;

  user_id:
    string;

  role:
    WorkspaceRoleDatabaseEnum;

  status:
    WorkspaceMembershipStatusDatabaseEnum;
};

/**
 * Loads canonical manual financial-calendar events for the authenticated
 * active CASE Budget workspace.
 *
 * Production rules:
 *
 * - The active workspace comes only from trusted server auth state.
 * - The browser never supplies workspace_id.
 * - The workspace must exist and remain active.
 * - The caller must have an active workspace membership.
 * - The query is explicitly scoped by workspace_id.
 * - Archived manual events are excluded.
 * - Generated bill/paycheck/transaction events are NOT stored here and remain
 *   derived by CalendarProvider from their canonical production providers.
 * - Invalid database rows are skipped instead of leaking malformed data into
 *   the client domain model.
 * - Supabase is the only persistence source.
 * - No localStorage or sessionStorage is read or written.
 */
export async function getCalendarEvents():
  Promise<GetFinancialCalendarEventsResult> {
  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

    const featureAccess =
      await resolveAuthenticatedFeatureAccess({
        feature:
          "calendar",

        workspaceId,
      });

    if (
      !featureAccess.access.allowed
    ) {
      return failure(
        getCalendarFeatureAccessMessage({
          reason:
            featureAccess.access.reason,

          requiredPlan:
            featureAccess.access.requiredPlan,
        }),
      );
    }

    const workspaceResult =
      await loadWorkspace({
        workspaceId,
      });

    if (
      !workspaceResult.success
    ) {
      return failure(
        workspaceResult.message,
      );
    }

    const membershipResult =
      await loadMembership({
        workspaceId,
        userId,
      });

    if (
      !membershipResult.success
    ) {
      return failure(
        membershipResult.message,
      );
    }

    const admin =
      createWorkspaceAdminClient();

    const {
      data,
      error,
    } =
      await admin
        .from(
          "case_budget_calendar_events",
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,title,description,notes,event_type,status,priority,event_date,start_time,end_time,is_all_day,amount,account_id,category_id,recurrence,reminders,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "is_archived",
          false,
        )
        .order(
          "event_date",
          {
            ascending:
              true,
          },
        )
        .order(
          "start_time",
          {
            ascending:
              true,
            nullsFirst:
              true,
          },
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          },
        );

    if (
      error
    ) {
      console.error(
        "[CASE Budget Calendar] Failed to load manual calendar events.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return failure(
        "CASE Budget could not load calendar events for this workspace.",
      );
    }

    const rows =
      (
        data ??
        []
      ) as unknown as
        CaseBudgetCalendarEventDatabaseRow[];

    const events:
      FinancialCalendarEvent[] =
      [];

    for (
      const row of
        rows
    ) {
      const mapped =
        mapCalendarEventRow({
          row,
          workspaceId,
        });

      if (
        !mapped
      ) {
        console.error(
          "[CASE Budget Calendar] Skipping invalid manual calendar event row.",
          {
            workspaceId,
            calendarEventId:
              row.id,
          },
        );

        continue;
      }

      events.push(
        mapped,
      );
    }

    return {
      success:
        true,

      events,
    };
  } catch (
    error
  ) {
    if (
      error instanceof
      CaseBudgetServerAuthError
    ) {
      return failure(
        error.message,
      );
    }

    console.error(
      "[CASE Budget Calendar] Unexpected get-calendar-events error.",
      error,
    );

    return failure(
      "CASE Budget could not load calendar events. Please try again.",
    );
  }
}

async function loadWorkspace({
  workspaceId,
}: {
  workspaceId:
    string;
}):
  Promise<
    | {
        success:
          true;

        workspace:
          WorkspaceRow;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "workspaces",
      )
      .select(
        "id,owner_user_id,is_active",
      )
      .eq(
        "id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Calendar] Failed to load active workspace.",
      {
        workspaceId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not load the active workspace.",
    };
  }

  const workspace =
    data as unknown as
      | WorkspaceRow
      | null;

  if (
    !workspace
  ) {
    return {
      success:
        false,

      message:
        "The active CASE Budget workspace could not be found.",
    };
  }

  if (
    !workspace.is_active
  ) {
    return {
      success:
        false,

      message:
        "Calendar events are unavailable because this workspace is inactive.",
    };
  }

  return {
    success:
      true,

    workspace,
  };
}

async function loadMembership({
  workspaceId,
  userId,
}: {
  workspaceId:
    string;

  userId:
    string;
}):
  Promise<
    | {
        success:
          true;

        membership:
          MembershipRow;
      }
    | {
        success:
          false;

        message:
          string;
      }
  > {
  const admin =
    createWorkspaceAdminClient();

  const {
    data,
    error,
  } =
    await admin
      .from(
        "workspace_members",
      )
      .select(
        "id,workspace_id,user_id,role,status",
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .eq(
        "user_id",
        userId,
      )
      .maybeSingle();

  if (
    error
  ) {
    console.error(
      "[CASE Budget Calendar] Failed to verify workspace membership.",
      {
        workspaceId,
        userId,
        error,
      },
    );

    return {
      success:
        false,

      message:
        "CASE Budget could not verify your workspace access.",
    };
  }

  const membership =
    data as unknown as
      | MembershipRow
      | null;

  if (
    !membership ||
    membership.status !==
      "active"
  ) {
    return {
      success:
        false,

      message:
        "You do not have active access to the calendar in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function mapCalendarEventRow({
  row,
  workspaceId,
}: {
  row:
    CaseBudgetCalendarEventDatabaseRow;

  workspaceId:
    string;
}): FinancialCalendarEvent | null {
  if (
    row.workspace_id !==
      workspaceId ||
    row.is_archived
  ) {
    return null;
  }

  const title =
    normalizeRequiredText(
      row.title,
    );

  const type =
    normalizeEventType(
      row.event_type,
    );

  const status =
    normalizeEventStatus(
      row.status,
    );

  const priority =
    normalizeEventPriority(
      row.priority,
    );

  const date =
    normalizeDate(
      row.event_date,
    );

  if (
    !title ||
    !type ||
    !status ||
    !priority ||
    !date
  ) {
    return null;
  }

  const startTime =
    normalizeOptionalTime(
      row.start_time,
    );

  const endTime =
    normalizeOptionalTime(
      row.end_time,
    );

  if (
    row.start_time !==
      null &&
    startTime ===
      null
  ) {
    return null;
  }

  if (
    row.end_time !==
      null &&
    endTime ===
      null
  ) {
    return null;
  }

  if (
    row.is_all_day &&
    (
      startTime !==
        null ||
      endTime !==
        null
    )
  ) {
    return null;
  }

  const amount =
    normalizeOptionalNonNegativeMoney(
      row.amount,
    );

  if (
    row.amount !==
      null &&
    amount ===
      null
  ) {
    return null;
  }

  const recurrence =
    parseRecurrence(
      row.recurrence,
    );

  if (
    row.recurrence !==
      null &&
    recurrence ===
      null
  ) {
    return null;
  }

  const reminders =
    parseReminders(
      row.reminders,
    );

  if (
    reminders ===
      null
  ) {
    return null;
  }

  const description =
    normalizeOptionalText(
      row.description,
    );

  const notes =
    normalizeOptionalText(
      row.notes,
    );

  const accountId =
    normalizeOptionalText(
      row.account_id,
    );

  const categoryId =
    normalizeOptionalText(
      row.category_id,
    );

  const createdAt =
    normalizeRequiredText(
      row.created_at,
    );

  const updatedAt =
    normalizeRequiredText(
      row.updated_at,
    );

  if (
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id:
      row.id,

    title,

    ...(description
      ? {
          description,
        }
      : {}),

    ...(notes
      ? {
          notes,
        }
      : {}),

    type,

    status,

    priority,

    date,

    ...(startTime
      ? {
          startTime,
        }
      : {}),

    ...(endTime
      ? {
          endTime,
        }
      : {}),

    isAllDay:
      row.is_all_day,

    ...(amount !==
      null
      ? {
          amount,
        }
      : {}),

    ...(accountId
      ? {
          accountId,
        }
      : {}),

    ...(categoryId
      ? {
          categoryId,
        }
      : {}),

    source: {
      type:
        "manual",

      id:
        row.id,
    },

    ...(recurrence
      ? {
          recurrence,
        }
      : {}),

    reminders,

    isAutoGenerated:
      false,

    createdAt,

    updatedAt,
  };
}

function parseRecurrence(
  value:
    Json | null,
): FinancialCalendarRecurrenceRule | null {
  if (
    value ===
      null ||
    !isRecord(
      value,
    )
  ) {
    return null;
  }

  const frequency =
    normalizeRecurrenceFrequency(
      value.frequency,
    );

  const interval =
    normalizePositiveInteger(
      value.interval,
    );

  const endType =
    normalizeRecurrenceEndType(
      value.endType,
    );

  if (
    !frequency ||
    interval ===
      null ||
    !endType
  ) {
    return null;
  }

  const recurrenceRule:
    FinancialCalendarRecurrenceRule = {
      frequency,
      interval,
      endType,
    };

  if (
    value.weekdays !==
      undefined
  ) {
    const weekdays =
      parseWeekdays(
        value.weekdays,
      );

    if (
      weekdays ===
        null
    ) {
      return null;
    }

    recurrenceRule.weekdays =
      weekdays;
  }

  if (
    value.dayOfMonth !==
      undefined
  ) {
    const dayOfMonth =
      normalizeDayOfMonth(
        value.dayOfMonth,
      );

    if (
      dayOfMonth ===
        null
    ) {
      return null;
    }

    recurrenceRule.dayOfMonth =
      dayOfMonth;
  }

  if (
    value.firstDayOfMonth !==
      undefined
  ) {
    const firstDayOfMonth =
      normalizeDayOfMonth(
        value.firstDayOfMonth,
      );

    if (
      firstDayOfMonth ===
        null
    ) {
      return null;
    }

    recurrenceRule.firstDayOfMonth =
      firstDayOfMonth;
  }

  if (
    value.secondDayOfMonth !==
      undefined
  ) {
    const secondDayOfMonth =
      normalizeDayOfMonth(
        value.secondDayOfMonth,
      );

    if (
      secondDayOfMonth ===
        null
    ) {
      return null;
    }

    recurrenceRule.secondDayOfMonth =
      secondDayOfMonth;
  }

  if (
    value.monthOfYear !==
      undefined
  ) {
    const monthOfYear =
      normalizeMonthOfYear(
        value.monthOfYear,
      );

    if (
      monthOfYear ===
        null
    ) {
      return null;
    }

    recurrenceRule.monthOfYear =
      monthOfYear;
  }

  if (
    value.endDate !==
      undefined
  ) {
    const endDate =
      normalizeDate(
        value.endDate,
      );

    if (
      endDate ===
        null
    ) {
      return null;
    }

    recurrenceRule.endDate =
      endDate;
  }

  if (
    value.occurrenceCount !==
      undefined
  ) {
    const occurrenceCount =
      normalizePositiveInteger(
        value.occurrenceCount,
      );

    if (
      occurrenceCount ===
        null
    ) {
      return null;
    }

    recurrenceRule.occurrenceCount =
      occurrenceCount;
  }

  if (
    recurrenceRule.endType ===
      "date" &&
    !recurrenceRule.endDate
  ) {
    return null;
  }

  if (
    recurrenceRule.endType ===
      "occurrences" &&
    recurrenceRule.occurrenceCount ===
      undefined
  ) {
    return null;
  }

  return recurrenceRule;
}

function parseReminders(
  value:
    Json,
): FinancialCalendarReminder[] | null {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return null;
  }

  const reminders:
    FinancialCalendarReminder[] =
    [];

  for (
    const candidate of
      value
  ) {
    if (
      !isRecord(
        candidate,
      )
    ) {
      return null;
    }

    const id =
      normalizeRequiredText(
        candidate.id,
      );

    const amount =
      normalizeNonNegativeInteger(
        candidate.amount,
      );

    const unit =
      normalizeReminderUnit(
        candidate.unit,
      );

    const isEnabled =
      candidate.isEnabled;

    if (
      !id ||
      amount ===
        null ||
      !unit ||
      typeof isEnabled !==
        "boolean"
    ) {
      return null;
    }

    reminders.push({
      id,

      amount,

      unit,

      isEnabled,
    });
  }

  return reminders;
}

function normalizeEventType(
  value:
    unknown,
): FinancialCalendarEventType | null {
  switch (
    value
  ) {
    case "bill":
    case "paycheck":
    case "transaction":
    case "income":
    case "savings-contribution":
    case "debt-payment":
    case "transfer":
    case "reminder":
    case "custom":
      return value;

    default:
      return null;
  }
}

function normalizeEventStatus(
  value:
    unknown,
): FinancialCalendarEventStatus | null {
  switch (
    value
  ) {
    case "scheduled":
    case "due":
    case "past-due":
    case "pending":
    case "completed":
    case "skipped":
    case "canceled":
      return value;

    default:
      return null;
  }
}

function normalizeEventPriority(
  value:
    unknown,
): FinancialCalendarEventPriority | null {
  switch (
    value
  ) {
    case "critical":
    case "high":
    case "normal":
    case "low":
      return value;

    default:
      return null;
  }
}

function normalizeRecurrenceFrequency(
  value:
    unknown,
): FinancialCalendarRecurrenceFrequency | null {
  switch (
    value
  ) {
    case "daily":
    case "weekly":
    case "biweekly":
    case "semimonthly":
    case "monthly":
    case "quarterly":
    case "yearly":
    case "custom":
      return value;

    default:
      return null;
  }
}

function normalizeRecurrenceEndType(
  value:
    unknown,
): FinancialCalendarRecurrenceEndType | null {
  switch (
    value
  ) {
    case "never":
    case "date":
    case "occurrences":
      return value;

    default:
      return null;
  }
}

function normalizeReminderUnit(
  value:
    unknown,
): FinancialCalendarReminderUnit | null {
  switch (
    value
  ) {
    case "minute":
    case "hour":
    case "day":
    case "week":
      return value;

    default:
      return null;
  }
}

function parseWeekdays(
  value:
    unknown,
): FinancialCalendarWeekday[] | null {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return null;
  }

  const weekdays:
    FinancialCalendarWeekday[] =
    [];

  for (
    const candidate of
      value
  ) {
    if (
      !isFinancialCalendarWeekday(
        candidate,
      )
    ) {
      return null;
    }

    weekdays.push(
      candidate,
    );
  }

  return weekdays;
}

function isFinancialCalendarWeekday(
  value:
    unknown,
): value is FinancialCalendarWeekday {
  return (
    value ===
      0 ||
    value ===
      1 ||
    value ===
      2 ||
    value ===
      3 ||
    value ===
      4 ||
    value ===
      5 ||
    value ===
      6
  );
}

function normalizeRequiredText(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      "string"
  ) {
    return null;
  }

  const normalized =
    value.trim();

  return normalized
    ? normalized
    : null;
}

function normalizeOptionalText(
  value:
    unknown,
): string | null {
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

function normalizeDatabaseNumber(
  value:
    unknown,
): number | null {
  if (
    typeof value ===
      "number"
  ) {
    return Number.isFinite(
      value,
    )
      ? value
      : null;
  }

  if (
    typeof value ===
      "string"
  ) {
    const normalized =
      value.trim();

    if (
      !normalized
    ) {
      return null;
    }

    const parsed =
      Number(
        normalized,
      );

    return Number.isFinite(
      parsed,
    )
      ? parsed
      : null;
  }

  return null;
}

function normalizeOptionalNonNegativeMoney(
  value:
    unknown,
): number | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const normalized =
    normalizeDatabaseNumber(
      value,
    );

  if (
    normalized ===
      null ||
    normalized <
      0
  ) {
    return null;
  }

  return roundMoney(
    normalized,
  );
}

function normalizePositiveInteger(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseNumber(
      value,
    );

  if (
    normalized ===
      null ||
    !Number.isInteger(
      normalized,
    ) ||
    normalized <=
      0
  ) {
    return null;
  }

  return normalized;
}

function normalizeNonNegativeInteger(
  value:
    unknown,
): number | null {
  const normalized =
    normalizeDatabaseNumber(
      value,
    );

  if (
    normalized ===
      null ||
    !Number.isInteger(
      normalized,
    ) ||
    normalized <
      0
  ) {
    return null;
  }

  return normalized;
}

function normalizeDayOfMonth(
  value:
    unknown,
): number | null {
  const normalized =
    normalizePositiveInteger(
      value,
    );

  if (
    normalized ===
      null ||
    normalized >
      31
  ) {
    return null;
  }

  return normalized;
}

function normalizeMonthOfYear(
  value:
    unknown,
): number | null {
  const normalized =
    normalizePositiveInteger(
      value,
    );

  if (
    normalized ===
      null ||
    normalized >
      12
  ) {
    return null;
  }

  return normalized;
}

function normalizeDate(
  value:
    unknown,
): string | null {
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

function normalizeOptionalTime(
  value:
    unknown,
): string | null {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const normalized =
    normalizeRequiredText(
      value,
    );

  if (
    !normalized
  ) {
    return null;
  }

  const match =
    normalized.match(
      /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?$/,
    );

  if (
    !match
  ) {
    return null;
  }

  const hours =
    match[1];

  const minutes =
    match[2];

  const seconds =
    match[3];

  return seconds
    ? `${hours}:${minutes}:${seconds}`
    : `${hours}:${minutes}`;
}

function isRecord(
  value:
    unknown,
): value is Record<string, Json | undefined> {
  return Boolean(
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    ),
  );
}

function roundMoney(
  value:
    number,
): number {
  return Math.round(
    (
      value +
      Number.EPSILON
    ) *
      100,
  ) /
    100;
}

function getCalendarFeatureAccessMessage({
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
      return "Calendar is unavailable because this workspace subscription is inactive. Please reactivate the subscription to continue.";

    case "requires-pro":
      return "Calendar requires the CASE Budget Pro plan for this workspace.";

    case "requires-plus":
      return "Calendar requires the CASE Budget Plus plan or higher for this workspace.";

    case "allowed":
    default: {
      if (
        requiredPlan ===
        "pro"
      ) {
        return "Calendar requires the CASE Budget Pro plan for this workspace.";
      }

      if (
        requiredPlan ===
        "plus"
      ) {
        return "Calendar requires the CASE Budget Plus plan or higher for this workspace.";
      }

      return "Calendar is not available for the current workspace subscription.";
    }
  }
}

function failure(
  message:
    string,
): GetFinancialCalendarEventsResult {
  return {
    success:
      false,

    error:
      message,
  };
}
