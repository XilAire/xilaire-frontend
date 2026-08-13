export const caseBudgetEmailTheme = {
  brand: {
    name:
      "CASE Budget",

    companyName:
      "XilAire Technologies",

    tagline:
      "Take control of your finances. Build wealth with confidence.",

    supportEmail:
      "support@casebudgets.com",

    noreplyEmail:
      "noreply@casebudgets.com",

    websiteUrl:
      "https://casebudgets.com",
  },

  colors: {
    background:
      "#F4F7F9",

    surface:
      "#FFFFFF",

    surfaceMuted:
      "#F8FAFC",

    border:
      "#E2E8F0",

    borderStrong:
      "#CBD5E1",

    text:
      "#0F172A",

    textSecondary:
      "#475569",

    textMuted:
      "#64748B",

    primary:
      "#059669",

    primaryHover:
      "#047857",

    primarySoft:
      "#ECFDF5",

    primaryBorder:
      "#A7F3D0",

    success:
      "#059669",

    successSoft:
      "#ECFDF5",

    warning:
      "#D97706",

    warningSoft:
      "#FFFBEB",

    danger:
      "#DC2626",

    dangerSoft:
      "#FEF2F2",

    info:
      "#2563EB",

    infoSoft:
      "#EFF6FF",

    white:
      "#FFFFFF",

    black:
      "#000000",
  },

  typography: {
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",

    headingFontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  sizing: {
    emailWidth:
      "600px",

    contentPadding:
      "40px",

    contentPaddingMobile:
      "24px",

    borderRadius:
      "18px",

    buttonRadius:
      "10px",
  },

  shadows: {
    card:
      "0 8px 30px rgba(15, 23, 42, 0.08)",
  },
} as const;

export type CaseBudgetEmailTheme =
  typeof caseBudgetEmailTheme;