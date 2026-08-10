import type {
  PayCycleCustomRule,
  PayCycleData,
  PayCycleDayAdjustment,
  PayCycleFrequency,
  PayCycleSemimonthlyRule,
  PayPeriodData,
  PayPeriodStatus,
} from "@/types/pay-cycle";

export type GeneratePayDatesOptions = {
  startDate?: string;
  endDate?: string;
  count?: number;
  includeStartDate?: boolean;
};

export type GeneratePayPeriodsOptions = {
  startDate?: string;
  endDate?: string;
  count?: number;
  includeCompleted?: boolean;
  includeSkipped?: boolean;
  referenceDate?: string;
};

export type PayCycleDateValidationResult = {
  isValid: boolean;
  errors: string[];
};

export type PayCycleProjectionWindow = {
  startDate: string;
  endDate: string;
};

const DEFAULT_PROJECTION_COUNT =
  12;

const MAX_PROJECTION_COUNT =
  260;

const ISO_DATE_PATTERN =
  /^\d{4}-\d{2}-\d{2}$/;

export function generatePayDates(
  payCycle: PayCycleData,
  options: GeneratePayDatesOptions = {},
) {
  const validation =
    validatePayCycleDates(
      payCycle,
    );

  if (
    !validation.isValid
  ) {
    throw new Error(
      validation.errors.join(
        " ",
      ),
    );
  }

  const startDate =
    normalizeDateString(
      options.startDate ??
        payCycle.nextPayDate,
    );

  const endDate =
    options.endDate
      ? normalizeDateString(
          options.endDate,
        )
      : undefined;

  const requestedCount =
    normalizeProjectionCount(
      options.count,
    );

  const includeStartDate =
    options.includeStartDate ??
    true;

  if (
    payCycle.frequency ===
    "irregular"
  ) {
    return generateIrregularPayDates(
      payCycle,
      {
        startDate,
        endDate,
        count:
          requestedCount,
        includeStartDate,
      },
    );
  }

  const generatedDates:
    string[] = [];

  let currentDate =
    getFirstProjectedPayDate(
      payCycle,
      startDate,
      includeStartDate,
    );

  let guardCount =
    0;

  while (
    generatedDates.length <
      requestedCount &&
    guardCount <
      MAX_PROJECTION_COUNT *
        4
  ) {
    guardCount +=
      1;

    if (
      endDate &&
      compareDateStrings(
        currentDate,
        endDate,
      ) >
        0
    ) {
      break;
    }

    const adjustedDate =
      adjustPayDate(
        currentDate,
        payCycle.dayAdjustment,
      );

    if (
      !generatedDates.includes(
        adjustedDate,
      )
    ) {
      generatedDates.push(
        adjustedDate,
      );
    }

    currentDate =
      getNextUnadjustedPayDate(
        currentDate,
        payCycle.frequency,
        payCycle.semimonthlyRule,
        payCycle.customRule,
      );
  }

  return generatedDates;
}

