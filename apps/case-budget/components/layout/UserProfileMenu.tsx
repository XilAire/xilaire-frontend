"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  createBrowserClient,
} from "@supabase/ssr";

export type UserProfileMenuProps = {
  name: string;
  email: string;
  avatarUrl?: string;
  profileHref?: string;
  loginHref?: string;
  className?: string;
  onOpenWorkspaceSwitcher?: () => void;
  onSignedOut?: () => void;
};

type SignOutState =
  | "idle"
  | "signing-out"
  | "error";

const ACTIVE_WORKSPACE_COOKIE_NAME =
  "case-budget-active-workspace-id";


const SUPABASE_URL_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET";

const SUPABASE_ANON_KEY_ENV_NAME =
  "NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_BUDGET";

export default function UserProfileMenu({
  name,
  email,
  avatarUrl,
  profileHref = "/dashboard/profile",
  loginHref = "/sign-in",
  className,
  onOpenWorkspaceSwitcher,
  onSignedOut,
}: UserProfileMenuProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const menuRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const triggerRef =
    useRef<HTMLButtonElement | null>(
      null,
    );

  const [
    isOpen,
    setIsOpen,
  ] =
    useState(
      false,
    );

  const [
    signOutState,
    setSignOutState,
  ] =
    useState<SignOutState>(
      "idle",
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const userInitials =
    useMemo(
      () =>
        getInitials(
          name,
        ),
      [
        name,
      ],
    );

  const isSigningOut =
    signOutState ===
    "signing-out";

  const closeMenu =
    useCallback(
      ({
        restoreFocus =
          false,
      }: {
        restoreFocus?:
          boolean;
      } = {}) => {
        setIsOpen(
          false,
        );

        setErrorMessage(
          null,
        );

        if (
          restoreFocus
        ) {
          window.requestAnimationFrame(
            () => {
              triggerRef.current?.focus();
            },
          );
        }
      },
      [],
    );

  const toggleMenu =
    useCallback(
      () => {
        setErrorMessage(
          null,
        );

        setIsOpen(
          (
            currentValue,
          ) =>
            !currentValue,
        );
      },
      [],
    );

  const handleWorkspaceSwitcher =
    useCallback(
      () => {
        closeMenu();

        onOpenWorkspaceSwitcher?.();
      },
      [
        closeMenu,
        onOpenWorkspaceSwitcher,
      ],
    );

  const handleSignOut =
    useCallback(
      async () => {
        if (
          isSigningOut
        ) {
          return;
        }

        setSignOutState(
          "signing-out",
        );

        setErrorMessage(
          null,
        );

        try {
          const supabase =
            createCaseBudgetBrowserClient();

          const {
            error,
          } =
            await supabase.auth.signOut({
              scope:
                "local",
            });

          if (
            error
          ) {
            throw error;
          }

          clearCaseBudgetWorkspaceCookie();

          onSignedOut?.();

          setIsOpen(
            false,
          );

          router.replace(
            loginHref,
          );

          router.refresh();
        } catch (
          error
        ) {
          console.error(
            "CASE Budget sign-out failed.",
            error,
          );

          setSignOutState(
            "error",
          );

          setErrorMessage(
            error instanceof
              Error &&
            error.message
              ? error.message
              : "CASE Budget could not sign you out. Please try again.",
          );
        }
      },
      [
        isSigningOut,
        loginHref,
        onSignedOut,
        router,
      ],
    );

  useEffect(
    () => {
      setIsOpen(
        false,
      );

      setErrorMessage(
        null,
      );
    },
    [
      pathname,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      const handlePointerDown =
        (
          event:
            PointerEvent,
        ) => {
          const target =
            event.target;

          if (
            !(
              target instanceof
              Node
            )
          ) {
            return;
          }

          if (
            containerRef.current?.contains(
              target,
            )
          ) {
            return;
          }

          closeMenu();
        };

      const handleKeyDown =
        (
          event:
            KeyboardEvent,
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            event.preventDefault();

            closeMenu({
              restoreFocus:
                true,
            });

            return;
          }

          if (
            event.key !==
              "Tab" ||
            !menuRef.current
          ) {
            return;
          }

          keepFocusInsideMenu(
            event,
            menuRef.current,
          );
        };

      document.addEventListener(
        "pointerdown",
        handlePointerDown,
      );

      document.addEventListener(
        "keydown",
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          "pointerdown",
          handlePointerDown,
        );

        document.removeEventListener(
          "keydown",
          handleKeyDown,
        );
      };
    },
    [
      closeMenu,
      isOpen,
    ],
  );

  useEffect(
    () => {
      if (
        !isOpen
      ) {
        return;
      }

      window.requestAnimationFrame(
        () => {
          getFocusableElements(
            menuRef.current,
          )[0]?.focus();
        },
      );
    },
    [
      isOpen,
    ],
  );

  const rootClassName =
    [
      "relative",
      className,
    ]
      .filter(
        Boolean,
      )
      .join(
        " ",
      );

  return (
    <div
      ref={
        containerRef
      }
      className={
        rootClassName
      }
    >
      {isOpen ? (
        <div
          ref={
            menuRef
          }
          id="case-budget-user-profile-menu"
          role="menu"
          aria-label="User profile menu"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-full min-w-[260px] overflow-hidden rounded-2xl border border-[var(--sidebar-border)] bg-[var(--surface-default)] shadow-xl"
        >
          <div className="border-b border-[var(--border-subtle)] px-4 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar
                name={
                  name
                }
                initials={
                  userInitials
                }
                avatarUrl={
                  avatarUrl
                }
                size="large"
              />

              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-[var(--text-primary)]">
                  {name}
                </p>

                <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                  {email}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <MenuLink
              href={
                profileHref
              }
              label="View profile"
              icon={
                <UserIcon />
              }
              onNavigate={
                closeMenu
              }
            />

            {onOpenWorkspaceSwitcher ? (
              <MenuButton
                label="Switch workspace"
                icon={
                  <WorkspaceIcon />
                }
                onClick={
                  handleWorkspaceSwitcher
                }
              />
            ) : null}
          </div>

          <div className="border-t border-[var(--border-subtle)] p-2">
            {errorMessage ? (
              <div
                role="alert"
                className="mb-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_30%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--danger)]"
              >
                {errorMessage}
              </div>
            ) : null}

            <button
              type="button"
              role="menuitem"
              onClick={
                () => {
                  void handleSignOut();
                }
              }
              disabled={
                isSigningOut
              }
              className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--danger)] outline-none transition hover:bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningOut ? (
                <SpinnerIcon />
              ) : (
                <LogoutIcon />
              )}

              <span className="min-w-0 flex-1">
                {isSigningOut
                  ? "Signing out…"
                  : "Sign out"}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      <button
        ref={
          triggerRef
        }
        type="button"
        onClick={
          toggleMenu
        }
        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-[var(--sidebar-hover-background)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
        aria-label="Open user profile menu"
        aria-haspopup="menu"
        aria-expanded={
          isOpen
        }
        aria-controls={
          isOpen
            ? "case-budget-user-profile-menu"
            : undefined
        }
      >
        <UserAvatar
          name={
            name
          }
          initials={
            userInitials
          }
          avatarUrl={
            avatarUrl
          }
          size="small"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--sidebar-foreground)]">
            {name}
          </p>

          <p className="truncate text-xs text-[var(--sidebar-muted-foreground)]">
            {email}
          </p>
        </div>

        <MoreIcon />
      </button>
    </div>
  );
}

