import {
  Section,
} from "react-email";

import {
  caseBudgetEmailTheme,
} from "../styles/theme";

export type EmailCardProps = {
  children:
    React.ReactNode;

  padding?:
    string;

  backgroundColor?:
    string;

  bordered?:
    boolean;

  shadow?:
    boolean;

  radius?:
    string;

  style?:
    React.CSSProperties;
};

export function EmailCard({
  children,
  padding =
    caseBudgetEmailTheme
      .sizing
      .contentPadding,

  backgroundColor =
    caseBudgetEmailTheme
      .colors
      .surface,

  bordered = true,

  shadow = true,

  radius =
    caseBudgetEmailTheme
      .sizing
      .borderRadius,

  style,
}: EmailCardProps) {
  return (
    <Section
      style={{
        backgroundColor,

        border: bordered
          ? `1px solid ${caseBudgetEmailTheme.colors.border}`
          : "none",

        borderRadius:
          radius,

        boxShadow:
          shadow
            ? caseBudgetEmailTheme
                .shadows
                .card
            : "none",

        padding,

        ...style,
      }}
    >
      {children}
    </Section>
  );
}