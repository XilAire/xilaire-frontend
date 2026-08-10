"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useCalendar,
} from "@/components/providers/CalendarProvider";
import {
  createFinancialCalendarReminderId,
  formatDateKey,
  normalizeCalendarDate,
} from "@/lib/calendar/calendar-utils";

import type {
  CreateFinancialCalendarEventData,
  FinancialCalendarEvent,
  FinancialCalendarEventPriority,
  FinancialCalendarEventStatus,
  FinancialCalendarEventType,
  FinancialCalendarRecurrenceEndType,
  FinancialCalendarRecurrenceFrequency,
  FinancialCalendarReminder,
  FinancialCalendarReminderUnit,
  FinancialCalendarWeekday,
  UpdateFinancialCalendarEventData,
} from "@/types/calendar";

export type CalendarEventModalProps = {
  isOpen?: boolean;
  event?: FinancialCalendarEvent | null;
  initialDate?: string;
  onClose?: () => void;
  onSaved?: (
    eventId: string,
  ) => void;
};

type CalendarEventFormState = {
  title: string;
  description: string;
  notes: string;

  type:
    FinancialCalendarEventType;

  status:
    FinancialCalendarEventStatus;

  priority:
    FinancialCalendarEventPriority;

  date: string;

  startTime: string;
  endTime: string;

  isAllDay: boolean;

  amount: string;

  accountId: string;
  categoryId: string;

  isRecurring: boolean;

  recurrenceFrequency:
    FinancialCalendarRecurrenceFrequency;

  recurrenceInterval: string;

  recurrenceWeekdays:
    FinancialCalendarWeekday[];

  recurrenceDayOfMonth:
    string;

  recurrenceFirstDayOfMonth:
    string;

  recurrenceSecondDayOfMonth:
    string;

  recurrenceMonthOfYear:
    string;

  recurrenceEndType:
    FinancialCalendarRecurrenceEndType;

  recurrenceEndDate:
    string;

  recurrenceOccurrenceCount:
    string;

  reminders:
    FinancialCalendarReminder[];
};

type CalendarEventValidationErrors = Partial<
  Record<
    keyof CalendarEventFormState,
    string
  >
> & {
  reminder?: string;
  form?: string;
};

const DEFAULT_FORM_STATE:
  CalendarEventFormState = {
    title:
      "",
    description:
      "",
    notes:
      "",

    type:
      "custom",

    status:
      "scheduled",

    priority:
      "normal",

    date:
      formatDateKey(
        new Date(),
      ),

    startTime:
      "09:00",
    endTime:
      "10:00",

    isAllDay:
      true,

    amount:
      "",

    accountId:
      "",
    categoryId:
      "",

    isRecurring:
      false,

    recurrenceFrequency:
      "monthly",

    recurrenceInterval:
      "1",

    recurrenceWeekdays:
      [],

    recurrenceDayOfMonth:
      "1",

    recurrenceFirstDayOfMonth:
      "1",

    recurrenceSecondDayOfMonth:
      "15",

    recurrenceMonthOfYear:
      "1",

    recurrenceEndType:
      "never",

    recurrenceEndDate:
      "",

    recurrenceOccurrenceCount:
      "12",

    reminders:
      [],
  };

const EVENT_TYPE_OPTIONS:
  {
    value:
      FinancialCalendarEventType;
    label:
      string;
    description:
      string;
  }[] = [
    {
      value:
        "custom",
      label:
        "Custom event",
      description:
        "A manually scheduled financial event.",
    },
    {
      value:
        "reminder",
      label:
        "Reminder",
      description:
        "A reminder without a required payment.",
    },
    {
      value:
        "bill",
      label:
        "Bill",
      description:
        "A manually scheduled bill or payment.",
    },
    {
      value:
        "income",
      label:
        "Income",
      description:
        "A manually scheduled income deposit.",
    },
    {
      value:
        "transaction",
      label:
        "Transaction",
      description:
        "A planned expense or transaction.",
    },
    {
      value:
        "transfer",
      label:
        "Transfer",
      description:
        "A planned transfer between accounts.",
    },
    {
      value:
        "savings-contribution",
      label:
        "Savings contribution",
      description:
        "A planned contribution toward savings.",
    },
    {
      value:
        "debt-payment",
      label:
        "Debt payment",
      description:
        "A planned debt payment.",
    },
  ];

const STATUS_OPTIONS:
  {
    value:
      FinancialCalendarEventStatus;
    label:
      string;
  }[] = [
    {
      value:
        "scheduled",
      label:
        "Scheduled",
    },
    {
      value:
        "due",
      label:
        "Due",
    },
    {
      value:
        "pending",
      label:
        "Pending",
    },
    {
      value:
        "completed",
      label:
        "Completed",
    },
    {
      value:
        "skipped",
      label:
        "Skipped",
    },
    {
      value:
        "canceled",
      label:
        "Canceled",
    },
  ];

const PRIORITY_OPTIONS:
  {
    value:
      FinancialCalendarEventPriority;
    label:
      string;
  }[] = [
    {
      value:
        "critical",
      label:
        "Critical",
    },
    {
      value:
        "high",
      label:
        "High",
    },
    {
      value:
        "normal",
      label:
        "Normal",
    },
    {
      value:
        "low",
      label:
        "Low",
    },
  ];

const RECURRENCE_FREQUENCY_OPTIONS:
  {
    value:
      FinancialCalendarRecurrenceFrequency;
    label:
      string;
  }[] = [
    {
      value:
        "daily",
      label:
        "Daily",
    },
    {
      value:
        "weekly",
      label:
        "Weekly",
    },
    {
      value:
        "biweekly",
      label:
        "Biweekly",
    },
    {
      value:
        "semimonthly",
      label:
        "Semimonthly",
    },
    {
      value:
        "monthly",
      label:
        "Monthly",
    },
    {
      value:
        "quarterly",
      label:
        "Quarterly",
    },
    {
      value:
        "yearly",
      label:
        "Yearly",
    },
    {
      value:
        "custom",
      label:
        "Custom",
    },
  ];

