"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type DrawerSide = "left" | "right" | "top" | "bottom";

type DrawerSize = "sm" | "md" | "lg" | "xl" | "full";

type DrawerContextValue = {
  open: boolean;
  titleId: string;
  descriptionId: string;
  onOpenChange: (open: boolean) => void;
};

type DrawerProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type DrawerTriggerProps = {
  children: ReactNode;
  asChild?: boolean;
};

type DrawerContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  side?: DrawerSide;
  size?: DrawerSize;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
};

type DrawerHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type DrawerTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
};

type DrawerDescriptionProps =
  HTMLAttributes<HTMLParagraphElement> & {
    children: ReactNode;
  };

type DrawerBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type DrawerFooterProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type DrawerCloseProps = {
  children: ReactNode;
  asChild?: boolean;
};

const DrawerContext =
  createContext<DrawerContextValue | null>(null);

const sideClasses: Record<DrawerSide, string> = {
  left:
    "inset-y-0 left-0 h-full border-r border-white/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left",
  right:
    "inset-y-0 right-0 h-full border-l border-white/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
  top:
    "inset-x-0 top-0 w-full border-b border-white/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-top data-[state=closed]:animate-out data-[state=closed]:slide-out-to-top",
  bottom:
    "inset-x-0 bottom-0 w-full rounded-t-3xl border-t border-white/10 data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
};

const horizontalSizeClasses: Record<DrawerSize, string> = {
  sm: "w-[min(100%,20rem)]",
  md: "w-[min(100%,28rem)]",
  lg: "w-[min(100%,36rem)]",
  xl: "w-[min(100%,48rem)]",
  full: "w-full",
};

const verticalSizeClasses: Record<DrawerSize, string> = {
  sm: "max-h-[35vh]",
  md: "max-h-[50vh]",
  lg: "max-h-[70vh]",
  xl: "max-h-[85vh]",
  full: "h-full",
};

function useDrawerContext() {
  const context = useContext(DrawerContext);

  if (!context) {
    throw new Error(
      "Drawer components must be rendered inside Drawer.",
    );
  }

  return context;
}

function isHTMLElement(
  value: EventTarget | null,
): value is HTMLElement {
  return value instanceof HTMLElement;
}

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        "a[href]",
        "button:not([disabled])",
        "textarea:not([disabled])",
        "input:not([disabled])",
        "select:not([disabled])",
        '[tabindex]:not([tabindex="-1"])',
      ].join(","),
    ),
  ).filter(
    (element) =>
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true",
  );
}

export default function Drawer({
  children,
  open,
  onOpenChange,
}: DrawerProps) {
  const generatedId = useId();

  const contextValue = useMemo<DrawerContextValue>(
    () => ({
      open,
      titleId: `drawer-title-${generatedId.replace(/:/g, "")}`,
      descriptionId: `drawer-description-${generatedId.replace(
        /:/g,
        "",
      )}`,
      onOpenChange,
    }),
    [generatedId, onOpenChange, open],
  );

  return (
    <DrawerContext.Provider value={contextValue}>
      {children}
    </DrawerContext.Provider>
  );
}

export function DrawerTrigger({
  children,
  asChild = false,
}: DrawerTriggerProps) {
  const { open, onOpenChange } = useDrawerContext();

  if (asChild && typeof children === "object") {
    return (
      <span
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => onOpenChange(true)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" ||
            event.key === " "
          ) {
            event.preventDefault();
            onOpenChange(true);
          }
        }}
        className="contents"
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => onOpenChange(true)}
    >
      {children}
    </button>
  );
}

