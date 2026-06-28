import { SelectHTMLAttributes } from "react";

interface FormSelectProps
  extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function FormSelect({
  label,
  hint,
  error,
  className = "",
  children,
  ...props
}: FormSelectProps) {
  const selectBase = `
    w-full rounded-md border border-border bg-background px-3 py-2
    text-foreground transition
    hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25)]
    focus:outline-none focus:ring-2 focus:ring-green-500/40
    invalid:border-red-500 invalid:ring-2 invalid:ring-red-500/40
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div>
      <label className="block text-sm font-medium mb-1">
        {label}
      </label>

      <select
        {...props}
        className={`${selectBase} ${className}`}
      >
        {children}
      </select>

      {hint && !error && (
        <p className="text-xs text-muted-foreground mt-1">
          {hint}
        </p>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
