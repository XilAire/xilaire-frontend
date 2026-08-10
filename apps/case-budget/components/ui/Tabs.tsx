"use client";

import {
  createContext,
  useContext,
  useId,
  useMemo,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

type TabsOrientation = "horizontal" | "vertical";

type TabsContextValue = {
  activeValue: string;
  baseId: string;
  orientation: TabsOrientation;
  setActiveValue: (value: string) => void;
};

type TabsProps = Omit<HTMLAttributes<HTMLDivElement>, "defaultValue"> & {
  children: ReactNode;
  value?: string;
  defaultValue?: string;
  orientation?: TabsOrientation;
  onValueChange?: (value: string) => void;
};

type TabsListProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  variant?: "default" | "pills" | "underline";
  fullWidth?: boolean;
};

type TabsTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  value: string;
  icon?: ReactNode;
  badge?: ReactNode;
};

type TabsContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  value: string;
  forceMount?: boolean;
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);

  if (!context) {
    throw new Error(
      "Tabs components must be rendered inside the Tabs component.",
    );
  }

  return context;
}

function sanitizeId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function Tabs({
  children,
  value,
  defaultValue = "",
  orientation = "horizontal",
  onValueChange,
  className = "",
  ...tabsProps
}: TabsProps) {
  const generatedId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue);

  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      activeValue,
      baseId: `tabs-${generatedId.replace(/:/g, "")}`,
      orientation,
      setActiveValue: (nextValue: string) => {
        if (!isControlled) {
          setInternalValue(nextValue);
        }

        onValueChange?.(nextValue);
      },
    }),
    [
      activeValue,
      generatedId,
      isControlled,
      onValueChange,
      orientation,
    ],
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        {...tabsProps}
        data-orientation={orientation}
        className={[
          orientation === "vertical"
            ? "flex items-start gap-6"
            : "w-full",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  children,
  variant = "default",
  fullWidth = false,
  className = "",
  ...listProps
}: TabsListProps) {
  const { orientation } = useTabsContext();

  const variantClasses = {
    default:
      "rounded-xl border border-white/10 bg-white/[0.04] p-1",
    pills: "gap-1",
    underline: "border-b border-white/10",
  };

  return (
    <div
      {...listProps}
      role="tablist"
      aria-orientation={orientation}
      data-variant={variant}
      className={[
        "flex",
        orientation === "vertical"
          ? "w-56 shrink-0 flex-col"
          : "items-center overflow-x-auto",
        fullWidth && orientation === "horizontal"
          ? "w-full"
          : "w-fit max-w-full",
        variantClasses[variant],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  children,
  value,
  icon,
  badge,
  className = "",
  disabled,
  onClick,
  ...triggerProps
}: TabsTriggerProps) {
  const {
    activeValue,
    baseId,
    orientation,
    setActiveValue,
  } = useTabsContext();

  const isActive = activeValue === value;
  const safeValue = sanitizeId(value);
  const triggerId = `${baseId}-trigger-${safeValue}`;
  const contentId = `${baseId}-content-${safeValue}`;

  function handleClick(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    onClick?.(event);

    if (!event.defaultPrevented && !disabled) {
      setActiveValue(value);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>,
  ) {
    if (
      event.key !== "ArrowRight" &&
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Home" &&
      event.key !== "End"
    ) {
      return;
    }

    const currentTrigger = event.currentTarget;
    const tabList = currentTrigger.closest('[role="tablist"]');

    if (!tabList) {
      return;
    }

    const enabledTabs = Array.from(
      tabList.querySelectorAll<HTMLButtonElement>(
        '[role="tab"]:not(:disabled)',
      ),
    );

    const currentIndex = enabledTabs.indexOf(currentTrigger);

    if (currentIndex === -1) {
      return;
    }

    const isForwardKey =
      orientation === "horizontal"
        ? event.key === "ArrowRight"
        : event.key === "ArrowDown";

    const isBackwardKey =
      orientation === "horizontal"
        ? event.key === "ArrowLeft"
        : event.key === "ArrowUp";

    let nextIndex = currentIndex;

    if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = enabledTabs.length - 1;
    } else if (isForwardKey) {
      nextIndex = (currentIndex + 1) % enabledTabs.length;
    } else if (isBackwardKey) {
      nextIndex =
        (currentIndex - 1 + enabledTabs.length) %
        enabledTabs.length;
    } else {
      return;
    }

    event.preventDefault();

    const nextTab = enabledTabs[nextIndex];

    nextTab.focus();
    nextTab.click();
  }

  return (
    <button
      {...triggerProps}
      id={triggerId}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={contentId}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      data-state={isActive ? "active" : "inactive"}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={[
        "group relative inline-flex min-h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:pointer-events-none disabled:opacity-40",
        "data-[state=active]:text-white data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-200",
        "[[data-variant=default]_&]:rounded-lg [[data-variant=default]_&]:data-[state=active]:bg-slate-800 [[data-variant=default]_&]:data-[state=active]:shadow-sm",
        "[[data-variant=pills]_&]:rounded-full [[data-variant=pills]_&]:data-[state=active]:bg-emerald-500/15 [[data-variant=pills]_&]:data-[state=active]:text-emerald-300",
        "[[data-variant=underline]_&]:rounded-none [[data-variant=underline]_&]:border-b-2 [[data-variant=underline]_&]:border-transparent [[data-variant=underline]_&]:data-[state=active]:border-emerald-400 [[data-variant=underline]_&]:data-[state=active]:text-emerald-300",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {icon ? (
        <span
          className={[
            "flex shrink-0 items-center justify-center transition",
            isActive
              ? "text-current"
              : "text-slate-600 group-hover:text-slate-300",
          ].join(" ")}
          aria-hidden="true"
        >
          {icon}
        </span>
      ) : null}

      <span>{children}</span>

      {badge ? (
        <span
          className={[
            "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
            isActive
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/[0.06] text-slate-500",
          ].join(" ")}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}

export function TabsContent({
  children,
  value,
  forceMount = false,
  className = "",
  ...contentProps
}: TabsContentProps) {
  const { activeValue, baseId } = useTabsContext();

  const isActive = activeValue === value;
  const safeValue = sanitizeId(value);
  const triggerId = `${baseId}-trigger-${safeValue}`;
  const contentId = `${baseId}-content-${safeValue}`;

  if (!isActive && !forceMount) {
    return null;
  }

  return (
    <div
      {...contentProps}
      id={contentId}
      role="tabpanel"
      aria-labelledby={triggerId}
      hidden={!isActive}
      tabIndex={0}
      data-state={isActive ? "active" : "inactive"}
      className={[
        "min-w-0 flex-1 focus:outline-none",
        isActive ? "animate-in fade-in duration-200" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}