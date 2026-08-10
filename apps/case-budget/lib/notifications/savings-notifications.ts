import type {
  NotificationItem,
  NotificationPriority,
  SavingsGoalData,
} from "./generate-notifications";

import {
  calculateCompletionPercentage,
  createNotificationId,
  differenceInCalendarDays,
  formatCurrency,
  formatDateKey,
  normalizeCalendarDate,
  normalizeMoney,
  parseDate,
  resolveEntityTimestamp,
  sortAndDeduplicateNotifications,
} from "./notification-utils";

const SAVINGS_DEADLINE_WARNING_DAYS =
  30;

const SAVINGS_DEADLINE_URGENT_DAYS =
  7;

const SAVINGS_MILESTONES = [
  25,
  50,
  75,
] as const;

export function generateSavingsNotifications(
  goals: SavingsGoalData[],
  asOfDate: Date,
): NotificationItem[] {
  const normalizedAsOfDate =
    normalizeCalendarDate(asOfDate);

  const notifications: NotificationItem[] =
    [];

  for (const goal of goals) {
    const eventDate =
      resolveSavingsEventDate(
        goal,
        normalizedAsOfDate,
      );

    const currentAmount =
      resolveCurrentAmount(goal);

    const targetAmount =
      Math.max(
        0,
        normalizeMoney(
          goal.targetAmount,
        ),
      );

    if (
      isSavingsGoalCompleted(
        goal,
        currentAmount,
        targetAmount,
      )
    ) {
      notifications.push(
        createSavingsGoalCompletedNotification(
          goal,
          currentAmount,
          targetAmount,
          eventDate,
        ),
      );

      continue;
    }

    const contributionNotification =
      createSavingsContributionNotification(
        goal,
        eventDate,
      );

    if (contributionNotification) {
      notifications.push(
        contributionNotification,
      );
    }

    const milestoneNotification =
      createSavingsMilestoneNotification(
        goal,
        currentAmount,
        targetAmount,
        eventDate,
      );

    if (milestoneNotification) {
      notifications.push(
        milestoneNotification,
      );
    }

    const deadlineNotification =
      createSavingsDeadlineNotification(
        goal,
        currentAmount,
        targetAmount,
        normalizedAsOfDate,
        eventDate,
      );

    if (deadlineNotification) {
      notifications.push(
        deadlineNotification,
      );
    }

    const behindScheduleNotification =
      createBehindScheduleNotification(
        goal,
        currentAmount,
        targetAmount,
        normalizedAsOfDate,
        eventDate,
      );

    if (behindScheduleNotification) {
      notifications.push(
        behindScheduleNotification,
      );
    }
  }

  return sortAndDeduplicateNotifications(
    notifications,
  );
}

function createSavingsGoalCompletedNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  eventDate: Date,
): NotificationItem {
  const completedAmount =
    targetAmount > 0
      ? Math.max(
          targetAmount,
          currentAmount,
        )
      : currentAmount;

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      "completed",
    ),
    category: "savings",
    priority: "high",
    title: `${goal.name} is fully funded`,
    message:
      completedAmount > 0
        ? `Congratulations. You saved ${formatCurrency(
            completedAmount,
          )} for this goal.`
        : "Congratulations. This savings goal is complete.",
    createdAt:
      resolveCompletedDate(
        goal,
        eventDate,
      ).toISOString(),
    read: false,
    actionLabel: "View savings goal",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createSavingsContributionNotification(
  goal: SavingsGoalData,
  eventDate: Date,
): NotificationItem | null {
  const contributionAmount =
    resolveContributionAmount(goal);

  if (contributionAmount <= 0) {
    return null;
  }

  const contributionDate =
    resolveContributionDate(
      goal,
      eventDate,
    );

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `contribution-${formatDateKey(
        contributionDate,
      )}-${formatMoneyIdPart(
        contributionAmount,
      )}`,
    ),
    category: "savings",
    priority: "low",
    title: `${formatCurrency(
      contributionAmount,
    )} added to ${goal.name}`,
    message:
      buildContributionMessage(
        goal,
        contributionAmount,
      ),
    createdAt:
      contributionDate.toISOString(),
    read: false,
    actionLabel: "View progress",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createSavingsMilestoneNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  eventDate: Date,
): NotificationItem | null {
  if (targetAmount <= 0) {
    return null;
  }

  const currentPercentage =
    calculateCompletionPercentage(
      currentAmount,
      targetAmount,
    );

  const previousPercentage =
    resolvePreviousProgressPercentage(
      goal,
      targetAmount,
    );

  const reachedMilestones =
    SAVINGS_MILESTONES.filter(
      (milestone) =>
        currentPercentage >=
          milestone &&
        previousPercentage <
          milestone,
    );

  if (
    reachedMilestones.length === 0
  ) {
    return null;
  }

  const milestone =
    reachedMilestones[
      reachedMilestones.length - 1
    ];

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `milestone-${milestone}`,
    ),
    category: "savings",
    priority:
      getMilestonePriority(
        milestone,
      ),
    title: `${goal.name} reached ${milestone}%`,
    message: `${formatCurrency(
      currentAmount,
    )} of your ${formatCurrency(
      targetAmount,
    )} goal has been saved.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View progress",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createSavingsDeadlineNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  asOfDate: Date,
  eventDate: Date,
): NotificationItem | null {
  const deadline =
    resolveGoalDeadline(goal);

  if (!deadline) {
    return null;
  }

  const daysUntilDeadline =
    differenceInCalendarDays(
      deadline,
      asOfDate,
    );

  if (daysUntilDeadline < 0) {
    return createSavingsDeadlinePassedNotification(
      goal,
      currentAmount,
      targetAmount,
      deadline,
      eventDate,
      Math.abs(
        daysUntilDeadline,
      ),
    );
  }

  if (daysUntilDeadline === 0) {
    return createSavingsDeadlineTodayNotification(
      goal,
      currentAmount,
      targetAmount,
      deadline,
      eventDate,
    );
  }

  if (
    daysUntilDeadline <=
    SAVINGS_DEADLINE_URGENT_DAYS
  ) {
    return createSavingsDeadlineUrgentNotification(
      goal,
      currentAmount,
      targetAmount,
      deadline,
      eventDate,
      daysUntilDeadline,
    );
  }

  if (
    daysUntilDeadline <=
    SAVINGS_DEADLINE_WARNING_DAYS
  ) {
    return createSavingsDeadlineWarningNotification(
      goal,
      currentAmount,
      targetAmount,
      deadline,
      eventDate,
      daysUntilDeadline,
    );
  }

  return null;
}

function createSavingsDeadlinePassedNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  deadline: Date,
  eventDate: Date,
  daysPastDeadline: number,
): NotificationItem {
  const remainingAmount =
    calculateRemainingAmount(
      currentAmount,
      targetAmount,
    );

  const deadlineText =
    daysPastDeadline === 1
      ? "yesterday"
      : `${daysPastDeadline} days ago`;

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `deadline-passed-${formatDateKey(
        deadline,
      )}`,
    ),
    category: "savings",
    priority: "high",
    title: `${goal.name} deadline has passed`,
    message:
      remainingAmount > 0
        ? `${formatCurrency(
            remainingAmount,
          )} is still needed. The target date was ${deadlineText}.`
        : `The target date was ${deadlineText}. Review the goal and mark it complete.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review goal",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createSavingsDeadlineTodayNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  deadline: Date,
  eventDate: Date,
): NotificationItem {
  const remainingAmount =
    calculateRemainingAmount(
      currentAmount,
      targetAmount,
    );

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `deadline-today-${formatDateKey(
        deadline,
      )}`,
    ),
    category: "savings",
    priority: "high",
    title: `${goal.name} is due today`,
    message:
      remainingAmount > 0
        ? `${formatCurrency(
            remainingAmount,
          )} is still needed to reach this savings goal.`
        : "The savings target has been reached. Mark the goal complete.",
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Review goal",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createSavingsDeadlineUrgentNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  deadline: Date,
  eventDate: Date,
  daysUntilDeadline: number,
): NotificationItem {
  const remainingAmount =
    calculateRemainingAmount(
      currentAmount,
      targetAmount,
    );

  const deadlineText =
    daysUntilDeadline === 1
      ? "tomorrow"
      : `in ${daysUntilDeadline} days`;

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `deadline-urgent-${formatDateKey(
        deadline,
      )}`,
    ),
    category: "savings",
    priority: "high",
    title: `${goal.name} deadline is approaching`,
    message:
      remainingAmount > 0
        ? `${formatCurrency(
            remainingAmount,
          )} is still needed before the deadline ${deadlineText}.`
        : `The deadline is ${deadlineText}, and the target amount has been reached.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View savings goal",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createSavingsDeadlineWarningNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  deadline: Date,
  eventDate: Date,
  daysUntilDeadline: number,
): NotificationItem {
  const remainingAmount =
    calculateRemainingAmount(
      currentAmount,
      targetAmount,
    );

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `deadline-warning-${formatDateKey(
        deadline,
      )}`,
    ),
    category: "savings",
    priority: "medium",
    title: `${goal.name} is due soon`,
    message:
      remainingAmount > 0
        ? `${formatCurrency(
            remainingAmount,
          )} remains with ${daysUntilDeadline} days left.`
        : `The target amount has been reached with ${daysUntilDeadline} days remaining.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "View savings goal",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function createBehindScheduleNotification(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
  asOfDate: Date,
  eventDate: Date,
): NotificationItem | null {
  if (
    targetAmount <= 0 ||
    currentAmount >= targetAmount
  ) {
    return null;
  }

  const startDate =
    parseDate(goal.startDate) ??
    parseDate(goal.createdAt);

  const deadline =
    resolveGoalDeadline(goal);

  if (
    !startDate ||
    !deadline
  ) {
    return null;
  }

  const totalScheduleDays =
    differenceInCalendarDays(
      deadline,
      startDate,
    );

  if (totalScheduleDays <= 0) {
    return null;
  }

  const elapsedScheduleDays =
    differenceInCalendarDays(
      asOfDate,
      startDate,
    );

  if (
    elapsedScheduleDays <= 0 ||
    elapsedScheduleDays >=
      totalScheduleDays
  ) {
    return null;
  }

  const expectedPercentage =
    Math.min(
      100,
      Math.max(
        0,
        (
          elapsedScheduleDays /
          totalScheduleDays
        ) * 100,
      ),
    );

  const currentPercentage =
    calculateCompletionPercentage(
      currentAmount,
      targetAmount,
    );

  if (
    currentPercentage >=
    expectedPercentage
  ) {
    return null;
  }

  const expectedAmount =
    normalizeMoney(
      targetAmount *
        (
          expectedPercentage /
          100
        ),
    );

  const scheduleShortfall =
    Math.max(
      0,
      normalizeMoney(
        expectedAmount -
          currentAmount,
      ),
    );

  if (scheduleShortfall <= 0) {
    return null;
  }

  return {
    id: createNotificationId(
      "savings",
      goal.id,
      `behind-schedule-${formatDateKey(
        asOfDate,
      )}`,
    ),
    category: "savings",
    priority:
      getBehindSchedulePriority(
        currentPercentage,
        expectedPercentage,
      ),
    title: `${goal.name} is behind schedule`,
    message: `${formatCurrency(
      scheduleShortfall,
    )} more should be saved by now to stay on pace for the target date.`,
    createdAt: eventDate.toISOString(),
    read: false,
    actionLabel: "Adjust savings plan",
    href: createSavingsGoalHref(
      goal.id,
    ),
  };
}

