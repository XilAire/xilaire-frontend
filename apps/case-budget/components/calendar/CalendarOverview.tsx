"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  useCalendar,
} from "@/components/providers/CalendarProvider";
import {
  addCalendarDays,
  addCalendarMonths,
  addCalendarWeeks,
  formatDateKey,
  parseDateKey,
} from "@/lib/calendar/calendar-utils";

import type {
  FinancialCalendarAgendaGroup,
  FinancialCalendarConflict,
  FinancialCalendarDay,
  FinancialCalendarEventOccurrence,
  FinancialCalendarEventType,
  FinancialCalendarSummary,
  FinancialCalendarView,
  FinancialCalendarWeek,
} from "@/types/calendar";

export type CalendarOverviewProps = {
  title?: string;
  description?: string;
  addEventHref?: string;
  billsHref?: string;
  payCyclesHref?: string;
  transactionsHref?: string;
  goalsHref?: string;
  debtHref?: string;
};

type EventTypeFilterOption = {
  value:
    FinancialCalendarEventType;
  label:
    string;
};

const EVENT_TYPE_FILTERS:
  EventTypeFilterOption[] = [
    {
      value:
        "bill",
      label:
        "Bills",
    },
    {
      value:
        "paycheck",
      label:
        "Paychecks",
    },
    {
      value:
        "transaction",
      label:
        "Transactions",
    },
    {
      value:
        "income",
      label:
        "Income",
    },
    {
      value:
        "savings-contribution",
      label:
        "Savings",
    },
    {
      value:
        "debt-payment",
      label:
        "Debt",
    },
    {
      value:
        "transfer",
      label:
        "Transfers",
    },
    {
      value:
        "reminder",
      label:
        "Reminders",
    },
    {
      value:
        "custom",
      label:
        "Custom",
    },
  ];

export default function CalendarOverview({
  title =
    "Financial Calendar",
  description =
    "See bills, paychecks, transactions, savings, debt payments, and cash-flow conflicts in one place.",
  addEventHref =
    "/dashboard/calendar?action=add",
  billsHref =
    "/dashboard/bills",
  payCyclesHref =
    "/dashboard/pay-cycles",
  transactionsHref =
    "/dashboard/transactions",
  goalsHref =
    "/dashboard/goals",
  debtHref =
    "/dashboard/debt",
}: CalendarOverviewProps) {
  const {
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
    setSelectedDate,
    setView,
    setFilters,
    resetFilters,
    markEventCompleted,
    markEventSkipped,
    restoreEvent,
    deleteEvent,
  } = useCalendar();

  const [
    selectedOccurrenceId,
    setSelectedOccurrenceId,
  ] =
    useState<string | null>(
      null,
    );

  const selectedDayOccurrences =
    useMemo(
      () =>
        visibleOccurrences.filter(
          (
            occurrence,
          ) =>
            occurrence.date ===
            selectedDate,
        ),
      [
        selectedDate,
        visibleOccurrences,
      ],
    );

  const selectedOccurrence =
    useMemo(
      () =>
        visibleOccurrences.find(
          (
            occurrence,
          ) =>
            occurrence.id ===
            selectedOccurrenceId,
        ) ??
        null,
      [
        selectedOccurrenceId,
        visibleOccurrences,
      ],
    );

  const activeTypeCount =
    filters.eventTypes.length;

  function navigatePrevious() {
    if (
      view ===
      "month"
    ) {
      setSelectedDate(
        addCalendarMonths(
          selectedDate,
          -1,
        ),
      );

      return;
    }

    if (
      view ===
      "week"
    ) {
      setSelectedDate(
        addCalendarWeeks(
          selectedDate,
          -1,
        ),
      );

      return;
    }

    setSelectedDate(
      addCalendarDays(
        selectedDate,
        -30,
      ),
    );
  }

  function navigateNext() {
    if (
      view ===
      "month"
    ) {
      setSelectedDate(
        addCalendarMonths(
          selectedDate,
          1,
        ),
      );

      return;
    }

    if (
      view ===
      "week"
    ) {
      setSelectedDate(
        addCalendarWeeks(
          selectedDate,
          1,
        ),
      );

      return;
    }

    setSelectedDate(
      addCalendarDays(
        selectedDate,
        30,
      ),
    );
  }

  function navigateToday() {
    setSelectedDate(
      formatDateKey(
        new Date(),
      ),
    );
  }

  function toggleEventType(
    eventType:
      FinancialCalendarEventType,
  ) {
    const isSelected =
      filters.eventTypes.includes(
        eventType,
      );

    setFilters({
      eventTypes:
        isSelected
          ? filters.eventTypes.filter(
              (
                currentType,
              ) =>
                currentType !==
                eventType,
            )
          : [
              ...filters.eventTypes,
              eventType,
            ],
    });
  }

  return (
    <div className="w-full space-y-5 px-4 pb-8 pt-4 sm:px-5 sm:pb-10 sm:pt-5 lg:px-6 lg:pb-12 lg:pt-6">
      <CalendarHeader
        title={
          title
        }
        description={
          description
        }
        addEventHref={
          addEventHref
        }
      />

      <CalendarSummaryCards
        summary={
          summary
        }
      />

      {conflicts.length >
      0 ? (
        <CalendarConflictPanel
          conflicts={
            conflicts
          }
        />
      ) : null}

      <CalendarToolbar
        view={
          view
        }
        selectedDate={
          selectedDate
        }
        visibleRange={
          visibleRange
        }
        search={
          filters.search
        }
        activeTypeCount={
          activeTypeCount
        }
        onViewChange={
          setView
        }
        onSearchChange={(
          search,
        ) =>
          setFilters({
            search,
          })
        }
        onPrevious={
          navigatePrevious
        }
        onNext={
          navigateNext
        }
        onToday={
          navigateToday
        }
        onResetFilters={
          resetFilters
        }
      />

      <EventTypeFilters
        selectedTypes={
          filters.eventTypes
        }
        onToggle={
          toggleEventType
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
          {view ===
          "month" ? (
            <MonthCalendar
              month={
                month
              }
              selectedDate={
                selectedDate
              }
              weekStartsOn={
                preferences.weekStartsOn
              }
              showWeekends={
                preferences.showWeekends
              }
              onSelectDate={
                setSelectedDate
              }
              onSelectOccurrence={(
                occurrence,
              ) => {
                setSelectedDate(
                  occurrence.date,
                );

                setSelectedOccurrenceId(
                  occurrence.id,
                );
              }}
            />
          ) : view ===
            "week" ? (
            <WeekCalendar
              weeks={
                month.weeks
              }
              selectedDate={
                selectedDate
              }
              onSelectDate={
                setSelectedDate
              }
              onSelectOccurrence={(
                occurrence,
              ) => {
                setSelectedDate(
                  occurrence.date,
                );

                setSelectedOccurrenceId(
                  occurrence.id,
                );
              }}
            />
          ) : (
            <AgendaCalendar
              groups={
                agendaGroups
              }
              onSelectOccurrence={(
                occurrence,
              ) => {
                setSelectedDate(
                  occurrence.date,
                );

                setSelectedOccurrenceId(
                  occurrence.id,
                );
              }}
            />
          )}
        </section>

        <aside className="space-y-6">
          <SelectedDayPanel
            selectedDate={
              selectedDate
            }
            occurrences={
              selectedDayOccurrences
            }
            addEventHref={
              createAddEventHref(
                addEventHref,
                selectedDate,
              )
            }
            onSelectOccurrence={
              setSelectedOccurrenceId
            }
          />

          <RelatedLinksPanel
            billsHref={
              billsHref
            }
            payCyclesHref={
              payCyclesHref
            }
            transactionsHref={
              transactionsHref
            }
            goalsHref={
              goalsHref
            }
            debtHref={
              debtHref
            }
          />
        </aside>
      </div>

      {selectedOccurrence ? (
        <EventDetailDrawer
          occurrence={
            selectedOccurrence
          }
          onClose={() =>
            setSelectedOccurrenceId(
              null,
            )
          }
          onComplete={() => {
            if (
              !selectedOccurrence.event
                .isAutoGenerated
            ) {
              markEventCompleted(
                selectedOccurrence.eventId,
              );
            }
          }}
          onSkip={() => {
            if (
              !selectedOccurrence.event
                .isAutoGenerated
            ) {
              markEventSkipped(
                selectedOccurrence.eventId,
              );
            }
          }}
          onRestore={() => {
            if (
              !selectedOccurrence.event
                .isAutoGenerated
            ) {
              restoreEvent(
                selectedOccurrence.eventId,
              );
            }
          }}
          onDelete={() => {
            if (
              !selectedOccurrence.event
                .isAutoGenerated
            ) {
              deleteEvent(
                selectedOccurrence.eventId,
              );

              setSelectedOccurrenceId(
                null,
              );
            }
          }}
        />
      ) : null}
    </div>
  );
}

function CalendarHeader({
  title,
  description,
  addEventHref,
}: {
  title:
    string;
  description:
    string;
  addEventHref:
    string;
}) {
  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-5 shadow-sm sm:p-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
          <CalendarIcon />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary)]">
            Plan ahead
          </p>

          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            {title}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            {description}
          </p>
        </div>
      </div>

      <Link
        href={
          addEventHref
        }
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <PlusIcon />

        Add event
      </Link>
    </section>
  );
}