function MenuLink({
  href,
  label,
  icon,
  onNavigate,
}: {
  href:
    string;

  label:
    string;

  icon:
    ReactNode;

  onNavigate:
    () => void;
}) {
  return (
    <Link
      href={
        href
      }
      role="menuitem"
      onClick={
        onNavigate
      }
      className="flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      <span className="shrink-0 text-[var(--text-muted)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>
    </Link>
  );
}

function MenuButton({
  label,
  icon,
  onClick,
}: {
  label:
    string;

  icon:
    ReactNode;

  onClick:
    () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={
        onClick
      }
      className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[var(--text-primary)] outline-none transition hover:bg-[var(--surface-muted)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
    >
      <span className="shrink-0 text-[var(--text-muted)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1 truncate">
        {label}
      </span>
    </button>
  );
}

function UserAvatar({
  name,
  initials,
  avatarUrl,
  size,
}: {
  name:
    string;

  initials:
    string;

  avatarUrl?:
    string;

  size:
    | "small"
    | "large";
}) {
  return (
    <div
      className={[
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--sidebar-avatar-background)] text-sm font-bold text-[var(--sidebar-avatar-foreground)] ring-1 ring-[var(--sidebar-border)]",

        size ===
        "large"
          ? "h-11 w-11"
          : "h-10 w-10",
      ].join(
        " ",
      )}
      aria-hidden="true"
    >
      {avatarUrl ? (
        <img
          src={
            avatarUrl
          }
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <span title={name}>
          {initials}
        </span>
      )}
    </div>
  );
}

