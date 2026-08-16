"use server";

import {
  revalidatePath,
} from "next/cache";

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
  CreateFinancialCalendarEventData,
  CreateFinancialCalendarEventResult,
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

type ValidatedCreateCalendarEvent = {
  title:
    string;

  description:
    string | null;

  notes:
    string | null;

  type:
    FinancialCalendarEventType;

  status:
    FinancialCalendarEventStatus;

  priority:
    FinancialCalendarEventPriority;

  date:
    string;

  startTime:
    string | null;

  endTime:
    string | null;

  isAllDay:
    boolean;

  amount:
    number | null;

  accountId:
    string | null;

  categoryId:
    string | null;

  recurrence:
    FinancialCalendarRecurrenceRule | null;

  reminders:
    FinancialCalendarReminder[];
};

type CreateCalendarEventValidationResult =
  | {
      success:
        true;

      value:
        ValidatedCreateCalendarEvent;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof CreateFinancialCalendarEventData,
            string
          >
        >;
    };

/**
 * Creates one canonical manual calendar event in the authenticated active
 * CASE Budget workspace.
 *
 * Production rules:
 *
 * - workspace_id is never accepted from the browser.
 * - user identity and active workspace come only from trusted server auth.
 * - the workspace must exist and remain active.
 * - the caller must have active, non-viewer membership.
 * - Supabase generates the event UUID.
 * - created_by_user_id and updated_by_user_id come only from auth.
 * - generated bill/paycheck/transaction events are not persisted here.
 * - only manual events are inserted into case_budget_calendar_events.
 * - recurrence/reminders are validated before being serialized to jsonb.
 * - all-day events persist null start/end times.
 * - archived fields are initialized to the canonical active state.
 * - no localStorage or sessionStorage is used.
 */
export async function createCalendarEvent(
  input:
    CreateFinancialCalendarEventData,
): Promise<CreateFinancialCalendarEventResult> {
  const validation =
    validateCreateCalendarEvent(
      input,
    );

  if (
    !validation.success
  ) {
    return {
      success:
        false,

      error:
        "Review the calendar event details and try again.",

      fieldErrors:
        validation.fieldErrors,
    };
  }

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

    const validated =
      validation.value;

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
        .insert({
          workspace_id:
            workspaceId,

          created_by_user_id:
            userId,

          updated_by_user_id:
            userId,

          title:
            validated.title,

          description:
            validated.description,

          notes:
            validated.notes,

          event_type:
            validated.type,

          status:
            validated.status,

          priority:
            validated.priority,

          event_date:
            validated.date,

          start_time:
            validated.isAllDay
              ? null
              : validated.startTime,

          end_time:
            validated.isAllDay
              ? null
              : validated.endTime,

          is_all_day:
            validated.isAllDay,

          amount:
            validated.amount,

          account_id:
            validated.accountId,

          category_id:
            validated.categoryId,

          recurrence:
            validated.recurrence
              ? toJson(
                  validated.recurrence,
                )
              : null,

          reminders:
            toJson(
              validated.reminders,
            ),

          is_archived:
            false,

          archived_at:
            null,

          archived_by_user_id:
            null,

          created_at:
            now,

          updated_at:
            now,
        })
        .select(
          "id,workspace_id,created_by_user_id,updated_by_user_id,title,description,notes,event_type,status,priority,event_date,start_time,end_time,is_all_day,amount,account_id,category_id,recurrence,reminders,is_archived,archived_at,archived_by_user_id,created_at,updated_at",
        )
        .single();

    if (
      error
    ) {
      console.error(
        "[CASE Budget Calendar] Failed to create calendar event.",
        {
          workspaceId,
          userId,
          error,
        },
      );

      return failure(
        "CASE Budget could not create the calendar event.",
      );
    }

    const row =
      data as unknown as
        CaseBudgetCalendarEventDatabaseRow;

    const event =
      mapCalendarEventRow({
        row,
        workspaceId,
      });

    if (
      !event
    ) {
      console.error(
        "[CASE Budget Calendar] Created calendar event could not be mapped.",
        {
          workspaceId,
          userId,
          calendarEventId:
            row?.id,
        },
      );

      return failure(
        "The calendar event was created, but CASE Budget could not read the saved record.",
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
      "[CASE Budget Calendar] Unexpected create-calendar-event error.",
      error,
    );

    return failure(
      "CASE Budget could not create the calendar event. Please try again.",
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
      "[CASE Budget Calendar] Failed to load workspace while creating event.",
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
        "Calendar events cannot be created because this workspace is inactive.",
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
      "[CASE Budget Calendar] Failed to verify membership while creating event.",
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
        "You do not have active access to create calendar events in this workspace.",
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
        "Viewers cannot create calendar events in this workspace.",
    };
  }

  return {
    success:
      true,

    membership,
  };
}

