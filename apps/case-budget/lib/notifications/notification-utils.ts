import type {
  NotificationCategory,
  NotificationItem,
  NotificationPriority,
} from "./generate-notifications";

export const MILLISECONDS_PER_DAY =
  24 * 60 * 60 * 1000;

export const DEFAULT_LOCALE =
  "en-US";

export const DEFAULT_CURRENCY =
  "USD";

export type DateInput =
  | string
  | Date
  | null
  | undefined;

export type MoneyInput =
  | number
  | null
  | undefined;

export type TimestampedEntity = {
  createdAt?: DateInput;
  updatedAt?: DateInput;
};

export function parseDate(
  value: DateInput,
): Date | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (
      Number.isNaN(
        value.getTime(),
      )
    ) {
      return null;
    }

    return new Date(
      value.getTime(),
    );
  }

  const normalizedValue =
    value.trim();

  if (!normalizedValue) {
    return null;
  }

  const monthOnlyMatch =
    normalizedValue.match(
      /^(\d{4})-(\d{2})$/,
    );

  if (monthOnlyMatch) {
    const year =
      Number(
        monthOnlyMatch[1],
      );

    const month =
      Number(
        monthOnlyMatch[2],
      ) - 1;

    const parsedDate =
      new Date(
        Date.UTC(
          year,
          month,
          1,
        ),
      );

    if (
      parsedDate.getUTCFullYear() !==
        year ||
      parsedDate.getUTCMonth() !==
        month
    ) {
      return null;
    }

    return parsedDate;
  }

  const dateOnlyMatch =
    normalizedValue.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (dateOnlyMatch) {
    const year =
      Number(
        dateOnlyMatch[1],
      );

    const month =
      Number(
        dateOnlyMatch[2],
      ) - 1;

    const day =
      Number(
        dateOnlyMatch[3],
      );

    const parsedDate =
      new Date(
        Date.UTC(
          year,
          month,
          day,
        ),
      );

    if (
      parsedDate.getUTCFullYear() !==
        year ||
      parsedDate.getUTCMonth() !==
        month ||
      parsedDate.getUTCDate() !==
        day
    ) {
      return null;
    }

    return parsedDate;
  }

  const parsedTimestamp =
    Date.parse(
      normalizedValue,
    );

  if (
    Number.isNaN(
      parsedTimestamp,
    )
  ) {
    return null;
  }

  return new Date(
    parsedTimestamp,
  );
}

export function normalizeCalendarDate(
  date: Date,
): Date {
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return new Date(
      "1970-01-01T00:00:00.000Z",
    );
  }

  return new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
    ),
  );
}

export function differenceInCalendarDays(
  laterDate: Date,
  earlierDate: Date,
): number {
  const normalizedLaterDate =
    normalizeCalendarDate(
      laterDate,
    );

  const normalizedEarlierDate =
    normalizeCalendarDate(
      earlierDate,
    );

  return Math.round(
    (normalizedLaterDate.getTime() -
      normalizedEarlierDate.getTime()) /
      MILLISECONDS_PER_DAY,
  );
}

export function formatDateKey(
  date: Date,
): string {
  const normalizedDate =
    normalizeCalendarDate(date);

  const year =
    normalizedDate
      .getUTCFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      normalizedDate.getUTCMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    normalizedDate
      .getUTCDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  return `${year}-${month}-${day}`;
}

export function formatDateTimeKey(
  date: Date,
): string {
  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "1970-01-01-00-00-00";
  }

  const year =
    date
      .getUTCFullYear()
      .toString()
      .padStart(
        4,
        "0",
      );

  const month =
    (
      date.getUTCMonth() +
      1
    )
      .toString()
      .padStart(
        2,
        "0",
      );

  const day =
    date
      .getUTCDate()
      .toString()
      .padStart(
        2,
        "0",
      );

  const hour =
    date
      .getUTCHours()
      .toString()
      .padStart(
        2,
        "0",
      );

  const minute =
    date
      .getUTCMinutes()
      .toString()
      .padStart(
        2,
        "0",
      );

  const second =
    date
      .getUTCSeconds()
      .toString()
      .padStart(
        2,
        "0",
      );

  return [
    year,
    month,
    day,
    hour,
    minute,
    second,
  ].join("-");
}

export function normalizeMoney(
  value: MoneyInput,
): number {
  const numericValue =
    Number(
      value ?? 0,
    );

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      numericValue * 100,
    ) / 100
  );
}

export function formatCurrency(
  value: MoneyInput,
  options?: {
    locale?: string;
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const locale =
    options?.locale ??
    DEFAULT_LOCALE;

  const currency =
    options?.currency ??
    DEFAULT_CURRENCY;

  const minimumFractionDigits =
    options?.minimumFractionDigits ??
    2;

  const maximumFractionDigits =
    options?.maximumFractionDigits ??
    2;

  return new Intl.NumberFormat(
    locale,
    {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    },
  ).format(
    normalizeMoney(value),
  );
}

export function formatPercentage(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  },
): string {
  const normalizedValue =
    Number.isFinite(value)
      ? value
      : 0;

  const minimumFractionDigits =
    options?.minimumFractionDigits ??
    0;

  const maximumFractionDigits =
    options?.maximumFractionDigits ??
    1;

  return new Intl.NumberFormat(
    DEFAULT_LOCALE,
    {
      style: "percent",
      minimumFractionDigits,
      maximumFractionDigits,
    },
  ).format(
    normalizedValue / 100,
  );
}

