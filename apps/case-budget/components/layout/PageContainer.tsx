import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type PageContainerWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full";

export type PageContainerSpacing =
  | "none"
  | "sm"
  | "md"
  | "lg";

export type PageContainerProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    title?: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    breadcrumbs?: ReactNode;
    width?: PageContainerWidth;
    spacing?: PageContainerSpacing;
    contentClassName?: string;
    headerClassName?: string;
  };

const widthClasses: Record<
  PageContainerWidth,
  string
> = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-[1600px]",
  full: "max-w-none",
};

const spacingClasses: Record<
  PageContainerSpacing,
  string
> = {
  none: "",
  sm: "py-4 sm:py-6",
  md: "py-6 sm:py-8",
  lg: "py-8 sm:py-10 lg:py-12",
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

export default function PageContainer({
  children,
  title,
  description,
  actions,
  breadcrumbs,
  width = "lg",
  spacing = "md",
  className = "",
  contentClassName = "",
  headerClassName = "",
  ...containerProps
}: PageContainerProps) {
  const hasHeader =
    Boolean(title) ||
    Boolean(description) ||
    Boolean(actions);

  return (
    <div
      {...containerProps}
      className={joinClassNames(
        "mx-auto w-full px-4 text-[var(--text-primary)] transition-colors duration-200 sm:px-6 lg:px-8",
        widthClasses[width],
        spacingClasses[spacing],
        className,
      )}
    >
      {breadcrumbs ? (
        <div className="mb-4 text-sm text-[var(--text-muted)] sm:mb-5">
          {breadcrumbs}
        </div>
      ) : null}

      {hasHeader ? (
        <header
          className={joinClassNames(
            "mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between",
            headerClassName,
          )}
        >
          <div className="min-w-0 flex-1">
            {title ? (
              <div className="text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
                {title}
              </div>
            ) : null}

            {description ? (
              <div
                className={joinClassNames(
                  "max-w-3xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base",
                  title
                    ? "mt-2"
                    : "",
                )}
              >
                {description}
              </div>
            ) : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
              {actions}
            </div>
          ) : null}
        </header>
      ) : null}

      <main
        className={joinClassNames(
          "min-w-0 text-[var(--text-primary)]",
          contentClassName,
        )}
      >
        {children}
      </main>
    </div>
  );
}