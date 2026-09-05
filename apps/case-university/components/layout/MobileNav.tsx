"use client";

import Link from "next/link";
import {
  usePathname,
} from "next/navigation";

type MobileNavigationItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function HomeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function CoursesIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function LearningIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 10 9-5 9 5-9 5-9-5Z" />
      <path d="M7 12.5V16c0 1.8 2.2 3 5 3s5-1.2 5-3v-3.5" />
      <path d="M21 10v6" />
    </svg>
  );
}


function PracticeIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 3h6" />
      <path d="M10 3v3" />
      <path d="M14 3v3" />
      <rect x="5" y="6" width="14" height="15" rx="2" />
      <path d="m8.5 12 1.5 1.5 3-3" />
      <path d="M8.5 17h7" />
    </svg>
  );
}

function ProgressIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-7" />
      <path d="M22 20V8" />
    </svg>
  );
}

function CertificateIcon() {
  return (
    <svg
      width="21"
      height="21"
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
        r="5"
      />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

const navigationItems: MobileNavigationItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: <HomeIcon />,
  },
  {
    label: "Courses",
    href: "/courses",
    icon: <CoursesIcon />,
  },
  {
    label: "Learning",
    href: "/learning",
    icon: <LearningIcon />,
  },
  {
    label: "Practice",
    href: "/practice",
    icon: <PracticeIcon />,
  },
  {
    label: "Progress",
    href: "/progress",
    icon: <ProgressIcon />,
  },
  {
    label: "Certificates",
    href: "/certificates",
    icon: <CertificateIcon />,
  },
];

function isItemActive(
  pathname: string,
  href: string,
) {
  if (
    href === "/dashboard"
  ) {
    return (
      pathname ===
      "/dashboard"
    );
  }

  if (
    href === "/courses"
  ) {
    return (
      pathname ===
        "/courses" ||
      pathname.startsWith(
        "/courses/",
      )
    );
  }

  return (
    pathname === href ||
    pathname.startsWith(
      `${href}/`,
    )
  );
}

export default function MobileNav() {
  const pathname =
    usePathname();

  return (
    <nav
      aria-label="CASE University mobile navigation"
      className="
        safe-area-bottom
        border-t
        border-[var(--sidebar-border)]
        bg-[var(--sidebar-background)]
        text-[var(--text-primary)]
        shadow-[var(--shadow-md)]
        transition-colors
        duration-200
        lg:hidden
      "
    >
      <div
        className="
          grid
          h-20
          grid-cols-6
        "
      >
        {navigationItems.map(
          (
            item,
          ) => {
            const active =
              isItemActive(
                pathname,
                item.href,
              );

            return (
              <Link
                key={
                  item.href
                }
                href={
                  item.href
                }
                aria-current={
                  active
                    ? "page"
                    : undefined
                }
                className={[
                  "group relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 outline-none transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]",
                  active
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--text-primary)]",
                ].join(
                  " ",
                )}
              >
                {active ? (
                  <span
                    className="
                      absolute
                      left-1/2
                      top-0
                      h-1
                      w-10
                      -translate-x-1/2
                      rounded-b-full
                      bg-[var(--primary)]
                    "
                    aria-hidden="true"
                  />
                ) : null}

                <span
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl transition",
                    active
                      ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                      : "text-[var(--text-muted)] group-hover:bg-[var(--sidebar-hover-background)] group-hover:text-[var(--primary)]",
                  ].join(
                    " ",
                  )}
                >
                  {
                    item.icon
                  }
                </span>

                <span
                  className={[
                    "max-w-full truncate text-[10px] font-bold transition-colors sm:text-[11px]",
                    active
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]",
                  ].join(
                    " ",
                  )}
                >
                  {
                    item.label
                  }
                </span>
              </Link>
            );
          },
        )}
      </div>
    </nav>
  );
}
