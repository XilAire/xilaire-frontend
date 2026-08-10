"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";
import {
  useBills,
} from "@/components/providers/BillsProvider";
import {
  usePayCycles,
} from "@/components/providers/PayCyclesProvider";
import {
  useTransactions,
} from "@/components/providers/TransactionsProvider";
import {
  DEFAULT_CALENDAR_FILTERS,
  DEFAULT_CALENDAR_PREFERENCES,
  applyCalendarPreferences,
  buildAgendaGroups,
  buildCalendarMonth,
  createFinancialCalendarEventId,
  detectCalendarConflicts,
  filterCalendarEvents,
  formatDateKey,
  generateCalendarOccurrences,
  getCalendarVisibleRange,
  mergeCalendarFilters,
  mergeCalendarPreferences,
  normalizeCalendarDate,
} from "@/lib/calendar/calendar-utils";

import type {
  CreateFinancialCalendarEventData,
  FinancialCalendarAgendaGroup,
  FinancialCalendarConflict,
  FinancialCalendarDateRange,
  FinancialCalendarEvent,
  FinancialCalendarEventOccurrence,
  FinancialCalendarFilters,
  FinancialCalendarMonth,
  FinancialCalendarPreferences,
  FinancialCalendarState,
  FinancialCalendarSummary,
  FinancialCalendarView,
  UpdateFinancialCalendarEventData,
} from "@/types/calendar";

type CalendarContextValue = {
  manualEvents: FinancialCalendarEvent[];
  generatedEvents: FinancialCalendarEvent[];
  events: FinancialCalendarEvent[];
  filteredEvents: FinancialCalendarEvent[];
  occurrences: FinancialCalendarEventOccurrence[];
  visibleOccurrences: FinancialCalendarEventOccurrence[];
  month: FinancialCalendarMonth;
  agendaGroups: FinancialCalendarAgendaGroup[];
  conflicts: FinancialCalendarConflict[];
  summary: FinancialCalendarSummary;
  selectedDate: string;
  visibleRange: FinancialCalendarDateRange;
  view: FinancialCalendarView;
  filters: FinancialCalendarFilters;
  preferences: FinancialCalendarPreferences;
  addEvent: (
    event: CreateFinancialCalendarEventData,
  ) => FinancialCalendarEvent;
  updateEvent: (
    event: UpdateFinancialCalendarEventData,
  ) => void;
  deleteEvent: (
    eventId: string,
  ) => void;
  getEventById: (
    eventId: string,
  ) => FinancialCalendarEvent | null;
  setSelectedDate: (
    date: string,
  ) => void;
  setView: (
    view: FinancialCalendarView,
  ) => void;
  setFilters: (
    filters: Partial<FinancialCalendarFilters>,
  ) => void;
  resetFilters: () => void;
  setPreferences: (
    preferences: Partial<FinancialCalendarPreferences>,
  ) => void;
  resetPreferences: () => void;
  markEventCompleted: (
    eventId: string,
  ) => void;
  markEventSkipped: (
    eventId: string,
  ) => void;
  restoreEvent: (
    eventId: string,
  ) => void;
  clearManualEvents: () => void;
};

export type CalendarProviderProps = {
  children: ReactNode;
  initialEvents?: FinancialCalendarEvent[];
  initialState?: Partial<FinancialCalendarState>;
};

type StoredCalendarData = {
  manualEvents: FinancialCalendarEvent[];
  selectedDate: string;
  view: FinancialCalendarView;
  filters: FinancialCalendarFilters;
  preferences: FinancialCalendarPreferences;
};

const CALENDAR_STORAGE_KEY =
  "case-budget:financial-calendar:v1";

const CalendarContext =
  createContext<CalendarContextValue | undefined>(
    undefined,
  );

