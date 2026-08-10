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

import AccountsProvider from "@/components/providers/AccountsProvider";
import BillsProvider from "@/components/providers/BillsProvider";
import BudgetProvider from "@/components/providers/BudgetProvider";
import DebtsProvider from "@/components/providers/DebtsProvider";
import GoalsProvider from "@/components/providers/GoalsProvider";
import InvestmentsProvider from "@/components/providers/InvestmentsProvider";
import NetWorthProvider from "@/components/providers/NetWorthProvider";
import PayCyclesProvider from "@/components/providers/PayCyclesProvider";
import TransactionsProvider from "@/components/providers/TransactionsProvider";

export type AppOverlay =
  | "mobile-navigation"
  | "search"
  | "notifications"
  | "quick-add"
  | "workspace"
  | null;

export type WorkspaceType =
  | "personal"
  | "household"
  | "family"
  | "business"
  | "rental"
  | "trust"
  | "other";

export type AppUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  displayName: string;
  avatarUrl?: string | null;
};

export type AppWorkspace = {
  id: string;
  name: string;
  type: WorkspaceType;
  memberCount?: number;
  isOwner?: boolean;
};

type AppProviderProps = {
  children: ReactNode;

  initialUser?: AppUser | null;

  initialWorkspaceId?: string;

  initialWorkspaces?: AppWorkspace[];
};

type AppContextValue = {
  currentUser: AppUser | null;

  activeOverlay: AppOverlay;

  isMobileNavigationOpen: boolean;
  isSearchOpen: boolean;
  isNotificationsOpen: boolean;
  isQuickAddOpen: boolean;
  isWorkspaceSwitcherOpen: boolean;

  workspaces: AppWorkspace[];
  activeWorkspace: AppWorkspace | null;
  activeWorkspaceId: string;

  openOverlay: (
    overlay: Exclude<
      AppOverlay,
      null
    >,
  ) => void;

  closeOverlay: () => void;

  openMobileNavigation: () => void;
  closeMobileNavigation: () => void;

  openSearch: () => void;
  closeSearch: () => void;

  openNotifications: () => void;
  closeNotifications: () => void;

  openQuickAdd: () => void;
  closeQuickAdd: () => void;

  openWorkspaceSwitcher: () => void;
  closeWorkspaceSwitcher: () => void;

  setActiveWorkspace: (
    workspaceId: string,
  ) => void;

  addWorkspace: (
    workspace: AppWorkspace,
  ) => void;

  updateWorkspace: (
    workspaceId: string,
    updates: Partial<AppWorkspace>,
  ) => void;

  removeWorkspace: (
    workspaceId: string,
  ) => void;
};

const ACTIVE_WORKSPACE_STORAGE_KEY =
  "case-budget:active-workspace:v1";

const LEGACY_WORKSPACES_STORAGE_KEY =
  "case-budget:workspaces:v1";

const ACTIVE_WORKSPACE_COOKIE_NAME =
  "case-budget-active-workspace-id";

const ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SECONDS =
  60 * 60 * 24 * 365;

const AppContext =
  createContext<
    AppContextValue | undefined
  >(undefined);

export function useApp() {
  const context =
    useContext(
      AppContext,
    );

  if (!context) {
    throw new Error(
      "useApp must be used within AppProvider.",
    );
  }

  return context;
}