function validateCreateCalendarEvent(
  input:
    CreateFinancialCalendarEventData,
): CreateCalendarEventValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof CreateFinancialCalendarEventData,
        string
      >
    > = {};

  const title =
    normalizeRequiredText(
      input.title,
    );

  if (
    !title
  ) {
    fieldErrors.title =
      "Event title is required.";
  } else if (
    title.length >
      160
  ) {
    fieldErrors.title =
      "Event title must be 160 characters or fewer.";
  }

  const description =
    normalizeOptionalText(
      input.description,
    );

  if (
    description &&
    description.length >
      2000
  ) {
    fieldErrors.description =
      "Description must be 2,000 characters or fewer.";
  }

  const notes =
    normalizeOptionalText(
      input.notes,
    );

  if (
    notes &&
    notes.length >
      4000
  ) {
    fieldErrors.notes =
      "Notes must be 4,000 characters or fewer.";
  }

  const type =
    normalizeEventType(
      input.type,
    );

  if (
    !type
  ) {
    fieldErrors.type =
      "Select a valid calendar event type.";
  }

  const status =
    normalizeEventStatus(
      input.status,
    );

  if (
    !status
  ) {
    fieldErrors.status =
      "Select a valid calendar event status.";
  }

  const priority =
    normalizeEventPriority(
      input.priority,
    );

  if (
    !priority
  ) {
    fieldErrors.priority =
      "Select a valid calendar event priority.";
  }

  const date =
    normalizeDate(
      input.date,
    );

  if (
    !date
  ) {
    fieldErrors.date =
      "Choose a valid event date.";
  }

  const isAllDay =
    input.isAllDay ===
      true;

  const startTime =
    isAllDay
      ? null
      : normalizeOptionalTime(
          input.startTime,
        );

  const endTime =
    isAllDay
      ? null
      : normalizeOptionalTime(
          input.endTime,
        );

  if (
    !isAllDay &&
    input.startTime !==
      undefined &&
    input.startTime !==
      "" &&
    startTime ===
      null
  ) {
    fieldErrors.startTime =
      "Enter a valid start time.";
  }

  if (
    !isAllDay &&
    input.endTime !==
      undefined &&
    input.endTime !==
      "" &&
    endTime ===
      null
  ) {
    fieldErrors.endTime =
      "Enter a valid end time.";
  }

  if (
    startTime &&
    endTime &&
    compareTimes(
      endTime,
      startTime,
    ) <
      0
  ) {
    fieldErrors.endTime =
      "End time cannot be earlier than start time.";
  }

  const amount =
    input.amount ===
      undefined
      ? null
      : normalizeOptionalNonNegativeMoney(
          input.amount,
        );

  if (
    input.amount !==
      undefined &&
    amount ===
      null
  ) {
    fieldErrors.amount =
      "Amount must be zero or greater.";
  }

  const accountId =
    normalizeOptionalText(
      input.accountId,
    );

  const categoryId =
    normalizeOptionalText(
      input.categoryId,
    );

  const recurrenceResult =
    validateRecurrence(
      input.recurrence,
    );

  if (
    !recurrenceResult.success
  ) {
    fieldErrors.recurrence =
      recurrenceResult.message;
  }

  const reminderResult =
    validateReminders(
      input.reminders,
    );

  if (
    !reminderResult.success
  ) {
    fieldErrors.reminders =
      reminderResult.message;
  }

  if (
    Object.keys(
      fieldErrors,
    ).length >
      0 ||
    !title ||
    !type ||
    !status ||
    !priority ||
    !date ||
    !recurrenceResult.success ||
    !reminderResult.success
  ) {
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
      title,

      description,

      notes,

      type,

      status,

      priority,

      date,

      startTime,

      endTime,

      isAllDay,

      amount,

      accountId,

      categoryId,

      recurrence:
        recurrenceResult.value,

      reminders:
        reminderResult.value,
    },
  };
}

