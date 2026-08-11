"use client";

import Image from "next/image";
import {
  useEffect,
  useState,
} from "react";

export type CaseBudgetLogoVariant =
  | "auto"
  | "light"
  | "dark";

export type CaseBudgetLogoSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl";

export type CaseBudgetLogoProps = {
  variant?: CaseBudgetLogoVariant;
  size?: CaseBudgetLogoSize;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  alt?: string;
};

type ResolvedTheme =
  | "light"
  | "dark";

const LOGO_SOURCES: Record<
  ResolvedTheme,
  string
> = {
  light:
    "/case-budget-logo-light.png",

  dark:
    "/case-budget-logo-dark.png",
};

const LOGO_SIZES: Record<
  CaseBudgetLogoSize,
  number
> = {
  xs:
    28,

  sm:
    36,

  md:
    48,

  lg:
    64,

  xl:
    96,
};

const THEME_CHANGE_EVENT =
  "case-budget-theme-change";

export default function CaseBudgetLogo({
  variant = "auto",
  size = "md",
  width,
  height,
  priority = false,
  className = "",
  alt = "CASE Budget",
}: CaseBudgetLogoProps) {
  const [
    resolvedTheme,
    setResolvedTheme,
  ] =
    useState<ResolvedTheme>(
      "light",
    );

  const defaultSize =
    LOGO_SIZES[
      size
    ];

  const resolvedWidth =
    width ??
    defaultSize;

  const resolvedHeight =
    height ??
    defaultSize;

  useEffect(
    () => {
      if (
        variant !==
        "auto"
      ) {
        return;
      }

      function updateTheme() {
        setResolvedTheme(
          getDocumentTheme(),
        );
      }

      updateTheme();

      window.addEventListener(
        THEME_CHANGE_EVENT,
        updateTheme,
      );

      const observer =
        new MutationObserver(
          updateTheme,
        );

      observer.observe(
        document.documentElement,
        {
          attributes:
            true,

          attributeFilter: [
            "class",
            "data-theme",
            "data-theme-preference",
          ],
        },
      );

      const mediaQuery =
        window.matchMedia(
          "(prefers-color-scheme: dark)",
        );

      mediaQuery.addEventListener(
        "change",
        updateTheme,
      );

      return () => {
        window.removeEventListener(
          THEME_CHANGE_EVENT,
          updateTheme,
        );

        observer.disconnect();

        mediaQuery.removeEventListener(
          "change",
          updateTheme,
        );
      };
    },
    [
      variant,
    ],
  );

  const activeVariant:
    ResolvedTheme =
    variant ===
    "auto"
      ? resolvedTheme
      : variant;

  const source =
    LOGO_SOURCES[
      activeVariant
    ];

  return (
    <Image
      src={
        source
      }
      alt={
        alt
      }
      width={
        resolvedWidth
      }
      height={
        resolvedHeight
      }
      priority={
        priority
      }
      className={[
        "block shrink-0 object-contain",
        className,
      ]
        .filter(
          Boolean,
        )
        .join(
          " ",
        )}
    />
  );
}

function getDocumentTheme():
  ResolvedTheme {
  if (
    typeof document ===
    "undefined"
  ) {
    return "light";
  }

  const root =
    document.documentElement;

  const dataTheme =
    root.dataset
      .theme;

  if (
    dataTheme ===
    "dark"
  ) {
    return "dark";
  }

  if (
    dataTheme ===
    "light"
  ) {
    return "light";
  }

  if (
    root.classList.contains(
      "dark",
    )
  ) {
    return "dark";
  }

  if (
    root.classList.contains(
      "light",
    )
  ) {
    return "light";
  }

  if (
    typeof window !==
    "undefined"
  ) {
    return window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches
      ? "dark"
      : "light";
  }

  return "light";
}