export default function AppProvider({
  children,
  initialUser = null,
  initialWorkspaceId = "",
  initialWorkspaces = [],
}: AppProviderProps) {
  const [
    activeOverlay,
    setActiveOverlay,
  ] = useState<AppOverlay>(
    null,
  );

  const [
    workspaces,
    setWorkspaces,
  ] = useState<AppWorkspace[]>(
    () =>
      cloneWorkspaces(
        initialWorkspaces,
      ),
  );

  const [
    activeWorkspaceId,
    setActiveWorkspaceId,
  ] = useState<string>(
    () =>
      resolveInitialWorkspaceId({
        initialWorkspaceId,
        initialWorkspaces,
      }),
  );

  useEffect(
    () => {
      setWorkspaces(
        cloneWorkspaces(
          initialWorkspaces,
        ),
      );

      const storedWorkspaceId =
        loadStoredActiveWorkspaceId();

      const cookieWorkspaceId =
        readActiveWorkspaceCookie();

      const candidateWorkspaceId =
        storedWorkspaceId ??
        cookieWorkspaceId ??
        initialWorkspaceId;

      const nextWorkspaceId =
        resolveAvailableWorkspaceId({
          requestedWorkspaceId:
            candidateWorkspaceId,

          workspaces:
            initialWorkspaces,
        });

      setActiveWorkspaceId(
        nextWorkspaceId,
      );

      clearLegacyWorkspaceStorage();
    },
    [
      initialWorkspaceId,
      initialWorkspaces,
    ],
  );

  useEffect(
    () => {
      if (
        !activeWorkspaceId
      ) {
        clearStoredActiveWorkspaceId();
        clearActiveWorkspaceCookie();

        return;
      }

      const workspaceExists =
        workspaces.some(
          (
            workspace,
          ) =>
            workspace.id ===
            activeWorkspaceId,
        );

      if (
        !workspaceExists
      ) {
        const fallbackWorkspaceId =
          workspaces[0]?.id ??
          "";

        setActiveWorkspaceId(
          fallbackWorkspaceId,
        );

        return;
      }

      writeStoredActiveWorkspaceId(
        activeWorkspaceId,
      );

      writeActiveWorkspaceCookie(
        activeWorkspaceId,
      );
    },
    [
      activeWorkspaceId,
      workspaces,
    ],
  );

  const activeWorkspace =
    useMemo(
      () =>
        workspaces.find(
          (
            workspace,
          ) =>
            workspace.id ===
            activeWorkspaceId,
        ) ??
        workspaces[0] ??
        null,
      [
        activeWorkspaceId,
        workspaces,
      ],
    );

  const openOverlay =
    useCallback(
      (
        overlay: Exclude<
          AppOverlay,
          null
        >,
      ) => {
        setActiveOverlay(
          overlay,
        );
      },
      [],
    );

  const closeOverlay =
    useCallback(
      () => {
        setActiveOverlay(
          null,
        );
      },
      [],
    );

  const openMobileNavigation =
    useCallback(
      () => {
        openOverlay(
          "mobile-navigation",
        );
      },
      [
        openOverlay,
      ],
    );

  const closeMobileNavigation =
    useCallback(
      () => {
        setActiveOverlay(
          (
            currentOverlay,
          ) =>
            currentOverlay ===
            "mobile-navigation"
              ? null
              : currentOverlay,
        );
      },
      [],
    );

  const openSearch =
    useCallback(
      () => {
        openOverlay(
          "search",
        );
      },
      [
        openOverlay,
      ],
    );

  const closeSearch =
    useCallback(
      () => {
        setActiveOverlay(
          (
            currentOverlay,
          ) =>
            currentOverlay ===
            "search"
              ? null
              : currentOverlay,
        );
      },
      [],
    );

  const openNotifications =
    useCallback(
      () => {
        openOverlay(
          "notifications",
        );
      },
      [
        openOverlay,
      ],
    );

  const closeNotifications =
    useCallback(
      () => {
        setActiveOverlay(
          (
            currentOverlay,
          ) =>
            currentOverlay ===
            "notifications"
              ? null
              : currentOverlay,
        );
      },
      [],
    );

  const openQuickAdd =
    useCallback(
      () => {
        openOverlay(
          "quick-add",
        );
      },
      [
        openOverlay,
      ],
    );

  const closeQuickAdd =
    useCallback(
      () => {
        setActiveOverlay(
          (
            currentOverlay,
          ) =>
            currentOverlay ===
            "quick-add"
              ? null
              : currentOverlay,
        );
      },
      [],
    );

  const openWorkspaceSwitcher =
    useCallback(
      () => {
        openOverlay(
          "workspace",
        );
      },
      [
        openOverlay,
      ],
    );

  const closeWorkspaceSwitcher =
    useCallback(
      () => {
        setActiveOverlay(
          (
            currentOverlay,
          ) =>
            currentOverlay ===
            "workspace"
              ? null
              : currentOverlay,
        );
      },
      [],
    );

  const setActiveWorkspace =
    useCallback(
      (
        workspaceId:
          string,
      ) => {
        const normalizedWorkspaceId =
          workspaceId.trim();

        const workspaceExists =
          workspaces.some(
            (
              workspace,
            ) =>
              workspace.id ===
              normalizedWorkspaceId,
          );

        if (
          !workspaceExists
        ) {
          return;
        }

        setActiveWorkspaceId(
          normalizedWorkspaceId,
        );

        setActiveOverlay(
          null,
        );
      },
      [
        workspaces,
      ],
    );

  const addWorkspace =
    useCallback(
      (
        workspace:
          AppWorkspace,
      ) => {
        setWorkspaces(
          (
            currentWorkspaces,
          ) => {
            const workspaceAlreadyExists =
              currentWorkspaces.some(
                (
                  currentWorkspace,
                ) =>
                  currentWorkspace.id ===
                  workspace.id,
              );

            if (
              workspaceAlreadyExists
            ) {
              return currentWorkspaces;
            }

            return [
              ...currentWorkspaces,
              workspace,
            ];
          },
        );
      },
      [],
    );

  const updateWorkspace =
    useCallback(
      (
        workspaceId:
          string,

        updates:
          Partial<AppWorkspace>,
      ) => {
        setWorkspaces(
          (
            currentWorkspaces,
          ) =>
            currentWorkspaces.map(
              (
                workspace,
              ) =>
                workspace.id ===
                workspaceId
                  ? {
                      ...workspace,
                      ...updates,

                      id:
                        workspace.id,
                    }
                  : workspace,
            ),
        );
      },
      [],
    );

  const removeWorkspace =
    useCallback(
      (
        workspaceId:
          string,
      ) => {
        setWorkspaces(
          (
            currentWorkspaces,
          ) => {
            const nextWorkspaces =
              currentWorkspaces.filter(
                (
                  workspace,
                ) =>
                  workspace.id !==
                  workspaceId,
              );

            if (
              activeWorkspaceId ===
              workspaceId
            ) {
              setActiveWorkspaceId(
                nextWorkspaces[0]?.id ??
                "",
              );
            }

            return nextWorkspaces;
          },
        );

        setActiveOverlay(
          null,
        );
      },
      [
        activeWorkspaceId,
      ],
    );

  const contextValue =
    useMemo<AppContextValue>(
      () => ({
        currentUser:
          initialUser,

        activeOverlay,

        isMobileNavigationOpen:
          activeOverlay ===
          "mobile-navigation",

        isSearchOpen:
          activeOverlay ===
          "search",

        isNotificationsOpen:
          activeOverlay ===
          "notifications",

        isQuickAddOpen:
          activeOverlay ===
          "quick-add",

        isWorkspaceSwitcherOpen:
          activeOverlay ===
          "workspace",

        workspaces,
        activeWorkspace,
        activeWorkspaceId,

        openOverlay,
        closeOverlay,

        openMobileNavigation,
        closeMobileNavigation,

        openSearch,
        closeSearch,

        openNotifications,
        closeNotifications,

        openQuickAdd,
        closeQuickAdd,

        openWorkspaceSwitcher,
        closeWorkspaceSwitcher,

        setActiveWorkspace,
        addWorkspace,
        updateWorkspace,
        removeWorkspace,
      }),
      [
        activeOverlay,
        activeWorkspace,
        activeWorkspaceId,
        addWorkspace,
        closeMobileNavigation,
        closeNotifications,
        closeOverlay,
        closeQuickAdd,
        closeSearch,
        closeWorkspaceSwitcher,
        initialUser,
        openMobileNavigation,
        openNotifications,
        openOverlay,
        openQuickAdd,
        openSearch,
        openWorkspaceSwitcher,
        removeWorkspace,
        setActiveWorkspace,
        updateWorkspace,
        workspaces,
      ],
    );

  return (
    <AppContext.Provider
      value={
        contextValue
      }
    >
      <BudgetProvider>
        <AccountsProvider>
          <InvestmentsProvider>
            <NetWorthProvider>
              <GoalsProvider>
                <DebtsProvider>
                  <BillsProvider>
                    <PayCyclesProvider>
                      <TransactionsProvider>
                        {children}
                      </TransactionsProvider>
                    </PayCyclesProvider>
                  </BillsProvider>
                </DebtsProvider>
              </GoalsProvider>
            </NetWorthProvider>
          </InvestmentsProvider>
        </AccountsProvider>
      </BudgetProvider>
    </AppContext.Provider>
  );
}