function validateRecurrence(
  input:
    FinancialCalendarRecurrenceRule | undefined,
):
  | {
      success:
        true;

      value:
        FinancialCalendarRecurrenceRule | null;
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    input ===
      undefined
  ) {
    return {
      success:
        true,

      value:
        null,
    };
  }

  const frequency =
    normalizeRecurrenceFrequency(
      input.frequency,
    );

  const interval =
    normalizePositiveInteger(
      input.interval,
    );

  const endType =
    normalizeRecurrenceEndType(
      input.endType,
    );

  if (
    !frequency ||
    interval ===
      null ||
    !endType
  ) {
    return {
      success:
        false,

      message:
        "Enter a valid recurrence rule.",
    };
  }

  const rule:
    FinancialCalendarRecurrenceRule = {
      frequency,

      interval,

      endType,
    };

  if (
    input.weekdays !==
      undefined
  ) {
    const weekdays =
      parseWeekdays(
        input.weekdays,
      );

    if (
      weekdays ===
        null
    ) {
      return {
        success:
          false,

        message:
          "Recurrence weekdays are invalid.",
      };
    }

    rule.weekdays =
      weekdays;
  }

  if (
    input.dayOfMonth !==
      undefined
  ) {
    const dayOfMonth =
      normalizeDayOfMonth(
        input.dayOfMonth,
      );

    if (
      dayOfMonth ===
        null
    ) {
      return {
        success:
          false,

        message:
          "Recurrence day of month must be between 1 and 31.",
      };
    }

    rule.dayOfMonth =
      dayOfMonth;
  }

  if (
    input.firstDayOfMonth !==
      undefined
  ) {
    const firstDayOfMonth =
      normalizeDayOfMonth(
        input.firstDayOfMonth,
      );

    if (
      firstDayOfMonth ===
        null
    ) {
      return {
        success:
          false,

        message:
          "The first semimonthly day must be between 1 and 31.",
      };
    }

    rule.firstDayOfMonth =
      firstDayOfMonth;
  }

  if (
    input.secondDayOfMonth !==
      undefined
  ) {
    const secondDayOfMonth =
      normalizeDayOfMonth(
        input.secondDayOfMonth,
      );

    if (
      secondDayOfMonth ===
        null
    ) {
      return {
        success:
          false,

        message:
          "The second semimonthly day must be between 1 and 31.",
      };
    }

    rule.secondDayOfMonth =
      secondDayOfMonth;
  }

  if (
    input.monthOfYear !==
      undefined
  ) {
    const monthOfYear =
      normalizeMonthOfYear(
        input.monthOfYear,
      );

    if (
      monthOfYear ===
        null
    ) {
      return {
        success:
          false,

        message:
          "Recurrence month must be between 1 and 12.",
      };
    }

    rule.monthOfYear =
      monthOfYear;
  }

  if (
    input.endDate !==
      undefined
  ) {
    const endDate =
      normalizeDate(
        input.endDate,
      );

    if (
      !endDate
    ) {
      return {
        success:
          false,

        message:
          "Recurrence end date is invalid.",
      };
    }

    rule.endDate =
      endDate;
  }

  if (
    input.occurrenceCount !==
      undefined
  ) {
    const occurrenceCount =
      normalizePositiveInteger(
        input.occurrenceCount,
      );

    if (
      occurrenceCount ===
        null
    ) {
      return {
        success:
          false,

        message:
          "Recurrence occurrence count must be greater than zero.",
      };
    }

    rule.occurrenceCount =
      occurrenceCount;
  }

  if (
    rule.endType ===
      "date" &&
    !rule.endDate
  ) {
    return {
      success:
        false,

      message:
        "A recurrence end date is required.",
    };
  }

  if (
    rule.endType ===
      "occurrences" &&
    rule.occurrenceCount ===
      undefined
  ) {
    return {
      success:
        false,

      message:
        "A recurrence occurrence count is required.",
    };
  }

  return {
    success:
      true,

    value:
      rule,
  };
}

function validateReminders(
  input:
    FinancialCalendarReminder[],
):
  | {
      success:
        true;

      value:
        FinancialCalendarReminder[];
    }
  | {
      success:
        false;

      message:
        string;
    } {
  if (
    !Array.isArray(
      input,
    )
  ) {
    return {
      success:
        false,

      message:
        "Calendar reminders are invalid.",
    };
  }

  if (
    input.length >
      10
  ) {
    return {
      success:
        false,

      message:
        "A calendar event can have at most 10 reminders.",
    };
  }

  const reminders:
    FinancialCalendarReminder[] =
    [];

  const seenIds =
    new Set<string>();

  for (
    const reminder of
      input
  ) {
    const id =
      normalizeRequiredText(
        reminder.id,
      );

    const amount =
      normalizeNonNegativeInteger(
        reminder.amount,
      );

    const unit =
      normalizeReminderUnit(
        reminder.unit,
      );

    if (
      !id ||
      amount ===
        null ||
      !unit ||
      typeof reminder.isEnabled !==
        "boolean"
    ) {
      return {
        success:
          false,

        message:
          "One or more calendar reminders are invalid.",
      };
    }

    if (
      seenIds.has(
        id,
      )
    ) {
      return {
        success:
          false,

        message:
          "Calendar reminder IDs must be unique.",
      };
    }

    seenIds.add(
      id,
    );

    reminders.push({
      id,

      amount,

      unit,

      isEnabled:
        reminder.isEnabled,
    });
  }

  return {
    success:
      true,

    value:
      reminders,
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

    rule.dayOfMonth =
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

    rule.firstDayOfMonth =
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

    rule.secondDayOfMonth =
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

    rule.monthOfYear =
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

    rule.occurrenceCount =
      occurrenceCount;
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

function normalizeFiniteNumber(
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
    normalizeFiniteNumber(
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
    normalizeFiniteNumber(
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
    normalizeFiniteNumber(
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

function compareTimes(
  first:
    string,
  second:
    string,
): number {
  return timeToSeconds(
    first,
  ) -
    timeToSeconds(
      second,
    );
}

function timeToSeconds(
  value:
    string,
): number {
  const [
    hours,
    minutes,
    seconds = "0",
  ] =
    value.split(
      ":",
    );

  return (
    Number(
      hours,
    ) *
      3600 +
    Number(
      minutes,
    ) *
      60 +
    Number(
      seconds,
    )
  );
}

function toJson(
  value:
    unknown,
): Json {
  return JSON.parse(
    JSON.stringify(
      value,
    ),
  ) as Json;
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
): CreateFinancialCalendarEventResult {
  return {
    success:
      false,

    error:
      message,
  };
}