export default function CalendarProvider({
  children,
  initialEvents = [],
  initialState,
}: CalendarProviderProps) {
  const {
    accounts,
  } = useAccounts();

  const {
    bills,
  } = useBills();

  const {
    payCycles,
    projectedPayPeriodsByCycle,
  } = usePayCycles();

  const {
    transactions,
  } = useTransactions();

  const today =
    useMemo(
      () =>
        formatDateKey(
          new Date(),
        ),
      [],
    );

  const [
    manualEvents,
    setManualEvents,
  ] =
    useState<FinancialCalendarEvent[]>(
      () =>
        cloneEvents(
          initialEvents,
        ),
    );

  const [
    selectedDate,
    setSelectedDateState,
  ] = useState(
    () =>
      normalizeCalendarDate(
        initialState?.selectedDate ??
          today,
      ),
  );

  const [
    view,
    setViewState,
  ] =
    useState<FinancialCalendarView>(
      initialState?.view ??
        DEFAULT_CALENDAR_PREFERENCES.defaultView,
    );

  const [
    filters,
    setFiltersState,
  ] =
    useState<FinancialCalendarFilters>(
      () => ({
        ...DEFAULT_CALENDAR_FILTERS,
        ...initialState?.filters,
        eventTypes:
          initialState?.filters?.eventTypes ??
          DEFAULT_CALENDAR_FILTERS.eventTypes,
        statuses:
          initialState?.filters?.statuses ??
          DEFAULT_CALENDAR_FILTERS.statuses,
        priorities:
          initialState?.filters?.priorities ??
          DEFAULT_CALENDAR_FILTERS.priorities,
        accountIds:
          initialState?.filters?.accountIds ??
          DEFAULT_CALENDAR_FILTERS.accountIds,
      }),
    );

  const [
    preferences,
    setPreferencesState,
  ] =
    useState<FinancialCalendarPreferences>(
      () => ({
        ...DEFAULT_CALENDAR_PREFERENCES,
        ...initialState?.preferences,
      }),
    );

  const [
    hasHydratedStorage,
    setHasHydratedStorage,
  ] = useState(
    false,
  );

  useEffect(
    () => {
      const storedData =
        loadStoredCalendarData();

      if (
        storedData
      ) {
        setManualEvents(
          cloneEvents(
            storedData.manualEvents,
          ),
        );

        setSelectedDateState(
          normalizeCalendarDate(
            storedData.selectedDate,
          ),
        );

        setViewState(
          storedData.view,
        );

        setFiltersState({
          ...DEFAULT_CALENDAR_FILTERS,
          ...storedData.filters,
          eventTypes: [
            ...storedData.filters.eventTypes,
          ],
          statuses: [
            ...storedData.filters.statuses,
          ],
          priorities: [
            ...storedData.filters.priorities,
          ],
          accountIds: [
            ...storedData.filters.accountIds,
          ],
        });

        setPreferencesState({
          ...DEFAULT_CALENDAR_PREFERENCES,
          ...storedData.preferences,
        });
      }

      setHasHydratedStorage(
        true,
      );
    },
    [],
  );

  useEffect(
    () => {
      if (
        !hasHydratedStorage
      ) {
        return;
      }

      const storedData:
        StoredCalendarData = {
          manualEvents,
          selectedDate,
          view,
          filters,
          preferences,
        };

      try {
        window.localStorage.setItem(
          CALENDAR_STORAGE_KEY,
          JSON.stringify(
            storedData,
          ),
        );
      } catch {
        // Storage may be unavailable or full.
      }
    },
    [
      filters,
      hasHydratedStorage,
      manualEvents,
      preferences,
      selectedDate,
      view,
    ],
  );

  const generatedEvents =
    useMemo(
      () =>
        createGeneratedCalendarEvents({
          bills,
          payCycles,
          projectedPayPeriodsByCycle,
          transactions,
        }),
      [
        bills,
        payCycles,
        projectedPayPeriodsByCycle,
        transactions,
      ],
    );

  const events =
    useMemo(
      () =>
        deduplicateCalendarEvents([
          ...manualEvents,
          ...generatedEvents,
        ]),
      [
        generatedEvents,
        manualEvents,
      ],
    );

  const filteredEvents =
    useMemo(
      () =>
        filterCalendarEvents(
          applyCalendarPreferences(
            events,
            preferences,
          ),
          filters,
        ),
      [
        events,
        filters,
        preferences,
      ],
    );

  const visibleRange =
    useMemo(
      () =>
        getCalendarVisibleRange({
          selectedDate,
          view,
          weekStartsOn:
            preferences.weekStartsOn,
        }),
      [
        preferences.weekStartsOn,
        selectedDate,
        view,
      ],
    );

  const occurrences =
    useMemo(
      () =>
        generateCalendarOccurrences({
          events:
            filteredEvents,
          range:
            visibleRange,
          today,
        }),
      [
        filteredEvents,
        today,
        visibleRange,
      ],
    );

  const visibleOccurrences =
    occurrences;

  const month =
    useMemo(
      () =>
        buildCalendarMonth({
          selectedDate,
          occurrences:
            visibleOccurrences,
          weekStartsOn:
            preferences.weekStartsOn,
          showWeekends:
            preferences.showWeekends,
          today,
        }),
      [
        preferences.showWeekends,
        preferences.weekStartsOn,
        selectedDate,
        today,
        visibleOccurrences,
      ],
    );

  const agendaGroups =
    useMemo(
      () =>
        buildAgendaGroups(
          visibleOccurrences,
        ),
      [
        visibleOccurrences,
      ],
    );

  const accountBalances =
    useMemo(
      () =>
        accounts.reduce<
          Record<string, number>
        >(
          (
            balances,
            account,
          ) => ({
            ...balances,
            [account.id]:
              getFiniteNumber(
                account,
                [
                  "availableBalance",
                  "currentBalance",
                  "balance",
                ],
                0,
              ),
          }),
          {},
        ),
      [
        accounts,
      ],
    );

  const conflicts =
    useMemo(
      () =>
        preferences.enableConflictDetection
          ? detectCalendarConflicts({
              occurrences,
              accountBalances,
              today,
            })
          : [],
      [
        accountBalances,
        occurrences,
        preferences.enableConflictDetection,
        today,
      ],
    );

  const summary =
    useMemo(
      () =>
        calculateProviderSummary({
          occurrences:
            visibleOccurrences,
          today,
        }),
      [
        today,
        visibleOccurrences,
      ],
    );

  const addEvent =
    useCallback(
      (
        input:
          CreateFinancialCalendarEventData,
      ) => {
        const now =
          new Date().toISOString();

        const event:
          FinancialCalendarEvent = {
            id:
              createFinancialCalendarEventId(),
            title:
              input.title.trim(),
            description:
              normalizeOptionalString(
                input.description,
              ),
            notes:
              normalizeOptionalString(
                input.notes,
              ),
            type:
              input.type,
            status:
              input.status,
            priority:
              input.priority,
            date:
              normalizeCalendarDate(
                input.date,
              ),
            startTime:
              input.isAllDay
                ? undefined
                : normalizeOptionalString(
                    input.startTime,
                  ),
            endTime:
              input.isAllDay
                ? undefined
                : normalizeOptionalString(
                    input.endTime,
                  ),
            isAllDay:
              input.isAllDay,
            amount:
              normalizeOptionalNumber(
                input.amount,
              ),
            accountId:
              normalizeOptionalString(
                input.accountId,
              ),
            categoryId:
              normalizeOptionalString(
                input.categoryId,
              ),
            recurrence:
              input.recurrence
                ? cloneRecurrence(
                    input.recurrence,
                  )
                : undefined,
            reminders:
              input.reminders.map(
                (
                  reminder,
                ) => ({
                  ...reminder,
                }),
              ),
            isAutoGenerated:
              false,
            createdAt:
              now,
            updatedAt:
              now,
          };

        setManualEvents(
          (
            currentEvents,
          ) => [
            ...currentEvents,
            event,
          ],
        );

        return event;
      },
      [],
    );

  const updateEvent =
    useCallback(
      (
        input:
          UpdateFinancialCalendarEventData,
      ) => {
        setManualEvents(
          (
            currentEvents,
          ) =>
            currentEvents.map(
              (
                event,
              ) => {
                if (
                  event.id !==
                  input.id
                ) {
                  return event;
                }

                return {
                  ...event,
                  title:
                    input.title.trim(),
                  description:
                    normalizeOptionalString(
                      input.description,
                    ),
                  notes:
                    normalizeOptionalString(
                      input.notes,
                    ),
                  type:
                    input.type,
                  status:
                    input.status,
                  priority:
                    input.priority,
                  date:
                    normalizeCalendarDate(
                      input.date,
                    ),
                  startTime:
                    input.isAllDay
                      ? undefined
                      : normalizeOptionalString(
                          input.startTime,
                        ),
                  endTime:
                    input.isAllDay
                      ? undefined
                      : normalizeOptionalString(
                          input.endTime,
                        ),
                  isAllDay:
                    input.isAllDay,
                  amount:
                    normalizeOptionalNumber(
                      input.amount,
                    ),
                  accountId:
                    normalizeOptionalString(
                      input.accountId,
                    ),
                  categoryId:
                    normalizeOptionalString(
                      input.categoryId,
                    ),
                  recurrence:
                    input.recurrence
                      ? cloneRecurrence(
                          input.recurrence,
                        )
                      : undefined,
                  reminders:
                    input.reminders.map(
                      (
                        reminder,
                      ) => ({
                        ...reminder,
                      }),
                    ),
                  updatedAt:
                    new Date().toISOString(),
                };
              },
            ),
        );
      },
      [],
    );

  const deleteEvent =
    useCallback(
      (
        eventId:
          string,
      ) => {
        setManualEvents(
          (
            currentEvents,
          ) =>
            currentEvents.filter(
              (
                event,
              ) =>
                event.id !==
                eventId,
            ),
        );
      },
      [],
    );

  const getEventById =
    useCallback(
      (
        eventId:
          string,
      ) =>
        events.find(
          (
            event,
          ) =>
            event.id ===
            eventId,
        ) ??
        null,
      [
        events,
      ],
    );

  const setSelectedDate =
    useCallback(
      (
        date:
          string,
      ) => {
        setSelectedDateState(
          normalizeCalendarDate(
            date,
          ),
        );
      },
      [],
    );

  const setView =
    useCallback(
      (
        nextView:
          FinancialCalendarView,
      ) => {
        setViewState(
          nextView,
        );
      },
      [],
    );

  const setFilters =
    useCallback(
      (
        updates:
          Partial<FinancialCalendarFilters>,
      ) => {
        setFiltersState(
          (
            currentFilters,
          ) =>
            mergeCalendarFilters(
              currentFilters,
              updates,
            ),
        );
      },
      [],
    );

  const resetFilters =
    useCallback(
      () => {
        setFiltersState({
          ...DEFAULT_CALENDAR_FILTERS,
          eventTypes: [
            ...DEFAULT_CALENDAR_FILTERS.eventTypes,
          ],
          statuses: [
            ...DEFAULT_CALENDAR_FILTERS.statuses,
          ],
          priorities: [
            ...DEFAULT_CALENDAR_FILTERS.priorities,
          ],
          accountIds: [
            ...DEFAULT_CALENDAR_FILTERS.accountIds,
          ],
        });
      },
      [],
    );

  const setPreferences =
    useCallback(
      (
        updates:
          Partial<FinancialCalendarPreferences>,
      ) => {
        setPreferencesState(
          (
            currentPreferences,
          ) =>
            mergeCalendarPreferences(
              currentPreferences,
              updates,
            ),
        );
      },
      [],
    );

  const resetPreferences =
    useCallback(
      () => {
        setPreferencesState({
          ...DEFAULT_CALENDAR_PREFERENCES,
        });

        setViewState(
          DEFAULT_CALENDAR_PREFERENCES.defaultView,
        );
      },
      [],
    );

  const markEventCompleted =
    useCallback(
      (
        eventId:
          string,
      ) => {
        updateManualEventStatus({
          eventId,
          status:
            "completed",
          setManualEvents,
        });
      },
      [],
    );

  const markEventSkipped =
    useCallback(
      (
        eventId:
          string,
      ) => {
        updateManualEventStatus({
          eventId,
          status:
            "skipped",
          setManualEvents,
        });
      },
      [],
    );

  const restoreEvent =
    useCallback(
      (
        eventId:
          string,
      ) => {
        updateManualEventStatus({
          eventId,
          status:
            "scheduled",
          setManualEvents,
        });
      },
      [],
    );

  const clearManualEvents =
    useCallback(
      () => {
        setManualEvents(
          [],
        );
      },
      [],
    );

  const value =
    useMemo<CalendarContextValue>(
      () => ({
        manualEvents,
        generatedEvents,
        events,
        filteredEvents,
        occurrences,
        visibleOccurrences,
        month,
        agendaGroups,
        conflicts,
        summary,
        selectedDate,
        visibleRange,
        view,
        filters,
        preferences,
        addEvent,
        updateEvent,
        deleteEvent,
        getEventById,
        setSelectedDate,
        setView,
        setFilters,
        resetFilters,
        setPreferences,
        resetPreferences,
        markEventCompleted,
        markEventSkipped,
        restoreEvent,
        clearManualEvents,
      }),
      [
        addEvent,
        agendaGroups,
        clearManualEvents,
        conflicts,
        deleteEvent,
        events,
        filteredEvents,
        filters,
        generatedEvents,
        getEventById,
        manualEvents,
        markEventCompleted,
        markEventSkipped,
        month,
        occurrences,
        preferences,
        resetFilters,
        resetPreferences,
        restoreEvent,
        selectedDate,
        setFilters,
        setPreferences,
        setSelectedDate,
        setView,
        summary,
        updateEvent,
        view,
        visibleOccurrences,
        visibleRange,
      ],
    );

  return (
    <CalendarContext.Provider
      value={
        value
      }
    >
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const context =
    useContext(
      CalendarContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useCalendar must be used within a CalendarProvider.",
    );
  }

  return context;
}

