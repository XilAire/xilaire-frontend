import {
  forwardRef,
  type TextareaHTMLAttributes,
} from "react";

export type TextareaResize =
  | "none"
  | "vertical"
  | "horizontal"
  | "both";

export type TextareaProps =
  TextareaHTMLAttributes<HTMLTextAreaElement> & {
    isInvalid?: boolean;
    resize?: TextareaResize;
  };

const resizeClasses: Record<
  TextareaResize,
  string
> = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames
    .filter(Boolean)
    .join(" ");
}

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(function Textarea(
  {
    isInvalid = false,
    resize = "vertical",
    className = "",
    disabled,
    rows = 4,
    "aria-describedby":
      ariaDescribedBy,
    ...textareaProps
  },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      disabled={disabled}
      aria-invalid={
        isInvalid
          ? true
          : undefined
      }
      aria-describedby={
        ariaDescribedBy
      }
      className={joinClassNames(
        "min-h-28",
        "w-full",
        "rounded-xl",
        "border",
        "bg-[var(--surface-default)]",
        "px-3.5",
        "py-3",
        "text-sm",
        "text-[var(--text-primary)]",
        "shadow-[var(--shadow-xs)]",
        "outline-none",
        "transition-[background-color,border-color,box-shadow,color]",
        "duration-[var(--motion-fast)]",
        "ease-out",
        "placeholder:text-[var(--text-muted)]",
        "hover:bg-[var(--surface-muted)]",
        "focus:bg-[var(--surface-default)]",
        "focus:ring-2",
        "focus:ring-offset-0",
        "disabled:cursor-not-allowed",
        "disabled:bg-[var(--surface-muted)]",
        "disabled:text-[var(--text-disabled)]",
        "disabled:opacity-70",
        "read-only:cursor-default",
        "read-only:bg-[var(--surface-muted)]",
        resizeClasses[resize],
        isInvalid
          ? [
              "border-[var(--danger)]",
              "focus:border-[var(--danger)]",
              "focus:ring-[color-mix(in_srgb,var(--danger)_20%,transparent)]",
            ].join(" ")
          : [
              "border-[var(--border-default)]",
              "focus:border-[var(--primary)]",
              "focus:ring-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
            ].join(" "),
        className,
      )}
      {...textareaProps}
    />
  );
});

Textarea.displayName = "Textarea";

export default Textarea;