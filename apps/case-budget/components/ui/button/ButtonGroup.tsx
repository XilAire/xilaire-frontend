import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type ButtonGroupOrientation =
  | "horizontal"
  | "vertical";

export type ButtonGroupAlignment =
  | "start"
  | "center"
  | "end"
  | "stretch";

export type ButtonGroupGap =
  | "none"
  | "sm"
  | "md"
  | "lg";

export type ButtonGroupProps =
  HTMLAttributes<HTMLDivElement> & {
    children: ReactNode;
    orientation?: ButtonGroupOrientation;
    alignment?: ButtonGroupAlignment;
    gap?: ButtonGroupGap;
    fullWidth?: boolean;
    wrap?: boolean;
  };

const orientationClasses: Record<
  ButtonGroupOrientation,
  string
> = {
  horizontal: "flex-row",
  vertical: "flex-col",
};

const horizontalAlignmentClasses: Record<
  ButtonGroupAlignment,
  string
> = {
  start: "items-center justify-start",
  center: "items-center justify-center",
  end: "items-center justify-end",
  stretch: "items-stretch justify-start",
};

const verticalAlignmentClasses: Record<
  ButtonGroupAlignment,
  string
> = {
  start: "items-start justify-start",
  center: "items-center justify-start",
  end: "items-end justify-start",
  stretch: "items-stretch justify-start",
};

const gapClasses: Record<
  ButtonGroupGap,
  string
> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-3",
  lg: "gap-4",
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames.filter(Boolean).join(" ");
}

export default function ButtonGroup({
  children,
  orientation = "horizontal",
  alignment = "start",
  gap = "sm",
  fullWidth = false,
  wrap = false,
  className = "",
  role = "group",
  ...groupProps
}: ButtonGroupProps) {
  const alignmentClasses =
    orientation === "horizontal"
      ? horizontalAlignmentClasses[alignment]
      : verticalAlignmentClasses[alignment];

  return (
    <div
      {...groupProps}
      role={role}
      className={joinClassNames(
        "flex",
        orientationClasses[orientation],
        alignmentClasses,
        gapClasses[gap],
        fullWidth ? "w-full" : "",
        wrap ? "flex-wrap" : "",
        className,
      )}
    >
      {children}
    </div>
  );
}