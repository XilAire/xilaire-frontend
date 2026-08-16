"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  useRouter,
} from "next/navigation";

export type NotificationCategory =
  | "budget"
  | "transactions"
  | "bills"
  | "goals"
  | "debts"
  | "accounts"
  | "workspace"
  | "security"
  | "system";

export type NotificationPriority =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type NotificationItem = {
  id:
    string;

  notificationKey:
    string;

  workspaceId:
    string;

  userId:
    string;

  category:
    NotificationCategory;

  priority:
    NotificationPriority;

  title:
    string;

  message:
    string;

  createdAt:
    string;

  persistedAt:
    string;

  updatedAt:
    string;

  read:
    boolean;

  readAt:
    string | null;

  dismissed:
    boolean;

  dismissedAt:
    string | null;

  expiresAt:
    string | null;

  actionLabel:
    string | null;

  href:
    string | null;

  sourceType:
    string | null;

  sourceId:
    string | null;

  metadata:
    unknown;
};

export type NotificationCenterProps = {
  className?:
    string;

  /**
   * Optional hook used by AppShell/AppProvider while the rest of the layout
   * is migrated to the persistent notification API.
   */
  onUnreadCountChange?:
    (
      unreadCount:
        number,
    ) => void;

  /**
   * Optional callback fired immediately before a notification deep-link is
   * opened.
   */
  onOpen?:
    (
      notification:
        NotificationItem,
    ) => void;
};

type NotificationFilter =
  | "all"
  | "unread"
  | "bills"
  | "budget"
  | "transactions"
  | "goals"
  | "debts"
  | "accounts"
  | "workspace"
  | "security";

type NotificationFilterOption = {
  id:
    NotificationFilter;

  label:
    string;
};

type NotificationListResponse = {
  success:
    boolean;

  data:
    | {
        notifications:
          NotificationItem[];

        unreadCount:
          number;
      }
    | null;

  error:
    | {
        code:
          string;

        message:
          string;
      }
    | null;
};

type NotificationStateResponse = {
  success:
    boolean;

  data:
    | {
        notification:
          NotificationItem;

        unreadCount:
          number;
      }
    | null;

  error:
    | {
        code:
          string;

        message:
          string;
      }
    | null;
};

type NotificationMarkAllReadResponse = {
  success:
    boolean;

  data:
    | {
        updatedCount:
          number;

        unreadCount:
          number;
      }
    | null;

  error:
    | {
        code:
          string;

        message:
          string;
      }
    | null;
};

type NotificationMutationAction =
  | "mark-read"
  | "mark-unread"
  | "dismiss"
  | "restore";

const notificationFilters:
  NotificationFilterOption[] = [
    {
      id:
        "all",

      label:
        "All",
    },
    {
      id:
        "unread",

      label:
        "Unread",
    },
    {
      id:
        "bills",

      label:
        "Bills",
    },
    {
      id:
        "budget",

      label:
        "Budget",
    },
    {
      id:
        "transactions",

      label:
        "Transactions",
    },
    {
      id:
        "goals",

      label:
        "Goals",
    },
    {
      id:
        "debts",

      label:
        "Debts",
    },
    {
      id:
        "accounts",

      label:
        "Accounts",
    },
    {
      id:
        "workspace",

      label:
        "Workspace",
    },
    {
      id:
        "security",

      label:
        "Security",
    },
  ];

const NOTIFICATIONS_API_PATH =
  "/api/notifications";

const NOTIFICATION_LIMIT =
  100;

