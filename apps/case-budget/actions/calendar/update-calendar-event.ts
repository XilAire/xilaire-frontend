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
  UpdateFinancialCalendarEventData,
  UpdateFinancialCalendarEventResult,
} from "@/types/calendar";

const CALENDAR_PATH =
  "/dashboard/calendar";

export type UpdateCalendarEventInput = {
  eventId:
    string;

  updates:
    Partial<
      Omit<
        UpdateFinancialCalendarEventData,
        "id"
      >
    >;
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

type ValidatedCalendarEvent = {
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

type ValidationResult =
  | {
      success:
        true;

      value:
        ValidatedCalendarEvent;
    }
  | {
      success:
        false;

      fieldErrors:
        Partial<
          Record<
            keyof UpdateFinancialCalendarEventData,
            string
          >
        >;
    };

/**
 * Updates one canonical manual calendar event in the authenticated
 * active CASE Budget workspace.
 *
 * Production guarantees:
 *
 * - workspace_id never comes from the browser.
 * - event lookup is constrained by id + workspace_id + is_archived=false.
 * - only active non-viewer members may mutate events.
 * - immutable ownership/audit identity fields are never client-controlled.
 * - only supplied fields replace existing values.
 * - recurrence/reminders are fully validated before jsonb persistence.
 * - optimistic concurrency uses the previously loaded updated_at value.
 * - Supabase is the only persistence source.
 * - no localStorage or sessionStorage is used.
 */
export async function updateCalendarEvent(
  input:
    UpdateCalendarEventInput,
): Promise<UpdateFinancialCalendarEventResult> {
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

  if (
    !input.updates ||
    typeof input.updates !==
      "object" ||
    Array.isArray(
      input.updates,
    )
  ) {
    return failure(
      "Calendar event changes are required.",
    );
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

    const existingEvent =
      mapCalendarEventRow({
        row:
          existingRow,
        workspaceId,
      });

    if (
      !existingEvent
    ) {
      return failure(
        "CASE Budget could not read the existing calendar event.",
      );
    }

    const validation =
      validateMergedEvent({
        existing:
          existingEvent,
        updates:
          input.updates,
      });

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

    const value =
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
        .update({
          title:
            value.title,

          description:
            value.description,

          notes:
            value.notes,

          event_type:
            value.type,

          status:
            value.status,

          priority:
            value.priority,

          event_date:
            value.date,

          start_time:
            value.isAllDay
              ? null
              : value.startTime,

          end_time:
            value.isAllDay
              ? null
              : value.endTime,

          is_all_day:
            value.isAllDay,

          amount:
            value.amount,

          account_id:
            value.accountId,

          category_id:
            value.categoryId,

          recurrence:
            value.recurrence
              ? toJson(
                  value.recurrence,
                )
              : null,

          reminders:
            toJson(
              value.reminders,
            ),

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
          "is_archived",
          false,
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
        "[CASE Budget Calendar] Failed to update calendar event.",
        {
          workspaceId,
          userId,
          eventId,
          error,
        },
      );

      return failure(
        "CASE Budget could not update the calendar event.",
      );
    }

    if (
      !data
    ) {
      return failure(
        await determineUpdateConflict({
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

    const event =
      mapCalendarEventRow({
        row,
        workspaceId,
      });

    if (
      !event
    ) {
      return failure(
        "The calendar event was updated, but CASE Budget could not read the saved record.",
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
      "[CASE Budget Calendar] Unexpected update-calendar-event error.",
      error,
    );

    return failure(
      "CASE Budget could not update the calendar event. Please try again.",
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
        "Calendar events cannot be updated because this workspace is inactive.",
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
        "You do not have active access to update calendar events in this workspace.",
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
        "Viewers cannot update calendar events in this workspace.",
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
      .eq(
        "is_archived",
        false,
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

async function determineUpdateConflict({
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
    return "The calendar event could not be updated. Refresh and try again.";
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
    current.is_archived
  ) {
    return "This calendar event has been removed from the active workspace.";
  }

  if (
    current.updated_at !==
    expectedUpdatedAt
  ) {
    return "This calendar event changed while you were editing it. Refresh and try again.";
  }

  return "The calendar event could not be updated. Refresh and try again.";
}

function validateMergedEvent({
  existing,
  updates,
}: {
  existing:
    FinancialCalendarEvent;

  updates:
    Partial<
      Omit<
        UpdateFinancialCalendarEventData,
        "id"
      >
    >;
}): ValidationResult {
  const fieldErrors:
    Partial<
      Record<
        keyof UpdateFinancialCalendarEventData,
        string
      >
    > = {};

  const title =
    hasOwn(
      updates,
      "title",
    )
      ? normalizeRequiredText(
          updates.title,
        )
      : existing.title;

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
    hasOwn(
      updates,
      "description",
    )
      ? normalizeOptionalText(
          updates.description,
        )
      : existing.description ??
        null;

  const notes =
    hasOwn(
      updates,
      "notes",
    )
      ? normalizeOptionalText(
          updates.notes,
        )
      : existing.notes ??
        null;

  const type =
    hasOwn(
      updates,
      "type",
    )
      ? normalizeEventType(
          updates.type,
        )
      : existing.type;

  const status =
    hasOwn(
      updates,
      "status",
    )
      ? normalizeEventStatus(
          updates.status,
        )
      : existing.status;

  const priority =
    hasOwn(
      updates,
      "priority",
    )
      ? normalizeEventPriority(
          updates.priority,
        )
      : existing.priority;

  const date =
    hasOwn(
      updates,
      "date",
    )
      ? normalizeDate(
          updates.date,
        )
      : existing.date;

  const isAllDay =
    hasOwn(
      updates,
      "isAllDay",
    )
      ? updates.isAllDay ===
        true
      : existing.isAllDay;

  const startTime =
    isAllDay
      ? null
      : hasOwn(
          updates,
          "startTime",
        )
        ? normalizeOptionalTime(
            updates.startTime,
          )
        : existing.startTime ??
          null;

  const endTime =
    isAllDay
      ? null
      : hasOwn(
          updates,
          "endTime",
        )
        ? normalizeOptionalTime(
            updates.endTime,
          )
        : existing.endTime ??
          null;

  const amount =
    hasOwn(
      updates,
      "amount",
    )
      ? (
          updates.amount ===
            undefined
            ? null
            : normalizeOptionalNonNegativeMoney(
                updates.amount,
              )
        )
      : existing.amount ??
        null;

  const accountId =
    hasOwn(
      updates,
      "accountId",
    )
      ? normalizeOptionalText(
          updates.accountId,
        )
      : existing.accountId ??
        null;

  const categoryId =
    hasOwn(
      updates,
      "categoryId",
    )
      ? normalizeOptionalText(
          updates.categoryId,
        )
      : existing.categoryId ??
        null;

  const recurrenceResult =
    hasOwn(
      updates,
      "recurrence",
    )
      ? validateRecurrence(
          updates.recurrence,
        )
      : {
          success:
            true as const,

          value:
            existing.recurrence ??
            null,
        };

  const remindersResult =
    hasOwn(
      updates,
      "reminders",
    )
      ? validateReminders(
          updates.reminders ??
            [],
        )
      : {
          success:
            true as const,

          value:
            existing.reminders,
        };

  if (
    !type
  ) {
    fieldErrors.type =
      "Select a valid calendar event type.";
  }

  if (
    !status
  ) {
    fieldErrors.status =
      "Select a valid calendar event status.";
  }

  if (
    !priority
  ) {
    fieldErrors.priority =
      "Select a valid calendar event priority.";
  }

  if (
    !date
  ) {
    fieldErrors.date =
      "Choose a valid event date.";
  }

  if (
    description &&
    description.length >
      2000
  ) {
    fieldErrors.description =
      "Description must be 2,000 characters or fewer.";
  }

  if (
    notes &&
    notes.length >
      4000
  ) {
    fieldErrors.notes =
      "Notes must be 4,000 characters or fewer.";
  }

  if (
    !isAllDay &&
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

  if (
    !recurrenceResult.success
  ) {
    fieldErrors.recurrence =
      recurrenceResult.message;
  }

  if (
    !remindersResult.success
  ) {
    fieldErrors.reminders =
      remindersResult.message;
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
    !remindersResult.success
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
        remindersResult.value,
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
    const firstDay =
      normalizeDayOfMonth(
        input.firstDayOfMonth,
      );

    if (
      firstDay ===
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
      firstDay;
  }

  if (
    input.secondDayOfMonth !==
      undefined
  ) {
    const secondDay =
      normalizeDayOfMonth(
        input.secondDayOfMonth,
      );

    if (
      secondDay ===
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
      secondDay;
  }

  if (
    input.monthOfYear !==
      undefined
  ) {
    const month =
      normalizeMonthOfYear(
        input.monthOfYear,
      );

    if (
      month ===
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
      month;
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
    const count =
      normalizePositiveInteger(
        input.occurrenceCount,
      );

    if (
      count ===
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
      count;
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
    ) ||
    input.length >
      10
  ) {
    return {
      success:
        false,

      message:
        "Calendar reminders are invalid.",
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
        "boolean" ||
      seenIds.has(
        id,
      )
    ) {
      return {
        success:
          false,

        message:
          "One or more calendar reminders are invalid.",
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

  return {
    id:
      row.id,

    title,

    ...(normalizeOptionalText(
      row.description,
    )
      ? {
          description:
            normalizeOptionalText(
              row.description,
            )!,
        }
      : {}),

    ...(normalizeOptionalText(
      row.notes,
    )
      ? {
          notes:
            normalizeOptionalText(
              row.notes,
            )!,
        }
      : {}),

    type,

    status,

    priority,

    date,

    ...(normalizeOptionalTime(
      row.start_time,
    )
      ? {
          startTime:
            normalizeOptionalTime(
              row.start_time,
            )!,
        }
      : {}),

    ...(normalizeOptionalTime(
      row.end_time,
    )
      ? {
          endTime:
            normalizeOptionalTime(
              row.end_time,
            )!,
        }
      : {}),

    isAllDay:
      row.is_all_day,

    ...(row.amount !==
      null
      ? {
          amount:
            roundMoney(
              Number(
                row.amount,
              ),
            ),
        }
      : {}),

    ...(row.account_id
      ? {
          accountId:
            row.account_id,
        }
      : {}),

    ...(row.category_id
      ? {
          categoryId:
            row.category_id,
        }
      : {}),

    source: {
      type:
        "manual",

      id:
        row.id,
    },

    ...(parseRecurrenceJson(
      row.recurrence,
    )
      ? {
          recurrence:
            parseRecurrenceJson(
              row.recurrence,
            )!,
        }
      : {}),

    reminders:
      parseRemindersJson(
        row.reminders,
      ) ??
      [],

    isAutoGenerated:
      false,

    createdAt:
      row.created_at,

    updatedAt:
      row.updated_at,
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

function hasOwn(
  value:
    object,
  key:
    PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(
    value,
    key,
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
): UpdateFinancialCalendarEventResult {
  return {
    success:
      false,

    error:
      message,
  };
}
