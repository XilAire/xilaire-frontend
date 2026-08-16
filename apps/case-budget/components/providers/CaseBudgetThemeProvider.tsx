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
  type PointerEvent as ReactPointerEvent,
} from "react";

export type CaseBudgetTheme =
  | "light"
  | "dark"
  | "system";

type ResolvedTheme =
  | "light"
  | "dark";

type CaseBudgetThemeContextValue = {
  theme: CaseBudgetTheme;
  resolvedTheme: ResolvedTheme;
  setTheme: (
    theme: CaseBudgetTheme,
  ) => void;
  toggleTheme: () => void;
};

type CaseBudgetThemeProviderProps = {
  children: ReactNode;
  defaultTheme?: CaseBudgetTheme;
  showGlobalToggle?: boolean;
};

const DEFAULT_THEME: CaseBudgetTheme =
  "system";


const CaseBudgetThemeContext =
  createContext<
    CaseBudgetThemeContextValue | undefined
  >(undefined);

function getSystemTheme(): ResolvedTheme {
  if (
    typeof window === "undefined"
  ) {
    return "light";
  }

  return window.matchMedia(
    "(prefers-color-scheme: dark)",
  ).matches
    ? "dark"
    : "light";
}

function resolveTheme(
  theme: CaseBudgetTheme,
): ResolvedTheme {
  if (theme === "system") {
    return getSystemTheme();
  }

  return theme;
}

function applyThemeToDocument(
  resolvedTheme: ResolvedTheme,
  selectedTheme: CaseBudgetTheme,
) {
  const root =
    document.documentElement;

  root.classList.remove(
    "light",
    "dark",
  );

  root.classList.add(
    resolvedTheme,
  );

  root.dataset.theme =
    resolvedTheme;

  root.dataset.themePreference =
    selectedTheme;

  root.style.colorScheme =
    resolvedTheme;
}

export function useCaseBudgetTheme() {
  const context =
    useContext(
      CaseBudgetThemeContext,
    );

  if (!context) {
    throw new Error(
      "useCaseBudgetTheme must be used within CaseBudgetThemeProvider.",
    );
  }

  return context;
}

export default function CaseBudgetThemeProvider({
  children,
  defaultTheme = DEFAULT_THEME,
  showGlobalToggle = true,
}: CaseBudgetThemeProviderProps) {
  const [
    theme,
    setThemeState,
  ] = useState<CaseBudgetTheme>(
    defaultTheme,
  );

  const [
    resolvedTheme,
    setResolvedTheme,
  ] = useState<ResolvedTheme>(
    () =>
      resolveTheme(
        defaultTheme,
      ),
  );

  const [
    isMounted,
    setIsMounted,
  ] = useState(false);

  const updateResolvedTheme =
    useCallback(
      (
        selectedTheme:
          CaseBudgetTheme,
      ) => {
        const nextResolvedTheme =
          resolveTheme(
            selectedTheme,
          );

        setResolvedTheme(
          nextResolvedTheme,
        );

        applyThemeToDocument(
          nextResolvedTheme,
          selectedTheme,
        );
      },
      [],
    );

  const persistThemePreference =
    useCallback(
      async (
        nextTheme:
          CaseBudgetTheme,
      ) => {
        try {
          const response =
            await fetch(
              "/api/preferences",
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
                    theme:
                      nextTheme,
                  }),
              },
            );

          if (
            !response.ok
          ) {
            console.error(
              "[CASE Budget Theme] Could not persist theme preference.",
              {
                status:
                  response.status,
              },
            );
          }
        } catch (
          error
        ) {
          console.error(
            "[CASE Budget Theme] Could not persist theme preference.",
            error,
          );
        }
      },
      [],
    );

  const setTheme =
    useCallback(
      (
        nextTheme:
          CaseBudgetTheme,
      ) => {
        setThemeState(
          nextTheme,
        );

        updateResolvedTheme(
          nextTheme,
        );

        void persistThemePreference(
          nextTheme,
        );
      },
      [
        persistThemePreference,
        updateResolvedTheme,
      ],
    );

  const toggleTheme =
    useCallback(
      () => {
        setTheme(
          resolvedTheme === "dark"
            ? "light"
            : "dark",
        );
      },
      [
        resolvedTheme,
        setTheme,
      ],
    );

  useEffect(
    () => {
      setThemeState(
        defaultTheme,
      );

      updateResolvedTheme(
        defaultTheme,
      );

      setIsMounted(
        true,
      );
    },
    [
      defaultTheme,
      updateResolvedTheme,
    ],
  );

  useEffect(
    () => {
      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        );

      function handleSystemThemeChange() {
        if (
          theme !== "system"
        ) {
          return;
        }

        updateResolvedTheme(
          "system",
        );
      }

      mediaQuery.addEventListener(
        "change",
        handleSystemThemeChange,
      );

      return () => {
        mediaQuery.removeEventListener(
          "change",
          handleSystemThemeChange,
        );
      };
    },
    [
      theme,
      updateResolvedTheme,
    ],
  );

  const contextValue =
    useMemo<CaseBudgetThemeContextValue>(
      () => ({
        theme,
        resolvedTheme,
        setTheme,
        toggleTheme,
      }),
      [
        resolvedTheme,
        setTheme,
        theme,
        toggleTheme,
      ],
    );

  return (
    <CaseBudgetThemeContext.Provider
      value={contextValue}
    >
      {children}

      {showGlobalToggle &&
      isMounted ? (
        <GlobalThemeSwitcher />
      ) : null}
    </CaseBudgetThemeContext.Provider>
  );
}

