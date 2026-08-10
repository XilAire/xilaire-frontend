export type ThemeMode =
  | "light"
  | "dark"
  | "system";

export type ResolvedTheme =
  | "light"
  | "dark";

export type ThemeColorScale = {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
};

export type ThemeColors = {
  primary: ThemeColorScale;
  secondary: ThemeColorScale;
  success: ThemeColorScale;
  warning: ThemeColorScale;
  danger: ThemeColorScale;
  info: ThemeColorScale;
  neutral: ThemeColorScale;

  background: {
    app: string;
    surface: string;
    elevated: string;
    overlay: string;
  };

  text: {
    primary: string;
    secondary: string;
    muted: string;
    inverse: string;
  };

  border: {
    subtle: string;
    default: string;
    strong: string;
  };
};

export type ThemeSpacing = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  "3xl": string;
};

export type ThemeRadius = {
  none: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
  "2xl": string;
  full: string;
};

export type ThemeElevation = {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
};

export type ThemeMotion = {
  fast: string;
  normal: string;
  slow: string;
};

export type ThemeTypography = {
  fontSans: string;
  fontMono: string;

  sizes: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    "2xl": string;
    "3xl": string;
    "4xl": string;
  };

  weights: {
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
  };
};

export type CaseBudgetTheme = {
  mode: ThemeMode;
  colors: ThemeColors;
  spacing: ThemeSpacing;
  radius: ThemeRadius;
  elevation: ThemeElevation;
  motion: ThemeMotion;
  typography: ThemeTypography;
};

export type CaseBudgetThemeContextValue = {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  isMounted: boolean;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};