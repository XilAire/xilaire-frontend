"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type UsePaginationOptions<
  Item,
> = {
  items: Item[];

  initialPage?: number;
  initialPageSize?: number;

  resetDependencies?: readonly unknown[];

  onPageChange?: (
    page: number,
  ) => void;

  onPageSizeChange?: (
    pageSize: number,
  ) => void;
};

export type UsePaginationResult<
  Item,
> = {
  currentPage: number;
  pageSize: number;

  totalItems: number;
  totalPages: number;

  firstItemIndex: number;
  lastItemIndex: number;

  paginatedItems: Item[];

  hasPreviousPage: boolean;
  hasNextPage: boolean;

  setCurrentPage: (
    page: number,
  ) => void;

  setPageSize: (
    pageSize: number,
  ) => void;

  goToFirstPage: () => void;
  goToPreviousPage: () => void;
  goToNextPage: () => void;
  goToLastPage: () => void;

  resetPagination: () => void;
};

export default function usePagination<
  Item,
>({
  items,
  initialPage = 1,
  initialPageSize = 10,
  resetDependencies = [],
  onPageChange,
  onPageSizeChange,
}: UsePaginationOptions<Item>): UsePaginationResult<Item> {
  const normalizedInitialPage =
    normalizePage(
      initialPage,
    );

  const normalizedInitialPageSize =
    normalizePageSize(
      initialPageSize,
    );

  const [
    currentPage,
    setCurrentPageState,
  ] = useState(
    normalizedInitialPage,
  );

  const [
    pageSize,
    setPageSizeState,
  ] = useState(
    normalizedInitialPageSize,
  );

  const onPageChangeRef =
    useRef(
      onPageChange,
    );

  const onPageSizeChangeRef =
    useRef(
      onPageSizeChange,
    );

  const previousResetDependenciesRef =
    useRef<
      readonly unknown[]
    >(
      resetDependencies,
    );

  useEffect(
    () => {
      onPageChangeRef.current =
        onPageChange;
    },
    [
      onPageChange,
    ],
  );

  useEffect(
    () => {
      onPageSizeChangeRef.current =
        onPageSizeChange;
    },
    [
      onPageSizeChange,
    ],
  );

  const totalItems =
    items.length;

  const totalPages =
    useMemo(
      () =>
        Math.max(
          1,
          Math.ceil(
            totalItems /
              pageSize,
          ),
        ),
      [
        pageSize,
        totalItems,
      ],
    );

  const safeCurrentPage =
    useMemo(
      () =>
        Math.min(
          Math.max(
            1,
            currentPage,
          ),
          totalPages,
        ),
      [
        currentPage,
        totalPages,
      ],
    );

  const firstItemIndex =
    totalItems ===
    0
      ? 0
      : (
          safeCurrentPage -
          1
        ) *
          pageSize +
        1;

  const lastItemIndex =
    totalItems ===
    0
      ? 0
      : Math.min(
          safeCurrentPage *
            pageSize,
          totalItems,
        );

  const paginatedItems =
    useMemo(
      () => {
        const startIndex =
          (
            safeCurrentPage -
            1
          ) *
          pageSize;

        return items.slice(
          startIndex,
          startIndex +
            pageSize,
        );
      },
      [
        items,
        pageSize,
        safeCurrentPage,
      ],
    );

  const hasPreviousPage =
    safeCurrentPage >
    1;

  const hasNextPage =
    safeCurrentPage <
    totalPages;

  const setCurrentPage =
    useCallback(
      (
        page:
          number,
      ) => {
        const normalizedPage =
          Math.min(
            Math.max(
              1,
              normalizePage(
                page,
              ),
            ),
            totalPages,
          );

        setCurrentPageState(
          normalizedPage,
        );

        onPageChangeRef.current?.(
          normalizedPage,
        );
      },
      [
        totalPages,
      ],
    );

  const setPageSize =
    useCallback(
      (
        nextPageSize:
          number,
      ) => {
        const normalizedPageSize =
          normalizePageSize(
            nextPageSize,
          );

        setPageSizeState(
          normalizedPageSize,
        );

        setCurrentPageState(
          1,
        );

        onPageSizeChangeRef.current?.(
          normalizedPageSize,
        );
      },
      [],
    );

  const goToFirstPage =
    useCallback(
      () => {
        setCurrentPage(
          1,
        );
      },
      [
        setCurrentPage,
      ],
    );

  const goToPreviousPage =
    useCallback(
      () => {
        setCurrentPage(
          safeCurrentPage -
            1,
        );
      },
      [
        safeCurrentPage,
        setCurrentPage,
      ],
    );

  const goToNextPage =
    useCallback(
      () => {
        setCurrentPage(
          safeCurrentPage +
            1,
        );
      },
      [
        safeCurrentPage,
        setCurrentPage,
      ],
    );

  const goToLastPage =
    useCallback(
      () => {
        setCurrentPage(
          totalPages,
        );
      },
      [
        setCurrentPage,
        totalPages,
      ],
    );

  const resetPagination =
    useCallback(
      () => {
        setCurrentPageState(
          normalizedInitialPage,
        );

        setPageSizeState(
          normalizedInitialPageSize,
        );

        onPageChangeRef.current?.(
          normalizedInitialPage,
        );

        onPageSizeChangeRef.current?.(
          normalizedInitialPageSize,
        );
      },
      [
        normalizedInitialPage,
        normalizedInitialPageSize,
      ],
    );

  useEffect(
    () => {
      if (
        currentPage ===
        safeCurrentPage
      ) {
        return;
      }

      setCurrentPageState(
        safeCurrentPage,
      );

      onPageChangeRef.current?.(
        safeCurrentPage,
      );
    },
    [
      currentPage,
      safeCurrentPage,
    ],
  );

  useEffect(
    () => {
      const previousDependencies =
        previousResetDependenciesRef.current;

      const dependenciesChanged =
        haveDependenciesChanged(
          previousDependencies,
          resetDependencies,
        );

      previousResetDependenciesRef.current =
        resetDependencies;

      if (
        !dependenciesChanged
      ) {
        return;
      }

      setCurrentPageState(
        1,
      );

      onPageChangeRef.current?.(
        1,
      );
    },
    [
      resetDependencies,
    ],
  );

  return {
    currentPage:
      safeCurrentPage,

    pageSize,

    totalItems,
    totalPages,

    firstItemIndex,
    lastItemIndex,

    paginatedItems,

    hasPreviousPage,
    hasNextPage,

    setCurrentPage,
    setPageSize,

    goToFirstPage,
    goToPreviousPage,
    goToNextPage,
    goToLastPage,

    resetPagination,
  };
}

function normalizePage(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 1;
  }

  return Math.max(
    1,
    Math.floor(
      value,
    ),
  );
}

function normalizePageSize(
  value: number,
) {
  if (
    !Number.isFinite(
      value,
    )
  ) {
    return 10;
  }

  return Math.max(
    1,
    Math.floor(
      value,
    ),
  );
}

function haveDependenciesChanged(
  previousDependencies:
    readonly unknown[],
  nextDependencies:
    readonly unknown[],
) {
  if (
    previousDependencies.length !==
    nextDependencies.length
  ) {
    return true;
  }

  return nextDependencies.some(
    (
      dependency,
      index,
    ) =>
      !Object.is(
        dependency,
        previousDependencies[
          index
        ],
      ),
  );
}
