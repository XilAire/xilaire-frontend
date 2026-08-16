"use server";

import {
  revalidatePath,
} from "next/cache";

import {
  CaseBudgetServerAuthError,
  requireCaseBudgetServerAuth,
} from "@/lib/auth/server-auth";

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
  ArchiveFinancialCalendarEventResult,
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
} from "@/types/calendar";

const CALENDAR_PATH =
  "/dashboard/calendar";

export type ArchiveCalendarEventInput = {
  eventId:
    string;

  archived?:
    boolean;
};

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
 * Soft-archives or restores one manual calendar event.
 *
 * Production guarantees:
 *
 * - The active workspace comes only from trusted server auth.
 * - workspace_id is never accepted from the browser.
 * - The event is loaded by id + workspace_id.
 * - Only active non-viewer members may archive or restore.
 * - Archiving never permanently deletes the row.
 * - archived_by_user_id and updated_by_user_id come only from auth.
 * - Restore clears archive audit fields.
 * - updated_at optimistic concurrency protects against stale writes.
 * - Supabase is the only persistence source.
 * - No localStorage or sessionStorage is used.
 */
export async function archiveCalendarEvent(
  input:
    ArchiveCalendarEventInput,
): Promise<ArchiveFinancialCalendarEventResult> {
  const eventId =
    normalizeRequiredText(
      input.eventId,
    );

  if (
    !eventId
  ) {
    return failure(
      "A calendar event is required.",
    );
  }

  const shouldArchive =
    input.archived ??
    true;

  try {
    const {
      userId,
      workspaceId,
    } =
      await requireCaseBudgetServerAuth();

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

    const existingResult =
      await loadEvent({
        workspaceId,
        eventId,
      });

    if (
      !existingResult.success
    ) {
      return failure(
        existingResult.message,
      );
    }

    const existingRow =
      existingResult.row;

    if (
      existingRow.is_archived ===
      shouldArchive
    ) {
      const existingEvent =
        mapCalendarEventRow({
          row:
            existingRow,
          workspaceId,
          allowArchived:
            true,
        });

      if (
        !existingEvent
      ) {
        return failure(
          "CASE Budget could not read the calendar event.",
        );
      }

      return {
        success:
          true,

        event:
          existingEvent,

        archived:
          existingRow.is_archived,
      };
    }

    const now =
      new Date().toISOString();

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
        .update({
          is_archived:
            shouldArchive,

          archived_at:
            shouldArchive
              ? now
              : null,

          archived_by_user_id:
            shouldArchive
              ? userId
              : null,

          updated_by_user_id:
            userId,

          updated_at:
            now,
        })
        .eq(
          "id",
          eventId,
        )
        .eq(
          "workspace_id",
          workspaceId,
        )
        .eq(
          "updated_at",
          existingRow.updated_at,
        )
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,title,description,notes,event_type,status,priority,event_date,start_time,end_time,is_all_day,amount,account_id,category_id,recurrence,reminders,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
        )
        .maybeSingle();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Calendar] Failed to archive or restore calendar event.",
        {
          workspaceId,
          userId,
          eventId,
          shouldArchive,
          error,
        },
      );

      return failure(
        shouldArchive
          ? "CASE Budget could not archive the calendar event."
          : "CASE Budget could not restore the calendar event.",
      );
    }

    if (
      !data
    ) {
      return failure(
        await determineArchiveConflict({
          workspaceId,
          eventId,
          expectedUpdatedAt:
            existingRow.updated_at,
        }),
      );
    }

    const row =
      data as unknown as
        CaseBudgetCalendarEventDatabaseRow;

    if (
      row.is_archived !==
      shouldArchive
    ) {
      return failure(
        "CASE Budget could not confirm the calendar event archive state.",
      );
    }

    const event =
      mapCalendarEventRow({
        row,
        workspaceId,
        allowArchived:
          true,
      });

    if (
      !event
    ) {
      return failure(
        shouldArchive
          ? "The calendar event was archived, but CASE Budget could not read the saved record."
          : "The calendar event was restored, but CASE Budget could not read the saved record.",
      );
    }

    revalidatePath(
      CALENDAR_PATH,
    );

    revalidatePath(
      "/dashboard",
    );

    return {
      success:
        true,

      event,

      archived:
        row.is_archived,
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
      "[CASE Budget Calendar] Unexpected archive-calendar-event error.",
      error,
    );

    return failure(
      "CASE Budget could not change the calendar event archive state. Please try again.",
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
      "[CASE Budget Calendar] Failed to load workspace while archiving event.",
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
        "Calendar archive changes are unavailable because this workspace is inactive.",
    };
  }

  return {
    success:
      true,
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
      "[CASE Budget Calendar] Failed to verify membership while archiving event.",
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
        "You do not have active access to change calendar events in this workspace.",
    };
  }

  if (
    membership.role ===
      "viewer"
  ) {
    return {
      success:
        false,

      message:
        "Viewers cannot archive or restore calendar events in this workspace.",
    };
  }

  return {
    success:
      true,
  };
}