function createGeneratedCalendarEvents({
  bills,
  payCycles,
  projectedPayPeriodsByCycle,
  transactions,
}: {
  bills: unknown[];
  payCycles: unknown[];
  projectedPayPeriodsByCycle: Record<string, unknown[]>;
  transactions: unknown[];
}) {
  return [
    ...createBillCalendarEvents(
      bills,
    ),
    ...createPaycheckCalendarEvents({
      payCycles,
      projectedPayPeriodsByCycle,
    }),
    ...createTransactionCalendarEvents(
      transactions,
    ),
  ];
}

function createBillCalendarEvents(
  bills: unknown[],
): FinancialCalendarEvent[] {
  return bills.flatMap(
    (
      bill,
    ) => {
      const record =
        asRecord(
          bill,
        );

      const id =
        getString(
          record,
          [
            "id",
          ],
        );

      const name =
        getString(
          record,
          [
            "name",
            "title",
            "billName",
            "payee",
          ],
        );

      const dueDate =
        getString(
          record,
          [
            "dueDate",
            "nextDueDate",
            "date",
          ],
        );

      if (
        !id ||
        !name ||
        !dueDate
      ) {
        return [];
      }

      const status =
        normalizeGeneratedStatus(
          getString(
            record,
            [
              "status",
              "paymentStatus",
            ],
          ),
        );

      const isPaid =
        getBoolean(
          record,
          [
            "isPaid",
            "paid",
          ],
          false,
        ) ||
        status ===
          "completed";

      const isAutopay =
        getBoolean(
          record,
          [
            "isAutopay",
            "autopay",
            "autoPay",
          ],
          false,
        );

      const amount =
        Math.abs(
          getFiniteNumber(
            record,
            [
              "amount",
              "expectedAmount",
              "minimumPayment",
            ],
            0,
          ),
        );

      return [
        {
          id:
            `calendar-bill-${id}`,
          title:
            name,
          description:
            isAutopay
              ? "Bill payment · Autopay"
              : "Bill payment",
          type:
            "bill",
          status:
            isPaid
              ? "completed"
              : status,
          priority:
            normalizePriority(
              getString(
                record,
                [
                  "priority",
                  "billPriority",
                ],
              ),
            ),
          date:
            normalizeCalendarDate(
              dueDate,
            ),
          isAllDay:
            true,
          amount,
          accountId:
            getString(
              record,
              [
                "accountId",
                "paymentAccountId",
              ],
            ),
          source: {
            type:
              "bill",
            id,
          },
          reminders:
            [],
          isAutoGenerated:
            true,
          createdAt:
            getString(
              record,
              [
                "createdAt",
              ],
            ) ??
            new Date(
              0,
            ).toISOString(),
          updatedAt:
            getString(
              record,
              [
                "updatedAt",
              ],
            ) ??
            new Date(
              0,
            ).toISOString(),
        },
      ];
    },
  );
}

