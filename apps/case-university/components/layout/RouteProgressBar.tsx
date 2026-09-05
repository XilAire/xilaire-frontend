"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useSearchParams,
} from "next/navigation";

type ProgressState =
  | "idle"
  | "starting"
  | "loading"
  | "finishing";

export default function RouteProgressBar() {
  const pathname =
    usePathname();

  const searchParams =
    useSearchParams();

  const [
    progressState,
    setProgressState,
  ] =
    useState<ProgressState>(
      "idle",
    );

  const [
    progress,
    setProgress,
  ] =
    useState(
      0,
    );

  useEffect(
    () => {
      if (
        progressState ===
        "idle"
      ) {
        return;
      }

      if (
        progressState ===
        "starting"
      ) {
        const frame =
          window.requestAnimationFrame(
            () => {
              setProgress(
                18,
              );

              setProgressState(
                "loading",
              );
            },
          );

        return () => {
          window.cancelAnimationFrame(
            frame,
          );
        };
      }

      if (
        progressState ===
        "loading"
      ) {
        const interval =
          window.setInterval(
            () => {
              setProgress(
                (
                  currentProgress,
                ) => {
                  if (
                    currentProgress >=
                    88
                  ) {
                    return currentProgress;
                  }

                  const remaining =
                    88 -
                    currentProgress;

                  const increment =
                    Math.max(
                      1,
                      remaining *
                        0.08,
                    );

                  return Math.min(
                    88,
                    currentProgress +
                      increment,
                  );
                },
              );
            },
            180,
          );

        return () => {
          window.clearInterval(
            interval,
          );
        };
      }

      if (
        progressState ===
        "finishing"
      ) {
        setProgress(
          100,
        );

        const timeout =
          window.setTimeout(
            () => {
              setProgress(
                0,
              );

              setProgressState(
                "idle",
              );
            },
            220,
          );

        return () => {
          window.clearTimeout(
            timeout,
          );
        };
      }
    },
    [
      progressState,
    ],
  );

  useEffect(
    () => {
      if (
        progressState ===
        "loading" ||
        progressState ===
        "starting"
      ) {
        setProgressState(
          "finishing",
        );
      }
    },
    [
      pathname,
      searchParams,
    ],
  );

  useEffect(
    () => {
      function handleDocumentClick(
        event: MouseEvent,
      ) {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const target =
          event.target;

        if (
          !(target instanceof Element)
        ) {
          return;
        }

        const anchor =
          target.closest(
            "a",
          );

        if (
          !anchor
        ) {
          return;
        }

        if (
          anchor.hasAttribute(
            "download",
          ) ||
          anchor.target ===
            "_blank"
        ) {
          return;
        }

        const href =
          anchor.getAttribute(
            "href",
          );

        if (
          !href ||
          href.startsWith(
            "#",
          ) ||
          href.startsWith(
            "mailto:",
          ) ||
          href.startsWith(
            "tel:",
          )
        ) {
          return;
        }

        let destination:
          URL;

        try {
          destination =
            new URL(
              anchor.href,
              window.location.href,
            );
        } catch {
          return;
        }

        if (
          destination.origin !==
          window.location.origin
        ) {
          return;
        }

        const currentUrl =
          new URL(
            window.location.href,
          );

        const destinationPath =
          `${destination.pathname}${destination.search}`;

        const currentPath =
          `${currentUrl.pathname}${currentUrl.search}`;

        if (
          destinationPath ===
          currentPath
        ) {
          return;
        }

        setProgress(
          4,
        );

        setProgressState(
          "starting",
        );
      }

      document.addEventListener(
        "click",
        handleDocumentClick,
        true,
      );

      return () => {
        document.removeEventListener(
          "click",
          handleDocumentClick,
          true,
        );
      };
    },
    [],
  );

  const isVisible =
    progressState !==
    "idle";

  return (
    <div
      className="
        pointer-events-none
        fixed
        inset-x-0
        top-0
        z-[100]
        h-[3px]
        overflow-hidden
      "
      aria-hidden="true"
    >
      <div
        className="
          h-full
          bg-[var(--primary)]
          shadow-[0_0_10px_var(--primary)]
          transition-[width,opacity]
          duration-200
          ease-out
        "
        style={{
          width:
            `${progress}%`,

          opacity:
            isVisible
              ? 1
              : 0,
        }}
      />
    </div>
  );
}