async function loadEvent({
  workspaceId,
  eventId,
}: {
  workspaceId:
    string;

  eventId:
    string;
}):
  Promise<
    | {
        success:
          true;

        row:
          CaseBudgetCalendarEventDatabaseRow;
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
        "case_budget_calendar_events",
      )
      .select(
        "id,workspace_id,created_by_user_id,updated_by_user_id,title,description,notes,event_type,status,priority,event_date,start_time,end_time,is_all_day,amount,account_id,category_id,recurrence,reminders,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
      )
      .eq(
        "id",
        eventId,
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
        false,

      message:
        "CASE Budget could not load the calendar event.",
    };
  }

  const row =
    data as unknown as
      | CaseBudgetCalendarEventDatabaseRow
      | null;

  if (
    !row
  ) {
    return {
      success:
        false,

      message:
        "The calendar event could not be found in the active workspace.",
    };
  }

  return {
    success:
      true,

    row,
  };
}

async function determineArchiveConflict({
  workspaceId,
  eventId,
  expectedUpdatedAt,
}: {
  workspaceId:
    string;

  eventId:
    string;

  expectedUpdatedAt:
    string;
}): Promise<string> {
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
        "id,updated_at,is_archived",
      )
      .eq(
        "id",
        eventId,
      )
      .eq(
        "workspace_id",
        workspaceId,
      )
      .maybeSingle();

  if (
    error
  ) {
    return "The calendar event archive state could not be changed. Refresh and try again.";
  }

  const current =
    data as unknown as
      | {
          id:
            string;

          updated_at:
            string;

          is_archived:
            boolean;
        }
      | null;

  if (
    !current
  ) {
    return "The calendar event no longer exists in the active workspace.";
  }

  if (
    current.updated_at !==
    expectedUpdatedAt
  ) {
    return "This calendar event changed while you were working with it. Refresh and try again.";
  }

  return "The calendar event archive state could not be changed. Refresh and try again.";
}