function CalendarSummaryCards({
  summary,
}: {
  summary:
    FinancialCalendarSummary;
}) {
  return (
    <section className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <SummaryCard
        label="Upcoming"
        value={
          String(
            summary.upcomingEventCount,
          )
        }
        description="Scheduled events"
        tone="primary"
        icon={
          <CalendarIcon />
        }
      />

      <SummaryCard
        label="Due today"
        value={
          String(
            summary.dueTodayCount,
          )
        }
        description="Needs attention"
        tone={
          summary.dueTodayCount >
          0
            ? "warning"
            : "neutral"
        }
        icon={
          <ClockIcon />
        }
      />

      <SummaryCard
        label="Past due"
        value={
          String(
            summary.pastDueCount,
          )
        }
        description="Requires action"
        tone={
          summary.pastDueCount >
          0
            ? "danger"
            : "neutral"
        }
        icon={
          <AlertIcon />
        }
      />

      <SummaryCard
        label="Income"
        value={
          formatCurrency(
            summary.scheduledIncomeAmount,
          )
        }
        description="Visible period"
        tone="success"
        icon={
          <IncomeIcon />
        }
      />

      <SummaryCard
        label="Expenses"
        value={
          formatCurrency(
            summary.scheduledExpenseAmount,
          )
        }
        description="Visible period"
        tone="warning"
        icon={
          <ExpenseIcon />
        }
      />

      <SummaryCard
        label="Net cash flow"
        value={
          formatCurrency(
            summary.netScheduledCashFlow,
          )
        }
        description="Income minus expenses"
        tone={
          summary.netScheduledCashFlow >=
          0
            ? "success"
            : "danger"
        }
        icon={
          <TrendIcon />
        }
      />
    </section>
  );
}

