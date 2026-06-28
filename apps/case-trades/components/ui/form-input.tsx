import { InputHTMLAttributes } from "react";

interface FormInputProps
  extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function FormInput({
  label,
  hint,
  error,
  className = "",
  ...props
}: FormInputProps) {
  const inputBase = `
    w-full rounded-md border border-border
    bg-muted px-3 py-2
    text-foreground placeholder:text-muted-foreground
    [color-scheme:dark]
    transition
    hover:shadow-[0_0_0_1px_rgba(34,197,94,0.25)]
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40
    invalid:border-destructive invalid:ring-2 invalid:ring-destructive/40
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-foreground">
        {label}
      </label>

      <input
        {...props}
        className={`${inputBase} ${className}`}
      />

      {hint && !error && (
        <p className="text-xs text-muted-foreground mt-1">
          {hint}
        </p>
      )}

      {error && (
        <p className="text-xs text-destructive mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