function cloneWorkspaces(
  workspaces:
    AppWorkspace[],
) {
  return workspaces.map(
    (
      workspace,
    ) => ({
      ...workspace,
    }),
  );
}

function resolveInitialWorkspaceId({
  initialWorkspaceId,
  initialWorkspaces,
}: {
  initialWorkspaceId:
    string;

  initialWorkspaces:
    AppWorkspace[];
}) {
  return resolveAvailableWorkspaceId({
    requestedWorkspaceId:
      initialWorkspaceId,

    workspaces:
      initialWorkspaces,
  });
}

function resolveAvailableWorkspaceId({
  requestedWorkspaceId,
  workspaces,
}: {
  requestedWorkspaceId:
    string | null | undefined;

  workspaces:
    AppWorkspace[];
}) {
  const normalizedRequestedWorkspaceId =
    requestedWorkspaceId?.trim() ??
    "";

  const requestedWorkspaceExists =
    normalizedRequestedWorkspaceId
      ? workspaces.some(
          (
            workspace,
          ) =>
            workspace.id ===
            normalizedRequestedWorkspaceId,
        )
      : false;

  if (
    requestedWorkspaceExists
  ) {
    return normalizedRequestedWorkspaceId;
  }

  return (
    workspaces[0]?.id ??
    ""
  );
}