const WEEKDAY_OPTIONS:
  {
    value:
      FinancialCalendarWeekday;
    label:
      string;
    shortLabel:
      string;
  }[] = [
    {
      value:
        0,
      label:
        "Sunday",
      shortLabel:
        "Sun",
    },
    {
      value:
        1,
      label:
        "Monday",
      shortLabel:
        "Mon",
    },
    {
      value:
        2,
      label:
        "Tuesday",
      shortLabel:
        "Tue",
    },
    {
      value:
        3,
      label:
        "Wednesday",
      shortLabel:
        "Wed",
    },
    {
      value:
        4,
      label:
        "Thursday",
      shortLabel:
        "Thu",
    },
    {
      value:
        5,
      label:
        "Friday",
      shortLabel:
        "Fri",
    },
    {
      value:
        6,
      label:
        "Saturday",
      shortLabel:
        "Sat",
    },
  ];

export default function CalendarEventModal({
  isOpen: isOpenOverride,
  event: eventOverride,
  initialDate,
  onClose,
  onSaved,
}: CalendarEventModalProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const {
    accounts,
  } = useAccounts();

  const {
    addEvent,
    updateEvent,
    getEventById,
  } = useCalendar();

  const requestedAction =
    searchParams.get(
      "action",
    );

  const requestedEventId =
    searchParams.get(
      "eventId",
    );

  const requestedDate =
    searchParams.get(
      "date",
    );

  const routeEvent =
    useMemo(
      () =>
        requestedEventId
          ? getEventById(
              requestedEventId,
            )
          : null,
      [
        getEventById,
        requestedEventId,
      ],
    );

  const resolvedEvent =
    eventOverride ??
    routeEvent;

  const isEditMode =
    Boolean(
      resolvedEvent,
    );

  const resolvedIsOpen =
    isOpenOverride ??
    (
      requestedAction ===
        "add" ||
      requestedAction ===
        "edit" ||
      Boolean(
        requestedEventId,
      )
    );

  const [
    form,
    setForm,
  ] =
    useState<CalendarEventFormState>(
      () =>
        createInitialFormState({
          event:
            resolvedEvent,
          initialDate:
            initialDate ??
            requestedDate ??
            undefined,
        }),
    );

  const [
    errors,
    setErrors,
  ] =
    useState<CalendarEventValidationErrors>(
      {},
    );

  const [
    isSaving,
    setIsSaving,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      if (
        !resolvedIsOpen
      ) {
        return;
      }

      setForm(
        createInitialFormState({
          event:
            resolvedEvent,
          initialDate:
            initialDate ??
            requestedDate ??
            undefined,
        }),
      );

      setErrors(
        {},
      );
    },
    [
      initialDate,
      requestedDate,
      resolvedEvent,
      resolvedIsOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !resolvedIsOpen
      ) {
        return;
      }

      const originalOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      function handleKeyDown(
        keyboardEvent:
          KeyboardEvent,
      ) {
        if (
          keyboardEvent.key ===
          "Escape"
        ) {
          handleClose();
        }
      }

      window.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.body.style.overflow =
          originalOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      resolvedIsOpen,
    ],
  );

  function updateField<
    Key extends keyof CalendarEventFormState,
  >(
    key:
      Key,
    value:
      CalendarEventFormState[Key],
  ) {
    setForm(
      (
        currentForm,
      ) => ({
        ...currentForm,
        [key]:
          value,
      }),
    );

    setErrors(
      (
        currentErrors,
      ) => {
        if (
          !currentErrors[
            key
          ]
        ) {
          return currentErrors;
        }

        const nextErrors = {
          ...currentErrors,
        };

        delete nextErrors[
          key
        ];

        return nextErrors;
      },
    );
  }

  function handleClose() {
    onClose?.();

    if (
      isOpenOverride !==
      undefined
    ) {
      return;
    }

    const params =
      new URLSearchParams(
        searchParams.toString(),
      );

    params.delete(
      "action",
    );

    params.delete(
      "eventId",
    );

    params.delete(
      "date",
    );

    const query =
      params.toString();

    router.replace(
      query
        ? `${pathname}?${query}`
        : pathname,
      {
        scroll:
          false,
      },
    );
  }

  function toggleWeekday(
    weekday:
      FinancialCalendarWeekday,
  ) {
    updateField(
      "recurrenceWeekdays",
      form.recurrenceWeekdays.includes(
        weekday,
      )
        ? form.recurrenceWeekdays.filter(
            (
              currentWeekday,
            ) =>
              currentWeekday !==
              weekday,
          )
        : [
            ...form.recurrenceWeekdays,
            weekday,
          ].sort(
            (
              firstWeekday,
              secondWeekday,
            ) =>
              firstWeekday -
              secondWeekday,
          ),
    );
  }

  function addReminder() {
    setForm(
      (
        currentForm,
      ) => ({
        ...currentForm,

        reminders: [
          ...currentForm.reminders,
          {
            id:
              createFinancialCalendarReminderId(),

            amount:
              1,

            unit:
              "day",

            isEnabled:
              true,
          },
        ],
      }),
    );
  }

  function updateReminder(
    reminderId:
      string,
    updates:
      Partial<
        FinancialCalendarReminder
      >,
  ) {
    setForm(
      (
        currentForm,
      ) => ({
        ...currentForm,

        reminders:
          currentForm.reminders.map(
            (
              reminder,
            ) =>
              reminder.id ===
                reminderId
                ? {
                    ...reminder,
                    ...updates,
                  }
                : reminder,
          ),
      }),
    );
  }

  function removeReminder(
    reminderId:
      string,
  ) {
    setForm(
      (
        currentForm,
      ) => ({
        ...currentForm,

        reminders:
          currentForm.reminders.filter(
            (
              reminder,
            ) =>
              reminder.id !==
              reminderId,
          ),
      }),
    );
  }

  async function handleSubmit(
    submitEvent:
      React.FormEvent<HTMLFormElement>,
  ) {
    submitEvent.preventDefault();

    const validationErrors =
      validateCalendarEventForm(
        form,
      );

    if (
      Object.keys(
        validationErrors,
      ).length >
      0
    ) {
      setErrors(
        validationErrors,
      );

      return;
    }

    setIsSaving(
      true,
    );

    setErrors(
      {},
    );

    try {
      if (
        resolvedEvent
      ) {
        const updateData:
          UpdateFinancialCalendarEventData = {
            id:
              resolvedEvent.id,

            ...createCalendarEventData(
              form,
            ),
          };

        updateEvent(
          updateData,
        );

        onSaved?.(
          resolvedEvent.id,
        );
      } else {
        const createData:
          CreateFinancialCalendarEventData =
          createCalendarEventData(
            form,
          );

        const createdEvent =
          addEvent(
            createData,
          );

        onSaved?.(
          createdEvent.id,
        );
      }

      handleClose();
    } catch (
      error
    ) {
      setErrors({
        form:
          error instanceof
              Error &&
            error.message.trim()
            ? error.message
            : "Unable to save the calendar event.",
      });
    } finally {
      setIsSaving(
        false,
      );
    }
  }

  if (
    !resolvedIsOpen
  ) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close calendar event modal"
        onClick={
          handleClose
        }
        className="absolute inset-0 cursor-default"
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-modal-title"
        className="relative flex max-h-[96vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:max-h-[92vh] sm:rounded-3xl"
      >
        <header className="flex items-start gap-4 border-b border-[var(--border-subtle)] px-5 py-5 sm:px-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <CalendarIcon />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
              {isEditMode
                ? "Edit event"
                : "New event"}
            </p>

            <h2
              id="calendar-event-modal-title"
              className="mt-1 text-xl font-bold text-[var(--text-primary)]"
            >
              {isEditMode
                ? "Update calendar event"
                : "Add calendar event"}
            </h2>

            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Schedule a financial event,
              reminder, contribution, or
              payment.
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Close calendar event modal"
          >
            <CloseIcon />
          </button>
        </header>

        <form
          onSubmit={
            handleSubmit
          }
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="space-y-6 p-5 sm:p-6">
            <FormSection
              title="Event details"
              description="Add the basic information for this calendar event."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  id="calendar-event-title"
                  label="Title"
                  value={
                    form.title
                  }
                  placeholder="Enter event title"
                  error={
                    errors.title
                  }
                  required
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "title",
                      value,
                    )
                  }
                />

                <SelectField
                  id="calendar-event-type"
                  label="Event type"
                  value={
                    form.type
                  }
                  options={
                    EVENT_TYPE_OPTIONS.map(
                      (
                        option,
                      ) => ({
                        value:
                          option.value,
                        label:
                          option.label,
                      }),
                    )
                  }
                  error={
                    errors.type
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "type",
                      value as FinancialCalendarEventType,
                    )
                  }
                />
              </div>

              <div className="mt-4">
                <TextAreaField
                  id="calendar-event-description"
                  label="Description"
                  value={
                    form.description
                  }
                  placeholder="Add a short description"
                  rows={
                    3
                  }
                  error={
                    errors.description
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "description",
                      value,
                    )
                  }
                />
              </div>
            </FormSection>

            <FormSection
              title="Date and time"
              description="Choose when the event should appear."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  id="calendar-event-date"
                  label="Date"
                  value={
                    form.date
                  }
                  error={
                    errors.date
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "date",
                      value,
                    )
                  }
                />

                <ToggleField
                  id="calendar-event-all-day"
                  label="All-day event"
                  description="Hide start and end times."
                  checked={
                    form.isAllDay
                  }
                  onChange={(
                    checked,
                  ) =>
                    updateField(
                      "isAllDay",
                      checked,
                    )
                  }
                />
              </div>

              {!form.isAllDay ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <TimeField
                    id="calendar-event-start-time"
                    label="Start time"
                    value={
                      form.startTime
                    }
                    error={
                      errors.startTime
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "startTime",
                        value,
                      )
                    }
                  />

                  <TimeField
                    id="calendar-event-end-time"
                    label="End time"
                    value={
                      form.endTime
                    }
                    error={
                      errors.endTime
                    }
                    onChange={(
                      value,
                    ) =>
                      updateField(
                        "endTime",
                        value,
                      )
                    }
                  />
                </div>
              ) : null}
            </FormSection>

            <FormSection
              title="Financial details"
              description="Add an amount, account, priority, and status when applicable."
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <CurrencyField
                  id="calendar-event-amount"
                  label="Amount"
                  value={
                    form.amount
                  }
                  placeholder="0.00"
                  error={
                    errors.amount
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "amount",
                      value,
                    )
                  }
                />

                <SelectField
                  id="calendar-event-account"
                  label="Account"
                  value={
                    form.accountId
                  }
                  options={[
                    {
                      value:
                        "",
                      label:
                        "No account selected",
                    },
                    ...accounts.map(
                      (
                        account,
                      ) => ({
                        value:
                          account.id,
                        label:
                          account.name,
                      }),
                    ),
                  ]}
                  error={
                    errors.accountId
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "accountId",
                      value,
                    )
                  }
                />

                <SelectField
                  id="calendar-event-priority"
                  label="Priority"
                  value={
                    form.priority
                  }
                  options={
                    PRIORITY_OPTIONS.map(
                      (
                        option,
                      ) => ({
                        value:
                          option.value,
                        label:
                          option.label,
                      }),
                    )
                  }
                  error={
                    errors.priority
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "priority",
                      value as FinancialCalendarEventPriority,
                    )
                  }
                />

                <SelectField
                  id="calendar-event-status"
                  label="Status"
                  value={
                    form.status
                  }
                  options={
                    STATUS_OPTIONS.map(
                      (
                        option,
                      ) => ({
                        value:
                          option.value,
                        label:
                          option.label,
                      }),
                    )
                  }
                  error={
                    errors.status
                  }
                  onChange={(
                    value,
                  ) =>
                    updateField(
                      "status",
                      value as FinancialCalendarEventStatus,
                    )
                  }
                />
              </div>
            </FormSection>

            <FormSection
              title="Recurrence"
              description="Repeat this event on a schedule."
            >
              <ToggleField
                id="calendar-event-recurring"
                label="Repeat event"
                description="Generate future calendar occurrences automatically."
                checked={
                  form.isRecurring
                }
                onChange={(
                  checked,
                ) =>
                  updateField(
                    "isRecurring",
                    checked,
                  )
                }
              />

              {form.isRecurring ? (
                <div className="mt-5 space-y-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="calendar-event-recurrence-frequency"
                      label="Frequency"
                      value={
                        form.recurrenceFrequency
                      }
                      options={
                        RECURRENCE_FREQUENCY_OPTIONS.map(
                          (
                            option,
                          ) => ({
                            value:
                              option.value,
                            label:
                              option.label,
                          }),
                        )
                      }
                      error={
                        errors.recurrenceFrequency
                      }
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "recurrenceFrequency",
                          value as FinancialCalendarRecurrenceFrequency,
                        )
                      }
                    />

                    <NumberField
                      id="calendar-event-recurrence-interval"
                      label="Repeat every"
                      value={
                        form.recurrenceInterval
                      }
                      minimum={
                        1
                      }
                      maximum={
                        365
                      }
                      suffix={
                        getRecurrenceIntervalSuffix(
                          form.recurrenceFrequency,
                        )
                      }
                      error={
                        errors.recurrenceInterval
                      }
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "recurrenceInterval",
                          value,
                        )
                      }
                    />
                  </div>

                  {form.recurrenceFrequency ===
                    "weekly" ||
                  form.recurrenceFrequency ===
                    "biweekly" ? (
                    <WeekdaySelector
                      selectedWeekdays={
                        form.recurrenceWeekdays
                      }
                      error={
                        errors.recurrenceWeekdays
                      }
                      onToggle={
                        toggleWeekday
                      }
                    />
                  ) : null}

                  {form.recurrenceFrequency ===
                  "semimonthly" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField
                        id="calendar-event-first-day"
                        label="First day of month"
                        value={
                          form.recurrenceFirstDayOfMonth
                        }
                        minimum={
                          1
                        }
                        maximum={
                          31
                        }
                        suffix="day"
                        error={
                          errors.recurrenceFirstDayOfMonth
                        }
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "recurrenceFirstDayOfMonth",
                            value,
                          )
                        }
                      />

                      <NumberField
                        id="calendar-event-second-day"
                        label="Second day of month"
                        value={
                          form.recurrenceSecondDayOfMonth
                        }
                        minimum={
                          1
                        }
                        maximum={
                          31
                        }
                        suffix="day"
                        error={
                          errors.recurrenceSecondDayOfMonth
                        }
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "recurrenceSecondDayOfMonth",
                            value,
                          )
                        }
                      />
                    </div>
                  ) : null}

                  {form.recurrenceFrequency ===
                    "monthly" ||
                  form.recurrenceFrequency ===
                    "quarterly" ? (
                    <NumberField
                      id="calendar-event-day-of-month"
                      label="Day of month"
                      value={
                        form.recurrenceDayOfMonth
                      }
                      minimum={
                        1
                      }
                      maximum={
                        31
                      }
                      suffix="day"
                      error={
                        errors.recurrenceDayOfMonth
                      }
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "recurrenceDayOfMonth",
                          value,
                        )
                      }
                    />
                  ) : null}

                  {form.recurrenceFrequency ===
                  "yearly" ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField
                        id="calendar-event-month-of-year"
                        label="Month"
                        value={
                          form.recurrenceMonthOfYear
                        }
                        options={
                          getMonthOptions()
                        }
                        error={
                          errors.recurrenceMonthOfYear
                        }
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "recurrenceMonthOfYear",
                            value,
                          )
                        }
                      />

                      <NumberField
                        id="calendar-event-yearly-day"
                        label="Day of month"
                        value={
                          form.recurrenceDayOfMonth
                        }
                        minimum={
                          1
                        }
                        maximum={
                          31
                        }
                        suffix="day"
                        error={
                          errors.recurrenceDayOfMonth
                        }
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "recurrenceDayOfMonth",
                            value,
                          )
                        }
                      />
                    </div>
                  ) : null}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <SelectField
                      id="calendar-event-recurrence-end-type"
                      label="Ends"
                      value={
                        form.recurrenceEndType
                      }
                      options={[
                        {
                          value:
                            "never",
                          label:
                            "Never",
                        },
                        {
                          value:
                            "date",
                          label:
                            "On a date",
                        },
                        {
                          value:
                            "occurrences",
                          label:
                            "After occurrences",
                        },
                      ]}
                      error={
                        errors.recurrenceEndType
                      }
                      onChange={(
                        value,
                      ) =>
                        updateField(
                          "recurrenceEndType",
                          value as FinancialCalendarRecurrenceEndType,
                        )
                      }
                    />

                    {form.recurrenceEndType ===
                    "date" ? (
                      <DateField
                        id="calendar-event-recurrence-end-date"
                        label="End date"
                        value={
                          form.recurrenceEndDate
                        }
                        error={
                          errors.recurrenceEndDate
                        }
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "recurrenceEndDate",
                            value,
                          )
                        }
                      />
                    ) : form.recurrenceEndType ===
                      "occurrences" ? (
                      <NumberField
                        id="calendar-event-occurrence-count"
                        label="Occurrences"
                        value={
                          form.recurrenceOccurrenceCount
                        }
                        minimum={
                          1
                        }
                        maximum={
                          999
                        }
                        suffix="times"
                        error={
                          errors.recurrenceOccurrenceCount
                        }
                        onChange={(
                          value,
                        ) =>
                          updateField(
                            "recurrenceOccurrenceCount",
                            value,
                          )
                        }
                      />
                    ) : (
                      <div />
                    )}
                  </div>
                </div>
              ) : null}
            </FormSection>

            <FormSection
              title="Reminders"
              description="Choose when CASE Budget should remind you about this event."
            >
              <div className="space-y-3">
                {form.reminders.map(
                  (
                    reminder,
                  ) => (
                    <ReminderRow
                      key={
                        reminder.id
                      }
                      reminder={
                        reminder
                      }
                      onChange={(
                        updates,
                      ) =>
                        updateReminder(
                          reminder.id,
                          updates,
                        )
                      }
                      onRemove={() =>
                        removeReminder(
                          reminder.id,
                        )
                      }
                    />
                  ),
                )}

                <button
                  type="button"
                  onClick={
                    addReminder
                  }
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <PlusIcon />

                  Add reminder
                </button>

                {errors.reminder ? (
                  <p className="text-xs font-semibold text-[var(--danger)]">
                    {
                      errors.reminder
                    }
                  </p>
                ) : null}
              </div>
            </FormSection>

            <FormSection
              title="Notes"
              description="Add any details you want to remember."
            >
              <TextAreaField
                id="calendar-event-notes"
                label="Notes"
                value={
                  form.notes
                }
                placeholder="Add optional notes"
                rows={
                  4
                }
                error={
                  errors.notes
                }
                onChange={(
                  value,
                ) =>
                  updateField(
                    "notes",
                    value,
                  )
                }
              />
            </FormSection>

            {errors.form ? (
              <div
                role="alert"
                className="flex items-start gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_25%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--danger)_7%,var(--surface-muted))] p-4"
              >
                <span className="mt-0.5 text-[var(--danger)]">
                  <AlertIcon />
                </span>

                <p className="text-sm font-semibold leading-6 text-[var(--danger)]">
                  {
                    errors.form
                  }
                </p>
              </div>
            ) : null}
          </div>

          <footer className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-default)] px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                isSaving
              }
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-5 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSaving
              }
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <SpinnerIcon />
              ) : (
                <SaveIcon />
              )}

              {isSaving
                ? "Saving..."
                : isEditMode
                  ? "Save changes"
                  : "Add event"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function createInitialFormState({
  event,
  initialDate,
}: {
  event:
    FinancialCalendarEvent | null | undefined;
  initialDate?:
    string;
}): CalendarEventFormState {
  if (
    !event
  ) {
    const normalizedInitialDate =
      normalizeCalendarDate(
        initialDate ??
          formatDateKey(
            new Date(),
          ),
      );

    return {
      ...DEFAULT_FORM_STATE,
      date:
        normalizedInitialDate,
      recurrenceDayOfMonth:
        String(
          Number(
            normalizedInitialDate.slice(
              8,
              10,
            ),
          ),
        ),
      recurrenceMonthOfYear:
        String(
          Number(
            normalizedInitialDate.slice(
              5,
              7,
            ),
          ),
        ),
    };
  }

  return {
    title:
      event.title,
    description:
      event.description ??
      "",
    notes:
      event.notes ??
      "",

    type:
      event.type,

    status:
      event.status,

    priority:
      event.priority,

    date:
      event.date,

    startTime:
      event.startTime ??
      "09:00",
    endTime:
      event.endTime ??
      "10:00",

    isAllDay:
      event.isAllDay,

    amount:
      typeof event.amount ===
      "number"
        ? String(
            event.amount,
          )
        : "",

    accountId:
      event.accountId ??
      "",
    categoryId:
      event.categoryId ??
      "",

    isRecurring:
      Boolean(
        event.recurrence,
      ),

    recurrenceFrequency:
      event.recurrence
        ?.frequency ??
      "monthly",

    recurrenceInterval:
      String(
        event.recurrence
          ?.interval ??
        1,
      ),

    recurrenceWeekdays:
      event.recurrence
        ?.weekdays
        ? [
            ...event.recurrence
              .weekdays,
          ]
        : [],

    recurrenceDayOfMonth:
      String(
        event.recurrence
          ?.dayOfMonth ??
        Number(
          event.date.slice(
            8,
            10,
          ),
        ),
      ),

    recurrenceFirstDayOfMonth:
      String(
        event.recurrence
          ?.firstDayOfMonth ??
        1,
      ),

    recurrenceSecondDayOfMonth:
      String(
        event.recurrence
          ?.secondDayOfMonth ??
        15,
      ),

    recurrenceMonthOfYear:
      String(
        event.recurrence
          ?.monthOfYear ??
        Number(
          event.date.slice(
            5,
            7,
          ),
        ),
      ),

    recurrenceEndType:
      event.recurrence
        ?.endType ??
      "never",

    recurrenceEndDate:
      event.recurrence
        ?.endDate ??
      "",

    recurrenceOccurrenceCount:
      String(
        event.recurrence
          ?.occurrenceCount ??
        12,
      ),

    reminders:
      event.reminders.map(
        (
          reminder,
        ) => ({
          ...reminder,
        }),
      ),
  };
}

function createCalendarEventData(
  form:
    CalendarEventFormState,
): CreateFinancialCalendarEventData {
  return {
    title:
      form.title.trim(),

    description:
      normalizeOptionalString(
        form.description,
      ),

    notes:
      normalizeOptionalString(
        form.notes,
      ),

    type:
      form.type,

    status:
      form.status,

    priority:
      form.priority,

    date:
      normalizeCalendarDate(
        form.date,
      ),

    startTime:
      form.isAllDay
        ? undefined
        : form.startTime,

    endTime:
      form.isAllDay
        ? undefined
        : form.endTime,

    isAllDay:
      form.isAllDay,

    amount:
      parseOptionalNumber(
        form.amount,
      ),

    accountId:
      normalizeOptionalString(
        form.accountId,
      ),

    categoryId:
      normalizeOptionalString(
        form.categoryId,
      ),

    recurrence:
      form.isRecurring
        ? {
            frequency:
              form.recurrenceFrequency,

            interval:
              parsePositiveInteger(
                form.recurrenceInterval,
                1,
              ),

            weekdays:
              form.recurrenceFrequency ===
                "weekly" ||
              form.recurrenceFrequency ===
                "biweekly"
                ? [
                    ...form.recurrenceWeekdays,
                  ]
                : undefined,

            dayOfMonth:
              form.recurrenceFrequency ===
                "monthly" ||
              form.recurrenceFrequency ===
                "quarterly" ||
              form.recurrenceFrequency ===
                "yearly"
                ? parsePositiveInteger(
                    form.recurrenceDayOfMonth,
                    1,
                  )
                : undefined,

            firstDayOfMonth:
              form.recurrenceFrequency ===
              "semimonthly"
                ? parsePositiveInteger(
                    form.recurrenceFirstDayOfMonth,
                    1,
                  )
                : undefined,

            secondDayOfMonth:
              form.recurrenceFrequency ===
              "semimonthly"
                ? parsePositiveInteger(
                    form.recurrenceSecondDayOfMonth,
                    15,
                  )
                : undefined,

            monthOfYear:
              form.recurrenceFrequency ===
              "yearly"
                ? parsePositiveInteger(
                    form.recurrenceMonthOfYear,
                    1,
                  )
                : undefined,

            endType:
              form.recurrenceEndType,

            endDate:
              form.recurrenceEndType ===
              "date"
                ? form.recurrenceEndDate
                : undefined,

            occurrenceCount:
              form.recurrenceEndType ===
              "occurrences"
                ? parsePositiveInteger(
                    form.recurrenceOccurrenceCount,
                    1,
                  )
                : undefined,
          }
        : undefined,

    reminders:
      form.reminders.map(
        (
          reminder,
        ) => ({
          ...reminder,

          amount:
            Math.max(
              0,
              Math.round(
                reminder.amount,
              ),
            ),
        }),
      ),
  };
}

function validateCalendarEventForm(
  form:
    CalendarEventFormState,
): CalendarEventValidationErrors {
  const errors:
    CalendarEventValidationErrors = {};

  if (
    !form.title.trim()
  ) {
    errors.title =
      "Enter an event title.";
  }

  if (
    form.title.trim().length >
    120
  ) {
    errors.title =
      "Keep the title under 120 characters.";
  }

  if (
    !isValidDateKey(
      form.date,
    )
  ) {
    errors.date =
      "Select a valid event date.";
  }

  if (
    !form.isAllDay
  ) {
    if (
      !form.startTime
    ) {
      errors.startTime =
        "Select a start time.";
    }

    if (
      !form.endTime
    ) {
      errors.endTime =
        "Select an end time.";
    }

    if (
      form.startTime &&
      form.endTime &&
      form.endTime <=
        form.startTime
    ) {
      errors.endTime =
        "The end time must be after the start time.";
    }
  }

  if (
    form.amount.trim()
  ) {
    const amount =
      Number(
        form.amount,
      );

    if (
      !Number.isFinite(
        amount,
      ) ||
      amount <
        0
    ) {
      errors.amount =
        "Enter a valid amount of zero or more.";
    }
  }

  if (
    form.isRecurring
  ) {
    const interval =
      Number(
        form.recurrenceInterval,
      );

    if (
      !Number.isInteger(
        interval,
      ) ||
      interval <
        1 ||
      interval >
        365
    ) {
      errors.recurrenceInterval =
        "Enter an interval between 1 and 365.";
    }

    if (
      (
        form.recurrenceFrequency ===
          "weekly" ||
        form.recurrenceFrequency ===
          "biweekly"
      ) &&
      form.recurrenceWeekdays.length ===
        0
    ) {
      errors.recurrenceWeekdays =
        "Select at least one weekday.";
    }

    if (
      form.recurrenceFrequency ===
      "semimonthly"
    ) {
      const firstDay =
        Number(
          form.recurrenceFirstDayOfMonth,
        );

      const secondDay =
        Number(
          form.recurrenceSecondDayOfMonth,
        );

      if (
        !isValidDayOfMonth(
          firstDay,
        )
      ) {
        errors.recurrenceFirstDayOfMonth =
          "Enter a day from 1 to 31.";
      }

      if (
        !isValidDayOfMonth(
          secondDay,
        )
      ) {
        errors.recurrenceSecondDayOfMonth =
          "Enter a day from 1 to 31.";
      }

      if (
        firstDay ===
        secondDay
      ) {
        errors.recurrenceSecondDayOfMonth =
          "Choose two different days.";
      }
    }

    if (
      form.recurrenceFrequency ===
        "monthly" ||
      form.recurrenceFrequency ===
        "quarterly" ||
      form.recurrenceFrequency ===
        "yearly"
    ) {
      if (
        !isValidDayOfMonth(
          Number(
            form.recurrenceDayOfMonth,
          ),
        )
      ) {
        errors.recurrenceDayOfMonth =
          "Enter a day from 1 to 31.";
      }
    }

    if (
      form.recurrenceFrequency ===
      "yearly"
    ) {
      const month =
        Number(
          form.recurrenceMonthOfYear,
        );

      if (
        !Number.isInteger(
          month,
        ) ||
        month <
          1 ||
        month >
          12
      ) {
        errors.recurrenceMonthOfYear =
          "Select a valid month.";
      }
    }

    if (
      form.recurrenceEndType ===
      "date"
    ) {
      if (
        !isValidDateKey(
          form.recurrenceEndDate,
        )
      ) {
        errors.recurrenceEndDate =
          "Select a valid end date.";
      } else if (
        form.recurrenceEndDate <
        form.date
      ) {
        errors.recurrenceEndDate =
          "The recurrence end date cannot be before the event date.";
      }
    }

    if (
      form.recurrenceEndType ===
      "occurrences"
    ) {
      const occurrenceCount =
        Number(
          form.recurrenceOccurrenceCount,
        );

      if (
        !Number.isInteger(
          occurrenceCount,
        ) ||
        occurrenceCount <
          1 ||
        occurrenceCount >
          999
      ) {
        errors.recurrenceOccurrenceCount =
          "Enter between 1 and 999 occurrences.";
      }
    }
  }

  const hasInvalidReminder =
    form.reminders.some(
      (
        reminder,
      ) =>
        !Number.isFinite(
          reminder.amount,
        ) ||
        reminder.amount <
          0,
    );

  if (
    hasInvalidReminder
  ) {
    errors.reminder =
      "Reminder values must be zero or greater.";
  }

  return errors;
}

function FormSection({
  title,
  description,
  children,
}: {
  title:
    string;
  description:
    string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4 sm:p-5">
      <div>
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          {title}
        </h3>

        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>

      <div className="mt-4">
        {children}
      </div>
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  placeholder,
  error,
  required = false,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  placeholder:
    string;
  error?:
    string;
  required?:
    boolean;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
      required={
        required
      }
    >
      <input
        id={
          id
        }
        type="text"
        value={
          value
        }
        placeholder={
          placeholder
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        aria-invalid={
          Boolean(
            error,
          )
        }
        aria-describedby={
          error
            ? `${id}-error`
            : undefined
        }
        className={getInputClassName(
          error,
        )}
      />
    </FieldShell>
  );
}

function TextAreaField({
  id,
  label,
  value,
  placeholder,
  rows,
  error,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  placeholder:
    string;
  rows:
    number;
  error?:
    string;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
    >
      <textarea
        id={
          id
        }
        value={
          value
        }
        placeholder={
          placeholder
        }
        rows={
          rows
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        aria-invalid={
          Boolean(
            error,
          )
        }
        aria-describedby={
          error
            ? `${id}-error`
            : undefined
        }
        className={[
          getInputClassName(
            error,
          ),
          "min-h-24 resize-y py-3",
        ].join(
          " ",
        )}
      />
    </FieldShell>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  error,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  options:
    {
      value:
        string;
      label:
        string;
    }[];
  error?:
    string;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
    >
      <select
        id={
          id
        }
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        aria-invalid={
          Boolean(
            error,
          )
        }
        aria-describedby={
          error
            ? `${id}-error`
            : undefined
        }
        className={getInputClassName(
          error,
        )}
      >
        {options.map(
          (
            option,
          ) => (
            <option
              key={
                option.value
              }
              value={
                option.value
              }
            >
              {
                option.label
              }
            </option>
          ),
        )}
      </select>
    </FieldShell>
  );
}

function DateField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  error?:
    string;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
    >
      <input
        id={
          id
        }
        type="date"
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        aria-invalid={
          Boolean(
            error,
          )
        }
        aria-describedby={
          error
            ? `${id}-error`
            : undefined
        }
        className={getInputClassName(
          error,
        )}
      />
    </FieldShell>
  );
}

function TimeField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  error?:
    string;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
    >
      <input
        id={
          id
        }
        type="time"
        value={
          value
        }
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        aria-invalid={
          Boolean(
            error,
          )
        }
        aria-describedby={
          error
            ? `${id}-error`
            : undefined
        }
        className={getInputClassName(
          error,
        )}
      />
    </FieldShell>
  );
}