type FloatingControlPosition = {
  x:
    number;

  y:
    number;
};

type PreferencesApiPayload = {
  success:
    boolean;

  data:
    {
      floatingControlX:
        number | null;

      floatingControlY:
        number | null;
    } | null;
};

const FLOATING_CONTROL_EDGE_GAP =
  16;

const FLOATING_CONTROL_MOBILE_BOTTOM_GAP =
  96;

const FLOATING_CONTROL_DESKTOP_BOTTOM_GAP =
  20;

const FLOATING_CONTROL_DESKTOP_BREAKPOINT =
  1024;

const FLOATING_CONTROL_DRAG_THRESHOLD =
  4;

function GlobalThemeSwitcher() {
  const {
    theme,
    resolvedTheme,
    setTheme,
  } =
    useCaseBudgetTheme();

  const controlRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const dragRef =
    useRef<{
      pointerId:
        number;

      startPointerX:
        number;

      startPointerY:
        number;

      startLeft:
        number;

      startTop:
        number;

      moved:
        boolean;
    } | null>(
      null,
    );

  const suppressClickRef =
    useRef(
      false,
    );

  const [
    position,
    setPosition,
  ] =
    useState<FloatingControlPosition | null>(
      null,
    );

  const [
    isDragging,
    setIsDragging,
  ] =
    useState(
      false,
    );

  const [
    hasLoadedPosition,
    setHasLoadedPosition,
  ] =
    useState(
      false,
    );

  const getDefaultPosition =
    useCallback(
      (): FloatingControlPosition => {
        const element =
          controlRef.current;

        const width =
          element?.offsetWidth ??
          148;

        const height =
          element?.offsetHeight ??
          52;

        const bottomGap =
          window.innerWidth >=
          FLOATING_CONTROL_DESKTOP_BREAKPOINT
            ? FLOATING_CONTROL_DESKTOP_BOTTOM_GAP
            : FLOATING_CONTROL_MOBILE_BOTTOM_GAP;

        return {
          x:
            Math.max(
              FLOATING_CONTROL_EDGE_GAP,
              window.innerWidth -
                width -
                FLOATING_CONTROL_EDGE_GAP,
            ),

          y:
            Math.max(
              FLOATING_CONTROL_EDGE_GAP,
              window.innerHeight -
                height -
                bottomGap,
            ),
        };
      },
      [],
    );

  const clampPosition =
    useCallback(
      (
        nextPosition:
          FloatingControlPosition,
      ): FloatingControlPosition => {
        const element =
          controlRef.current;

        const width =
          element?.offsetWidth ??
          148;

        const height =
          element?.offsetHeight ??
          52;

        const maxX =
          Math.max(
            FLOATING_CONTROL_EDGE_GAP,
            window.innerWidth -
              width -
              FLOATING_CONTROL_EDGE_GAP,
          );

        const maxY =
          Math.max(
            FLOATING_CONTROL_EDGE_GAP,
            window.innerHeight -
              height -
              FLOATING_CONTROL_EDGE_GAP,
          );

        return {
          x:
            Math.min(
              Math.max(
                nextPosition.x,
                FLOATING_CONTROL_EDGE_GAP,
              ),
              maxX,
            ),

          y:
            Math.min(
              Math.max(
                nextPosition.y,
                FLOATING_CONTROL_EDGE_GAP,
              ),
              maxY,
            ),
        };
      },
      [],
    );

  const normalizedToPixels =
    useCallback(
      (
        x:
          number,

        y:
          number,
      ): FloatingControlPosition => {
        const element =
          controlRef.current;

        const width =
          element?.offsetWidth ??
          148;

        const height =
          element?.offsetHeight ??
          52;

        const availableWidth =
          Math.max(
            1,
            window.innerWidth -
              width,
          );

        const availableHeight =
          Math.max(
            1,
            window.innerHeight -
              height,
          );

        return clampPosition({
          x:
            x *
            availableWidth,

          y:
            y *
            availableHeight,
        });
      },
      [
        clampPosition,
      ],
    );

  const pixelsToNormalized =
    useCallback(
      (
        nextPosition:
          FloatingControlPosition,
      ) => {
        const element =
          controlRef.current;

        const width =
          element?.offsetWidth ??
          148;

        const height =
          element?.offsetHeight ??
          52;

        const availableWidth =
          Math.max(
            1,
            window.innerWidth -
              width,
          );

        const availableHeight =
          Math.max(
            1,
            window.innerHeight -
              height,
          );

        return {
          x:
            Math.min(
              1,
              Math.max(
                0,
                nextPosition.x /
                  availableWidth,
              ),
            ),

          y:
            Math.min(
              1,
              Math.max(
                0,
                nextPosition.y /
                  availableHeight,
              ),
            ),
        };
      },
      [],
    );

  const persistPosition =
    useCallback(
      async (
        nextPosition:
          FloatingControlPosition,
      ) => {
        const normalized =
          pixelsToNormalized(
            nextPosition,
          );

        try {
          const response =
            await fetch(
              "/api/preferences",
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
                    floatingControlX:
                      normalized.x,

                    floatingControlY:
                      normalized.y,
                  }),
              },
            );

          if (
            !response.ok
          ) {
            console.error(
              "[CASE Budget Theme] Could not persist floating-control position.",
              {
                status:
                  response.status,
              },
            );
          }
        } catch (
          error
        ) {
          console.error(
            "[CASE Budget Theme] Could not persist floating-control position.",
            error,
          );
        }
      },
      [
        pixelsToNormalized,
      ],
    );

  useEffect(
    () => {
      let cancelled =
        false;

      async function loadPosition() {
        try {
          const response =
            await fetch(
              "/api/preferences",
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
              },
            );

          if (
            !response.ok
          ) {
            if (
              !cancelled
            ) {
              setPosition(
                getDefaultPosition(),
              );
            }

            return;
          }

          const payload =
            (await response.json()) as
              PreferencesApiPayload;

          if (
            cancelled
          ) {
            return;
          }

          const x =
            payload.data
              ?.floatingControlX;

          const y =
            payload.data
              ?.floatingControlY;

          if (
            typeof x ===
              "number" &&
            Number.isFinite(
              x,
            ) &&
            typeof y ===
              "number" &&
            Number.isFinite(
              y,
            )
          ) {
            setPosition(
              normalizedToPixels(
                x,
                y,
              ),
            );

            return;
          }

          setPosition(
            getDefaultPosition(),
          );
        } catch {
          if (
            !cancelled
          ) {
            setPosition(
              getDefaultPosition(),
            );
          }
        } finally {
          if (
            !cancelled
          ) {
            setHasLoadedPosition(
              true,
            );
          }
        }
      }

      const frame =
        window.requestAnimationFrame(
          () => {
            void loadPosition();
          },
        );

      return () => {
        cancelled =
          true;

        window.cancelAnimationFrame(
          frame,
        );
      };
    },
    [
      getDefaultPosition,
      normalizedToPixels,
    ],
  );

  useEffect(
    () => {
      function handleResize() {
        setPosition(
          (
            currentPosition,
          ) => {
            if (
              !currentPosition
            ) {
              return getDefaultPosition();
            }

            return clampPosition(
              currentPosition,
            );
          },
        );
      }

      window.addEventListener(
        "resize",
        handleResize,
      );

      return () => {
        window.removeEventListener(
          "resize",
          handleResize,
        );
      };
    },
    [
      clampPosition,
      getDefaultPosition,
    ],
  );

  const handlePointerDown =
    useCallback(
      (
        event:
          ReactPointerEvent<HTMLDivElement>,
      ) => {
        if (
          event.button !==
            0
        ) {
          return;
        }

        const target =
          event.target as
            HTMLElement;

        /*
         * Theme buttons must retain their normal click behavior.
         *
         * Pointer capture on the draggable wrapper can retarget the pointer-up
         * sequence and prevent a button click from being delivered. Therefore
         * dragging only begins from the pill's padding/gap area, not from the
         * Light, Dark, or System buttons themselves.
         */
        if (
          target.closest(
            "button",
          )
        ) {
          return;
        }

        const element =
          controlRef.current;

        if (
          !element
        ) {
          return;
        }

        const rect =
          element.getBoundingClientRect();

        dragRef.current = {
          pointerId:
            event.pointerId,

          startPointerX:
            event.clientX,

          startPointerY:
            event.clientY,

          startLeft:
            rect.left,

          startTop:
            rect.top,

          moved:
            false,
        };

        element.setPointerCapture(
          event.pointerId,
        );
      },
      [],
    );

  const handlePointerMove =
    useCallback(
      (
        event:
          ReactPointerEvent<HTMLDivElement>,
      ) => {
        const drag =
          dragRef.current;

        if (
          !drag ||
          drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        const deltaX =
          event.clientX -
          drag.startPointerX;

        const deltaY =
          event.clientY -
          drag.startPointerY;

        if (
          !drag.moved &&
          Math.hypot(
            deltaX,
            deltaY,
          ) >=
            FLOATING_CONTROL_DRAG_THRESHOLD
        ) {
          drag.moved =
            true;

          setIsDragging(
            true,
          );
        }

        if (
          !drag.moved
        ) {
          return;
        }

        event.preventDefault();

        setPosition(
          clampPosition({
            x:
              drag.startLeft +
              deltaX,

            y:
              drag.startTop +
              deltaY,
          }),
        );
      },
      [
        clampPosition,
      ],
    );

  const finishDrag =
    useCallback(
      (
        event:
          ReactPointerEvent<HTMLDivElement>,
      ) => {
        const drag =
          dragRef.current;

        if (
          !drag ||
          drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        const element =
          controlRef.current;

        if (
          element?.hasPointerCapture(
            event.pointerId,
          )
        ) {
          element.releasePointerCapture(
            event.pointerId,
          );
        }

        dragRef.current =
          null;

        setIsDragging(
          false,
        );

        if (
          !drag.moved
        ) {
          return;
        }

        suppressClickRef.current =
          true;

        window.setTimeout(
          () => {
            suppressClickRef.current =
              false;
          },
          0,
        );

        setPosition(
          (
            currentPosition,
          ) => {
            const nextPosition =
              clampPosition(
                currentPosition ?? {
                  x:
                    drag.startLeft,

                  y:
                    drag.startTop,
                },
              );

            void persistPosition(
              nextPosition,
            );

            return nextPosition;
          },
        );
      },
      [
        clampPosition,
        persistPosition,
      ],
    );

  const handleClickCapture =
    useCallback(
      (
        event:
          React.MouseEvent<HTMLDivElement>,
      ) => {
        if (
          !suppressClickRef.current
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      },
      [],
    );

  const resetPosition =
    useCallback(
      async () => {
        /*
         * null/null is the canonical "use the default placement" state.
         * Updating local state first makes the control jump back immediately.
         */
        setPosition(
          null,
        );

        try {
          const response =
            await fetch(
              "/api/preferences",
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
                    floatingControlX:
                      null,

                    floatingControlY:
                      null,
                  }),
              },
            );

          if (
            !response.ok
          ) {
            console.error(
              "[CASE Budget Theme] Could not reset floating-control position.",
              {
                status:
                  response.status,
              },
            );
          }
        } catch (
          error
        ) {
          console.error(
            "[CASE Budget Theme] Could not reset floating-control position.",
            error,
          );
        }
      },
      [],
    );

  return (
    <div
      ref={
        controlRef
      }
      aria-label="Theme controls. Drag the space around the buttons to reposition."
      title="Drag the space around the buttons to move"
      onPointerDown={
        handlePointerDown
      }
      onPointerMove={
        handlePointerMove
      }
      onPointerUp={
        finishDrag
      }
      onPointerCancel={
        finishDrag
      }
      onClickCapture={
        handleClickCapture
      }
      className={[
        "fixed z-[70] touch-none select-none",
        isDragging
          ? "cursor-grabbing"
          : "cursor-grab",
        hasLoadedPosition
          ? "opacity-100"
          : "pointer-events-none opacity-0",
      ].join(
        " ",
      )}
      style={
        position
          ? {
              left:
                `${position.x}px`,

              top:
                `${position.y}px`,
            }
          : {
              right:
                `${FLOATING_CONTROL_EDGE_GAP}px`,

              bottom:
                `${
                  typeof window !==
                    "undefined" &&
                  window.innerWidth >=
                    FLOATING_CONTROL_DESKTOP_BREAKPOINT
                    ? FLOATING_CONTROL_DESKTOP_BOTTOM_GAP
                    : FLOATING_CONTROL_MOBILE_BOTTOM_GAP
                }px`,
            }
      }
    >
      <div className="flex items-center gap-1 rounded-2xl border border-[var(--border-default)] bg-[var(--surface-elevated)] p-1.5 shadow-[var(--shadow-lg)] backdrop-blur-xl">
        <ThemeOptionButton
          label="Light"
          isActive={
            theme === "light"
          }
          onClick={() =>
            setTheme(
              "light",
            )
          }
        >
          <SunIcon />
        </ThemeOptionButton>

        <ThemeOptionButton
          label="Dark"
          isActive={
            theme === "dark"
          }
          onClick={() =>
            setTheme(
              "dark",
            )
          }
        >
          <MoonIcon />
        </ThemeOptionButton>

        <ThemeOptionButton
          label="System"
          description={`System is currently using ${resolvedTheme} mode`}
          isActive={
            theme === "system"
          }
          onClick={() =>
            setTheme(
              "system",
            )
          }
        >
          <SystemIcon />
        </ThemeOptionButton>

        <button
          type="button"
          aria-label="Reset theme control position"
          title="Reset position"
          onClick={
            () => {
              void resetPosition();
            }
          }
          className={[
            "inline-flex h-10 w-10 items-center justify-center rounded-xl outline-none transition-[background-color,color,box-shadow]",
            "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
            "focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
          ].join(
            " ",
          )}
        >
          <ResetPositionIcon />
        </button>
      </div>
    </div>
  );
}

type ThemeOptionButtonProps = {
  children: ReactNode;
  label: string;
  description?: string;
  isActive: boolean;
  onClick: () => void;
};

function ThemeOptionButton({
  children,
  label,
  description,
  isActive,
  onClick,
}: ThemeOptionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isActive}
      title={
        description ?? label
      }
      onClick={onClick}
      className={[
        "inline-flex h-10 w-10 items-center justify-center rounded-xl outline-none transition-[background-color,color,box-shadow]",
        "focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        isActive
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
          : "text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ResetPositionIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v6h6" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="4"
      />

      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.42 1.42" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.42" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="13"
        rx="2"
      />

      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}