function loadStoredActiveWorkspaceId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  try {
    return (
      window.localStorage.getItem(
        ACTIVE_WORKSPACE_STORAGE_KEY,
      )
        ?.trim() ||
      null
    );
  } catch {
    return null;
  }
}

function writeStoredActiveWorkspaceId(
  workspaceId:
    string,
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.setItem(
      ACTIVE_WORKSPACE_STORAGE_KEY,
      workspaceId,
    );
  } catch {
    // Local storage may be unavailable or full.
  }
}

function clearStoredActiveWorkspaceId() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      ACTIVE_WORKSPACE_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable.
  }
}

function clearLegacyWorkspaceStorage() {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  try {
    window.localStorage.removeItem(
      LEGACY_WORKSPACES_STORAGE_KEY,
    );
  } catch {
    // Local storage may be unavailable.
  }
}

function readActiveWorkspaceCookie() {
  if (
    typeof document ===
    "undefined"
  ) {
    return null;
  }

  const cookiePrefix =
    `${ACTIVE_WORKSPACE_COOKIE_NAME}=`;

  const matchingCookie =
    document.cookie
      .split(
        ";",
      )
      .map(
        (
          cookie,
        ) =>
          cookie.trim(),
      )
      .find(
        (
          cookie,
        ) =>
          cookie.startsWith(
            cookiePrefix,
          ),
      );

  if (
    !matchingCookie
  ) {
    return null;
  }

  try {
    return (
      decodeURIComponent(
        matchingCookie.slice(
          cookiePrefix.length,
        ),
      )
        .trim() ||
      null
    );
  } catch {
    return null;
  }
}

function writeActiveWorkspaceCookie(
  workspaceId:
    string,
) {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const normalizedWorkspaceId =
    workspaceId.trim();

  if (
    !normalizedWorkspaceId
  ) {
    clearActiveWorkspaceCookie();

    return;
  }

  const secureAttribute =
    window.location.protocol ===
    "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${ACTIVE_WORKSPACE_COOKIE_NAME}=${encodeURIComponent(
      normalizedWorkspaceId,
    )}`,

    "Path=/",

    `Max-Age=${ACTIVE_WORKSPACE_COOKIE_MAX_AGE_SECONDS}`,

    "SameSite=Lax",

    secureAttribute,
  ]
    .filter(
      Boolean,
    )
    .join(
      "; ",
    );
}

function clearActiveWorkspaceCookie() {
  if (
    typeof document ===
    "undefined"
  ) {
    return;
  }

  const secureAttribute =
    window.location.protocol ===
    "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${ACTIVE_WORKSPACE_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    secureAttribute,
  ]
    .filter(
      Boolean,
    )
    .join(
      "; ",
    );
}