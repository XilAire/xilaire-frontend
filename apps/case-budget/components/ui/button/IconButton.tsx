import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import Button, {
  type ButtonVariant,
} from "./Button";

export type IconButtonSize =
  | "sm"
  | "md"
  | "lg";

export type IconButtonProps =
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "children"
  > & {
    icon: ReactNode;
    label: string;
    variant?: ButtonVariant;
    size?: IconButtonSize;
    isLoading?: boolean;
  };

const sizeClasses: Record<
  IconButtonSize,
  string
> = {
  sm: "h-9 w-9 min-h-9",
  md: "h-11 w-11 min-h-11",
  lg: "h-12 w-12 min-h-12",
};

function joinClassNames(
  ...classNames: Array<
    string | false | null | undefined
  >
) {
  return classNames.filter(Boolean).join(" ");
}

export default function IconButton({
  icon,
  label,
  variant = "ghost",
  size = "md",
  isLoading = false,
  className = "",
  type = "button",
  ...buttonProps
}: IconButtonProps) {
  return (
    <Button
      {...buttonProps}
      type={type}
      variant={variant}
      size="icon"
      isLoading={isLoading}
      loadingText={label}
      aria-label={label}
      title={buttonProps.title ?? label}
      className={joinClassNames(
        sizeClasses[size],
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex items-center justify-center"
      >
        {icon}
      </span>
    </Button>
  );
}