function SummaryCard({
  label,
  value,
  description,
  tone,
  icon,
}: {
  label:
    string;
  value:
    string;
  description:
    string;
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral";
  icon:
    ReactNode;
}) {
  const toneClasses =
    getToneClasses(
      tone,
    );

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm sm:p-5">
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          toneClasses.background,
          toneClasses.text,
        ].join(
          " ",
        )}
      >
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-bold text-[var(--text-primary)]">
        {value}
      </p>

      <p
        className={[
          "mt-1 truncate text-xs font-semibold",
          toneClasses.detail,
        ].join(
          " ",
        )}
      >
        {description}
      </p>
    </article>
  );
}

function CalendarConflictPanel({
  conflicts,
}: {
  conflicts:
    FinancialCalendarConflict[];
}) {
  const visibleConflicts =
    conflicts.slice(
      0,
      4,
    );

  return (
    <section className="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--warning)_24%,var(--border-subtle))] bg-[color-mix(in_srgb,var(--warning)_6%,var(--surface-default))] shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b border-[color-mix(in_srgb,var(--warning)_20%,var(--border-subtle))] px-4 py-4 sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]">
            <AlertIcon />
          </div>

          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Cash-flow warnings
            </h2>

            <p className="mt-0.5 text-xs text-[var(--text-muted)]">
              Review possible schedule conflicts.
            </p>
          </div>
        </div>

        <span className="inline-flex min-w-7 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--warning)_16%,transparent)] px-2 py-1 text-xs font-bold text-[var(--warning)]">
          {
            conflicts.length
          }
        </span>
      </header>

      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        {visibleConflicts.map(
          (
            conflict,
          ) => (
            <ConflictCard
              key={
                conflict.id
              }
              conflict={
                conflict
              }
            />
          ),
        )}
      </div>
    </section>
  );
}

function ConflictCard({
  conflict,
}: {
  conflict:
    FinancialCalendarConflict;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4">
      <div className="flex items-start gap-3">
        <div
          className={[
            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
            conflict.severity ===
            "critical"
              ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
              : conflict.severity ===
                  "warning"
                ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
                : "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]",
          ].join(
            " ",
          )}
        >
          <AlertIcon />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {conflict.title}
          </h3>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            {conflict.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-semibold text-[var(--text-muted)]">
              {formatShortDate(
                conflict.date,
              )}
            </span>

            {typeof conflict.shortageAmount ===
            "number" ? (
              <span className="rounded-full bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--danger)]">
                Short{" "}
                {formatCurrency(
                  conflict.shortageAmount,
                )}
              </span>
            ) : typeof conflict.amount ===
              "number" ? (
              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-primary)]">
                {formatCurrency(
                  conflict.amount,
                )}
              </span>
            ) : null}
          </div>

          {conflict.actionHref &&
          conflict.actionLabel ? (
            <Link
              href={
                conflict.actionHref
              }
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] outline-none hover:underline focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              {
                conflict.actionLabel
              }

              <ArrowRightIcon />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CalendarToolbar({
  view,
  selectedDate,
  visibleRange,
  search,
  activeTypeCount,
  onViewChange,
  onSearchChange,
  onPrevious,
  onNext,
  onToday,
  onResetFilters,
}: {
  view:
    FinancialCalendarView;
  selectedDate:
    string;
  visibleRange: {
    startDate:
      string;
    endDate:
      string;
  };
  search:
    string;
  activeTypeCount:
    number;
  onViewChange: (
    view:
      FinancialCalendarView,
  ) => void;
  onSearchChange: (
    value:
      string,
  ) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onResetFilters: () => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-4 shadow-sm">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={
              onPrevious
            }
            aria-label="Previous calendar period"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <ChevronLeftIcon />
          </button>

          <button
            type="button"
            onClick={
              onNext
            }
            aria-label="Next calendar period"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <ChevronRightIcon />
          </button>

          <button
            type="button"
            onClick={
              onToday
            }
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            Today
          </button>

          <div className="ml-1">
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {formatCalendarHeading({
                view,
                selectedDate,
                visibleRange,
              })}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block sm:min-w-[260px]">
            <span className="sr-only">
              Search calendar
            </span>

            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[var(--text-muted)]">
              <SearchIcon />
            </span>

            <input
              type="search"
              value={
                search
              }
              onChange={(
                event,
              ) =>
                onSearchChange(
                  event.target
                    .value,
                )
              }
              placeholder="Search calendar..."
              className="h-10 w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]"
            />
          </label>

          <ViewSwitcher
            view={
              view
            }
            onChange={
              onViewChange
            }
          />

          {search ||
          activeTypeCount >
            0 ? (
            <button
              type="button"
              onClick={
                onResetFilters
              }
              className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-xs font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ViewSwitcher({
  view,
  onChange,
}: {
  view:
    FinancialCalendarView;
  onChange: (
    view:
      FinancialCalendarView,
  ) => void;
}) {
  const options:
    {
      value:
        FinancialCalendarView;
      label:
        string;
    }[] = [
      {
        value:
          "month",
        label:
          "Month",
      },
      {
        value:
          "week",
        label:
          "Week",
      },
      {
        value:
          "agenda",
        label:
          "Agenda",
      },
    ];

  return (
    <div className="inline-flex rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-1">
      {options.map(
        (
          option,
        ) => (
          <button
            key={
              option.value
            }
            type="button"
            onClick={() =>
              onChange(
                option.value,
              )
            }
            className={[
              "inline-flex min-h-8 items-center justify-center rounded-lg px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
              view ===
              option.value
                ? "bg-[var(--surface-default)] text-[var(--primary)] shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            ].join(
              " ",
            )}
          >
            {
              option.label
            }
          </button>
        ),
      )}
    </div>
  );
}

function EventTypeFilters({
  selectedTypes,
  onToggle,
}: {
  selectedTypes:
    FinancialCalendarEventType[];
  onToggle: (
    eventType:
      FinancialCalendarEventType,
  ) => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] p-3 shadow-sm">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {EVENT_TYPE_FILTERS.map(
          (
            option,
          ) => {
            const isSelected =
              selectedTypes.includes(
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
                className={[
                  "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isSelected
                    ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,var(--surface-default))] text-[var(--primary)]"
                    : "border-transparent bg-[var(--surface-muted)] text-[var(--text-muted)] hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)]",
                ].join(
                  " ",
                )}
              >
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    getEventTypeDotClass(
                      option.value,
                    ),
                  ].join(
                    " ",
                  )}
                />

                {
                  option.label
                }
              </button>
            );
          },
        )}
      </div>
    </section>
  );
}

