"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  deleteNetWorthSnapshot,
} from "@/actions/net-worth/delete-net-worth-snapshot";

import {
  getNetWorthSnapshots,
} from "@/actions/net-worth/get-net-worth-snapshots";

import {
  recordNetWorthSnapshot,
} from "@/actions/net-worth/record-net-worth-snapshot";

import {
  useAccounts,
} from "@/components/providers/AccountsProvider";

import {
  useApp,
} from "@/components/providers/AppProvider";

export type NetWorthHistoryPoint = {
  id: string;
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

type NetWorthContextValue = {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;

  history: NetWorthHistoryPoint[];

  isLoadingHistory: boolean;
  isRecordingSnapshot: boolean;
  historyError: string | null;

  recordSnapshot: (
    date?: string,
  ) => Promise<NetWorthHistoryPoint | null>;

  deleteSnapshot: (
    snapshotId: string,
  ) => Promise<boolean>;

  refreshHistory: () => Promise<void>;

  clearHistoryError: () => void;
};

export type NetWorthProviderProps = {
  children: ReactNode;
};

const NetWorthContext =
  createContext<
    NetWorthContextValue | undefined
  >(undefined);

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

function getLocalDateString(
  date =
    new Date(),
) {
  const timezoneOffset =
    date.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    date.getTime() -
      timezoneOffset,
  )
    .toISOString()
    .slice(
      0,
      10,
    );
}

function sortHistory(
  history:
    NetWorthHistoryPoint[],
) {
  return [
    ...history,
  ].sort(
    (
      firstPoint,
      secondPoint,
    ) =>
      firstPoint.date.localeCompare(
        secondPoint.date,
      ),
  );
}

function upsertHistoryPoint(
  history:
    NetWorthHistoryPoint[],
  point:
    NetWorthHistoryPoint,
) {
  const nextHistory =
    history.filter(
      (
        currentPoint,
      ) =>
        currentPoint.id !==
          point.id &&
        currentPoint.date !==
          point.date,
    );

  return sortHistory([
    ...nextHistory,
    point,
  ]);
}

function mapSnapshotToHistoryPoint(
  snapshot: {
    id: string;
    snapshotDate: string;
    totalAssets: number;
    totalLiabilities: number;
    netWorth: number;
  },
): NetWorthHistoryPoint {
  return {
    id:
      snapshot.id,

    date:
      snapshot.snapshotDate,

    totalAssets:
      normalizeCurrency(
        snapshot.totalAssets,
      ),

    totalLiabilities:
      normalizeCurrency(
        snapshot.totalLiabilities,
      ),

    netWorth:
      normalizeCurrency(
        snapshot.netWorth,
      ),
  };
}