export function generatePayPeriods(
  payCycle: PayCycleData,
  options: GeneratePayPeriodsOptions = {},
) {
  const referenceDate =
    normalizeDateString(
      options.referenceDate ??
        getTodayDateString(),
    );

  const payDates =
    generatePayDates(
      payCycle,
      {
        startDate:
          options.startDate,
        endDate:
          options.endDate,
        count:
          options.count,
        includeStartDate:
          true,
      },
    );

  const payPeriods =
    payDates.map(
      (
        payDate,
        index,
      ): PayPeriodData => {
        const previousPayDate =
          index >
          0
            ? payDates[
                index -
                  1
              ]
            : getPreviousPayDate(
                payCycle,
                payDate,
              );

        const nextPayDate =
          index <
          payDates.length -
            1
            ? payDates[
                index +
                  1
              ]
            : getNextPayDate(
                payCycle,
                payDate,
              );

        const periodStartDate =
          addDaysToDateString(
            previousPayDate,
            1,
          );

        const periodEndDate =
          payDate;

        const status =
          getPayPeriodStatus(
            payDate,
            referenceDate,
          );

        return {
          id:
            createPayPeriodId(
              payCycle.id,
              payDate,
            ),
          payCycleId:
            payCycle.id,
          periodStartDate,
          periodEndDate,
          expectedPayDate:
            payDate,
          expectedAmount:
            normalizeCurrency(
              payCycle.expectedNetAmount,
            ),
          availableForBills:
            normalizeCurrency(
              payCycle.expectedNetAmount,
            ),
          reservedAmount:
            0,
          remainingAmount:
            normalizeCurrency(
              payCycle.expectedNetAmount,
            ),
          destinationAccountId:
            payCycle.accountId,
          status,
        };
      },
    );

  return payPeriods.filter(
    (
      payPeriod,
    ) => {
      if (
        !options.includeCompleted &&
        payPeriod.status ===
          "completed"
      ) {
        return false;
      }

      if (
        !options.includeSkipped &&
        payPeriod.status ===
          "skipped"
      ) {
        return false;
      }

      return true;
    },
  );
}

export function getNextPayDate(
  payCycle: PayCycleData,
  fromDate =
    getTodayDateString(),
) {
  const normalizedFromDate =
    normalizeDateString(
      fromDate,
    );

  const dates =
    generatePayDates(
      payCycle,
      {
        startDate:
          normalizedFromDate,
        count:
          2,
        includeStartDate:
          false,
      },
    );

  const nextDate =
    dates[0];

  if (
    !nextDate
  ) {
    throw new Error(
      `Unable to calculate the next pay date for pay cycle "${payCycle.name}".`,
    );
  }

  return nextDate;
}

export function getPreviousPayDate(
  payCycle: PayCycleData,
  fromDate =
    getTodayDateString(),
) {
  const normalizedFromDate =
    normalizeDateString(
      fromDate,
    );

  const unadjustedDate =
    reversePayDate(
      normalizedFromDate,
      payCycle.frequency,
      payCycle.semimonthlyRule,
      payCycle.customRule,
    );

  return adjustPayDate(
    unadjustedDate,
    payCycle.dayAdjustment,
  );
}

export function getPayPeriodWindow(
  payCycle: PayCycleData,
  payDate: string,
): PayCycleProjectionWindow {
  const normalizedPayDate =
    normalizeDateString(
      payDate,
    );

  const previousPayDate =
    getPreviousPayDate(
      payCycle,
      normalizedPayDate,
    );

  return {
    startDate:
      addDaysToDateString(
        previousPayDate,
        1,
      ),
    endDate:
      normalizedPayDate,
  };
}

export function getNextPayPeriodWindow(
  payCycle: PayCycleData,
  fromDate =
    getTodayDateString(),
): PayCycleProjectionWindow {
  const nextPayDate =
    getNextPayDate(
      payCycle,
      fromDate,
    );

  return getPayPeriodWindow(
    payCycle,
    nextPayDate,
  );
}

export function getPayDatesBetween(
  payCycle: PayCycleData,
  startDate: string,
  endDate: string,
) {
  const normalizedStartDate =
    normalizeDateString(
      startDate,
    );

  const normalizedEndDate =
    normalizeDateString(
      endDate,
    );

  if (
    compareDateStrings(
      normalizedStartDate,
      normalizedEndDate,
    ) >
      0
  ) {
    return [];
  }

  return generatePayDates(
    payCycle,
    {
      startDate:
        normalizedStartDate,
      endDate:
        normalizedEndDate,
      count:
        MAX_PROJECTION_COUNT,
      includeStartDate:
        true,
    },
  );
}

export function calculateProjectedIncome(
  payCycle: PayCycleData,
  startDate: string,
  endDate: string,
) {
  const payDates =
    getPayDatesBetween(
      payCycle,
      startDate,
      endDate,
    );

  return normalizeCurrency(
    payDates.length *
      payCycle.expectedNetAmount,
  );
}

