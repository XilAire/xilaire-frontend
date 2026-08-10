"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

export type NotificationCategory =
  | "bill"
  | "budget"
  | "transaction"
  | "saving"
  | "debt"
  | "account";

export type NotificationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type NotificationItem = {
  id: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionLabel?: string;
  href?: string;
};

export type NotificationCenterProps = {
  notifications: NotificationItem[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onOpen: (
    notification: NotificationItem,
  ) => void;
  className?: string;
};

type NotificationFilter =
  | "all"
  | "unread"
  | "bill"
  | "budget"
  | "account"
  | "saving";

type NotificationFilterOption = {
  id: NotificationFilter;
  label: string;
};

const notificationFilters: NotificationFilterOption[] =
  [
    {
      id: "all",
      label: "All",
    },
    {
      id: "unread",
      label: "Unread",
    },
    {
      id: "bill",
      label: "Bills",
    },
    {
      id: "budget",
      label: "Budget",
    },
    {
      id: "account",
      label: "Accounts",
    },
    {
      id: "saving",
      label: "Savings",
    },
  ];

export default function NotificationCenter({
  notifications,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onOpen,
  className,
}: NotificationCenterProps) {
  const [isOpen, setIsOpen] =
    useState(false);

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<NotificationFilter>(
      "all",
    );

  const panelRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const triggerRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const filteredNotifications =
    useMemo(() => {
      const sortedNotifications =
        [...notifications].sort(
          (
            firstNotification,
            secondNotification,
          ) =>
            new Date(
              secondNotification.createdAt,
            ).getTime() -
            new Date(
              firstNotification.createdAt,
            ).getTime(),
        );

      if (
        activeFilter === "all"
      ) {
        return sortedNotifications;
      }

      if (
        activeFilter === "unread"
      ) {
        return sortedNotifications.filter(
          (notification) =>
            !notification.read,
        );
      }

      return sortedNotifications.filter(
        (notification) =>
          notification.category ===
          activeFilter,
      );
    }, [
      activeFilter,
      notifications,
    ]);

  const safeUnreadCount =
    Math.max(0, unreadCount);

  const visibleUnreadCount =
    safeUnreadCount > 99
      ? "99+"
      : String(safeUnreadCount);

  const hasNotifications =
    filteredNotifications.length >
    0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        panelRef.current?.contains(
          target,
        ) ||
        triggerRef.current?.contains(
          target,
        )
      ) {
        return;
      }

      setIsOpen(false);
    }

    function handleEscape(
      event: globalThis.KeyboardEvent,
    ) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      setIsOpen(false);

      window.setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }

    document.addEventListener(
      "mousedown",
      handlePointerDown,
    );

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handlePointerDown,
      );

      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      document.body.style.overflow =
        "";

      return;
    }

    const mediaQuery =
      window.matchMedia(
        "(max-width: 639px)",
      );

    if (mediaQuery.matches) {
      document.body.style.overflow =
        "hidden";
    }

    return () => {
      document.body.style.overflow =
        "";
    };
  }, [isOpen]);

  function handleToggle() {
    setIsOpen(
      (currentValue) =>
        !currentValue,
    );
  }

  function handleClose() {
    setIsOpen(false);

    window.setTimeout(() => {
      triggerRef.current?.focus();
    }, 0);
  }

  function handleOpenNotification(
    notification: NotificationItem,
  ) {
    if (!notification.read) {
      onMarkRead(notification.id);
    }

    onOpen(notification);
    setIsOpen(false);
  }

  function handleMarkRead(
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>,
    notification: NotificationItem,
  ) {
    event.stopPropagation();

    if (!notification.read) {
      onMarkRead(notification.id);
    }
  }

  function handleItemKeyDown(
    event: KeyboardEvent<HTMLDivElement>,
    notification: NotificationItem,
  ) {
    if (
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    event.preventDefault();

    handleOpenNotification(
      notification,
    );
  }

  return (
    <div
      className={[
        "relative",
        className ?? "",
      ].join(" ")}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          safeUnreadCount > 0
            ? `Open notifications. ${safeUnreadCount} unread.`
            : "Open notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="case-budget-notification-center"
        onClick={handleToggle}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <BellIcon />

        {safeUnreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--surface-default)] bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {visibleUnreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={handleClose}
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] sm:hidden"
          />

          <div
            ref={panelRef}
            id="case-budget-notification-center"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:h-auto sm:max-h-[min(720px,calc(100vh-7rem))] sm:w-[420px] sm:rounded-2xl"
          >
            <NotificationHeader
              unreadCount={
                safeUnreadCount
              }
              onClose={handleClose}
              onMarkAllRead={
                onMarkAllRead
              }
            />

            <NotificationFilters
              activeFilter={
                activeFilter
              }
              notifications={
                notifications
              }
              onChange={
                setActiveFilter
              }
            />

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {hasNotifications ? (
                <div className="divide-y divide-[var(--border-subtle)]">
                  {filteredNotifications.map(
                    (
                      notification,
                    ) => (
                      <NotificationRow
                        key={
                          notification.id
                        }
                        notification={
                          notification
                        }
                        onOpen={() =>
                          handleOpenNotification(
                            notification,
                          )
                        }
                        onKeyDown={(
                          event,
                        ) =>
                          handleItemKeyDown(
                            event,
                            notification,
                          )
                        }
                        onMarkRead={(
                          event,
                        ) =>
                          handleMarkRead(
                            event,
                            notification,
                          )
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <NotificationEmptyState
                  activeFilter={
                    activeFilter
                  }
                />
              )}
            </div>

            <NotificationFooter
              totalCount={
                notifications.length
              }
              unreadCount={
                safeUnreadCount
              }
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

type NotificationHeaderProps = {
  unreadCount: number;
  onClose: () => void;
  onMarkAllRead: () => void;
};

function NotificationHeader({
  unreadCount,
  onClose,
  onMarkAllRead,
}: NotificationHeaderProps) {
  return (
    <header className="border-b border-[var(--border-subtle)] px-4 pb-4 pt-3 sm:px-5 sm:pt-5">
      <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--border-subtle)] sm:hidden" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
            <BellIcon />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Notifications
              </h2>

              {unreadCount > 0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Financial updates and
              items needing attention.
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close notifications"
          onClick={onClose}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <CloseIcon />
        </button>
      </div>

      {unreadCount > 0 ? (
        <button
          type="button"
          onClick={onMarkAllRead}
          className="mt-4 inline-flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm font-bold text-[var(--primary)] outline-none transition hover:bg-[var(--primary)]/10 focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        >
          <CheckCheckIcon />

          Mark all as read
        </button>
      ) : null}
    </header>
  );
}

type NotificationFiltersProps = {
  activeFilter: NotificationFilter;
  notifications: NotificationItem[];
  onChange: (
    filter: NotificationFilter,
  ) => void;
};

function NotificationFilters({
  activeFilter,
  notifications,
  onChange,
}: NotificationFiltersProps) {
  return (
    <div className="border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
      <div
        role="tablist"
        aria-label="Notification filters"
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {notificationFilters.map(
          (filter) => {
            const count =
              getFilterCount(
                filter.id,
                notifications,
              );

            const isActive =
              activeFilter ===
              filter.id;

            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={
                  isActive
                }
                onClick={() =>
                  onChange(
                    filter.id,
                  )
                }
                className={[
                  "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isActive
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                ].join(" ")}
              >
                {filter.label}

                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px]",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--surface-default)] text-[var(--text-muted)]",
                  ].join(" ")}
                >
                  {count > 99
                    ? "99+"
                    : count}
                </span>
              </button>
            );
          },
        )}
      </div>
    </div>
  );
}