function MonthCalendar({
  month,
  selectedDate,
  weekStartsOn,
  showWeekends,
  onSelectDate,
  onSelectOccurrence,
}: {
  month: {
    weeks:
      FinancialCalendarWeek[];
  };
  selectedDate:
    string;
  weekStartsOn:
    number;
  showWeekends:
    boolean;
  onSelectDate: (
    date:
      string,
  ) => void;
  onSelectOccurrence: (
    occurrence:
      FinancialCalendarEventOccurrence,
  ) => void;
}) {
  const weekdayLabels =
    getWeekdayLabels(
      weekStartsOn,
      showWeekends,
    );

  return (
    <div>
      <div
        className={[
          "grid border-b border-[var(--border-subtle)] bg-[var(--surface-muted)]",
          showWeekends
            ? "grid-cols-7"
            : "grid-cols-5",
        ].join(
          " ",
        )}
      >
        {weekdayLabels.map(
          (
            label,
          ) => (
            <div
              key={
                label
              }
              className="px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)] sm:text-xs"
            >
              {label}
            </div>
          ),
        )}
      </div>

      <div className="divide-y divide-[var(--border-subtle)]">
        {month.weeks.map(
          (
            week,
          ) => (
            <div
              key={
                week.id
              }
              className={[
                "grid",
                showWeekends
                  ? "grid-cols-7"
                  : "grid-cols-5",
              ].join(
                " ",
              )}
            >
              {week.days.map(
                (
                  day,
                ) => (
                  <MonthDayCell
                    key={
                      day.date
                    }
                    day={
                      day
                    }
                    isSelected={
                      selectedDate ===
                      day.date
                    }
                    onSelectDate={
                      onSelectDate
                    }
                    onSelectOccurrence={
                      onSelectOccurrence
                    }
                  />
                ),
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function MonthDayCell({
  day,
  isSelected,
  onSelectDate,
  onSelectOccurrence,
}: {
  day:
    FinancialCalendarDay;
  isSelected:
    boolean;
  onSelectDate: (
    date:
      string,
  ) => void;
  onSelectOccurrence: (
    occurrence:
      FinancialCalendarEventOccurrence,
  ) => void;
}) {
  const visibleOccurrences =
    day.occurrences.slice(
      0,
      3,
    );

  const hiddenCount =
    Math.max(
      0,
      day.occurrences.length -
        visibleOccurrences.length,
    );

  return (
    <div
      className={[
        "min-h-28 border-r border-[var(--border-subtle)] p-1.5 transition last:border-r-0 sm:min-h-36 sm:p-2",
        !day.isCurrentMonth
          ? "bg-[var(--surface-muted)]/50"
          : "bg-[var(--surface-default)]",
        isSelected
          ? "ring-2 ring-inset ring-[var(--primary)]"
          : "",
      ].join(
        " ",
      )}
    >
      <button
        type="button"
        onClick={() =>
          onSelectDate(
            day.date,
          )
        }
        className={[
          "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:h-8 sm:w-8 sm:text-sm",
          day.isToday
            ? "bg-[var(--primary)] text-white"
            : day.isCurrentMonth
              ? "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-default)]",
        ].join(
          " ",
        )}
      >
        {parseDateKey(
          day.date,
        ).getDate()}
      </button>

      <div className="mt-1 space-y-1">
        {visibleOccurrences.map(
          (
            occurrence,
          ) => (
            <button
              key={
                occurrence.id
              }
              type="button"
              onClick={() =>
                onSelectOccurrence(
                  occurrence,
                )
              }
              className={[
                "block w-full truncate rounded-md px-1.5 py-1 text-left text-[9px] font-bold outline-none transition hover:opacity-80 focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:text-[10px]",
                getEventToneClass(
                  occurrence,
                ),
              ].join(
                " ",
              )}
              title={
                occurrence.event
                  .title
              }
            >
              {
                occurrence.event
                  .title
              }
            </button>
          ),
        )}

        {hiddenCount >
        0 ? (
          <button
            type="button"
            onClick={() =>
              onSelectDate(
                day.date,
              )
            }
            className="block w-full truncate px-1 text-left text-[9px] font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            +{hiddenCount} more
          </button>
        ) : null}
      </div>
    </div>
  );
}

function WeekCalendar({
  weeks,
  selectedDate,
  onSelectDate,
  onSelectOccurrence,
}: {
  weeks:
    FinancialCalendarWeek[];
  selectedDate:
    string;
  onSelectDate: (
    date:
      string,
  ) => void;
  onSelectOccurrence: (
    occurrence:
      FinancialCalendarEventOccurrence,
  ) => void;
}) {
  const week =
    weeks.find(
      (
        candidate,
      ) =>
        selectedDate >=
          candidate.startDate &&
        selectedDate <=
          candidate.endDate,
    ) ??
    weeks[
      0
    ];

  if (
    !week
  ) {
    return (
      <EmptyCalendarState />
    );
  }

  return (
    <div className="grid divide-y divide-[var(--border-subtle)] sm:grid-cols-7 sm:divide-x sm:divide-y-0">
      {week.days.map(
        (
          day,
        ) => (
          <section
            key={
              day.date
            }
            className={[
              "min-h-56 p-3",
              day.date ===
              selectedDate
                ? "bg-[color-mix(in_srgb,var(--primary)_4%,var(--surface-default))]"
                : "",
            ].join(
              " ",
            )}
          >
            <button
              type="button"
              onClick={() =>
                onSelectDate(
                  day.date,
                )
              }
              className="w-full rounded-xl p-2 text-left outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                {formatWeekday(
                  day.date,
                )}
              </p>

              <p
                className={[
                  "mt-1 text-lg font-bold",
                  day.isToday
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-primary)]",
                ].join(
                  " ",
                )}
              >
                {parseDateKey(
                  day.date,
                ).getDate()}
              </p>
            </button>

            <div className="mt-3 space-y-2">
              {day.occurrences.map(
                (
                  occurrence,
                ) => (
                  <button
                    key={
                      occurrence.id
                    }
                    type="button"
                    onClick={() =>
                      onSelectOccurrence(
                        occurrence,
                      )
                    }
                    className={[
                      "block w-full rounded-xl p-2 text-left text-[10px] font-bold outline-none transition hover:opacity-85 focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                      getEventToneClass(
                        occurrence,
                      ),
                    ].join(
                      " ",
                    )}
                  >
                    <span className="block truncate">
                      {
                        occurrence.event
                          .title
                      }
                    </span>

                    {typeof occurrence
                      .event.amount ===
                    "number" ? (
                      <span className="mt-1 block text-[9px] opacity-80">
                        {formatCurrency(
                          occurrence.event
                            .amount,
                        )}
                      </span>
                    ) : null}
                  </button>
                ),
              )}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

function AgendaCalendar({
  groups,
  onSelectOccurrence,
}: {
  groups:
    FinancialCalendarAgendaGroup[];
  onSelectOccurrence: (
    occurrence:
      FinancialCalendarEventOccurrence,
  ) => void;
}) {
  if (
    groups.length ===
    0
  ) {
    return (
      <EmptyCalendarState />
    );
  }

  return (
    <div className="divide-y divide-[var(--border-subtle)]">
      {groups.map(
        (
          group,
        ) => (
          <section
            key={
              group.date
            }
            className="p-4 sm:p-5"
          >
            <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  {group.label}
                </h3>

                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  {
                    group.occurrences
                      .length
                  }{" "}
                  {group.occurrences
                    .length ===
                  1
                    ? "event"
                    : "events"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {group.totalIncomeAmount >
                0 ? (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--success)]">
                    +
                    {formatCurrency(
                      group.totalIncomeAmount,
                    )}
                  </span>
                ) : null}

                {group.totalExpenseAmount >
                0 ? (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--warning)]">
                    -
                    {formatCurrency(
                      group.totalExpenseAmount,
                    )}
                  </span>
                ) : null}
              </div>
            </header>

            <div className="mt-4 space-y-2">
              {group.occurrences.map(
                (
                  occurrence,
                ) => (
                  <AgendaOccurrenceRow
                    key={
                      occurrence.id
                    }
                    occurrence={
                      occurrence
                    }
                    onSelect={
                      onSelectOccurrence
                    }
                  />
                ),
              )}
            </div>
          </section>
        ),
      )}
    </div>
  );
}

function AgendaOccurrenceRow({
  occurrence,
  onSelect,
}: {
  occurrence:
    FinancialCalendarEventOccurrence;
  onSelect: (
    occurrence:
      FinancialCalendarEventOccurrence,
  ) => void;
}) {
  return (
    <button
      type="button"
      onClick={() =>
        onSelect(
          occurrence,
        )
      }
      className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-3 text-left outline-none transition hover:bg-[var(--surface-default)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          getEventIconToneClass(
            occurrence,
          ),
        ].join(
          " ",
        )}
      >
        <EventTypeIcon
          type={
            occurrence.event
              .type
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-bold text-[var(--text-primary)]">
            {occurrence.event.title}
          </p>

          <StatusBadge
            status={
              occurrence.status
            }
          />
        </div>

        <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
          {occurrence.event.description ??
            formatEventType(
              occurrence.event
                .type,
            )}
        </p>
      </div>

      <div className="shrink-0 text-right">
        {typeof occurrence
          .event.amount ===
        "number" ? (
          <p className="text-sm font-bold text-[var(--text-primary)]">
            {formatCurrency(
              occurrence.event
                .amount,
            )}
          </p>
        ) : null}

        <p className="mt-1 text-[10px] font-semibold text-[var(--text-muted)]">
          {occurrence.startTime ??
            "All day"}
        </p>
      </div>
    </button>
  );
}

function SelectedDayPanel({
  selectedDate,
  occurrences,
  addEventHref,
  onSelectOccurrence,
}: {
  selectedDate:
    string;
  occurrences:
    FinancialCalendarEventOccurrence[];
  addEventHref:
    string;
  onSelectOccurrence: (
    occurrenceId:
      string,
  ) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] px-4 py-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">
            {formatLongDate(
              selectedDate,
            )}
          </h2>

          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {
              occurrences.length
            }{" "}
            {occurrences.length ===
            1
              ? "event"
              : "events"}
          </p>
        </div>

        <Link
          href={
            addEventHref
          }
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary)] text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          aria-label="Add event on selected date"
        >
          <PlusIcon />
        </Link>
      </header>

      {occurrences.length >
      0 ? (
        <div className="divide-y divide-[var(--border-subtle)]">
          {occurrences.map(
            (
              occurrence,
            ) => (
              <button
                key={
                  occurrence.id
                }
                type="button"
                onClick={() =>
                  onSelectOccurrence(
                    occurrence.id,
                  )
                }
                className="flex w-full items-center gap-3 px-4 py-4 text-left outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
              >
                <div
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                    getEventIconToneClass(
                      occurrence,
                    ),
                  ].join(
                    " ",
                  )}
                >
                  <EventTypeIcon
                    type={
                      occurrence.event
                        .type
                    }
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                    {
                      occurrence.event
                        .title
                    }
                  </p>

                  <p className="mt-1 truncate text-xs text-[var(--text-muted)]">
                    {occurrence.event
                      .description ??
                      formatEventType(
                        occurrence.event
                          .type,
                      )}
                  </p>
                </div>

                {typeof occurrence
                  .event.amount ===
                "number" ? (
                  <p className="shrink-0 text-xs font-bold text-[var(--text-primary)]">
                    {formatCurrency(
                      occurrence.event
                        .amount,
                    )}
                  </p>
                ) : null}
              </button>
            ),
          )}
        </div>
      ) : (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
            <CalendarIcon />
          </div>

          <h3 className="mt-4 text-sm font-bold text-[var(--text-primary)]">
            No events scheduled
          </h3>

          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Add a reminder or custom
            financial event for this day.
          </p>
        </div>
      )}
    </section>
  );
}