export function calculateAnnualPaycheckCount(
  frequency: PayCycleFrequency,
  semimonthlyRule?: PayCycleSemimonthlyRule,
  customRule?: PayCycleCustomRule,
) {
  switch (frequency) {
    case "weekly":
      return 52;

    case "biweekly":
      return 26;

    case "semimonthly":
      return semimonthlyRule
        ? 24
        : 24;

    case "monthly":
      return 12;

    case "quarterly":
      return 4;

    case "custom":
      return calculateCustomAnnualCount(
        customRule,
      );

    case "irregular":
    default:
      return 0;
  }
}

export function calculateAverageMonthlyIncome(
  payCycle: PayCycleData,
) {
  const annualPaycheckCount =
    calculateAnnualPaycheckCount(
      payCycle.frequency,
      payCycle.semimonthlyRule,
      payCycle.customRule,
    );

  if (
    annualPaycheckCount <=
    0
  ) {
    return 0;
  }

  return normalizeCurrency(
    (
      payCycle.expectedNetAmount *
      annualPaycheckCount
    ) /
      12,
  );
}

export function validatePayCycleDates(
  payCycle: PayCycleData,
): PayCycleDateValidationResult {
  const errors:
    string[] = [];

  if (
    !isValidDateString(
      payCycle.startDate,
    )
  ) {
    errors.push(
      "The pay cycle start date is invalid.",
    );
  }

  if (
    !isValidDateString(
      payCycle.nextPayDate,
    )
  ) {
    errors.push(
      "The next pay date is invalid.",
    );
  }

  if (
    payCycle.lastPayDate &&
    !isValidDateString(
      payCycle.lastPayDate,
    )
  ) {
    errors.push(
      "The last pay date is invalid.",
    );
  }

  if (
    payCycle.endDate &&
    !isValidDateString(
      payCycle.endDate,
    )
  ) {
    errors.push(
      "The pay cycle end date is invalid.",
    );
  }

  if (
    isValidDateString(
      payCycle.startDate,
    ) &&
    isValidDateString(
      payCycle.nextPayDate,
    ) &&
    compareDateStrings(
      payCycle.nextPayDate,
      payCycle.startDate,
    ) <
      0
  ) {
    errors.push(
      "The next pay date cannot be before the pay cycle start date.",
    );
  }

  if (
    payCycle.endDate &&
    isValidDateString(
      payCycle.startDate,
    ) &&
    isValidDateString(
      payCycle.endDate,
    ) &&
    compareDateStrings(
      payCycle.endDate,
      payCycle.startDate,
    ) <
      0
  ) {
    errors.push(
      "The pay cycle end date cannot be before the start date.",
    );
  }

  if (
    !Number.isFinite(
      payCycle.expectedNetAmount,
    ) ||
    payCycle.expectedNetAmount <
      0
  ) {
    errors.push(
      "The expected net amount must be a valid non-negative number.",
    );
  }

  if (
    payCycle.frequency ===
    "semimonthly"
  ) {
    const semimonthlyErrors =
      validateSemimonthlyRule(
        payCycle.semimonthlyRule,
      );

    errors.push(
      ...semimonthlyErrors,
    );
  }

  if (
    payCycle.frequency ===
    "custom"
  ) {
    const customErrors =
      validateCustomRule(
        payCycle.customRule,
      );

    errors.push(
      ...customErrors,
    );
  }

  return {
    isValid:
      errors.length ===
      0,
    errors,
  };
}

export function adjustPayDate(
  date: string,
  adjustment: PayCycleDayAdjustment,
) {
  const normalizedDate =
    normalizeDateString(
      date,
    );

  if (
    adjustment ===
    "none"
  ) {
    return normalizedDate;
  }

  const parsedDate =
    parseLocalDate(
      normalizedDate,
    );

  if (
    !isWeekend(
      parsedDate,
    )
  ) {
    return normalizedDate;
  }

  if (
    adjustment ===
    "previous-business-day"
  ) {
    while (
      isWeekend(
        parsedDate,
      )
    ) {
      parsedDate.setDate(
        parsedDate.getDate() -
          1,
      );
    }

    return formatLocalDate(
      parsedDate,
    );
  }

  while (
    isWeekend(
      parsedDate,
    )
  ) {
    parsedDate.setDate(
      parsedDate.getDate() +
        1,
    );
  }

  return formatLocalDate(
    parsedDate,
  );
}

