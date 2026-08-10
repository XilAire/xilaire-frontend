import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type ComponentSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";

export type ComponentVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted"
  | "outline"
  | "ghost";

export type ComponentAlignment =
  | "start"
  | "center"
  | "end"
  | "stretch";

export type ComponentOrientation =
  | "horizontal"
  | "vertical";

export type ComponentStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "disabled";

export type SemanticTone =
  | "neutral"
  | "positive"
  | "negative"
  | "warning"
  | "info";

export type ResponsiveValue<T> =
  | T
  | {
      base?: T;
      sm?: T;
      md?: T;
      lg?: T;
      xl?: T;
    };

export type SelectOption<TValue extends string = string> = {
  label: string;
  value: TValue;
  description?: string;
  disabled?: boolean;
  icon?: ReactNode;
};

export type NavigationItem = {
  label: string;
  href: string;
  description?: string;
  icon?: ReactNode;
  badge?: ReactNode;
  disabled?: boolean;
  external?: boolean;
};

export type ActionItem = {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  description?: string;
  disabled?: boolean;
  destructive?: boolean;
};

export type BaseComponentProps =
  HTMLAttributes<HTMLElement> & {
    children?: ReactNode;
  };

export type WithClassName = {
  className?: string;
};

export type WithChildren = {
  children: ReactNode;
};

export type WithOptionalChildren = {
  children?: ReactNode;
};

export type WithLoadingState = {
  isLoading?: boolean;
  loadingText?: string;
};

export type WithDisabledState = {
  disabled?: boolean;
};

export type WithErrorState = {
  error?: string | null;
};

export type WithLabel = {
  label: string;
};

export type WithDescription = {
  description?: ReactNode;
};

export type WithIcon = {
  icon?: ReactNode;
};

export type WithActions = {
  actions?: ReactNode;
};

export type WithTestId = {
  testId?: string;
};

export type EmptyStateContent = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
};

export type PaginationState = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type SortDirection =
  | "asc"
  | "desc";

export type SortState<TKey extends string = string> = {
  key: TKey;
  direction: SortDirection;
};

export type TableColumn<
  TData,
  TKey extends string = string,
> = {
  key: TKey;
  label: string;
  align?: "left" | "center" | "right";
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render: (
    item: TData,
    index: number,
  ) => ReactNode;
};

export type ToastTone =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  dismissible?: boolean;
  action?: ReactNode;
};

export type ModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "full";

export type DropdownPlacement =
  | "top-start"
  | "top-end"
  | "bottom-start"
  | "bottom-end"
  | "left-start"
  | "left-end"
  | "right-start"
  | "right-end";