function RelatedLinksPanel({
  billsHref,
  payCyclesHref,
  transactionsHref,
  goalsHref,
  debtHref,
}: {
  billsHref:
    string;
  payCyclesHref:
    string;
  transactionsHref:
    string;
  goalsHref:
    string;
  debtHref:
    string;
}) {
  const links = [
    {
      label:
        "Bills",
      description:
        "Review due dates and payments.",
      href:
        billsHref,
      icon:
        <BillsIcon />,
    },
    {
      label:
        "Pay Cycles",
      description:
        "Manage expected paycheck dates.",
      href:
        payCyclesHref,
      icon:
        <PaycheckIcon />,
    },
    {
      label:
        "Transactions",
      description:
        "Review scheduled activity.",
      href:
        transactionsHref,
      icon:
        <TransactionIcon />,
    },
    {
      label:
        "Savings Goals",
      description:
        "Plan upcoming contributions.",
      href:
        goalsHref,
      icon:
        <GoalIcon />,
    },
    {
      label:
        "Debt Payoff",
      description:
        "Review planned payments.",
      href:
        debtHref,
      icon:
        <DebtIcon />,
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-sm">
      <header className="border-b border-[var(--border-subtle)] px-4 py-4">
        <h2 className="text-sm font-bold text-[var(--text-primary)]">
          Related planning
        </h2>

        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
          Open the source feature for
          more details.
        </p>
      </header>

      <div className="divide-y divide-[var(--border-subtle)]">
        {links.map(
          (
            item,
          ) => (
            <Link
              key={
                item.href
              }
              href={
                item.href
              }
              className="flex items-center gap-3 px-4 py-4 outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
                {
                  item.icon
                }
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {
                    item.label
                  }
                </p>

                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                  {
                    item.description
                  }
                </p>
              </div>

              <ChevronRightIcon />
            </Link>
          ),
        )}
      </div>
    </section>
  );
}

function EventDetailDrawer({
  occurrence,
  onClose,
  onComplete,
  onSkip,
  onRestore,
  onDelete,
}: {
  occurrence:
    FinancialCalendarEventOccurrence;
  onClose: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const isTerminal =
    occurrence.status ===
      "completed" ||
    occurrence.status ===
      "skipped" ||
    occurrence.status ===
      "canceled";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button
        type="button"
        aria-label="Close event details"
        onClick={
          onClose
        }
        className="absolute inset-0 cursor-default"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-event-detail-title"
        className="relative flex h-full w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl"
      >
        <header className="flex items-start gap-3 border-b border-[var(--border-subtle)] px-5 py-5">
          <div
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              getEventIconToneClass(
                occurrence,
              ),
            ].join(
              " ",
            )}
          >
            <EventTypeIcon
              type={
                occurrence.event
                  .type
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            <h2
              id="calendar-event-detail-title"
              className="text-lg font-bold text-[var(--text-primary)]"
            >
              {
                occurrence.event
                  .title
              }
            </h2>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={
                  occurrence.status
                }
              />

              <span className="rounded-full bg-[var(--surface-muted)] px-2.5 py-1 text-[10px] font-bold text-[var(--text-muted)]">
                {formatEventType(
                  occurrence.event
                    .type,
                )}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            aria-label="Close event details"
          >
            <CloseIcon />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <dl className="space-y-4">
            <DetailRow
              label="Date"
              value={
                formatLongDate(
                  occurrence.date,
                )
              }
            />

            <DetailRow
              label="Time"
              value={
                occurrence.event
                  .isAllDay
                  ? "All day"
                  : formatEventTime(
                      occurrence.startTime,
                      occurrence.endTime,
                    )
              }
            />

            {typeof occurrence.event
              .amount ===
            "number" ? (
              <DetailRow
                label="Amount"
                value={
                  formatCurrency(
                    occurrence.event
                      .amount,
                  )
                }
              />
            ) : null}

            <DetailRow
              label="Priority"
              value={
                capitalize(
                  occurrence.event
                    .priority,
                )
              }
            />

            <DetailRow
              label="Source"
              value={
                occurrence.event
                  .isAutoGenerated
                  ? "Connected feature"
                  : "Manual event"
              }
            />
          </dl>

          {occurrence.event
            .description ? (
            <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Description
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                {
                  occurrence.event
                    .description
                }
              </p>
            </section>
          ) : null}

          {occurrence.event
            .notes ? (
            <section className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                Notes
              </h3>

              <p className="mt-2 text-sm leading-6 text-[var(--text-primary)]">
                {
                  occurrence.event
                    .notes
                }
              </p>
            </section>
          ) : null}
        </div>

        {!occurrence.event
          .isAutoGenerated ? (
          <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)] p-4">
            <div className="grid grid-cols-2 gap-3">
              {isTerminal ? (
                <button
                  type="button"
                  onClick={
                    onRestore
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                >
                  <RestoreIcon />

                  Restore
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={
                      onComplete
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--success)] px-4 text-sm font-bold text-white outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--success)]"
                  >
                    <CheckIcon />

                    Complete
                  </button>

                  <button
                    type="button"
                    onClick={
                      onSkip
                    }
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-hover)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  >
                    <SkipIcon />

                    Skip
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={
                  onDelete
                }
                className="col-span-2 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--danger)]"
              >
                <TrashIcon />

                Delete event
              </button>
            </div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label:
    string;
  value:
    string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-3">
      <dt className="text-sm font-medium text-[var(--text-muted)]">
        {label}
      </dt>

      <dd className="text-right text-sm font-bold text-[var(--text-primary)]">
        {value}
      </dd>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    FinancialCalendarEventOccurrence["status"];
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em]",
        status ===
        "completed"
          ? "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]"
          : status ===
              "past-due"
            ? "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]"
            : status ===
                "due"
              ? "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]"
              : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
      ].join(
        " ",
      )}
    >
      {status.replace(
        "-",
        " ",
      )}
    </span>
  );
}