export function isPayDate(
  payCycle: PayCycleData,
  date: string,
) {
  const normalizedDate =
    normalizeDateString(
      date,
    );

  const projectionStartDate =
    compareDateStrings(
      normalizedDate,
      payCycle.nextPayDate,
    ) <
      0
      ? payCycle.startDate
      : payCycle.nextPayDate;

  const dates =
    generatePayDates(
      payCycle,
      {
        startDate:
          projectionStartDate,
        endDate:
          normalizedDate,
        count:
          MAX_PROJECTION_COUNT,
        includeStartDate:
          true,
      },
    );

  return dates.includes(
    normalizedDate,
  );
}

export function normalizePayCycle(
  payCycle: PayCycleData,
): PayCycleData {
  return {
    ...payCycle,
    expectedNetAmount:
      normalizeCurrency(
        payCycle.expectedNetAmount,
      ),
    minimumExpectedAmount:
      payCycle.minimumExpectedAmount ===
      undefined
        ? undefined
        : normalizeCurrency(
            payCycle.minimumExpectedAmount,
          ),
    maximumExpectedAmount:
      payCycle.maximumExpectedAmount ===
      undefined
        ? undefined
        : normalizeCurrency(
            payCycle.maximumExpectedAmount,
          ),
    startDate:
      normalizeDateString(
        payCycle.startDate,
      ),
    nextPayDate:
      normalizeDateString(
        payCycle.nextPayDate,
      ),
    lastPayDate:
      payCycle.lastPayDate
        ? normalizeDateString(
            payCycle.lastPayDate,
          )
        : undefined,
    endDate:
      payCycle.endDate
        ? normalizeDateString(
            payCycle.endDate,
          )
        : undefined,
  };
}

function getFirstProjectedPayDate(
  payCycle: PayCycleData,
  startDate: string,
  includeStartDate: boolean,
) {
  let currentDate =
    normalizeDateString(
      payCycle.nextPayDate,
    );

  const normalizedStartDate =
    normalizeDateString(
      startDate,
    );

  if (
    compareDateStrings(
      currentDate,
      normalizedStartDate,
    ) <
      0
  ) {
    while (
      compareDateStrings(
        currentDate,
        normalizedStartDate,
      ) <
        0
    ) {
      currentDate =
        getNextUnadjustedPayDate(
          currentDate,
          payCycle.frequency,
          payCycle.semimonthlyRule,
          payCycle.customRule,
        );
    }
  }

  if (
    !includeStartDate &&
    compareDateStrings(
      currentDate,
      normalizedStartDate,
    ) ===
      0
  ) {
    currentDate =
      getNextUnadjustedPayDate(
        currentDate,
        payCycle.frequency,
        payCycle.semimonthlyRule,
        payCycle.customRule,
      );
  }

  return currentDate;
}

function getNextUnadjustedPayDate(
  date: string,
  frequency: PayCycleFrequency,
  semimonthlyRule?: PayCycleSemimonthlyRule,
  customRule?: PayCycleCustomRule,
) {
  switch (frequency) {
    case "weekly":
      return addDaysToDateString(
        date,
        7,
      );

    case "biweekly":
      return addDaysToDateString(
        date,
        14,
      );

    case "semimonthly":
      return getNextSemimonthlyDate(
        date,
        semimonthlyRule,
      );

    case "monthly":
      return addMonthsToDateString(
        date,
        1,
      );

    case "quarterly":
      return addMonthsToDateString(
        date,
        3,
      );

    case "custom":
      return getNextCustomDate(
        date,
        customRule,
      );

    case "irregular":
    default:
      throw new Error(
        "Irregular pay cycles require manually supplied pay dates.",
      );
  }
}