type NotificationRowProps = {
  notification: NotificationItem;
  onOpen: () => void;
  onKeyDown: (
    event: KeyboardEvent<HTMLDivElement>,
  ) => void;
  onMarkRead: (
    event:
      | React.MouseEvent<HTMLButtonElement>
      | React.KeyboardEvent<HTMLButtonElement>,
  ) => void;
};

function NotificationRow({
  notification,
  onOpen,
  onKeyDown,
  onMarkRead,
}: NotificationRowProps) {
  const categoryLabel =
    getNotificationCategoryLabel(
      notification.category,
    );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Open notification: ${notification.title}`}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={[
        "group relative cursor-pointer px-4 py-4 outline-none transition sm:px-5",
        notification.read
          ? "bg-[var(--surface-default)] hover:bg-[var(--surface-muted)]"
          : "bg-[var(--primary)]/[0.045] hover:bg-[var(--primary)]/[0.075]",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--primary)]",
      ].join(" ")}
    >
      {!notification.read ? (
        <span
          aria-hidden="true"
          className="absolute left-1.5 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-[var(--primary)]"
        />
      ) : null}

      <div className="flex items-start gap-3">
        <NotificationIcon
          category={
            notification.category
          }
          priority={
            notification.priority
          }
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                    getCategoryBadgeClasses(
                      notification.category,
                    ),
                  ].join(" ")}
                >
                  {categoryLabel}
                </span>

                <PriorityBadge
                  priority={
                    notification.priority
                  }
                />
              </div>

              <h3
                className={[
                  "mt-2 text-sm leading-5 text-[var(--text-primary)]",
                  notification.read
                    ? "font-semibold"
                    : "font-bold",
                ].join(" ")}
              >
                {notification.title}
              </h3>
            </div>

            {!notification.read ? (
              <button
                type="button"
                aria-label={`Mark ${notification.title} as read`}
                onClick={onMarkRead}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] opacity-100 outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
              >
                <CheckIcon />
              </button>
            ) : null}
          </div>

          <p className="mt-1.5 text-sm leading-5 text-[var(--text-muted)]">
            {notification.message}
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <time
              dateTime={
                notification.createdAt
              }
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]"
            >
              <ClockIcon />

              {formatRelativeTime(
                notification.createdAt,
              )}
            </time>

            {notification.actionLabel ||
            notification.href ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
                {notification.actionLabel ??
                  "Open"}

                <ArrowRightIcon />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
                View

                <ArrowRightIcon />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type NotificationIconProps = {
  category: NotificationCategory;
  priority: NotificationPriority;
};

function NotificationIcon({
  category,
  priority,
}: NotificationIconProps) {
  return (
    <div
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        getPriorityIconClasses(
          priority,
        ),
      ].join(" ")}
    >
      {getCategoryIcon(
        category,
      )}
    </div>
  );
}

type PriorityBadgeProps = {
  priority: NotificationPriority;
};

function PriorityBadge({
  priority,
}: PriorityBadgeProps) {
  if (
    priority === "low"
  ) {
    return null;
  }

  return (
    <span
      className={[
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        getPriorityBadgeClasses(
          priority,
        ),
      ].join(" ")}
    >
      {priority}
    </span>
  );
}

type NotificationEmptyStateProps = {
  activeFilter: NotificationFilter;
};

function NotificationEmptyState({
  activeFilter,
}: NotificationEmptyStateProps) {
  const content =
    getEmptyStateContent(
      activeFilter,
    );

  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
        <CheckCircleIcon />
      </div>

      <h3 className="mt-4 text-base font-bold text-[var(--text-primary)]">
        {content.title}
      </h3>

      <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
        {content.description}
      </p>
    </div>
  );
}

type NotificationFooterProps = {
  totalCount: number;
  unreadCount: number;
};

function NotificationFooter({
  totalCount,
  unreadCount,
}: NotificationFooterProps) {
  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--surface-muted)]/50 px-4 py-3 sm:px-5">
      <div className="flex items-center justify-between gap-4 text-xs font-medium text-[var(--text-muted)]">
        <span>
          {formatNotificationCount(
            totalCount,
          )}
        </span>

        <span>
          {unreadCount > 0
            ? `${unreadCount} unread`
            : "All caught up"}
        </span>
      </div>
    </footer>
  );
}

function getFilterCount(
  filter: NotificationFilter,
  notifications: NotificationItem[],
) {
  switch (filter) {
    case "all":
      return notifications.length;

    case "unread":
      return notifications.filter(
        (notification) =>
          !notification.read,
      ).length;

    case "bill":
    case "budget":
    case "account":
    case "saving":
      return notifications.filter(
        (notification) =>
          notification.category ===
          filter,
      ).length;

    default:
      return notifications.length;
  }
}

function getNotificationCategoryLabel(
  category: NotificationCategory,
) {
  switch (category) {
    case "bill":
      return "Bill";

    case "budget":
      return "Budget";

    case "transaction":
      return "Transaction";

    case "saving":
      return "Savings";

    case "debt":
      return "Debt";

    case "account":
      return "Account";

    default:
      return "Alert";
  }
}

function getCategoryBadgeClasses(
  category: NotificationCategory,
) {
  switch (category) {
    case "bill":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";

    case "budget":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";

    case "transaction":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";

    case "saving":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    case "debt":
      return "bg-red-500/10 text-red-700 dark:text-red-300";

    case "account":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";

    default:
      return "bg-[var(--surface-muted)] text-[var(--text-muted)]";
  }
}

function getPriorityIconClasses(
  priority: NotificationPriority,
) {
  switch (priority) {
    case "critical":
      return "bg-red-500/10 text-red-600 dark:text-red-400";

    case "high":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";

    case "medium":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";

    case "low":
    default:
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
  }
}

function getPriorityBadgeClasses(
  priority: NotificationPriority,
) {
  switch (priority) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";

    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

    case "low":
    default:
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";
  }
}

function getCategoryIcon(
  category: NotificationCategory,
): ReactNode {
  switch (category) {
    case "bill":
      return <ReceiptIcon />;

    case "budget":
      return <BudgetIcon />;

    case "transaction":
      return <TransactionIcon />;

    case "saving":
      return <SavingsIcon />;

    case "debt":
      return <DebtIcon />;

    case "account":
      return <AccountIcon />;

    default:
      return <BellIcon />;
  }
}

function getEmptyStateContent(
  filter: NotificationFilter,
) {
  switch (filter) {
    case "unread":
      return {
        title: "No unread notifications",
        description:
          "You have reviewed every notification. New updates will appear here.",
      };

    case "bill":
      return {
        title: "No bill alerts",
        description:
          "There are no bill reminders or payment updates to show.",
      };

    case "budget":
      return {
        title: "No budget alerts",
        description:
          "Your budget has no alerts requiring attention right now.",
      };

    case "account":
      return {
        title: "No account alerts",
        description:
          "Your connected accounts have no sync or connection issues.",
      };

    case "saving":
      return {
        title: "No savings updates",
        description:
          "Savings milestones and goal updates will appear here.",
      };

    case "all":
    default:
      return {
        title: "You are all caught up",
        description:
          "There are no financial notifications requiring your attention.",
      };
  }
}

function formatNotificationCount(
  count: number,
) {
  if (count === 1) {
    return "1 notification";
  }

  return `${count} notifications`;
}

function formatRelativeTime(
  value: string,
) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  const now = new Date();
  const differenceInMilliseconds =
    now.getTime() -
    date.getTime();

  const absoluteDifference =
    Math.abs(
      differenceInMilliseconds,
    );

  const minutes = Math.floor(
    absoluteDifference /
      (1000 * 60),
  );

  const hours = Math.floor(
    absoluteDifference /
      (1000 * 60 * 60),
  );

  const days = Math.floor(
    absoluteDifference /
      (1000 * 60 * 60 * 24),
  );

  const isFuture =
    differenceInMilliseconds < 0;

  if (minutes < 1) {
    return isFuture
      ? "In a moment"
      : "Just now";
  }

  if (minutes < 60) {
    return isFuture
      ? `In ${minutes} ${
          minutes === 1
            ? "minute"
            : "minutes"
        }`
      : `${minutes} ${
          minutes === 1
            ? "minute"
            : "minutes"
        } ago`;
  }

  if (hours < 24) {
    return isFuture
      ? `In ${hours} ${
          hours === 1
            ? "hour"
            : "hours"
        }`
      : `${hours} ${
          hours === 1
            ? "hour"
            : "hours"
        } ago`;
  }

  if (days < 7) {
    return isFuture
      ? `In ${days} ${
          days === 1
            ? "day"
            : "days"
        }`
      : `${days} ${
          days === 1
            ? "day"
            : "days"
        } ago`;
  }

  return date.toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year:
        date.getFullYear() ===
        now.getFullYear()
          ? undefined
          : "numeric",
    },
  );
}

function BellIcon() {
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
      <path d="M10.3 21a2 2 0 0 0 3.4 0" />
      <path d="M4 17h16" />
      <path d="M6 17V10a6 6 0 0 1 12 0v7" />
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function CheckCheckIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 12 4 4L17 6" />
      <path d="m11 16 2 2L21 8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="16"
      height="16"
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

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function ArrowRightIcon() {
  return (
    <svg
      width="14"
      height="14"
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

function CheckCircleIcon() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <path d="m9 11 3 3L22 4" />
    </svg>
  );
}

function ReceiptIcon() {
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
      <path d="M9 13h6" />
    </svg>
  );
}

function BudgetIcon() {
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
        width="18"
        height="14"
        x="3"
        y="5"
        rx="2"
      />
      <path d="M3 10h18" />
      <path d="M7 15h2" />
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
      <path d="m17 3 4 4-4 4" />
      <path d="M3 7h18" />
      <path d="m7 21-4-4 4-4" />
      <path d="M21 17H3" />
    </svg>
  );
}

function SavingsIcon() {
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
      <path d="M19 5c-1.5 0-2.8.8-3.5 2H9a5 5 0 0 0 0 10h1v3h4v-3h2l3 2v-5.5a4.5 4.5 0 0 0 0-8.5Z" />
      <path d="M6 11h.01" />
      <path d="M14 10h2" />
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
      <circle
        cx="12"
        cy="12"
        r="9"
      />
      <path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" />
      <path d="M12 6v2" />
      <path d="M12 16v2" />
    </svg>
  );
}

function AccountIcon() {
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
      <path d="m3 10 9-7 9 7" />
      <path d="M5 10v9" />
      <path d="M9 10v9" />
      <path d="M15 10v9" />
      <path d="M19 10v9" />
      <path d="M3 21h18" />
    </svg>
  );
}