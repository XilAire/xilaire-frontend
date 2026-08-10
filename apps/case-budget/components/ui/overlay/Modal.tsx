"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

type ModalContextValue = {
  open: boolean;
  titleId: string;
  descriptionId: string;
  onOpenChange: (open: boolean) => void;
};

type ModalProps = {
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ModalTriggerProps = {
  children: ReactNode;
  asChild?: boolean;
};

type ModalContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  size?: ModalSize;
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
};

type ModalHeaderProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type ModalTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  children: ReactNode;
};

type ModalDescriptionProps =
  HTMLAttributes<HTMLParagraphElement> & {
    children: ReactNode;
  };

type ModalBodyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type ModalFooterProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

type ModalCloseProps = {
  children: ReactNode;
  asChild?: boolean;
};

type TriggerElementProps = {
  onClick?: React.MouseEventHandler<HTMLElement>;
  "aria-haspopup"?: "dialog";
  "aria-expanded"?: boolean;
};

type CloseElementProps = {
  onClick?: React.MouseEventHandler<HTMLElement>;
};

const ModalContext = createContext<ModalContextValue | null>(
  null,
);

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  xl: "max-w-5xl",
  full:
    "h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] sm:h-[calc(100dvh-3rem)] sm:max-w-[calc(100vw-3rem)]",
};

function useModalContext() {
  const context = useContext(ModalContext);

  if (!context) {
    throw new Error(
      "Modal components must be rendered inside Modal.",
    );
  }

  return context;
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
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null,
  );
}

function mergeClickHandlers(
  originalHandler:
    | React.MouseEventHandler<HTMLElement>
    | undefined,
  additionalHandler: React.MouseEventHandler<HTMLElement>,
) {
  return (event: React.MouseEvent<HTMLElement>) => {
    originalHandler?.(event);

    if (!event.defaultPrevented) {
      additionalHandler(event);
    }
  };
}

export default function Modal({
  children,
  open,
  onOpenChange,
}: ModalProps) {
  const generatedId = useId();

  const normalizedId = generatedId.replace(/:/g, "");

  const contextValue = useMemo<ModalContextValue>(
    () => ({
      open,
      titleId: `modal-title-${normalizedId}`,
      descriptionId: `modal-description-${normalizedId}`,
      onOpenChange,
    }),
    [
      normalizedId,
      onOpenChange,
      open,
    ],
  );

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
}

export function ModalTrigger({
  children,
  asChild = false,
}: ModalTriggerProps) {
  const { open, onOpenChange } = useModalContext();

  function openModal() {
    onOpenChange(true);
  }

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement<TriggerElementProps>(child)) {
      throw new Error(
        "ModalTrigger with asChild requires one valid React element.",
      );
    }

    return cloneElement(child, {
      "aria-haspopup": "dialog",
      "aria-expanded": open,
      onClick: mergeClickHandlers(
        child.props.onClick,
        openModal,
      ),
    });
  }

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={openModal}
    >
      {children}
    </button>
  );
}

export function ModalContent({
  children,
  size = "md",
  closeOnEscape = true,
  closeOnOverlayClick = true,
  showCloseButton = true,
  className = "",
  ...contentProps
}: ModalContentProps) {
  const {
    open,
    titleId,
    descriptionId,
    onOpenChange,
  } = useModalContext();

  const modalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement =
    useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    previouslyFocusedElement.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const originalOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const modalElement = modalRef.current;

    if (modalElement) {
      const focusableElements =
        getFocusableElements(modalElement);

      const initialFocusTarget =
        focusableElements[0] ?? modalElement;

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

      const modalElement = modalRef.current;

      if (!modalElement) {
        return;
      }

      const focusableElements =
        getFocusableElements(modalElement);

      if (focusableElements.length === 0) {
        event.preventDefault();
        modalElement.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      if (
        event.shiftKey &&
        document.activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      data-state={open ? "open" : "closed"}
    >
      <button
        type="button"
        aria-label="Close modal"
        tabIndex={-1}
        className="absolute inset-0 cursor-default bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => {
          if (closeOnOverlayClick) {
            onOpenChange(false);
          }
        }}
      />

      <div
        {...contentProps}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className={[
          "relative z-10 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 shadow-2xl shadow-black/50 outline-none",
          "animate-in fade-in zoom-in-95 duration-200",
          sizeClasses[size],
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {showCloseButton ? (
          <button
            type="button"
            aria-label="Close modal"
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

export function ModalHeader({
  children,
  className = "",
  ...headerProps
}: ModalHeaderProps) {
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

export function ModalTitle({
  children,
  className = "",
  ...titleProps
}: ModalTitleProps) {
  const { titleId } = useModalContext();

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

export function ModalDescription({
  children,
  className = "",
  ...descriptionProps
}: ModalDescriptionProps) {
  const { descriptionId } = useModalContext();

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

export function ModalBody({
  children,
  className = "",
  ...bodyProps
}: ModalBodyProps) {
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

export function ModalFooter({
  children,
  className = "",
  ...footerProps
}: ModalFooterProps) {
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

export function ModalClose({
  children,
  asChild = false,
}: ModalCloseProps) {
  const { onOpenChange } = useModalContext();

  function closeModal() {
    onOpenChange(false);
  }

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement<CloseElementProps>(child)) {
      throw new Error(
        "ModalClose with asChild requires one valid React element.",
      );
    }

    return cloneElement(child, {
      onClick: mergeClickHandlers(
        child.props.onClick,
        closeModal,
      ),
    });
  }

  return (
    <button
      type="button"
      onClick={closeModal}
    >
      {children}
    </button>
  );
}

export function ModalAction({
  children,
  className = "",
  type = "button",
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...buttonProps}
      type={type}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}

export function ModalCancel({
  children,
  className = "",
  type = "button",
  onClick,
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { onOpenChange } = useModalContext();

  function handleClick(
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    onClick?.(event);

    if (!event.defaultPrevented) {
      onOpenChange(false);
    }
  }

  return (
    <button
      {...buttonProps}
      type={type}
      onClick={handleClick}
      className={[
        "inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:pointer-events-none disabled:opacity-50",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}