import type {
  HTMLAttributes,
  ReactNode,
} from "react";

export type FormFieldProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
  htmlFor?: string;
  description?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: ReactNode;
};

function joinClassNames(
  ...classNames: Array<string | false | null | undefined>
) {
  return classNames.filter(Boolean).join(" ");
}

export default function FormField({
  label,
  htmlFor,
  description,
  error,
  required = false,
  optionalLabel = "Optional",
  children,
  className,
  ...props
}: FormFieldProps) {
  const descriptionId =
    htmlFor && description ? `${htmlFor}-description` : undefined;

  const errorId =
    htmlFor && error ? `${htmlFor}-error` : undefined;

  return (
    <div
      className={joinClassNames(
        "w-full",
        className,
      )}
      {...props}
    >
      {label ? (
        <div className="mb-2 flex items-center justify-between gap-3">
          <label
            htmlFor={htmlFor}
            className="text-sm font-semibold text-slate-200"
          >
            {label}

            {required ? (
              <span
                className="ml-1 text-rose-400"
                aria-hidden="true"
              >
                *
              </span>
            ) : null}
          </label>

          {!required && optionalLabel ? (
            <span className="text-xs font-medium text-slate-600">
              {optionalLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {children}

      {description && !error ? (
        <p
          id={descriptionId}
          className="mt-2 text-xs leading-5 text-slate-500"
        >
          {description}
        </p>
      ) : null}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-xs font-medium leading-5 text-rose-400"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}