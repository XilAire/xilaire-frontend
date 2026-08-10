import type {
  HTMLAttributes,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";

type TableProps = TableHTMLAttributes<HTMLTableElement> & {
  children: ReactNode;
  containerClassName?: string;
};

type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

type TableBodyProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

type TableFooterProps = HTMLAttributes<HTMLTableSectionElement> & {
  children: ReactNode;
};

type TableRowProps = HTMLAttributes<HTMLTableRowElement> & {
  children: ReactNode;
  interactive?: boolean;
  selected?: boolean;
};

type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  align?: "left" | "center" | "right";
};

type TableCellProps = TdHTMLAttributes<HTMLTableCellElement> & {
  children?: ReactNode;
  align?: "left" | "center" | "right";
};

type TableCaptionProps = HTMLAttributes<HTMLTableCaptionElement> & {
  children: ReactNode;
};

type TableEmptyProps = HTMLAttributes<HTMLTableCellElement> & {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  colSpan: number;
};

type TableLoadingProps = HTMLAttributes<HTMLTableCellElement> & {
  colSpan: number;
  rows?: number;
  columns?: number;
};

const alignmentClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function Table({
  children,
  containerClassName = "",
  className = "",
  ...tableProps
}: TableProps) {
  return (
    <div
      className={[
        "w-full overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/70",
        containerClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <table
        {...tableProps}
        className={[
          "w-full min-w-[720px] border-collapse text-sm",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({
  children,
  className = "",
  ...headerProps
}: TableHeaderProps) {
  return (
    <thead
      {...headerProps}
      className={[
        "border-b border-white/10 bg-white/[0.025]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </thead>
  );
}

export function TableBody({
  children,
  className = "",
  ...bodyProps
}: TableBodyProps) {
  return (
    <tbody
      {...bodyProps}
      className={[
        "divide-y divide-white/[0.07]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </tbody>
  );
}

export function TableFooter({
  children,
  className = "",
  ...footerProps
}: TableFooterProps) {
  return (
    <tfoot
      {...footerProps}
      className={[
        "border-t border-white/10 bg-white/[0.025] font-semibold",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </tfoot>
  );
}

export function TableRow({
  children,
  interactive = false,
  selected = false,
  className = "",
  ...rowProps
}: TableRowProps) {
  return (
    <tr
      {...rowProps}
      aria-selected={selected || undefined}
      data-selected={selected ? "true" : "false"}
      className={[
        "transition-colors",
        interactive
          ? "cursor-pointer hover:bg-white/[0.04] focus-within:bg-white/[0.04]"
          : "",
        selected
          ? "bg-emerald-500/[0.08] hover:bg-emerald-500/[0.1]"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  align = "left",
  className = "",
  scope = "col",
  ...headProps
}: TableHeadProps) {
  return (
    <th
      {...headProps}
      scope={scope}
      className={[
        "h-12 whitespace-nowrap px-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500",
        alignmentClasses[align],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  align = "left",
  className = "",
  ...cellProps
}: TableCellProps) {
  return (
    <td
      {...cellProps}
      className={[
        "whitespace-nowrap px-5 py-4 align-middle text-sm text-slate-300",
        alignmentClasses[align],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </td>
  );
}

export function TableCaption({
  children,
  className = "",
  ...captionProps
}: TableCaptionProps) {
  return (
    <caption
      {...captionProps}
      className={[
        "caption-bottom px-5 py-4 text-left text-sm text-slate-500",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </caption>
  );
}

export function TableEmpty({
  title,
  description,
  icon,
  action,
  colSpan,
  className = "",
  ...cellProps
}: TableEmptyProps) {
  return (
    <td
      {...cellProps}
      colSpan={colSpan}
      className={[
        "px-6 py-16 text-center",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        {icon ? (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-400">
            {icon}
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <path d="M3 9h18" />
              <path d="M8 9v11" />
            </svg>
          </div>
        )}

        <h3 className="mt-5 text-base font-bold text-white">
          {title}
        </h3>

        {description ? (
          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        ) : null}

        {action ? (
          <div className="mt-6">
            {action}
          </div>
        ) : null}
      </div>
    </td>
  );
}

export function TableLoading({
  colSpan,
  rows = 5,
  columns = 4,
  className = "",
  ...cellProps
}: TableLoadingProps) {
  const safeRowCount = Math.max(1, rows);
  const safeColumnCount = Math.max(1, columns);

  return (
    <td
      {...cellProps}
      colSpan={colSpan}
      className={[
        "p-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="divide-y divide-white/[0.07]">
        {Array.from({ length: safeRowCount }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-4 px-5 py-4"
            style={{
              gridTemplateColumns: `repeat(${safeColumnCount}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: safeColumnCount }).map(
              (_, columnIndex) => (
                <div
                  key={columnIndex}
                  className={[
                    "h-4 animate-pulse rounded-md bg-white/[0.07]",
                    columnIndex === 0 ? "w-32" : "w-24",
                    "max-w-full",
                  ].join(" ")}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </td>
  );
}