function CurrencyField({
  id,
  label,
  value,
  placeholder,
  error,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  placeholder:
    string;
  error?:
    string;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
    >
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-sm font-bold text-[var(--text-muted)]">
          $
        </span>

        <input
          id={
            id
          }
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={
            value
          }
          placeholder={
            placeholder
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          aria-invalid={
            Boolean(
              error,
            )
          }
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          className={[
            getInputClassName(
              error,
            ),
            "pl-8",
          ].join(
            " ",
          )}
        />
      </div>
    </FieldShell>
  );
}

function NumberField({
  id,
  label,
  value,
  minimum,
  maximum,
  suffix,
  error,
  onChange,
}: {
  id:
    string;
  label:
    string;
  value:
    string;
  minimum:
    number;
  maximum:
    number;
  suffix:
    string;
  error?:
    string;
  onChange: (
    value:
      string,
  ) => void;
}) {
  return (
    <FieldShell
      id={
        id
      }
      label={
        label
      }
      error={
        error
      }
    >
      <div className="relative">
        <input
          id={
            id
          }
          type="number"
          inputMode="numeric"
          min={
            minimum
          }
          max={
            maximum
          }
          step="1"
          value={
            value
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .value,
            )
          }
          aria-invalid={
            Boolean(
              error,
            )
          }
          aria-describedby={
            error
              ? `${id}-error`
              : undefined
          }
          className={[
            getInputClassName(
              error,
            ),
            "pr-20",
          ].join(
            " ",
          )}
        />

        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-bold text-[var(--text-muted)]">
          {suffix}
        </span>
      </div>
    </FieldShell>
  );
}