export default function NotificationCenter({
  className,
  onUnreadCountChange,
  onOpen,
}: NotificationCenterProps) {
  const router =
    useRouter();

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      NotificationItem[]
    >(
      [],
    );

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(
      0,
    );

  const [
    activeFilter,
    setActiveFilter,
  ] =
    useState<
      NotificationFilter
    >(
      "all",
    );

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false,
    );

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(
      false,
    );

  const [
    isRefreshing,
    setIsRefreshing,
  ] =
    useState(
      false,
    );

  const [
    isMarkingAllRead,
    setIsMarkingAllRead,
  ] =
    useState(
      false,
    );

  const [
    pendingNotificationIds,
    setPendingNotificationIds,
  ] =
    useState<
      Set<string>
    >(
      () =>
        new Set(),
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const [
    hasLoaded,
    setHasLoaded,
  ] =
    useState(
      false,
    );

  const panelRef =
    useRef<
      HTMLDivElement | null
    >(
      null,
    );

  const triggerRef =
    useRef<
      HTMLButtonElement | null
    >(
      null,
    );

  const mountedRef =
    useRef(
      true,
    );

  const loadRequestRef =
    useRef<
      AbortController | null
    >(
      null,
    );

  const filteredNotifications =
    useMemo(
      () => {
        const sortedNotifications =
          [
            ...notifications,
          ].sort(
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
          activeFilter ===
          "all"
        ) {
          return sortedNotifications;
        }

        if (
          activeFilter ===
          "unread"
        ) {
          return sortedNotifications.filter(
            (
              notification,
            ) =>
              !notification.read,
          );
        }

        return sortedNotifications.filter(
          (
            notification,
          ) =>
            notification.category ===
            activeFilter,
        );
      },
      [
        activeFilter,
        notifications,
      ],
    );

  const safeUnreadCount =
    Math.max(
      0,
      unreadCount,
    );

  const visibleUnreadCount =
    safeUnreadCount >
      99
      ? "99+"
      : String(
          safeUnreadCount,
        );

  const hasNotifications =
    filteredNotifications.length >
    0;

  const setUnreadCountSafely =
    useCallback(
      (
        value:
          number,
      ) => {
        const normalizedValue =
          Math.max(
            0,
            value,
          );

        setUnreadCount(
          normalizedValue,
        );

        onUnreadCountChange?.(
          normalizedValue,
        );
      },
      [
        onUnreadCountChange,
      ],
    );

  const loadNotifications =
    useCallback(
      async ({
        refresh = false,
      }: {
        refresh?:
          boolean;
      } = {}) => {
        loadRequestRef.current?.abort();

        const controller =
          new AbortController();

        loadRequestRef.current =
          controller;

        if (
          refresh
        ) {
          setIsRefreshing(
            true,
          );
        } else if (
          !hasLoaded
        ) {
          setIsLoading(
            true,
          );
        }

        setErrorMessage(
          null,
        );

        try {
          const response =
            await fetch(
              `${NOTIFICATIONS_API_PATH}?limit=${NOTIFICATION_LIMIT}`,
              {
                method:
                  "GET",

                credentials:
                  "include",

                cache:
                  "no-store",

                headers: {
                  Accept:
                    "application/json",
                },

                signal:
                  controller.signal,
              },
            );

          const payload =
            await readJsonResponse<
              NotificationListResponse
            >(
              response,
            );

          if (
            !response.ok ||
            !payload?.success ||
            !payload.data
          ) {
            throw new Error(
              getApiErrorMessage(
                payload,
                "CASE Budget could not load notifications.",
              ),
            );
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setNotifications(
            normalizeNotificationCollection(
              payload.data.notifications,
            ),
          );

          setUnreadCountSafely(
            payload.data.unreadCount,
          );

          setHasLoaded(
            true,
          );
        } catch (
          error
        ) {
          if (
            isAbortError(
              error,
            )
          ) {
            return;
          }

          if (
            !mountedRef.current
          ) {
            return;
          }

          setErrorMessage(
            readUnknownErrorMessage(
              error,
              "CASE Budget could not load notifications.",
            ),
          );
        } finally {
          if (
            mountedRef.current
          ) {
            setIsLoading(
              false,
            );

            setIsRefreshing(
              false,
            );
          }

          if (
            loadRequestRef.current ===
            controller
          ) {
            loadRequestRef.current =
              null;
          }
        }
      },
      [
        hasLoaded,
        setUnreadCountSafely,
      ],
    );

  useEffect(
    () => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;

        loadRequestRef.current?.abort();
      };
    },
    [],
  );

  /**
   * Load once when the component mounts so the bell badge is authoritative
   * even before the user opens the notification center.
   */
  useEffect(
    () => {
      void loadNotifications();
    },
    [
      loadNotifications,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      function handlePointerDown(
        event:
          globalThis.MouseEvent,
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

        setIsOpen(
          false,
        );
      }

      function handleEscape(
        event:
          globalThis.KeyboardEvent,
      ) {
        if (
          event.key !==
          "Escape"
        ) {
          return;
        }

        setIsOpen(
          false,
        );

        window.setTimeout(
          () => {
            triggerRef.current?.focus();
          },
          0,
        );
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
    },
    [
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        document.body.style.overflow =
          "";

        return;
      }

      const mediaQuery =
        window.matchMedia(
          "(max-width: 639px)",
        );

      if (
        mediaQuery.matches
      ) {
        document.body.style.overflow =
          "hidden";
      }

      return () => {
        document.body.style.overflow =
          "";
      };
    },
    [
      isOpen,
    ],
  );

  function handleToggle() {
    setIsOpen(
      (
        currentValue,
      ) =>
        !currentValue,
    );

    if (
      !isOpen &&
      hasLoaded
    ) {
      void loadNotifications({
        refresh:
          true,
      });
    }
  }

  function handleClose() {
    setIsOpen(
      false,
    );

    window.setTimeout(
      () => {
        triggerRef.current?.focus();
      },
      0,
    );
  }

  async function mutateNotification({
    notification,
    action,
  }: {
    notification:
      NotificationItem;

    action:
      NotificationMutationAction;
  }) {
    if (
      pendingNotificationIds.has(
        notification.id,
      )
    ) {
      return null;
    }

    addPendingNotificationId(
      notification.id,
    );

    setErrorMessage(
      null,
    );

    try {
      const response =
        await fetch(
          NOTIFICATIONS_API_PATH,
          {
            method:
              "PATCH",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json",

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                notificationId:
                  notification.id,

                action,
              }),
          },
        );

      const payload =
        await readJsonResponse<
          NotificationStateResponse
        >(
          response,
        );

      if (
        !response.ok ||
        !payload?.success ||
        !payload.data
      ) {
        throw new Error(
          getApiErrorMessage(
            payload,
            "CASE Budget could not update this notification.",
          ),
        );
      }

      if (
        !mountedRef.current
      ) {
        return payload.data.notification;
      }

      const updatedNotification =
        normalizeNotificationItem(
          payload.data.notification,
        );

      if (
        updatedNotification.dismissed
      ) {
        setNotifications(
          (
            currentNotifications,
          ) =>
            currentNotifications.filter(
              (
                currentNotification,
              ) =>
                currentNotification.id !==
                updatedNotification.id,
            ),
        );
      } else {
        setNotifications(
          (
            currentNotifications,
          ) =>
            currentNotifications.map(
              (
                currentNotification,
              ) =>
                currentNotification.id ===
                updatedNotification.id
                  ? updatedNotification
                  : currentNotification,
            ),
        );
      }

      setUnreadCountSafely(
        payload.data.unreadCount,
      );

      return updatedNotification;
    } catch (
      error
    ) {
      if (
        mountedRef.current
      ) {
        setErrorMessage(
          readUnknownErrorMessage(
            error,
            "CASE Budget could not update this notification.",
          ),
        );
      }

      return null;
    } finally {
      removePendingNotificationId(
        notification.id,
      );
    }
  }

  async function handleOpenNotification(
    notification:
      NotificationItem,
  ) {
    let resolvedNotification =
      notification;

    if (
      !notification.read
    ) {
      const updatedNotification =
        await mutateNotification({
          notification,

          action:
            "mark-read",
        });

      if (
        updatedNotification
      ) {
        resolvedNotification =
          updatedNotification;
      }
    }

    onOpen?.(
      resolvedNotification,
    );

    setIsOpen(
      false,
    );

    if (
      resolvedNotification.href
    ) {
      router.push(
        resolvedNotification.href,
      );
    }
  }

  async function handleMarkRead(
    event:
      MouseEvent<HTMLButtonElement>,
    notification:
      NotificationItem,
  ) {
    event.stopPropagation();

    if (
      notification.read
    ) {
      return;
    }

    await mutateNotification({
      notification,

      action:
        "mark-read",
    });
  }

  async function handleToggleRead(
    event:
      MouseEvent<HTMLButtonElement>,
    notification:
      NotificationItem,
  ) {
    event.stopPropagation();

    await mutateNotification({
      notification,

      action:
        notification.read
          ? "mark-unread"
          : "mark-read",
    });
  }

  async function handleDismiss(
    event:
      MouseEvent<HTMLButtonElement>,
    notification:
      NotificationItem,
  ) {
    event.stopPropagation();

    await mutateNotification({
      notification,

      action:
        "dismiss",
    });
  }

  async function handleMarkAllRead() {
    if (
      isMarkingAllRead ||
      safeUnreadCount ===
        0
    ) {
      return;
    }

    setIsMarkingAllRead(
      true,
    );

    setErrorMessage(
      null,
    );

    try {
      const response =
        await fetch(
          NOTIFICATIONS_API_PATH,
          {
            method:
              "POST",

            credentials:
              "include",

            cache:
              "no-store",

            headers: {
              Accept:
                "application/json",
            },
          },
        );

      const payload =
        await readJsonResponse<
          NotificationMarkAllReadResponse
        >(
          response,
        );

      if (
        !response.ok ||
        !payload?.success ||
        !payload.data
      ) {
        throw new Error(
          getApiErrorMessage(
            payload,
            "CASE Budget could not mark notifications as read.",
          ),
        );
      }

      if (
        !mountedRef.current
      ) {
        return;
      }

      const readAt =
        new Date().toISOString();

      setNotifications(
        (
          currentNotifications,
        ) =>
          currentNotifications.map(
            (
              notification,
            ) =>
              notification.read
                ? notification
                : {
                    ...notification,

                    read:
                      true,

                    readAt,
                  },
          ),
      );

      setUnreadCountSafely(
        payload.data.unreadCount,
      );
    } catch (
      error
    ) {
      if (
        mountedRef.current
      ) {
        setErrorMessage(
          readUnknownErrorMessage(
            error,
            "CASE Budget could not mark notifications as read.",
          ),
        );
      }
    } finally {
      if (
        mountedRef.current
      ) {
        setIsMarkingAllRead(
          false,
        );
      }
    }
  }

  function handleItemKeyDown(
    event:
      KeyboardEvent<HTMLDivElement>,
    notification:
      NotificationItem,
  ) {
    if (
      event.key !==
        "Enter" &&
      event.key !==
        " "
    ) {
      return;
    }

    event.preventDefault();

    void handleOpenNotification(
      notification,
    );
  }

  function addPendingNotificationId(
    notificationId:
      string,
  ) {
    setPendingNotificationIds(
      (
        currentIds,
      ) => {
        const nextIds =
          new Set(
            currentIds,
          );

        nextIds.add(
          notificationId,
        );

        return nextIds;
      },
    );
  }

  function removePendingNotificationId(
    notificationId:
      string,
  ) {
    if (
      !mountedRef.current
    ) {
      return;
    }

    setPendingNotificationIds(
      (
        currentIds,
      ) => {
        const nextIds =
          new Set(
            currentIds,
          );

        nextIds.delete(
          notificationId,
        );

        return nextIds;
      },
    );
  }

  return (
    <div
      className={[
        "relative",
        className ??
          "",
      ].join(
        " ",
      )}
    >
      <button
        ref={
          triggerRef
        }
        type="button"
        aria-label={
          safeUnreadCount >
          0
            ? `Open notifications. ${safeUnreadCount} unread.`
            : "Open notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={
          isOpen
        }
        aria-controls="case-budget-notification-center"
        onClick={
          handleToggle
        }
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <BellIcon />

        {safeUnreadCount >
        0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[var(--surface-default)] bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {
              visibleUnreadCount
            }
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={
              handleClose
            }
            className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] sm:hidden"
          />

          <div
            ref={
              panelRef
            }
            id="case-budget-notification-center"
            role="dialog"
            aria-modal="true"
            aria-label="Notifications"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col overflow-hidden rounded-t-3xl border border-[var(--border-subtle)] bg-[var(--surface-default)] shadow-2xl sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+0.75rem)] sm:h-auto sm:max-h-[min(720px,calc(100vh-7rem))] sm:w-[430px] sm:rounded-2xl"
          >
            <NotificationHeader
              unreadCount={
                safeUnreadCount
              }
              isRefreshing={
                isRefreshing
              }
              isMarkingAllRead={
                isMarkingAllRead
              }
              onClose={
                handleClose
              }
              onRefresh={() =>
                void loadNotifications({
                  refresh:
                    true,
                })
              }
              onMarkAllRead={() =>
                void handleMarkAllRead()
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

            {errorMessage ? (
              <div
                role="alert"
                className="border-b border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:text-red-300 sm:px-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span>
                    {
                      errorMessage
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      void loadNotifications({
                        refresh:
                          true,
                      })
                    }
                    className="shrink-0 font-semibold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isLoading &&
              !hasLoaded ? (
                <NotificationLoadingState />
              ) : hasNotifications ? (
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
                        isPending={
                          pendingNotificationIds.has(
                            notification.id,
                          )
                        }
                        onOpen={() =>
                          void handleOpenNotification(
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
                          void handleMarkRead(
                            event,
                            notification,
                          )
                        }
                        onToggleRead={(
                          event,
                        ) =>
                          void handleToggleRead(
                            event,
                            notification,
                          )
                        }
                        onDismiss={(
                          event,
                        ) =>
                          void handleDismiss(
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
  unreadCount:
    number;

  isRefreshing:
    boolean;

  isMarkingAllRead:
    boolean;

  onClose:
    () => void;

  onRefresh:
    () => void;

  onMarkAllRead:
    () => void;
};

function NotificationHeader({
  unreadCount,
  isRefreshing,
  isMarkingAllRead,
  onClose,
  onRefresh,
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

              {unreadCount >
              0 ? (
                <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-white">
                  {unreadCount >
                  99
                    ? "99+"
                    : unreadCount}
                </span>
              ) : null}
            </div>

            <p className="mt-0.5 text-sm text-[var(--text-muted)]">
              Financial
              updates and
              items needing
              attention.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Refresh notifications"
            title="Refresh notifications"
            disabled={
              isRefreshing
            }
            onClick={
              onRefresh
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshIcon
              spinning={
                isRefreshing
              }
            />
          </button>

          <button
            type="button"
            aria-label="Close notifications"
            onClick={
              onClose
            }
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {unreadCount >
      0 ? (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={
              isMarkingAllRead
            }
            onClick={
              onMarkAllRead
            }
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--primary)] outline-none transition hover:bg-[var(--primary)]/10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckIcon />

            {isMarkingAllRead
              ? "Marking read..."
              : "Mark all as read"}
          </button>
        </div>
      ) : null}
    </header>
  );
}

type NotificationFiltersProps = {
  activeFilter:
    NotificationFilter;

  notifications:
    NotificationItem[];

  onChange:
    (
      filter:
        NotificationFilter,
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
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {notificationFilters.map(
          (
            filter,
          ) => {
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
                key={
                  filter.id
                }
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
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                  isActive
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--border-subtle)] bg-[var(--surface-default)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                ].join(
                  " ",
                )}
              >
                {
                  filter.label
                }

                <span
                  className={[
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[var(--surface-muted)] text-[var(--text-muted)]",
                  ].join(
                    " ",
                  )}
                >
                  {
                    count
                  }
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
  notification:
    NotificationItem;

  isPending:
    boolean;

  onOpen:
    () => void;

  onKeyDown:
    (
      event:
        KeyboardEvent<HTMLDivElement>,
    ) => void;

  onMarkRead:
    (
      event:
        MouseEvent<HTMLButtonElement>,
    ) => void;

  onToggleRead:
    (
      event:
        MouseEvent<HTMLButtonElement>,
    ) => void;

  onDismiss:
    (
      event:
        MouseEvent<HTMLButtonElement>,
    ) => void;
};

function NotificationRow({
  notification,
  isPending,
  onOpen,
  onKeyDown,
  onMarkRead,
  onToggleRead,
  onDismiss,
}: NotificationRowProps) {
  const relativeTime =
    formatRelativeTime(
      notification.createdAt,
    );

  const categoryLabel =
    getNotificationCategoryLabel(
      notification.category,
    );

  return (
    <div
      role="button"
      tabIndex={
        0
      }
      aria-label={`${notification.title}. ${notification.message}`}
      onClick={
        onOpen
      }
      onKeyDown={
        onKeyDown
      }
      className={[
        "group relative cursor-pointer px-4 py-4 outline-none transition sm:px-5",
        notification.read
          ? "bg-[var(--surface-default)] hover:bg-[var(--surface-muted)]/65"
          : "bg-[var(--primary)]/[0.035] hover:bg-[var(--primary)]/[0.07]",
        isPending
          ? "pointer-events-none opacity-65"
          : "",
      ].join(
        " ",
      )}
    >
      {!notification.read ? (
        <span
          aria-hidden="true"
          className="absolute left-1.5 top-6 h-2 w-2 rounded-full bg-[var(--primary)]"
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
                  ].join(
                    " ",
                  )}
                >
                  {
                    categoryLabel
                  }
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
                ].join(
                  " ",
                )}
              >
                {
                  notification.title
                }
              </h3>
            </div>

            <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-[var(--text-muted)]">
              {
                relativeTime
              }
            </span>
          </div>

          <p className="mt-1.5 text-sm leading-5 text-[var(--text-muted)]">
            {
              notification.message
            }
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {!notification.read ? (
                <button
                  type="button"
                  disabled={
                    isPending
                  }
                  onClick={
                    onMarkRead
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[var(--primary)] outline-none transition hover:bg-[var(--primary)]/10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckIcon />
                  Mark read
                </button>
              ) : null}

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  onToggleRead
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {notification.read
                  ? "Mark unread"
                  : "Keep unread"}
              </button>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  onDismiss
                }
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[var(--text-muted)] outline-none transition hover:bg-red-500/10 hover:text-red-600 focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:text-red-400"
              >
                <DismissIcon />
                Dismiss
              </button>
            </div>

            {notification.href ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)]">
                {notification.actionLabel ??
                  "View details"}

                <ArrowRightIcon />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationLoadingState() {
  return (
    <div className="space-y-0 divide-y divide-[var(--border-subtle)]">
      {[
        1,
        2,
        3,
      ].map(
        (
          item,
        ) => (
          <div
            key={
              item
            }
            className="animate-pulse px-4 py-5 sm:px-5"
          >
            <div className="flex gap-3">
              <div className="h-10 w-10 shrink-0 rounded-xl bg-[var(--surface-muted)]" />

              <div className="min-w-0 flex-1">
                <div className="h-3 w-20 rounded bg-[var(--surface-muted)]" />

                <div className="mt-3 h-4 w-3/4 rounded bg-[var(--surface-muted)]" />

                <div className="mt-2 h-3 w-full rounded bg-[var(--surface-muted)]" />

                <div className="mt-2 h-3 w-2/3 rounded bg-[var(--surface-muted)]" />
              </div>
            </div>
          </div>
        ),
      )}
    </div>
  );
}

type NotificationEmptyStateProps = {
  activeFilter:
    NotificationFilter;
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
        {
          content.title
        }
      </h3>

      <p className="mt-2 max-w-xs text-sm leading-6 text-[var(--text-muted)]">
        {
          content.description
        }
      </p>
    </div>
  );
}

type NotificationFooterProps = {
  totalCount:
    number;

  unreadCount:
    number;
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
          {unreadCount >
          0
            ? `${unreadCount} unread`
            : "All caught up"}
        </span>
      </div>
    </footer>
  );
}

function NotificationIcon({
  category,
  priority,
}: {
  category:
    NotificationCategory;

  priority:
    NotificationPriority;
}) {
  return (
    <div
      className={[
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        getPriorityIconClasses(
          priority,
        ),
      ].join(
        " ",
      )}
    >
      {getCategoryIcon(
        category,
      )}
    </div>
  );
}

function PriorityBadge({
  priority,
}: {
  priority:
    NotificationPriority;
}) {
  if (
    priority ===
    "low"
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
      ].join(
        " ",
      )}
    >
      {
        priority
      }
    </span>
  );
}

function getFilterCount(
  filter:
    NotificationFilter,
  notifications:
    NotificationItem[],
) {
  switch (
    filter
  ) {
    case "all":
      return notifications.length;

    case "unread":
      return notifications.filter(
        (
          notification,
        ) =>
          !notification.read,
      ).length;

    case "bills":
    case "budget":
    case "transactions":
    case "goals":
    case "debts":
    case "accounts":
    case "workspace":
    case "security":
      return notifications.filter(
        (
          notification,
        ) =>
          notification.category ===
          filter,
      ).length;

    default:
      return notifications.length;
  }
}

function getNotificationCategoryLabel(
  category:
    NotificationCategory,
) {
  switch (
    category
  ) {
    case "bills":
      return "Bill";

    case "budget":
      return "Budget";

    case "transactions":
      return "Transaction";

    case "goals":
      return "Goal";

    case "debts":
      return "Debt";

    case "accounts":
      return "Account";

    case "workspace":
      return "Workspace";

    case "security":
      return "Security";

    case "system":
      return "System";

    default:
      return assertNever(
        category,
      );
  }
}

function getCategoryBadgeClasses(
  category:
    NotificationCategory,
) {
  switch (
    category
  ) {
    case "bills":
      return "bg-orange-500/10 text-orange-700 dark:text-orange-300";

    case "budget":
      return "bg-blue-500/10 text-blue-700 dark:text-blue-300";

    case "transactions":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";

    case "goals":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

    case "debts":
      return "bg-red-500/10 text-red-700 dark:text-red-300";

    case "accounts":
      return "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300";

    case "workspace":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300";

    case "security":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";

    case "system":
      return "bg-slate-500/10 text-slate-700 dark:text-slate-300";

    default:
      return assertNever(
        category,
      );
  }
}

function getPriorityIconClasses(
  priority:
    NotificationPriority,
) {
  switch (
    priority
  ) {
    case "critical":
      return "bg-red-500/10 text-red-600 dark:text-red-400";

    case "high":
      return "bg-orange-500/10 text-orange-600 dark:text-orange-400";

    case "medium":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400";

    case "low":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400";

    default:
      return assertNever(
        priority,
      );
  }
}

function getPriorityBadgeClasses(
  priority:
    NotificationPriority,
) {
  switch (
    priority
  ) {
    case "critical":
      return "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300";

    case "high":
      return "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300";

    case "medium":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";

    case "low":
      return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300";

    default:
      return assertNever(
        priority,
      );
  }
}

function getCategoryIcon(
  category:
    NotificationCategory,
): ReactNode {
  switch (
    category
  ) {
    case "bills":
      return <ReceiptIcon />;

    case "budget":
      return <BudgetIcon />;

    case "transactions":
      return <TransactionIcon />;

    case "goals":
      return <SavingsIcon />;

    case "debts":
      return <DebtIcon />;

    case "accounts":
      return <AccountIcon />;

    case "workspace":
      return <WorkspaceIcon />;

    case "security":
      return <SecurityIcon />;

    case "system":
      return <BellIcon />;

    default:
      return assertNever(
        category,
      );
  }
}

function getEmptyStateContent(
  filter:
    NotificationFilter,
) {
  switch (
    filter
  ) {
    case "unread":
      return {
        title:
          "No unread notifications",

        description:
          "You have reviewed every notification. New updates will appear here.",
      };

    case "bills":
      return {
        title:
          "No bill alerts",

        description:
          "There are no bill reminders or payment updates to show.",
      };

    case "budget":
      return {
        title:
          "No budget alerts",

        description:
          "Your budget has no alerts requiring attention right now.",
      };

    case "transactions":
      return {
        title:
          "No transaction alerts",

        description:
          "There are no transaction alerts requiring your attention.",
      };

    case "goals":
      return {
        title:
          "No goal updates",

        description:
          "Savings goal milestones and updates will appear here.",
      };

    case "debts":
      return {
        title:
          "No debt updates",

        description:
          "Debt payoff milestones and payment alerts will appear here.",
      };

    case "accounts":
      return {
        title:
          "No account alerts",

        description:
          "Your connected accounts have no sync or connection issues.",
      };

    case "workspace":
      return {
        title:
          "No workspace updates",

        description:
          "Workspace membership and collaboration updates will appear here.",
      };

    case "security":
      return {
        title:
          "No security alerts",

        description:
          "There are no account security alerts requiring attention.",
      };

    case "all":
    default:
      return {
        title:
          "You are all caught up",

        description:
          "There are no financial notifications requiring your attention.",
      };
  }
}

function normalizeNotificationCollection(
  value:
    unknown,
): NotificationItem[] {
  if (
    !Array.isArray(
      value,
    )
  ) {
    return [];
  }

  return value
    .map(
      (
        item,
      ) =>
        normalizeNotificationItem(
          item,
        ),
    )
    .filter(
      (
        item,
      ): item is NotificationItem =>
        Boolean(
          item.id,
        ),
    );
}

function normalizeNotificationItem(
  value:
    unknown,
): NotificationItem {
  const record =
    isRecord(
      value,
    )
      ? value
      : {};

  const category =
    normalizeNotificationCategory(
      record.category,
    );

  const priority =
    normalizeNotificationPriority(
      record.priority,
    );

  const createdAt =
    normalizeTimestamp(
      record.createdAt,
    );

  const persistedAt =
    normalizeTimestamp(
      record.persistedAt,
      createdAt,
    );

  const updatedAt =
    normalizeTimestamp(
      record.updatedAt,
      persistedAt,
    );

  return {
    id:
      readString(
        record.id,
      ),

    notificationKey:
      readString(
        record.notificationKey,
      ),

    workspaceId:
      readString(
        record.workspaceId,
      ),

    userId:
      readString(
        record.userId,
      ),

    category,

    priority,

    title:
      readString(
        record.title,
      ),

    message:
      readString(
        record.message,
      ),

    createdAt,

    persistedAt,

    updatedAt,

    read:
      record.read ===
      true,

    readAt:
      readNullableString(
        record.readAt,
      ),

    dismissed:
      record.dismissed ===
      true,

    dismissedAt:
      readNullableString(
        record.dismissedAt,
      ),

    expiresAt:
      readNullableString(
        record.expiresAt,
      ),

    actionLabel:
      readNullableString(
        record.actionLabel,
      ),

    href:
      readNullableString(
        record.href,
      ),

    sourceType:
      readNullableString(
        record.sourceType,
      ),

    sourceId:
      readNullableString(
        record.sourceId,
      ),

    metadata:
      record.metadata ??
      {},
  };
}

function normalizeNotificationCategory(
  value:
    unknown,
): NotificationCategory {
  switch (
    value
  ) {
    case "budget":
    case "transactions":
    case "bills":
    case "goals":
    case "debts":
    case "accounts":
    case "workspace":
    case "security":
    case "system":
      return value;

    default:
      return "system";
  }
}

function normalizeNotificationPriority(
  value:
    unknown,
): NotificationPriority {
  switch (
    value
  ) {
    case "low":
    case "medium":
    case "high":
    case "critical":
      return value;

    default:
      return "medium";
  }
}

function normalizeTimestamp(
  value:
    unknown,
  fallback =
    new Date().toISOString(),
) {
  if (
    typeof value !==
    "string"
  ) {
    return fallback;
  }

  const timestamp =
    Date.parse(
      value,
    );

  if (
    Number.isNaN(
      timestamp,
    )
  ) {
    return fallback;
  }

  return new Date(
    timestamp,
  ).toISOString();
}

function formatNotificationCount(
  count:
    number,
) {
  if (
    count ===
    1
  ) {
    return "1 notification";
  }

  return `${count} notifications`;
}

function formatRelativeTime(
  value:
    string,
) {
  const date =
    new Date(
      value,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  const now =
    new Date();

  const differenceInMilliseconds =
    now.getTime() -
    date.getTime();

  const absoluteDifference =
    Math.abs(
      differenceInMilliseconds,
    );

  const minutes =
    Math.floor(
      absoluteDifference /
      (
        1000 *
        60
      ),
    );

  const hours =
    Math.floor(
      absoluteDifference /
      (
        1000 *
        60 *
        60
      ),
    );

  const days =
    Math.floor(
      absoluteDifference /
      (
        1000 *
        60 *
        60 *
        24
      ),
    );

  const isFuture =
    differenceInMilliseconds <
    0;

  if (
    minutes <
    1
  ) {
    return isFuture
      ? "In a moment"
      : "Just now";
  }

  if (
    minutes <
    60
  ) {
    return isFuture
      ? `In ${minutes} ${minutes === 1 ? "minute" : "minutes"}`
      : `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  if (
    hours <
    24
  ) {
    return isFuture
      ? `In ${hours} ${hours === 1 ? "hour" : "hours"}`
      : `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  if (
    days <
    7
  ) {
    return isFuture
      ? `In ${days} ${days === 1 ? "day" : "days"}`
      : `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month:
        "short",

      day:
        "numeric",

      year:
        date.getFullYear() !==
        now.getFullYear()
          ? "numeric"
          : undefined,
    },
  );
}

async function readJsonResponse<
  ResponseType,
>(
  response:
    Response,
): Promise<ResponseType | null> {
  try {
    return await response.json() as ResponseType;
  } catch {
    return null;
  }
}

function getApiErrorMessage(
  payload:
    {
      error?:
        {
          message?:
            string;
        } | null;
    } | null,
  fallback:
    string,
) {
  const message =
    payload?.error?.message
      ?.trim();

  return message
    ? message
    : fallback;
}

function readUnknownErrorMessage(
  error:
    unknown,
  fallback:
    string,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    return message
      ? message
      : fallback;
  }

  if (
    typeof error ===
    "string"
  ) {
    const message =
      error.trim();

    return message
      ? message
      : fallback;
  }

  return fallback;
}

function readString(
  value:
    unknown,
) {
  return typeof value ===
    "string"
    ? value.trim()
    : "";
}

function readNullableString(
  value:
    unknown,
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  const normalizedValue =
    value.trim();

  return normalizedValue
    ? normalizedValue
    : null;
}

function isAbortError(
  error:
    unknown,
) {
  return (
    error instanceof
      DOMException &&
    error.name ===
      "AbortError"
  );
}

function isRecord(
  value:
    unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      "object" &&
    value !==
      null &&
    !Array.isArray(
      value,
    )
  );
}

function assertNever(
  value:
    never,
): never {
  throw new Error(
    `Unhandled CASE Budget notification value: ${String(
      value,
    )}`,
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
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
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

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

function DismissIcon() {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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

function RefreshIcon({
  spinning,
}: {
  spinning:
    boolean;
}) {
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
      className={
        spinning
          ? "animate-spin"
          : undefined
      }
    >
      <path d="M20 6v5h-5" />
      <path d="M4 18v-5h5" />
      <path d="M18.5 9A7 7 0 0 0 6.2 6.2L4 8" />
      <path d="M5.5 15a7 7 0 0 0 12.3 2.8L20 16" />
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

function WorkspaceIcon() {
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
        y="3"
        width="7"
        height="7"
        rx="1"
      />
      <rect
        x="14"
        y="3"
        width="7"
        height="7"
        rx="1"
      />
      <rect
        x="3"
        y="14"
        width="7"
        height="7"
        rx="1"
      />
      <rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
      />
    </svg>
  );
}

function SecurityIcon() {
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
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