function buildContributionMessage(
  goal: SavingsGoalData,
  contributionAmount: number,
): string {
  const currentAmount =
    resolveCurrentAmount(goal);

  const targetAmount =
    Math.max(
      0,
      normalizeMoney(
        goal.targetAmount,
      ),
    );

  if (targetAmount <= 0) {
    return `${formatCurrency(
      contributionAmount,
    )} was recorded toward this savings goal.`;
  }

  const remainingAmount =
    calculateRemainingAmount(
      currentAmount,
      targetAmount,
    );

  if (remainingAmount <= 0) {
    return `${formatCurrency(
      contributionAmount,
    )} was recorded, and the savings target has now been reached.`;
  }

  return `${formatCurrency(
    remainingAmount,
  )} remains to reach the ${formatCurrency(
    targetAmount,
  )} target.`;
}

function resolveCurrentAmount(
  goal: SavingsGoalData,
): number {
  const currentAmount =
    goal.currentAmount ??
    goal.savedAmount ??
    0;

  return Math.max(
    0,
    normalizeMoney(
      currentAmount,
    ),
  );
}

function resolvePreviousAmount(
  goal: SavingsGoalData,
): number | null {
  if (
    goal.previousAmount ===
      undefined ||
    goal.previousAmount === null
  ) {
    return null;
  }

  return Math.max(
    0,
    normalizeMoney(
      goal.previousAmount,
    ),
  );
}

