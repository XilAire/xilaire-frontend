import {
  Button,
} from "react-email";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

export type EmailButtonProps = {
  href: string;

  children:
    React.ReactNode;

  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger";

  fullWidth?:
    boolean;
};

export function EmailButton({
  href,
  children,
  variant = "primary",
  fullWidth = false,
}: EmailButtonProps) {
  const colors =
    getVariantColors(
      variant,
    );

  return (
    <Button
      href={href}
      style={{
        display:
          fullWidth
            ? "block"
            : "inline-block",

        width:
          fullWidth
            ? "100%"
            : "auto",

        boxSizing:
          "border-box",

        backgroundColor:
          colors.background,

        color:
          colors.text,

        border:
          `1px solid ${colors.border}`,

        borderRadius:
          caseBudgetEmailTheme
            .sizing
            .buttonRadius,

        fontFamily:
          caseBudgetEmailTheme
            .typography
            .fontFamily,

        fontSize:
          "15px",

        fontWeight:
          700,

        lineHeight:
          "22px",

        textAlign:
          "center",

        textDecoration:
          "none",

        padding:
          "14px 24px",
      }}
    >
      {children}
    </Button>
  );
}

function getVariantColors(
  variant:
    NonNullable<
      EmailButtonProps["variant"]
    >,
) {
  switch (
    variant
  ) {
    case "secondary":
      return {
        background:
          caseBudgetEmailTheme
            .colors
            .surface,

        border:
          caseBudgetEmailTheme
            .colors
            .borderStrong,

        text:
          caseBudgetEmailTheme
            .colors
            .text,
      };

    case "success":
      return {
        background:
          caseBudgetEmailTheme
            .colors
            .success,

        border:
          caseBudgetEmailTheme
            .colors
            .success,

        text:
          caseBudgetEmailTheme
            .colors
            .white,
      };

    case "danger":
      return {
        background:
          caseBudgetEmailTheme
            .colors
            .danger,

        border:
          caseBudgetEmailTheme
            .colors
            .danger,

        text:
          caseBudgetEmailTheme
            .colors
            .white,
      };

    case "primary":
    default:
      return {
        background:
          caseBudgetEmailTheme
            .colors
            .primary,

        border:
          caseBudgetEmailTheme
            .colors
            .primary,

        text:
          caseBudgetEmailTheme
            .colors
            .white,
      };
  }
}