function createPaycheckCalendarEvents({
  payCycles,
  projectedPayPeriodsByCycle,
}: {
  payCycles: unknown[];
  projectedPayPeriodsByCycle: Record<string, unknown[]>;
}): FinancialCalendarEvent[] {
  return payCycles.flatMap(
    (
      payCycle,
    ) => {
      const record =
        asRecord(
          payCycle,
        );

      const payCycleId =
        getString(
          record,
          [
            "id",
          ],
        );

      if (
        !payCycleId
      ) {
        return [];
      }

      const payCycleName =
        getString(
          record,
          [
            "name",
            "employerName",
          ],
        ) ??
        "Paycheck";

      const payPeriods =
        projectedPayPeriodsByCycle[
          payCycleId
        ] ??
        [];

      if (
        payPeriods.length ===
        0
      ) {
        const fallbackDate =
          getString(
            record,
            [
              "nextPayDate",
              "startDate",
            ],
          );

        if (
          !fallbackDate
        ) {
          return [];
        }

        return [
          createPaycheckEvent({
            payCycleId,
            payCycleName,
            periodId:
              "next",
            payDate:
              fallbackDate,
            amount:
              getFiniteNumber(
                record,
                [
                  "expectedNetAmount",
                ],
                0,
              ),
            accountId:
              getString(
                record,
                [
                  "accountId",
                ],
              ),
            status:
              "scheduled",
          }),
        ];
      }

      return payPeriods.flatMap(
        (
          payPeriod,
        ) => {
          const periodRecord =
            asRecord(
              payPeriod,
            );

          const periodId =
            getString(
              periodRecord,
              [
                "id",
              ],
            );

          const payDate =
            getString(
              periodRecord,
              [
                "actualPayDate",
                "expectedPayDate",
              ],
            );

          if (
            !periodId ||
            !payDate
          ) {
            return [];
          }

          return [
            createPaycheckEvent({
              payCycleId,
              payCycleName,
              periodId,
              payDate,
              amount:
                getFiniteNumber(
                  periodRecord,
                  [
                    "actualAmount",
                    "expectedAmount",
                  ],
                  getFiniteNumber(
                    record,
                    [
                      "expectedNetAmount",
                    ],
                    0,
                  ),
                ),
              accountId:
                getString(
                  periodRecord,
                  [
                    "destinationAccountId",
                  ],
                ) ??
                getString(
                  record,
                  [
                    "accountId",
                  ],
                ),
              status:
                normalizeGeneratedStatus(
                  getString(
                    periodRecord,
                    [
                      "status",
                    ],
                  ),
                ),
            }),
          ];
        },
      );
    },
  );
}