export function DrawerContent({
  children,
  side = "right",
  size = "md",
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = "",
  ...contentProps
}: DrawerContentProps) {
  const {
    open,
    titleId,
    descriptionId,
    onOpenChange,
  } = useDrawerContext();

  const drawerRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement =
    useRef<HTMLElement | null>(null);

  const isHorizontal =
    side === "left" || side === "right";

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const drawerElement = drawerRef.current;

    if (drawerElement) {
      const focusableElements =
        getFocusableElements(drawerElement);

      const initialFocusTarget =
        focusableElements[0] ?? drawerElement;

      window.requestAnimationFrame(() => {
        initialFocusTarget.focus();
      });
    }

    return () => {
      document.body.style.overflow = originalOverflow;

      window.requestAnimationFrame(() => {
        previouslyFocusedElement.current?.focus();
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (
        closeOnEscape &&
        event.key === "Escape"
      ) {
        event.preventDefault();
        onOpenChange(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const drawerElement = drawerRef.current;

      if (!drawerElement) {
        return;
      }

      const focusableElements =
        getFocusableElements(drawerElement);

      if (focusableElements.length === 0) {
        event.preventDefault();
        drawerElement.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        document.activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    closeOnEscape,
    onOpenChange,
    open,
  ]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      data-state={open ? "open" : "closed"}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200"
        onMouseDown={(event) => {
          if (
            closeOnOverlayClick &&
            event.target === event.currentTarget
          ) {
            onOpenChange(false);
          }
        }}
      />

      <div
        {...contentProps}
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        data-state={open ? "open" : "closed"}
        data-side={side}
        className={[
          "fixed z-10 flex flex-col overflow-hidden bg-slate-950 shadow-2xl shadow-black/40 outline-none duration-300",
          sideClasses[side],
          isHorizontal
            ? horizontalSizeClasses[size]
            : verticalSizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {side === "bottom" ? (
          <div
            aria-hidden="true"
            className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-white/15"
          />
        ) : null}

        {showCloseButton ? (
          <button
            type="button"
            aria-label="Close drawer"
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-900/90 text-slate-400 transition hover:border-white/20 hover:bg-slate-800 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        ) : null}

        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DrawerHeader({
  children,
  className = "",
  ...headerProps
}: DrawerHeaderProps) {
  return (
    <div
      {...headerProps}
      className={[
        "shrink-0 border-b border-white/10 px-5 py-5 pr-16 sm:px-6 sm:py-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function DrawerTitle({
  children,
  className = "",
  ...titleProps
}: DrawerTitleProps) {
  const { titleId } = useDrawerContext();

  return (
    <h2
      {...titleProps}
      id={titleId}
      className={[
        "text-lg font-bold tracking-tight text-white sm:text-xl",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </h2>
  );
}

export function DrawerDescription({
  children,
  className = "",
  ...descriptionProps
}: DrawerDescriptionProps) {
  const { descriptionId } = useDrawerContext();

  return (
    <p
      {...descriptionProps}
      id={descriptionId}
      className={[
        "mt-2 text-sm leading-6 text-slate-400",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </p>
  );
}

export function DrawerBody({
  children,
  className = "",
  ...bodyProps
}: DrawerBodyProps) {
  return (
    <div
      {...bodyProps}
      className={[
        "min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6 sm:py-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

export function DrawerFooter({
  children,
  className = "",
  ...footerProps
}: DrawerFooterProps) {
  return (
    <div
      {...footerProps}
      className={[
        "shrink-0 border-t border-white/10 bg-slate-950/95 px-5 py-4 sm:px-6",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {children}
      </div>
    </div>
  );
}

export function DrawerClose({
  children,
  asChild = false,
}: DrawerCloseProps) {
  const { onOpenChange } = useDrawerContext();

  function handleClose(
    event:
      | React.MouseEvent<HTMLElement>
      | React.KeyboardEvent<HTMLElement>,
  ) {
    if (
      "key" in event &&
      event.key !== "Enter" &&
      event.key !== " "
    ) {
      return;
    }

    if ("key" in event) {
      event.preventDefault();
    }

    onOpenChange(false);
  }

  if (asChild && typeof children === "object") {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={(event) => {
          if (isHTMLElement(event.target)) {
            handleClose(event);
          }
        }}
        onKeyDown={handleClose}
        className="contents"
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenChange(false)}
    >
      {children}
    </button>
  );
}