function EmptyCalendarState() {
  return (
    <div className="flex min-h-96 flex-col items-center justify-center px-5 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text-muted)]">
        <CalendarIcon />
      </div>

      <h2 className="mt-5 text-base font-bold text-[var(--text-primary)]">
        No calendar events
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-[var(--text-muted)]">
        Bills, paychecks, transactions,
        and manual events will appear
        here.
      </p>
    </div>
  );
}

function createAddEventHref(
  baseHref:
    string,
  date:
    string,
) {
  const separator =
    baseHref.includes(
      "?",
    )
      ? "&"
      : "?";

  return `${baseHref}${separator}date=${encodeURIComponent(
    date,
  )}`;
}

function formatCalendarHeading({
  view,
  selectedDate,
  visibleRange,
}: {
  view:
    FinancialCalendarView;
  selectedDate:
    string;
  visibleRange: {
    startDate:
      string;
    endDate:
      string;
  };
}) {
  if (
    view ===
    "month"
  ) {
    return parseDateKey(
      selectedDate,
    ).toLocaleDateString(
      "en-US",
      {
        month:
          "long",
        year:
          "numeric",
      },
    );
  }

  return `${formatShortDate(
    visibleRange.startDate,
  )} – ${formatShortDate(
    visibleRange.endDate,
  )}`;
}