function createPaycheckEvent({
  payCycleId,
  payCycleName,
  periodId,
  payDate,
  amount,
  accountId,
  status,
}: {
  payCycleId: string;
  payCycleName: string;
  periodId: string;
  payDate: string;
  amount: number;
  accountId?: string;
  status: FinancialCalendarEvent["status"];
}): FinancialCalendarEvent {
  return {
    id:
      `calendar-paycheck-${payCycleId}-${periodId}`,
    title:
      payCycleName,
    description:
      "Expected paycheck deposit",
    type:
      "paycheck",
    status,
    priority:
      "normal",
    date:
      normalizeCalendarDate(
        payDate,
      ),
    isAllDay:
      true,
    amount:
      Math.abs(
        amount,
      ),
    accountId,
    source: {
      type:
        "pay-cycle",
      id:
        payCycleId,
    },
    reminders:
      [],
    isAutoGenerated:
      true,
    createdAt:
      new Date(
        0,
      ).toISOString(),
    updatedAt:
      new Date(
        0,
      ).toISOString(),
  };
}

function createTransactionCalendarEvents(
  transactions: unknown[],
): FinancialCalendarEvent[] {
  return transactions.flatMap(
    (
      transaction,
    ) => {
      const record =
        asRecord(
          transaction,
        );

      const id =
        getString(
          record,
          [
            "id",
          ],
        );

      const date =
        getString(
          record,
          [
            "date",
            "transactionDate",
          ],
        );

      if (
        !id ||
        !date
      ) {
        return [];
      }

      const type =
        getString(
          record,
          [
            "type",
          ],
        );

      const merchant =
        getString(
          record,
          [
            "merchant",
            "name",
            "description",
          ],
        ) ??
        "Transaction";

      const transactionStatus =
        getString(
          record,
          [
            "status",
          ],
        );

      return [
        {
          id:
            `calendar-transaction-${id}`,
          title:
            merchant,
          description:
            getString(
              record,
              [
                "note",
                "description",
              ],
            ),
          type:
            type ===
              "income"
              ? "income"
              : type ===
                  "transfer"
                ? "transfer"
                : "transaction",
          status:
            transactionStatus ===
              "cleared"
              ? "completed"
              : "pending",
          priority:
            "normal",
          date:
            normalizeCalendarDate(
              date,
            ),
          isAllDay:
            true,
          amount:
            Math.abs(
              getFiniteNumber(
                record,
                [
                  "amount",
                ],
                0,
              ),
            ),
          accountId:
            getNestedString(
              record,
              [
                "account",
                "id",
              ],
            ) ??
            getString(
              record,
              [
                "accountId",
              ],
            ),
          categoryId:
            getNestedString(
              record,
              [
                "category",
                "id",
              ],
            ) ??
            getString(
              record,
              [
                "categoryId",
              ],
            ),
          source: {
            type:
              "transaction",
            id,
          },
          reminders:
            [],
          isAutoGenerated:
            true,
          createdAt:
            getString(
              record,
              [
                "createdAt",
              ],
            ) ??
            new Date(
              0,
            ).toISOString(),
          updatedAt:
            getString(
              record,
              [
                "updatedAt",
              ],
            ) ??
            new Date(
              0,
            ).toISOString(),
        },
      ];
    },
  );
}