function reversePayDate(
  date: string,
  frequency: PayCycleFrequency,
  semimonthlyRule?: PayCycleSemimonthlyRule,
  customRule?: PayCycleCustomRule,
) {
  switch (frequency) {
    case "weekly":
      return addDaysToDateString(
        date,
        -7,
      );

    case "biweekly":
      return addDaysToDateString(
        date,
        -14,
      );

    case "semimonthly":
      return getPreviousSemimonthlyDate(
        date,
        semimonthlyRule,
      );

    case "monthly":
      return addMonthsToDateString(
        date,
        -1,
      );

    case "quarterly":
      return addMonthsToDateString(
        date,
        -3,
      );

    case "custom":
      return getPreviousCustomDate(
        date,
        customRule,
      );

    case "irregular":
    default:
      return addDaysToDateString(
        date,
        -1,
      );
  }
}

function getNextSemimonthlyDate(
  date: string,
  rule?: PayCycleSemimonthlyRule,
) {
  const validatedRule =
    requireSemimonthlyRule(
      rule,
    );

  const currentDate =
    parseLocalDate(
      date,
    );

  const currentYear =
    currentDate.getFullYear();

  const currentMonth =
    currentDate.getMonth();

  const firstDate =
    createDateForMonthDay(
      currentYear,
      currentMonth,
      validatedRule.firstDayOfMonth,
    );

  const secondDate =
    createDateForMonthDay(
      currentYear,
      currentMonth,
      validatedRule.secondDayOfMonth,
    );

  if (
    currentDate <
    firstDate
  ) {
    return formatLocalDate(
      firstDate,
    );
  }

  if (
    currentDate <
    secondDate
  ) {
    return formatLocalDate(
      secondDate,
    );
  }

  return formatLocalDate(
    createDateForMonthDay(
      currentYear,
      currentMonth +
        1,
      validatedRule.firstDayOfMonth,
    ),
  );
}

function getPreviousSemimonthlyDate(
  date: string,
  rule?: PayCycleSemimonthlyRule,
) {
  const validatedRule =
    requireSemimonthlyRule(
      rule,
    );

  const currentDate =
    parseLocalDate(
      date,
    );

  const currentYear =
    currentDate.getFullYear();

  const currentMonth =
    currentDate.getMonth();

  const firstDate =
    createDateForMonthDay(
      currentYear,
      currentMonth,
      validatedRule.firstDayOfMonth,
    );

  const secondDate =
    createDateForMonthDay(
      currentYear,
      currentMonth,
      validatedRule.secondDayOfMonth,
    );

  if (
    currentDate >
    secondDate
  ) {
    return formatLocalDate(
      secondDate,
    );
  }

  if (
    currentDate >
    firstDate
  ) {
    return formatLocalDate(
      firstDate,
    );
  }

  return formatLocalDate(
    createDateForMonthDay(
      currentYear,
      currentMonth -
        1,
      validatedRule.secondDayOfMonth,
    ),
  );
}

function getNextCustomDate(
  date: string,
  rule?: PayCycleCustomRule,
) {
  const validatedRule =
    requireCustomRule(
      rule,
    );

  switch (
    validatedRule.intervalUnit
  ) {
    case "day":
      return addDaysToDateString(
        date,
        validatedRule.intervalCount,
      );

    case "week":
      return addDaysToDateString(
        date,
        validatedRule.intervalCount *
          7,
      );

    case "month":
      return addMonthsToDateString(
        date,
        validatedRule.intervalCount,
      );

    default:
      return date;
  }
}

function getPreviousCustomDate(
  date: string,
  rule?: PayCycleCustomRule,
) {
  const validatedRule =
    requireCustomRule(
      rule,
    );

  switch (
    validatedRule.intervalUnit
  ) {
    case "day":
      return addDaysToDateString(
        date,
        -validatedRule.intervalCount,
      );

    case "week":
      return addDaysToDateString(
        date,
        -validatedRule.intervalCount *
          7,
      );

    case "month":
      return addMonthsToDateString(
        date,
        -validatedRule.intervalCount,
      );

    default:
      return date;
  }
}

