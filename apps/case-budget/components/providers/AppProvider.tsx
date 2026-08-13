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
  useRouter,
} from "next/navigation";

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

type SwitchWorkspaceApiSuccessResponse = {
  success: true;

  data: {
    activeWorkspaceId: string;

    workspace: {
      id: string;
      name: string;
      workspaceType: string;
      description: string | null;
      logoUrl: string | null;
      isActive: boolean;
      isOwner: boolean;
      role: string;
      membershipStatus: string;
      createdAt: string;
      updatedAt: string;
    };
  };

  error: null;
};

type SwitchWorkspaceApiErrorResponse = {
  success: false;

  data: null;

  error: {
    code: string;
    message: string;
  };
};

type SwitchWorkspaceApiResponse =
  | SwitchWorkspaceApiSuccessResponse
  | SwitchWorkspaceApiErrorResponse;

const ACTIVE_WORKSPACE_STORAGE_KEY =
  "case-budget:active-workspace:v1";

const LEGACY_WORKSPACES_STORAGE_KEY =
  "case-budget:workspaces:v1";

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
  const router =
    useRouter();

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

  const [
    isWorkspaceSwitchPending,
    setIsWorkspaceSwitchPending,
  ] = useState(
    false,
  );

  /**
   * The server-provided workspace is authoritative.
   *
   * initialWorkspaceId is resolved from the HttpOnly
   * case-budget-active-workspace-id cookie by the server.
   *
   * localStorage is retained only as a non-authoritative client-side
   * convenience value. It must never override a workspace that the
   * server has already resolved.
   */
  useEffect(
    () => {
      const nextWorkspaces =
        cloneWorkspaces(
          initialWorkspaces,
        );

      setWorkspaces(
        nextWorkspaces,
      );

      const nextWorkspaceId =
        resolveAvailableWorkspaceId({
          requestedWorkspaceId:
            initialWorkspaceId,

          workspaces:
            nextWorkspaces,
        });

      setActiveWorkspaceId(
        nextWorkspaceId,
      );

      if (
        nextWorkspaceId
      ) {
        writeStoredActiveWorkspaceId(
          nextWorkspaceId,
        );
      } else {
        clearStoredActiveWorkspaceId();
      }

      clearLegacyWorkspaceStorage();
    },
    [
      initialWorkspaceId,
      initialWorkspaces,
    ],
  );

  /**
   * Keep localStorage synchronized with the workspace currently
   * represented by client state.
   *
   * This does NOT control server authorization. The HttpOnly cookie
   * managed by /api/workspaces/current is the authoritative workspace
   * selection for server requests.
   */
  useEffect(
    () => {
      if (
        !activeWorkspaceId
      ) {
        clearStoredActiveWorkspaceId();

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

  /**
   * Changes the authoritative active workspace.
   *
   * The browser does not write the CASE Budget active-workspace
   * cookie directly.
   *
   * Instead:
   *
   * 1. POST the requested workspace to the server.
   * 2. The server authenticates the user.
   * 3. The server verifies active membership.
   * 4. The server writes the HttpOnly workspace cookie.
   * 5. Client state is updated only after server confirmation.
   * 6. router.refresh() rebuilds the Server Component tree using
   *    the newly selected workspace.
   *
   * This keeps subscription entitlements, workspace data, and the
   * visible workspace selection aligned.
   */
  const setActiveWorkspace =
    useCallback(
      (
        workspaceId:
          string,
      ) => {
        const normalizedWorkspaceId =
          workspaceId.trim();

        if (
          !normalizedWorkspaceId
        ) {
          return;
        }

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

        if (
          isWorkspaceSwitchPending
        ) {
          return;
        }

        if (
          activeWorkspaceId ===
          normalizedWorkspaceId
        ) {
          setActiveOverlay(
            null,
          );

          return;
        }

        void switchActiveWorkspace({
          workspaceId:
            normalizedWorkspaceId,

          onStart:
            () => {
              setIsWorkspaceSwitchPending(
                true,
              );
            },

          onSuccess:
            (
              confirmedWorkspaceId,
            ) => {
              writeStoredActiveWorkspaceId(
                confirmedWorkspaceId,
              );

              setActiveWorkspaceId(
                confirmedWorkspaceId,
              );

              setActiveOverlay(
                null,
              );

              router.refresh();
            },

          onError:
            (
              error,
            ) => {
              console.error(
                "[CASE Budget AppProvider] Workspace switch failed.",
                error,
              );
            },

          onFinish:
            () => {
              setIsWorkspaceSwitchPending(
                false,
              );
            },
        });
      },
      [
        activeWorkspaceId,
        isWorkspaceSwitchPending,
        router,
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
              const nextWorkspaceId =
                nextWorkspaces[0]?.id ??
                "";

              if (
                nextWorkspaceId
              ) {
                writeStoredActiveWorkspaceId(
                  nextWorkspaceId,
                );
              } else {
                clearStoredActiveWorkspaceId();
              }

              setActiveWorkspaceId(
                nextWorkspaceId,
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

async function switchActiveWorkspace({
  workspaceId,
  onStart,
  onSuccess,
  onError,
  onFinish,
}: {
  workspaceId:
    string;

  onStart:
    () => void;

  onSuccess:
    (
      workspaceId:
        string,
    ) => void;

  onError:
    (
      error:
        unknown,
    ) => void;

  onFinish:
    () => void;
}) {
  onStart();

  try {
    const response =
      await fetch(
        "/api/workspaces/current",
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          credentials:
            "same-origin",

          cache:
            "no-store",

          body:
            JSON.stringify({
              workspaceId,
            }),
        },
      );

    const responseBody =
      await readSwitchWorkspaceResponse(
        response,
      );

    if (
      !response.ok
    ) {
      const message =
        responseBody &&
        !responseBody.success
          ? responseBody.error.message
          : "CASE Budget could not switch workspaces.";

      throw new Error(
        message,
      );
    }

    if (
      !responseBody ||
      !responseBody.success
    ) {
      throw new Error(
        "CASE Budget received an invalid workspace switch response.",
      );
    }

    const confirmedWorkspaceId =
      responseBody.data
        .activeWorkspaceId
        .trim();

    if (
      !confirmedWorkspaceId
    ) {
      throw new Error(
        "CASE Budget did not receive a valid active workspace ID.",
      );
    }

    if (
      confirmedWorkspaceId !==
      workspaceId
    ) {
      throw new Error(
        "CASE Budget received an unexpected active workspace ID.",
      );
    }

    onSuccess(
      confirmedWorkspaceId,
    );
  } catch (
    error
  ) {
    onError(
      error,
    );
  } finally {
    onFinish();
  }
}

async function readSwitchWorkspaceResponse(
  response:
    Response,
): Promise<
  SwitchWorkspaceApiResponse | null
> {
  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    !contentType
      ?.toLowerCase()
      .includes(
        "application/json",
      )
  ) {
    return null;
  }

  try {
    const value:
      unknown =
      await response.json();

    if (
      !isRecord(
        value,
      )
    ) {
      return null;
    }

    if (
      value.success ===
      true
    ) {
      if (
        !isRecord(
          value.data,
        ) ||
        typeof value.data
          .activeWorkspaceId !==
          "string"
      ) {
        return null;
      }

      return value as
        SwitchWorkspaceApiSuccessResponse;
    }

    if (
      value.success ===
      false
    ) {
      if (
        !isRecord(
          value.error,
        ) ||
        typeof value.error.code !==
          "string" ||
        typeof value.error.message !==
          "string"
      ) {
        return null;
      }

      return value as
        SwitchWorkspaceApiErrorResponse;
    }

    return null;
  } catch {
    return null;
  }
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