function calculateProviderSummary({
  occurrences,
  today,
}: {
  occurrences: FinancialCalendarEventOccurrence[];
  today: string;
}): FinancialCalendarSummary {
  const upcomingOccurrences =
    occurrences
      .filter(
        (
          occurrence,
        ) =>
          occurrence.date >=
            today &&
          occurrence.status !==
            "completed" &&
          occurrence.status !==
            "canceled" &&
          occurrence.status !==
            "skipped",
      )
      .sort(
        (
          firstOccurrence,
          secondOccurrence,
        ) =>
          firstOccurrence.date.localeCompare(
            secondOccurrence.date,
          ),
      );

  const scheduledIncomeAmount =
    occurrences.reduce(
      (
        total,
        occurrence,
      ) =>
        total +
        (
          occurrence.event.type ===
            "paycheck" ||
          occurrence.event.type ===
            "income"
            ? Math.abs(
                occurrence.event.amount ??
                  0,
              )
            : 0
        ),
      0,
    );

  const scheduledExpenseAmount =
    occurrences.reduce(
      (
        total,
        occurrence,
      ) =>
        total +
        (
          occurrence.event.type ===
            "bill" ||
          occurrence.event.type ===
            "transaction" ||
          occurrence.event.type ===
            "savings-contribution" ||
          occurrence.event.type ===
            "debt-payment"
            ? Math.abs(
                occurrence.event.amount ??
                  0,
              )
            : 0
        ),
      0,
    );

  const nextPaycheck =
    upcomingOccurrences.find(
      (
        occurrence,
      ) =>
        occurrence.event.type ===
          "paycheck" ||
        occurrence.event.type ===
          "income",
    );

  const nextBill =
    upcomingOccurrences.find(
      (
        occurrence,
      ) =>
        occurrence.event.type ===
        "bill",
    );

  return {
    totalEventCount:
      occurrences.length,
    upcomingEventCount:
      upcomingOccurrences.length,
    dueTodayCount:
      occurrences.filter(
        (
          occurrence,
        ) =>
          occurrence.date ===
            today &&
          occurrence.status ===
            "due",
      ).length,
    pastDueCount:
      occurrences.filter(
        (
          occurrence,
        ) =>
          occurrence.status ===
          "past-due",
      ).length,
    completedCount:
      occurrences.filter(
        (
          occurrence,
        ) =>
          occurrence.status ===
          "completed",
      ).length,
    upcomingBillCount:
      upcomingOccurrences.filter(
        (
          occurrence,
        ) =>
          occurrence.event.type ===
          "bill",
      ).length,
    upcomingPaycheckCount:
      upcomingOccurrences.filter(
        (
          occurrence,
        ) =>
          occurrence.event.type ===
            "paycheck" ||
          occurrence.event.type ===
            "income",
      ).length,
    scheduledIncomeAmount:
      normalizeCurrency(
        scheduledIncomeAmount,
      ),
    scheduledExpenseAmount:
      normalizeCurrency(
        scheduledExpenseAmount,
      ),
    netScheduledCashFlow:
      normalizeCurrency(
        scheduledIncomeAmount -
        scheduledExpenseAmount,
      ),
    nextEventDate:
      upcomingOccurrences[
        0
      ]?.date,
    nextPaycheckDate:
      nextPaycheck?.date,
    nextBillDueDate:
      nextBill?.date,
  };
}

