import { ReactNode, FormHTMLAttributes } from "react";

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  title?: string;
  description?: string;
  children: ReactNode;
}

export function Form({
  title,
  description,
  children,
  className = "",
  ...props
}: FormProps) {
  return (
    <form
      {...props}
      className={`space-y-6 ${className}`}
    >
      {(title || description) && (
        <fieldset className="space-y-1">
          {title && (
            <legend className="text-lg font-semibold">
              {title}
            </legend>
          )}

          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </fieldset>
      )}

      <div className="space-y-6">
        {children}
      </div>
    </form>
  );
}