export function calculateCompletionPercentage(
  currentAmount: number,
  targetAmount: number,
): number {
  const normalizedCurrentAmount =
    Number.isFinite(currentAmount)
      ? currentAmount
      : 0;

  const normalizedTargetAmount =
    Number.isFinite(targetAmount)
      ? targetAmount
      : 0;

  if (
    normalizedTargetAmount <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(
      0,
      (
        normalizedCurrentAmount /
        normalizedTargetAmount
      ) * 100,
    ),
  );
}

export function getPriorityRank(
  priority: NotificationPriority,
): number {
  switch (priority) {
    case "critical":
      return 4;

    case "high":
      return 3;

    case "medium":
      return 2;

    case "low":
    default:
      return 1;
  }
}

export function compareNotifications(
  firstNotification: NotificationItem,
  secondNotification: NotificationItem,
): number {
  const priorityDifference =
    getPriorityRank(
      secondNotification.priority,
    ) -
    getPriorityRank(
      firstNotification.priority,
    );

  if (
    priorityDifference !== 0
  ) {
    return priorityDifference;
  }

  const firstTimestamp =
    parseDate(
      firstNotification.createdAt,
    )?.getTime() ?? 0;

  const secondTimestamp =
    parseDate(
      secondNotification.createdAt,
    )?.getTime() ?? 0;

  const timestampDifference =
    secondTimestamp -
    firstTimestamp;

  if (
    timestampDifference !== 0
  ) {
    return timestampDifference;
  }

  return firstNotification.id.localeCompare(
    secondNotification.id,
  );
}

export function deduplicateNotifications(
  notifications: NotificationItem[],
): NotificationItem[] {
  const notificationMap =
    new Map<
      string,
      NotificationItem
    >();

  for (
    const notification
    of notifications
  ) {
    const existingNotification =
      notificationMap.get(
        notification.id,
      );

    if (
      !existingNotification
    ) {
      notificationMap.set(
        notification.id,
        notification,
      );

      continue;
    }

    if (
      compareNotifications(
        notification,
        existingNotification,
      ) < 0
    ) {
      notificationMap.set(
        notification.id,
        notification,
      );
    }
  }

  return Array.from(
    notificationMap.values(),
  );
}

export function sortAndDeduplicateNotifications(
  notifications: NotificationItem[],
): NotificationItem[] {
  return deduplicateNotifications(
    notifications,
  ).sort(
    compareNotifications,
  );
}

export function sanitizeIdPart(
  value:
    | string
    | number
    | null
    | undefined,
): string {
  const normalizedValue =
    String(
      value ?? "",
    )
      .trim()
      .toLowerCase();

  const sanitizedValue =
    normalizedValue
      .replace(
        /[^a-z0-9_-]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );

  return (
    sanitizedValue ||
    "unknown"
  );
}

export function createNotificationId(
  category: NotificationCategory,
  entityId:
    | string
    | number,
  eventName: string,
): string {
  return [
    "notification",
    sanitizeIdPart(category),
    sanitizeIdPart(entityId),
    sanitizeIdPart(eventName),
  ].join(":");
}

export function resolveEntityTimestamp(
  entity: TimestampedEntity,
  fallbackDate: Date,
  additionalDates: DateInput[] = [],
): Date {
  const candidateDates: DateInput[] =
    [
      entity.updatedAt,
      ...additionalDates,
      entity.createdAt,
    ];

  for (
    const candidateDate
    of candidateDates
  ) {
    const parsedCandidateDate =
      parseDate(
        candidateDate,
      );

    if (
      parsedCandidateDate
    ) {
      return parsedCandidateDate;
    }
  }

  if (
    Number.isNaN(
      fallbackDate.getTime(),
    )
  ) {
    return new Date(
      "1970-01-01T00:00:00.000Z",
    );
  }

  return new Date(
    fallbackDate.getTime(),
  );
}

export function isSameCalendarDay(
  firstDate: Date,
  secondDate: Date,
): boolean {
  return (
    normalizeCalendarDate(
      firstDate,
    ).getTime() ===
    normalizeCalendarDate(
      secondDate,
    ).getTime()
  );
}

export function isDateBefore(
  firstDate: Date,
  secondDate: Date,
): boolean {
  return (
    normalizeCalendarDate(
      firstDate,
    ).getTime() <
    normalizeCalendarDate(
      secondDate,
    ).getTime()
  );
}

export function isDateAfter(
  firstDate: Date,
  secondDate: Date,
): boolean {
  return (
    normalizeCalendarDate(
      firstDate,
    ).getTime() >
    normalizeCalendarDate(
      secondDate,
    ).getTime()
  );
}

export function clampNumber(
  value: number,
  minimum: number,
  maximum: number,
): number {
  const normalizedValue =
    Number.isFinite(value)
      ? value
      : minimum;

  return Math.min(
    maximum,
    Math.max(
      minimum,
      normalizedValue,
    ),
  );
}