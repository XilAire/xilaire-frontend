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

import type {
  InvestmentsData,
} from "@/lib/investments/investments-service";

export type AppOverlay =
  | "mobile-navigation"
  | "search"
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

  initialInvestments?: InvestmentsData;
};

type AppContextValue = {
  currentUser: AppUser | null;

  activeOverlay: AppOverlay;

  isMobileNavigationOpen: boolean;
  isSearchOpen: boolean;
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
  initialInvestments = {
    investmentAccounts: [],
    holdings: [],
    activities: [],
    performanceSnapshots: [],
  },
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
   * CASE Budget does not persist workspace selection in browser storage.
   * The server cookie and database-backed workspace membership are the
   * canonical source of truth.
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
    },
    [
      initialWorkspaceId,
      initialWorkspaces,
    ],
  );

  /**
   * Keep client state valid when the available workspace collection changes.
   *
   * This does not persist anything in the browser. The authoritative active
   * workspace remains the HttpOnly cookie managed by /api/workspaces/current.
   */
  useEffect(
    () => {
      if (
        !activeWorkspaceId
      ) {
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
        workspaceExists
      ) {
        return;
      }

      const fallbackWorkspaceId =
        workspaces[0]?.id ??
        "";

      setActiveWorkspaceId(
        fallbackWorkspaceId,
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
        closeOverlay,
        closeQuickAdd,
        closeSearch,
        closeWorkspaceSwitcher,
        initialUser,
        openMobileNavigation,
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
      <BudgetProvider
        activeWorkspaceId={
          activeWorkspaceId
        }
      >
        <AccountsProvider>
          <InvestmentsProvider
            initialInvestmentAccounts={
              initialInvestments.investmentAccounts
            }
            initialHoldings={
              initialInvestments.holdings
            }
            initialActivities={
              initialInvestments.activities
            }
            initialPerformanceHistory={
              initialInvestments.performanceSnapshots
            }
          >
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