function generateIrregularPayDates(
  payCycle: PayCycleData,
  options: Required<
    Pick<
      GeneratePayDatesOptions,
      "startDate" |
      "count" |
      "includeStartDate"
    >
  > & {
    endDate?: string;
  },
) {
  const candidateDates =
    [
      payCycle.lastPayDate,
      payCycle.nextPayDate,
    ]
      .filter(
        (
          value,
        ): value is string =>
          Boolean(
            value,
          ),
      )
      .map(
        normalizeDateString,
      )
      .filter(
        (
          date,
        ) => {
          const startComparison =
            compareDateStrings(
              date,
              options.startDate,
            );

          if (
            options.includeStartDate
              ? startComparison <
                  0
              : startComparison <=
                  0
          ) {
            return false;
          }

          if (
            options.endDate &&
            compareDateStrings(
              date,
              options.endDate,
            ) >
              0
          ) {
            return false;
          }

          return true;
        },
      )
      .sort(
        compareDateStrings,
      );

  return Array.from(
    new Set(
      candidateDates,
    ),
  ).slice(
    0,
    options.count,
  );
}

function getPayPeriodStatus(
  payDate: string,
  referenceDate: string,
): PayPeriodStatus {
  const comparison =
    compareDateStrings(
      payDate,
      referenceDate,
    );

  if (
    comparison <
    0
  ) {
    return "completed";
  }

  if (
    comparison ===
    0
  ) {
    return "current";
  }

  return "projected";
}

function createPayPeriodId(
  payCycleId: string,
  payDate: string,
) {
  return `pay-period-${payCycleId}-${payDate}`;
}

function calculateCustomAnnualCount(
  rule?: PayCycleCustomRule,
) {
  if (
    !rule ||
    rule.intervalCount <=
      0
  ) {
    return 0;
  }

  switch (
    rule.intervalUnit
  ) {
    case "day":
      return Math.floor(
        365 /
          rule.intervalCount,
      );

    case "week":
      return Math.floor(
        52 /
          rule.intervalCount,
      );

    case "month":
      return Math.floor(
        12 /
          rule.intervalCount,
      );

    default:
      return 0;
  }
}

function validateSemimonthlyRule(
  rule?: PayCycleSemimonthlyRule,
) {
  const errors:
    string[] = [];

  if (
    !rule
  ) {
    errors.push(
      "Semimonthly pay cycles require a semimonthly rule.",
    );

    return errors;
  }

  if (
    !isValidMonthDay(
      rule.firstDayOfMonth,
    )
  ) {
    errors.push(
      "The first semimonthly pay day must be between 1 and 31.",
    );
  }

  if (
    !isValidMonthDay(
      rule.secondDayOfMonth,
    )
  ) {
    errors.push(
      "The second semimonthly pay day must be between 1 and 31.",
    );
  }

  if (
    rule.firstDayOfMonth >=
    rule.secondDayOfMonth
  ) {
    errors.push(
      "The first semimonthly pay day must occur before the second pay day.",
    );
  }

  return errors;
}

function validateCustomRule(
  rule?: PayCycleCustomRule,
) {
  const errors:
    string[] = [];

  if (
    !rule
  ) {
    errors.push(
      "Custom pay cycles require a custom interval rule.",
    );

    return errors;
  }

  if (
    !Number.isInteger(
      rule.intervalCount,
    ) ||
    rule.intervalCount <=
      0
  ) {
    errors.push(
      "The custom interval count must be a positive whole number.",
    );
  }

  if (
    ![
      "day",
      "week",
      "month",
    ].includes(
      rule.intervalUnit,
    )
  ) {
    errors.push(
      "The custom interval unit is invalid.",
    );
  }

  return errors;
}