function getWeekdayLabels(
  weekStartsOn:
    number,
  showWeekends:
    boolean,
) {
  const labels = [
    "Sun",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
  ];

  const rotatedLabels = [
    ...labels.slice(
      weekStartsOn,
    ),
    ...labels.slice(
      0,
      weekStartsOn,
    ),
  ];

  return showWeekends
    ? rotatedLabels
    : rotatedLabels.filter(
        (
          label,
        ) =>
          label !==
            "Sun" &&
          label !==
            "Sat",
      );
}

function formatEventType(
  type:
    FinancialCalendarEventType,
) {
  return type
    .split(
      "-",
    )
    .map(
      (
        part,
      ) =>
        capitalize(
          part,
        ),
    )
    .join(
      " ",
    );
}

function getEventTypeDotClass(
  type:
    FinancialCalendarEventType,
) {
  switch (
    type
  ) {
    case "bill":
      return "bg-[var(--warning)]";

    case "paycheck":
    case "income":
      return "bg-[var(--success)]";

    case "transaction":
    case "transfer":
      return "bg-[var(--primary)]";

    case "savings-contribution":
      return "bg-[var(--success)]";

    case "debt-payment":
      return "bg-[var(--danger)]";

    case "reminder":
    case "custom":
    default:
      return "bg-[var(--text-muted)]";
  }
}