function createCaseBudgetBrowserClient() {
  const supabaseUrl =
    process.env
      .NEXT_PUBLIC_SUPABASE_URL_CASE_BUDGET
      ?.trim();

  const supabaseAnonKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_ANON_KEY_CASE_BUDGET
      ?.trim();

  if (
    !supabaseUrl
  ) {
    throw new Error(
      `Missing required environment variable ${SUPABASE_URL_ENV_NAME}.`,
    );
  }

  if (
    !supabaseAnonKey
  ) {
    throw new Error(
      `Missing required environment variable ${SUPABASE_ANON_KEY_ENV_NAME}.`,
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey,
  );
}

function clearCaseBudgetWorkspaceCookie() {
  const secureAttribute =
    window.location.protocol ===
    "https:"
      ? "; Secure"
      : "";

  document.cookie = [
    `${ACTIVE_WORKSPACE_COOKIE_NAME}=`,
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax",
    secureAttribute,
  ]
    .filter(
      Boolean,
    )
    .join(
      "; ",
    );
}

function keepFocusInsideMenu(
  event:
    KeyboardEvent,
  menuElement:
    HTMLElement,
) {
  const focusableElements =
    getFocusableElements(
      menuElement,
    );

  if (
    focusableElements.length ===
    0
  ) {
    event.preventDefault();

    return;
  }

  const firstElement =
    focusableElements[0];

  const lastElement =
    focusableElements[
      focusableElements.length -
      1
    ];

  if (
    event.shiftKey &&
    document.activeElement ===
      firstElement
  ) {
    event.preventDefault();

    lastElement.focus();

    return;
  }

  if (
    !event.shiftKey &&
    document.activeElement ===
      lastElement
  ) {
    event.preventDefault();

    firstElement.focus();
  }
}

function getFocusableElements(
  container:
    HTMLElement | null,
) {
  if (
    !container
  ) {
    return [];
  }

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])",
    ),
  );
}

function getInitials(
  name:
    string,
) {
  const initials =
    name
      .trim()
      .split(
        /\s+/,
      )
      .map(
        (
          part,
        ) =>
          part.charAt(
            0,
          ),
      )
      .join(
        "",
      )
      .slice(
        0,
        2,
      )
      .toUpperCase();

  return initials ||
    "CB";
}

function MoreIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-[var(--sidebar-muted-foreground)]"
      aria-hidden="true"
    >
      <circle
        cx="5"
        cy="12"
        r="1"
      />

      <circle
        cx="12"
        cy="12"
        r="1"
      />

      <circle
        cx="19"
        cy="12"
        r="1"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="8"
        r="4"
      />

      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
      />

      <path d="M8 4v16" />
      <path d="M8 9h13" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />

      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}