function requireSemimonthlyRule(
  rule?: PayCycleSemimonthlyRule,
) {
  const errors =
    validateSemimonthlyRule(
      rule,
    );

  if (
    errors.length >
    0
  ) {
    throw new Error(
      errors.join(
        " ",
      ),
    );
  }

  return rule as PayCycleSemimonthlyRule;
}

function requireCustomRule(
  rule?: PayCycleCustomRule,
) {
  const errors =
    validateCustomRule(
      rule,
    );

  if (
    errors.length >
    0
  ) {
    throw new Error(
      errors.join(
        " ",
      ),
    );
  }

  return rule as PayCycleCustomRule;
}

function createDateForMonthDay(
  year: number,
  monthIndex: number,
  requestedDay: number,
) {
  const normalizedMonthDate =
    new Date(
      year,
      monthIndex,
      1,
    );

  const normalizedYear =
    normalizedMonthDate.getFullYear();

  const normalizedMonth =
    normalizedMonthDate.getMonth();

  const lastDayOfMonth =
    new Date(
      normalizedYear,
      normalizedMonth +
        1,
      0,
    ).getDate();

  return new Date(
    normalizedYear,
    normalizedMonth,
    Math.min(
      requestedDay,
      lastDayOfMonth,
    ),
  );
}

function addDaysToDateString(
  value: string,
  days: number,
) {
  const date =
    parseLocalDate(
      value,
    );

  date.setDate(
    date.getDate() +
      days,
  );

  return formatLocalDate(
    date,
  );
}

function addMonthsToDateString(
  value: string,
  months: number,
) {
  const date =
    parseLocalDate(
      value,
    );

  const originalDay =
    date.getDate();

  date.setDate(
    1,
  );

  date.setMonth(
    date.getMonth() +
      months,
  );

  const lastDayOfTargetMonth =
    new Date(
      date.getFullYear(),
      date.getMonth() +
        1,
      0,
    ).getDate();

  date.setDate(
    Math.min(
      originalDay,
      lastDayOfTargetMonth,
    ),
  );

  return formatLocalDate(
    date,
  );
}

function compareDateStrings(
  firstDate: string,
  secondDate: string,
) {
  return firstDate.localeCompare(
    secondDate,
  );
}

function normalizeProjectionCount(
  count?: number,
) {
  if (
    !Number.isFinite(
      count,
    )
  ) {
    return DEFAULT_PROJECTION_COUNT;
  }

  return Math.min(
    MAX_PROJECTION_COUNT,
    Math.max(
      1,
      Math.floor(
        count as number,
      ),
    ),
  );
}

function normalizeDateString(
  value: string,
) {
  const normalizedValue =
    value.slice(
      0,
      10,
    );

  if (
    !isValidDateString(
      normalizedValue,
    )
  ) {
    throw new Error(
      `Invalid date value: "${value}". Expected YYYY-MM-DD.`,
    );
  }

  return normalizedValue;
}

function isValidDateString(
  value: string,
) {
  if (
    !ISO_DATE_PATTERN.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    parseLocalDateUnsafe(
      value,
    );

  return (
    date !==
      null &&
    formatLocalDate(
      date,
    ) ===
      value
  );
}

function parseLocalDate(
  value: string,
) {
  const date =
    parseLocalDateUnsafe(
      value,
    );

  if (
    !date
  ) {
    throw new Error(
      `Invalid date value: "${value}".`,
    );
  }

  return date;
}

function parseLocalDateUnsafe(
  value: string,
) {
  const match =
    ISO_DATE_PATTERN.exec(
      value,
    );

  if (
    !match
  ) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] =
    value
      .split(
        "-",
      )
      .map(
        Number,
      );

  const date =
    new Date(
      year,
      month -
        1,
      day,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatLocalDate(
  date: Date,
) {
  const year =
    date
      .getFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      date.getMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    date
      .getDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}-${day}`;
}

function getTodayDateString() {
  return formatLocalDate(
    new Date(),
  );
}

function isWeekend(
  date: Date,
) {
  return (
    date.getDay() ===
      0 ||
    date.getDay() ===
      6
  );
}

function isValidMonthDay(
  value: number,
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