function getEventToneClass(
  occurrence:
    FinancialCalendarEventOccurrence,
) {
  if (
    occurrence.status ===
    "past-due"
  ) {
    return "bg-[color-mix(in_srgb,var(--danger)_12%,var(--surface-default))] text-[var(--danger)]";
  }

  switch (
    occurrence.event.type
  ) {
    case "bill":
      return "bg-[color-mix(in_srgb,var(--warning)_12%,var(--surface-default))] text-[var(--warning)]";

    case "paycheck":
    case "income":
      return "bg-[color-mix(in_srgb,var(--success)_12%,var(--surface-default))] text-[var(--success)]";

    case "transaction":
    case "transfer":
      return "bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface-default))] text-[var(--primary)]";

    case "savings-contribution":
      return "bg-[color-mix(in_srgb,var(--success)_10%,var(--surface-default))] text-[var(--success)]";

    case "debt-payment":
      return "bg-[color-mix(in_srgb,var(--danger)_10%,var(--surface-default))] text-[var(--danger)]";

    case "reminder":
    case "custom":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function getEventIconToneClass(
  occurrence:
    FinancialCalendarEventOccurrence,
) {
  if (
    occurrence.status ===
    "past-due"
  ) {
    return "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)] text-[var(--danger)]";
  }

  switch (
    occurrence.event.type
  ) {
    case "bill":
      return "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)] text-[var(--warning)]";

    case "paycheck":
    case "income":
      return "bg-[color-mix(in_srgb,var(--success)_12%,transparent)] text-[var(--success)]";

    case "transaction":
    case "transfer":
      return "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]";

    case "savings-contribution":
      return "bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-[var(--success)]";

    case "debt-payment":
      return "bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] text-[var(--danger)]";

    case "reminder":
    case "custom":
    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function getToneClasses(
  tone:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "neutral",
) {
  switch (
    tone
  ) {
    case "primary":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
        text:
          "text-[var(--primary)]",
        detail:
          "text-[var(--primary)]",
      };

    case "success":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--success)_12%,transparent)]",
        text:
          "text-[var(--success)]",
        detail:
          "text-[var(--success)]",
      };

    case "warning":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--warning)_14%,transparent)]",
        text:
          "text-[var(--warning)]",
        detail:
          "text-[var(--warning)]",
      };

    case "danger":
      return {
        background:
          "bg-[color-mix(in_srgb,var(--danger)_12%,transparent)]",
        text:
          "text-[var(--danger)]",
        detail:
          "text-[var(--danger)]",
      };

    case "neutral":
    default:
      return {
        background:
          "bg-[var(--surface-muted)]",
        text:
          "text-[var(--text-muted)]",
        detail:
          "text-[var(--text-muted)]",
      };
  }
}

function formatCurrency(
  value:
    number,
) {
  return new Intl.NumberFormat(
    "en-US",
    {
      style:
        "currency",
      currency:
        "USD",
      minimumFractionDigits:
        2,
      maximumFractionDigits:
        2,
    },
  ).format(
    Number.isFinite(
      value,
    )
      ? value
      : 0,
  );
}

function formatLongDate(
  value:
    string,
) {
  return parseDateKey(
    value,
  ).toLocaleDateString(
    "en-US",
    {
      weekday:
        "long",
      month:
        "long",
      day:
        "numeric",
      year:
        "numeric",
    },
  );
}

function formatShortDate(
  value:
    string,
) {
  return parseDateKey(
    value,
  ).toLocaleDateString(
    "en-US",
    {
      month:
        "short",
      day:
        "numeric",
      year:
        "numeric",
    },
  );
}

function formatWeekday(
  value:
    string,
) {
  return parseDateKey(
    value,
  ).toLocaleDateString(
    "en-US",
    {
      weekday:
        "short",
    },
  );
}

function formatEventTime(
  startTime?:
    string,
  endTime?:
    string,
) {
  if (
    !startTime
  ) {
    return "Not specified";
  }

  if (
    !endTime
  ) {
    return startTime;
  }

  return `${startTime} – ${endTime}`;
}

function capitalize(
  value:
    string,
) {
  return `${value
    .charAt(
      0,
    )
    .toUpperCase()}${value.slice(
    1,
  )}`;
}

function EventTypeIcon({
  type,
}: {
  type:
    FinancialCalendarEventType;
}) {
  switch (
    type
  ) {
    case "bill":
      return (
        <BillsIcon />
      );

    case "paycheck":
      return (
        <PaycheckIcon />
      );

    case "income":
      return (
        <IncomeIcon />
      );

    case "transaction":
      return (
        <TransactionIcon />
      );

    case "transfer":
      return (
        <TransferIcon />
      );

    case "savings-contribution":
      return (
        <GoalIcon />
      );

    case "debt-payment":
      return (
        <DebtIcon />
      );

    case "reminder":
      return (
        <ReminderIcon />
      );

    case "custom":
    default:
      return (
        <CalendarIcon />
      );
  }
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

function ClockIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M12 7v5l3 2" />
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

function IncomeIcon() {
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
      <path d="M12 21V3" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 13h14" />
    </svg>
  );
}

function ExpenseIcon() {
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
      <path d="M12 3v18" />
      <path d="m7 16 5 5 5-5" />
      <path d="M5 11h14" />
    </svg>
  );
}

function TrendIcon() {
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
      <path d="M3 3v18h18" />
      <path d="m7 16 4-5 4 3 5-7" />
    </svg>
  );
}

function SearchIcon() {
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
      <circle
        cx="11"
        cy="11"
        r="7"
      />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
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
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

function BillsIcon() {
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
      <path d="M6 2v20l3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h4" />
    </svg>
  );
}

function PaycheckIcon() {
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
      <rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2"
      />
      <path d="M3 10h18" />
      <path d="M8 15h3" />
      <path d="M16 13v4" />
      <path d="M14 15h4" />
    </svg>
  );
}

function TransactionIcon() {
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
      <path d="M7 7h11" />
      <path d="m15 4 3 3-3 3" />
      <path d="M17 17H6" />
      <path d="m9 14-3 3 3 3" />
    </svg>
  );
}

function TransferIcon() {
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
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function GoalIcon() {
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <circle
        cx="12"
        cy="12"
        r="5"
      />
      <circle
        cx="12"
        cy="12"
        r="1"
      />
    </svg>
  );
}

function DebtIcon() {
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
      <path d="M6 3h12v18H6Z" />
      <path d="M9 8h6" />
      <path d="M9 12h4" />
      <path d="M9 16h6" />
    </svg>
  );
}

function ReminderIcon() {
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
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

function CheckIcon() {
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
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function SkipIcon() {
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
      <path d="m5 4 10 8L5 20Z" />
      <path d="M19 5v14" />
    </svg>
  );
}

function RestoreIcon() {
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
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
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
