import type {
  HTMLAttributes,
  ReactNode,
} from "react";

type SectionHeaderProps =
  HTMLAttributes<HTMLDivElement> & {
    title: string;
    description?: string;
    eyebrow?: string;
    action?: ReactNode;
    icon?: ReactNode;
    align?: "start" | "center";
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

export default function SectionHeader({
  title,
  description,
  eyebrow,
  action,
  icon,
  align = "start",
  className = "",
  ...sectionHeaderProps
}: SectionHeaderProps) {
  const isCentered =
    align === "center";

  return (
    <div
      {...sectionHeaderProps}
      className={joinClassNames(
        "flex gap-4 text-[var(--text-primary)]",
        isCentered
          ? "flex-col items-center text-center"
          : "flex-col sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div
        className={joinClassNames(
          "min-w-0",
          isCentered
            ? "max-w-3xl"
            : "flex-1",
        )}
      >
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">
            {eyebrow}
          </p>
        ) : null}

        <div
          className={joinClassNames(
            "flex gap-3",
            isCentered
              ? "flex-col items-center"
              : "items-start",
            eyebrow
              ? "mt-2"
              : "",
          )}
        >
          {icon ? (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--primary-border)] bg-[var(--primary-soft)] text-[var(--primary)]">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)] sm:text-2xl">
              {title}
            </h2>

            {description ? (
              <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
                {description}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {action ? (
        <div
          className={joinClassNames(
            "flex shrink-0 items-center gap-2",
            isCentered
              ? "justify-center"
              : "sm:justify-end",
          )}
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}