function mapCalendarEventRow({
  row,
  workspaceId,
  allowArchived,
}: {
  row:
    CaseBudgetCalendarEventDatabaseRow;

  workspaceId:
    string;

  allowArchived:
    boolean;
}): FinancialCalendarEvent | null {
  if (
    row.workspace_id !==
    workspaceId
  ) {
    return null;
  }

  if (
    row.is_archived &&
    !allowArchived
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
    parseRecurrenceJson(
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
    parseRemindersJson(
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

function parseRecurrenceJson(
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

  const rule:
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

    rule.weekdays =
      weekdays;
  }

  if (
    value.dayOfMonth !==
      undefined
  ) {
    const day =
      normalizeDayOfMonth(
        value.dayOfMonth,
      );

    if (
      day ===
        null
    ) {
      return null;
    }

    rule.dayOfMonth =
      day;
  }

  if (
    value.firstDayOfMonth !==
      undefined
  ) {
    const day =
      normalizeDayOfMonth(
        value.firstDayOfMonth,
      );

    if (
      day ===
        null
    ) {
      return null;
    }

    rule.firstDayOfMonth =
      day;
  }

  if (
    value.secondDayOfMonth !==
      undefined
  ) {
    const day =
      normalizeDayOfMonth(
        value.secondDayOfMonth,
      );

    if (
      day ===
        null
    ) {
      return null;
    }

    rule.secondDayOfMonth =
      day;
  }

  if (
    value.monthOfYear !==
      undefined
  ) {
    const month =
      normalizeMonthOfYear(
        value.monthOfYear,
      );

    if (
      month ===
        null
    ) {
      return null;
    }

    rule.monthOfYear =
      month;
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
      !endDate
    ) {
      return null;
    }

    rule.endDate =
      endDate;
  }

  if (
    value.occurrenceCount !==
      undefined
  ) {
    const count =
      normalizePositiveInteger(
        value.occurrenceCount,
      );

    if (
      count ===
        null
    ) {
      return null;
    }

    rule.occurrenceCount =
      count;
  }

  if (
    rule.endType ===
      "date" &&
    !rule.endDate
  ) {
    return null;
  }

  if (
    rule.endType ===
      "occurrences" &&
    rule.occurrenceCount ===
      undefined
  ) {
    return null;
  }

  return rule;
}

function parseRemindersJson(
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

    if (
      !id ||
      amount ===
        null ||
      !unit ||
      typeof candidate.isEnabled !==
        "boolean"
    ) {
      return null;
    }

    reminders.push({
      id,
      amount,
      unit,
      isEnabled:
        candidate.isEnabled,
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

  const result:
    FinancialCalendarWeekday[] =
    [];

  for (
    const day of
      value
  ) {
    if (
      day !==
        0 &&
      day !==
        1 &&
      day !==
        2 &&
      day !==
        3 &&
      day !==
        4 &&
      day !==
        5 &&
      day !==
        6
    ) {
      return null;
    }

    result.push(
      day,
    );
  }

  return result;
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

  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
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

function normalizeFiniteNumber(
  value:
    unknown,
): number | null {
  const number =
    typeof value ===
      "number"
      ? value
      : typeof value ===
          "string"
        ? Number(
            value,
          )
        : Number.NaN;

  return Number.isFinite(
    number,
  )
    ? number
    : null;
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

function normalizePositiveInteger(
  value:
    unknown,
): number | null {
  const number =
    normalizeFiniteNumber(
      value,
    );

  return number !==
      null &&
    Number.isInteger(
      number,
    ) &&
    number >
      0
    ? number
    : null;
}

function normalizeNonNegativeInteger(
  value:
    unknown,
): number | null {
  const number =
    normalizeFiniteNumber(
      value,
    );

  return number !==
      null &&
    Number.isInteger(
      number,
    ) &&
    number >=
      0
    ? number
    : null;
}

function normalizeDayOfMonth(
  value:
    unknown,
): number | null {
  const number =
    normalizePositiveInteger(
      value,
    );

  return number !==
      null &&
    number <=
      31
    ? number
    : null;
}

function normalizeMonthOfYear(
  value:
    unknown,
): number | null {
  const number =
    normalizePositiveInteger(
      value,
    );

  return number !==
      null &&
    number <=
      12
    ? number
    : null;
}

function normalizeDate(
  value:
    unknown,
): string | null {
  const text =
    normalizeRequiredText(
      value,
    );

  if (
    !text ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      text,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${text}T00:00:00.000Z`,
    );

  return !Number.isNaN(
    date.getTime(),
  ) &&
    date
      .toISOString()
      .slice(
        0,
        10,
      ) ===
      text
    ? text
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
      undefined ||
    value ===
      ""
  ) {
    return null;
  }

  const text =
    normalizeRequiredText(
      value,
    );

  if (
    !text ||
    !/^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.test(
      text,
    )
  ) {
    return null;
  }

  return text;
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

function failure(
  message:
    string,
): ArchiveFinancialCalendarEventResult {
  return {
    success:
      false,

    error:
      message,
  };
}