function resolvePreviousProgressPercentage(
  goal: SavingsGoalData,
  targetAmount: number,
): number {
  if (
    goal.previousProgressPercentage !==
      undefined &&
    goal.previousProgressPercentage !==
      null
  ) {
    const percentage =
      Number(
        goal.previousProgressPercentage,
      );

    if (
      Number.isFinite(
        percentage,
      )
    ) {
      return Math.min(
        100,
        Math.max(
          0,
          percentage,
        ),
      );
    }
  }

  const previousAmount =
    resolvePreviousAmount(goal);

  if (previousAmount === null) {
    return 0;
  }

  return calculateCompletionPercentage(
    previousAmount,
    targetAmount,
  );
}

function resolveContributionAmount(
  goal: SavingsGoalData,
): number {
  const explicitContributionAmount =
    normalizeMoney(
      goal.contributionAmount ??
        goal.lastContributionAmount,
    );

  if (
    explicitContributionAmount >
    0
  ) {
    return explicitContributionAmount;
  }

  if (
    goal.contributionRecorded !==
    true
  ) {
    return 0;
  }

  const previousAmount =
    resolvePreviousAmount(goal);

  if (previousAmount === null) {
    return 0;
  }

  const currentAmount =
    resolveCurrentAmount(goal);

  return Math.max(
    0,
    normalizeMoney(
      currentAmount -
        previousAmount,
    ),
  );
}

function resolveContributionDate(
  goal: SavingsGoalData,
  fallbackDate: Date,
): Date {
  return (
    parseDate(
      goal.contributionRecordedAt,
    ) ??
    parseDate(
      goal.lastContributionAt,
    ) ??
    fallbackDate
  );
}

function resolveGoalDeadline(
  goal: SavingsGoalData,
): Date | null {
  return (
    parseDate(goal.targetDate) ??
    parseDate(goal.deadline)
  );
}

function resolveCompletedDate(
  goal: SavingsGoalData,
  fallbackDate: Date,
): Date {
  return (
    parseDate(goal.completedAt) ??
    fallbackDate
  );
}

function resolveSavingsEventDate(
  goal: SavingsGoalData,
  fallbackDate: Date,
): Date {
  return resolveEntityTimestamp(
    goal,
    fallbackDate,
    [
      goal.contributionRecordedAt,
      goal.lastContributionAt,
      goal.completedAt,
    ],
  );
}

function calculateRemainingAmount(
  currentAmount: number,
  targetAmount: number,
): number {
  return Math.max(
    0,
    normalizeMoney(
      targetAmount -
        currentAmount,
    ),
  );
}

function isSavingsGoalCompleted(
  goal: SavingsGoalData,
  currentAmount: number,
  targetAmount: number,
): boolean {
  return (
    goal.status === "completed" ||
    (
      targetAmount > 0 &&
      currentAmount >=
        targetAmount
    )
  );
}

function getMilestonePriority(
  milestone: number,
): NotificationPriority {
  if (milestone >= 75) {
    return "medium";
  }

  return "low";
}

function getBehindSchedulePriority(
  currentPercentage: number,
  expectedPercentage: number,
): NotificationPriority {
  const percentageDifference =
    expectedPercentage -
    currentPercentage;

  if (
    percentageDifference >= 25
  ) {
    return "high";
  }

  return "medium";
}

function formatMoneyIdPart(
  amount: number,
): string {
  return Math.round(
    normalizeMoney(amount) *
      100,
  ).toString();
}

function createSavingsGoalHref(
  goalId: string,
): string {
  return `/dashboard/savings?goalId=${encodeURIComponent(
    goalId,
  )}`;
}