function updateManualEventStatus({
  eventId,
  status,
  setManualEvents,
}: {
  eventId: string;
  status: FinancialCalendarEvent["status"];
  setManualEvents: React.Dispatch<
    React.SetStateAction<FinancialCalendarEvent[]>
  >;
}) {
  setManualEvents(
    (
      currentEvents,
    ) =>
      currentEvents.map(
        (
          event,
        ) =>
          event.id ===
          eventId
            ? {
                ...event,
                status,
                updatedAt:
                  new Date().toISOString(),
              }
            : event,
      ),
  );
}

function loadStoredCalendarData() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    const storedValue =
      window.localStorage.getItem(
        CALENDAR_STORAGE_KEY,
      );

    if (
      !storedValue
    ) {
      return null;
    }

    const parsedValue:
      unknown =
      JSON.parse(
        storedValue,
      );

    if (
      !isStoredCalendarData(
        parsedValue,
      )
    ) {
      window.localStorage.removeItem(
        CALENDAR_STORAGE_KEY,
      );

      return null;
    }

    return parsedValue;
  } catch {
    return null;
  }
}

function isStoredCalendarData(
  value: unknown,
): value is StoredCalendarData {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(
      value,
    )
  ) {
    return false;
  }

  const record =
    value as Partial<StoredCalendarData>;

  return (
    Array.isArray(
      record.manualEvents,
    ) &&
    typeof record.selectedDate ===
      "string" &&
    isCalendarView(
      record.view,
    ) &&
    Boolean(
      record.filters,
    ) &&
    Boolean(
      record.preferences,
    )
  );
}