export default function NetWorthProvider({
  children,
}: NetWorthProviderProps) {
  const {
    totalAssets,
    totalLiabilities,
    netWorth,
  } =
    useAccounts();

  const {
    activeWorkspace,
  } =
    useApp();

  const workspaceId =
    activeWorkspace?.id ??
    "";

  const [
    history,
    setHistory,
  ] =
    useState<
      NetWorthHistoryPoint[]
    >(
      [],
    );

  const [
    isLoadingHistory,
    setIsLoadingHistory,
  ] =
    useState(
      false,
    );

  const [
    isRecordingSnapshot,
    setIsRecordingSnapshot,
  ] =
    useState(
      false,
    );

  const [
    historyError,
    setHistoryError,
  ] =
    useState<
      string | null
    >(
      null,
    );

  const requestIdRef =
    useRef(
      0,
    );

  const currentTotalsRef =
    useRef({
      totalAssets:
        normalizeCurrency(
          totalAssets,
        ),

      totalLiabilities:
        normalizeCurrency(
          totalLiabilities,
        ),

      netWorth:
        normalizeCurrency(
          netWorth,
        ),
    });

  useEffect(
    () => {
      currentTotalsRef.current =
        {
          totalAssets:
            normalizeCurrency(
              totalAssets,
            ),

          totalLiabilities:
            normalizeCurrency(
              totalLiabilities,
            ),

          netWorth:
            normalizeCurrency(
              netWorth,
            ),
        };
    },
    [
      netWorth,
      totalAssets,
      totalLiabilities,
    ],
  );

  const loadHistory =
    useCallback(
      async (
        targetWorkspaceId:
          string,
      ) => {
        const normalizedWorkspaceId =
          targetWorkspaceId.trim();

        const requestId =
          requestIdRef.current +
          1;

        requestIdRef.current =
          requestId;

        if (
          !normalizedWorkspaceId
        ) {
          setHistory(
            [],
          );

          setHistoryError(
            null,
          );

          setIsLoadingHistory(
            false,
          );

          return;
        }

        setIsLoadingHistory(
          true,
        );

        setHistoryError(
          null,
        );

        try {
          const result =
            await getNetWorthSnapshots();

          if (
            requestIdRef.current !==
            requestId
          ) {
            return;
          }

          if (
            !result.success
          ) {
            setHistory(
              [],
            );

            setHistoryError(
              result.error?.message ??
                "Unable to load net worth history.",
            );

            return;
          }

          const nextHistory =
            result.snapshots.map(
              (
                snapshot,
              ) =>
                mapSnapshotToHistoryPoint(
                  snapshot,
                ),
            );

          setHistory(
            sortHistory(
              nextHistory,
            ),
          );
        } catch (
          error
        ) {
          if (
            requestIdRef.current !==
            requestId
          ) {
            return;
          }

          setHistory(
            [],
          );

          setHistoryError(
            getUnknownErrorMessage(
              error,
              "Unable to load net worth history.",
            ),
          );
        } finally {
          if (
            requestIdRef.current ===
            requestId
          ) {
            setIsLoadingHistory(
              false,
            );
          }
        }
      },
      [],
    );

  useEffect(
    () => {
      void loadHistory(
        workspaceId,
      );
    },
    [
      loadHistory,
      workspaceId,
    ],
  );

  const refreshHistory =
    useCallback(
      async () => {
        await loadHistory(
          workspaceId,
        );
      },
      [
        loadHistory,
        workspaceId,
      ],
    );

  const recordSnapshot =
    useCallback(
      async (
        date =
          getLocalDateString(),
      ): Promise<NetWorthHistoryPoint | null> => {
        const normalizedWorkspaceId =
          workspaceId.trim();

        if (
          !normalizedWorkspaceId
        ) {
          setHistoryError(
            "A workspace is required to record net worth.",
          );

          return null;
        }

        if (
          isRecordingSnapshot
        ) {
          return null;
        }

        const totals =
          currentTotalsRef.current;

        setIsRecordingSnapshot(
          true,
        );

        setHistoryError(
          null,
        );

        try {
          const result =
            await recordNetWorthSnapshot({
              snapshotDate:
                date,

              totalAssets:
                totals.totalAssets,

              totalLiabilities:
                totals.totalLiabilities,
            });

          if (
            !result.success ||
            !result.snapshot
          ) {
            setHistoryError(
              result.error?.message ??
                "Unable to record the net worth snapshot.",
            );

            return null;
          }

          const historyPoint =
            mapSnapshotToHistoryPoint(
              result.snapshot,
            );

          setHistory(
            (
              currentHistory,
            ) =>
              upsertHistoryPoint(
                currentHistory,
                historyPoint,
              ),
          );

          return historyPoint;
        } catch (
          error
        ) {
          setHistoryError(
            getUnknownErrorMessage(
              error,
              "Unable to record the net worth snapshot.",
            ),
          );

          return null;
        } finally {
          setIsRecordingSnapshot(
            false,
          );
        }
      },
      [
        isRecordingSnapshot,
        workspaceId,
      ],
    );

  const deleteSnapshot =
    useCallback(
      async (
        snapshotId:
          string,
      ) => {
        const normalizedWorkspaceId =
          workspaceId.trim();

        const normalizedSnapshotId =
          snapshotId.trim();

        if (
          !normalizedWorkspaceId
        ) {
          setHistoryError(
            "A workspace is required to delete a net worth snapshot.",
          );

          return false;
        }

        if (
          !normalizedSnapshotId
        ) {
          setHistoryError(
            "A net worth snapshot is required.",
          );

          return false;
        }

        setHistoryError(
          null,
        );

        try {
          const result =
            await deleteNetWorthSnapshot({
              snapshotId:
                normalizedSnapshotId,
            });

          if (
            !result.success
          ) {
            setHistoryError(
              result.error?.message ??
                "Unable to delete the net worth snapshot.",
            );

            return false;
          }

          setHistory(
            (
              currentHistory,
            ) =>
              currentHistory.filter(
                (
                  point,
                ) =>
                  point.id !==
                  normalizedSnapshotId,
              ),
          );

          return true;
        } catch (
          error
        ) {
          setHistoryError(
            getUnknownErrorMessage(
              error,
              "Unable to delete the net worth snapshot.",
            ),
          );

          return false;
        }
      },
      [
        workspaceId,
      ],
    );

  const clearHistoryError =
    useCallback(
      () => {
        setHistoryError(
          null,
        );
      },
      [],
    );

  const value =
    useMemo<NetWorthContextValue>(
      () => ({
        totalAssets:
          normalizeCurrency(
            totalAssets,
          ),

        totalLiabilities:
          normalizeCurrency(
            totalLiabilities,
          ),

        netWorth:
          normalizeCurrency(
            netWorth,
          ),

        history,

        isLoadingHistory,

        isRecordingSnapshot,

        historyError,

        recordSnapshot,

        deleteSnapshot,

        refreshHistory,

        clearHistoryError,
      }),
      [
        clearHistoryError,
        deleteSnapshot,
        history,
        historyError,
        isLoadingHistory,
        isRecordingSnapshot,
        netWorth,
        recordSnapshot,
        refreshHistory,
        totalAssets,
        totalLiabilities,
      ],
    );

  return (
    <NetWorthContext.Provider
      value={
        value
      }
    >
      {children}
    </NetWorthContext.Provider>
  );
}

export function useNetWorth() {
  const context =
    useContext(
      NetWorthContext,
    );

  if (
    !context
  ) {
    throw new Error(
      "useNetWorth must be used within a NetWorthProvider.",
    );
  }

  return context;
}

function getUnknownErrorMessage(
  error:
    unknown,
  fallbackMessage:
    string,
) {
  if (
    error instanceof
    Error
  ) {
    const message =
      error.message.trim();

    if (
      message
    ) {
      return message;
    }
  }

  return fallbackMessage;
}