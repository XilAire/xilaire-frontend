import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base =
    `
      inline-flex items-center justify-center
      rounded-md px-4 py-2 text-sm font-medium
      transition
      disabled:opacity-50
      disabled:cursor-not-allowed
    `;

  const variants: Record<typeof variant, string> = {
    primary: `
      bg-green-600 text-white
      hover:bg-green-700
    `,
    secondary: `
      border border-border
      hover:bg-muted
    `,
    ghost: `
      text-foreground
      hover:bg-muted
    `,
  };

  return (
    <button
      {...props}
      className={`${base} ${variants[variant]} ${className}`}
    />
  );
}