function isCalendarView(
  value: unknown,
): value is FinancialCalendarView {
  return (
    value ===
      "month" ||
    value ===
      "week" ||
    value ===
      "agenda"
  );
}

function deduplicateCalendarEvents(
  events: FinancialCalendarEvent[],
) {
  const eventMap =
    new Map<string, FinancialCalendarEvent>();

  events.forEach(
    (
      event,
    ) => {
      eventMap.set(
        event.id,
        event,
      );
    },
  );

  return Array.from(
    eventMap.values(),
  );
}

function cloneEvents(
  events: FinancialCalendarEvent[],
) {
  return events.map(
    (
      event,
    ) => ({
      ...event,
      source:
        event.source
          ? {
              ...event.source,
            }
          : undefined,
      recurrence:
        event.recurrence
          ? cloneRecurrence(
              event.recurrence,
            )
          : undefined,
      reminders:
        event.reminders.map(
          (
            reminder,
          ) => ({
            ...reminder,
          }),
        ),
    }),
  );
}

function cloneRecurrence(
  recurrence: NonNullable<
    FinancialCalendarEvent["recurrence"]
  >,
) {
  return {
    ...recurrence,
    weekdays:
      recurrence.weekdays
        ? [
            ...recurrence.weekdays,
          ]
        : undefined,
  };
}

function normalizeGeneratedStatus(
  value?: string,
): FinancialCalendarEvent["status"] {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "paid":
    case "completed":
    case "cleared":
      return "completed";

    case "past-due":
    case "overdue":
      return "past-due";

    case "due":
      return "due";

    case "pending":
      return "pending";

    case "skipped":
      return "skipped";

    case "canceled":
    case "cancelled":
      return "canceled";

    case "scheduled":
    case "projected":
    case "current":
    default:
      return "scheduled";
  }
}

function normalizePriority(
  value?: string,
): FinancialCalendarEvent["priority"] {
  switch (
    value
      ?.trim()
      .toLowerCase()
  ) {
    case "critical":
      return "critical";

    case "high":
      return "high";

    case "low":
      return "low";

    case "normal":
    default:
      return "normal";
  }
}

function normalizeOptionalString(
  value?: string,
) {
  const normalizedValue =
    value?.trim();

  return normalizedValue
    ? normalizedValue
    : undefined;
}

function normalizeOptionalNumber(
  value?: number,
) {
  if (
    value ===
      undefined ||
    !Number.isFinite(
      value,
    )
  ) {
    return undefined;
  }

  return normalizeCurrency(
    value,
  );
}

function normalizeCurrency(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      value *
        100,
    ) /
    100
  );
}

function asRecord(
  value: unknown,
) {
  if (
    value &&
    typeof value ===
      "object" &&
    !Array.isArray(
      value,
    )
  ) {
    return value as Record<string, unknown>;
  }

  return {} as Record<string, unknown>;
}

function getString(
  record: Record<string, unknown>,
  keys: string[],
) {
  for (
    const key of
    keys
  ) {
    const value =
      record[
        key
      ];

    if (
      typeof value ===
        "string" &&
      value.trim()
    ) {
      return value;
    }
  }

  return undefined;
}

function getBoolean(
  record: Record<string, unknown>,
  keys: string[],
  fallback: boolean,
) {
  for (
    const key of
    keys
  ) {
    const value =
      record[
        key
      ];

    if (
      typeof value ===
      "boolean"
    ) {
      return value;
    }
  }

  return fallback;
}

function getFiniteNumber(
  value: unknown,
  keys: string[],
  fallback: number,
) {
  const record =
    asRecord(
      value,
    );

  for (
    const key of
    keys
  ) {
    const candidate =
      record[
        key
      ];

    if (
      typeof candidate ===
        "number" &&
      Number.isFinite(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  return fallback;
}

function getNestedString(
  record: Record<string, unknown>,
  path: string[],
) {
  let current:
    unknown =
    record;

  for (
    const segment of
    path
  ) {
    if (
      !current ||
      typeof current !==
        "object" ||
      Array.isArray(
        current,
      )
    ) {
      return undefined;
    }

    current =
      (
        current as Record<string, unknown>
      )[
        segment
      ];
  }

  return typeof current ===
      "string" &&
    current.trim()
    ? current
    : undefined;
}