function ToggleField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id:
    string;
  label:
    string;
  description:
    string;
  checked:
    boolean;
  onChange: (
    checked:
      boolean,
  ) => void;
}) {
  return (
    <label
      htmlFor={
        id
      }
      className="flex cursor-pointer items-start gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 transition hover:bg-[var(--surface-hover)]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-[var(--text-primary)]">
          {label}
        </span>

        <span className="mt-1 block text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </span>
      </span>

      <span className="relative mt-0.5 shrink-0">
        <input
          id={
            id
          }
          type="checkbox"
          checked={
            checked
          }
          onChange={(
            event,
          ) =>
            onChange(
              event.target
                .checked,
            )
          }
          className="peer sr-only"
        />

        <span className="block h-6 w-11 rounded-full bg-[var(--border-strong)] transition peer-checked:bg-[var(--primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--primary)] peer-focus-visible:ring-offset-2" />

        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function WeekdaySelector({
  selectedWeekdays,
  error,
  onToggle,
}: {
  selectedWeekdays:
    FinancialCalendarWeekday[];
  error?:
    string;
  onToggle: (
    weekday:
      FinancialCalendarWeekday,
  ) => void;
}) {
  return (
    <div>
      <p className="text-sm font-bold text-[var(--text-primary)]">
        Repeat on
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {WEEKDAY_OPTIONS.map(
          (
            option,
          ) => {
            const isSelected =
              selectedWeekdays.includes(
                option.value,
              );

            return (
              <button
                key={
                  option.value
                }
                type="button"
                onClick={() =>
                  onToggle(
                    option.value,
                  )
                }
                aria-pressed={
                  isSelected
                }
                title={
                  option.label
                }
                className={[
                  "inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border-default)] bg-[var(--surface-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                ].join(
                  " ",
                )}
              >
                {
                  option.shortLabel
                }
              </button>
            );
          },
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs font-semibold text-[var(--danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ReminderRow({
  reminder,
  onChange,
  onRemove,
}: {
  reminder:
    FinancialCalendarReminder;
  onChange: (
    updates:
      Partial<
        FinancialCalendarReminder
      >,
  ) => void;
  onRemove: () => void;
}) {
  const unitOptions:
    {
      value:
        FinancialCalendarReminderUnit;
      label:
        string;
    }[] = [
      {
        value:
          "minute",
        label:
          "Minutes before",
      },
      {
        value:
          "hour",
        label:
          "Hours before",
      },
      {
        value:
          "day",
        label:
          "Days before",
      },
      {
        value:
          "week",
        label:
          "Weeks before",
      },
    ];

  return (
    <div className="grid gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 sm:grid-cols-[110px_minmax(0,1fr)_auto] sm:items-end">
      <NumberField
        id={`calendar-reminder-amount-${reminder.id}`}
        label="Amount"
        value={
          String(
            reminder.amount,
          )
        }
        minimum={
          0
        }
        maximum={
          999
        }
        suffix=""
        onChange={(
          value,
        ) =>
          onChange({
            amount:
              Number(
                value,
              ),
          })
        }
      />

      <SelectField
        id={`calendar-reminder-unit-${reminder.id}`}
        label="Reminder"
        value={
          reminder.unit
        }
        options={
          unitOptions
        }
        onChange={(
          value,
        ) =>
          onChange({
            unit:
              value as FinancialCalendarReminderUnit,
          })
        }
      />

      <button
        type="button"
        onClick={
          onRemove
        }
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
        aria-label="Remove reminder"
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function FieldShell({
  id,
  label,
  error,
  required = false,
  children,
}: {
  id:
    string;
  label:
    string;
  error?:
    string;
  required?:
    boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={
          id
        }
        className="block text-sm font-bold text-[var(--text-primary)]"
      >
        {label}

        {required ? (
          <span className="ml-1 text-[var(--danger)]">
            *
          </span>
        ) : null}
      </label>

      <div className="mt-2">
        {children}
      </div>

      {error ? (
        <p
          id={`${id}-error`}
          className="mt-2 text-xs font-semibold text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function getInputClassName(
  error?:
    string,
) {
  return [
    "h-11 w-full rounded-xl border bg-[var(--surface-default)] px-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:ring-2",
    error
      ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]"
      : "border-[var(--border-default)] focus:border-[var(--primary)] focus:ring-[var(--primary)]",
  ].join(
    " ",
  );
}

function getRecurrenceIntervalSuffix(
  frequency:
    FinancialCalendarRecurrenceFrequency,
) {
  switch (
    frequency
  ) {
    case "daily":
      return "days";

    case "weekly":
      return "weeks";

    case "biweekly":
      return "2-week cycles";

    case "semimonthly":
      return "months";

    case "monthly":
      return "months";

    case "quarterly":
      return "quarters";

    case "yearly":
      return "years";

    case "custom":
    default:
      return "days";
  }
}

function getMonthOptions() {
  return Array.from(
    {
      length:
        12,
    },
    (
      _,
      index,
    ) => {
      const value =
        index +
        1;

      return {
        value:
          String(
            value,
          ),

        label:
          new Date(
            2026,
            index,
            1,
          ).toLocaleDateString(
            "en-US",
            {
              month:
                "long",
            },
          ),
      };
    },
  );
}

function normalizeOptionalString(
  value:
    string,
) {
  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function parseOptionalNumber(
  value:
    string,
) {
  if (
    !value.trim()
  ) {
    return undefined;
  }

  const parsedValue =
    Number(
      value,
    );

  return Number.isFinite(
    parsedValue,
  )
    ? Math.round(
        parsedValue *
          100,
      ) /
      100
    : undefined;
}

function parsePositiveInteger(
  value:
    string,
  fallback:
    number,
) {
  const parsedValue =
    Number(
      value,
    );

  if (
    !Number.isInteger(
      parsedValue,
    ) ||
    parsedValue <
      1
  ) {
    return fallback;
  }

  return parsedValue;
}

function isValidDateKey(
  value:
    string,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  return !Number.isNaN(
    date.getTime(),
  );
}

function isValidDayOfMonth(
  value:
    number,
) {
  return (
    Number.isInteger(
      value,
    ) &&
    value >=
      1 &&
    value <=
      31
  );
}

function CalendarIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="5"
        width="18"
        height="16"
        rx="2"
      />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
      <path d="M3 10h18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 3h12l2 2v16H5Z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 15h8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6 18 20H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 3 9 16H3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
    </svg>
  );
}
