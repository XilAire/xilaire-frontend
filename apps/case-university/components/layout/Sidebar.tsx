"use client";

import Link from "next/link";
import {
  usePathname,
  useRouter,
} from "next/navigation";

type NavigationItem = {
  label: string;
  href?: string;
  disabled?: boolean;
  badge?: string;
  icon: React.ReactNode;
};

type NavigationSection = {
  label: string;
  items: NavigationItem[];
};

function HomeIcon() {
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
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </svg>
  );
}

function CoursesIcon() {
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
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
    </svg>
  );
}

function LearningIcon() {
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
      <path d="m3 10 9-5 9 5-9 5-9-5Z" />
      <path d="M7 12.5V16c0 1.8 2.2 3 5 3s5-1.2 5-3v-3.5" />
      <path d="M21 10v6" />
    </svg>
  );
}

function PracticeIcon() {
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
        cy="12"
        r="9"
      />
      <path d="M12 7v5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

function ProgressIcon() {
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
        r="5"
      />
      <path d="m8.5 12.5-1.5 8 5-3 5 3-1.5-8" />
    </svg>
  );
}

function ProfileIcon() {
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

function SettingsIcon() {
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
        cy="12"
        r="3"
      />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1v.1h-4v-.1a1.7 1.7 0 0 0-.4-1 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1-.4h-.1v-4H3a1.7 1.7 0 0 0 1-.4 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1V2.9h4V3a1.7 1.7 0 0 0 .4 1 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.1.4.3.8.6 1 .3.3.6.4 1 .4h.1v4H21a1.7 1.7 0 0 0-1 .4 1.7 1.7 0 0 0-.6 1Z" />
    </svg>
  );
}

function AdminIcon() {
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
      <path d="M12 3 4.5 6v5.5c0 4.7 3.1 8.1 7.5 9.5 4.4-1.4 7.5-4.8 7.5-9.5V6L12 3Z" />
      <path d="M9 12h6" />
      <path d="M12 9v6" />
    </svg>
  );
}

function ChevronIcon({
  expanded,
}: {
  expanded: boolean;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={[
        "transition-transform duration-200",
        expanded
          ? "rotate-180"
          : "",
      ].join(" ")}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const navigationSections: NavigationSection[] = [
  {
    label: "Home",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <HomeIcon />,
      },
    ],
  },
  {
    label: "Learn",
    items: [
      {
        label: "Courses",
        href: "/courses",
        icon: <CoursesIcon />,
      },
      {
        label: "My Learning",
        href: "/learning",
        icon: <LearningIcon />,
      },
      {
        label: "Practice",
        href: "/practice",
        icon: <PracticeIcon />,
      },
    ],
  },
  {
    label: "Progress",
    items: [
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
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Course Management",
        href: "/admin/courses",
        icon: <AdminIcon />,
      },
    ],
  },
  {
    label: "Account",
    items: [
      {
        label: "Profile",
        href: "/profile",
        icon: <ProfileIcon />,
      },
      {
        label: "Settings",
        href: "/settings",
        icon: <SettingsIcon />,
      },
    ],
  },
];

function isItemActive(
  pathname: string,
  href?: string,
) {
  if (!href) {
    return false;
  }

  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (href === "/courses") {
    return (
      pathname === "/courses" ||
      pathname.startsWith(
        "/courses/",
      )
    );
  }

  if (href === "/admin/courses") {
    return (
      pathname === "/admin/courses" ||
      pathname.startsWith(
        "/admin/courses/",
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

function getSectionActiveState(
  pathname: string,
  section: NavigationSection,
) {
  return section.items.some(
    (item) =>
      isItemActive(
        pathname,
        item.href,
      ),
  );
}

function getFirstEnabledHref(
  section: NavigationSection,
) {
  return (
    section.items.find(
      (item) =>
        !item.disabled &&
        item.href,
    )?.href ?? null
  );
}

type SidebarProps = {
  canManageUniversity?: boolean;
};

export default function Sidebar({
  canManageUniversity = false,
}: SidebarProps) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const visibleNavigationSections =
    canManageUniversity
      ? navigationSections
      : navigationSections.filter(
          (section) =>
            section.label !== "Admin",
        );

  const activeSectionIndex =
    visibleNavigationSections.findIndex(
      (section) =>
        getSectionActiveState(
          pathname,
          section,
        ),
    );

  function handleSectionClick(
    section: NavigationSection,
    sectionIndex: number,
  ) {
    if (
      sectionIndex ===
      activeSectionIndex
    ) {
      return;
    }

    const firstEnabledHref =
      getFirstEnabledHref(
        section,
      );

    if (!firstEnabledHref) {
      return;
    }

    router.push(
      firstEnabledHref,
    );
  }

  return (
    <aside
      className="
        flex
        h-full
        min-h-dvh
        w-full
        flex-col
        bg-[var(--sidebar-background)]
        text-[var(--text-primary)]
      "
    >
      <div
        className="
          flex
          min-h-20
          items-center
          border-b
          border-[var(--sidebar-border)]
          px-5
        "
      >
        <Link
          href="/dashboard"
          className="
            flex
            min-w-0
            items-center
            gap-3
            rounded-xl
            outline-none
            focus-visible:ring-2
            focus-visible:ring-[var(--focus-ring)]
          "
        >
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-[var(--primary)]
              text-sm
              font-black
              text-[var(--primary-foreground)]
              shadow-[var(--shadow-primary)]
            "
          >
            CU
          </div>

          <div className="min-w-0">
            <p
              className="
                truncate
                text-sm
                font-extrabold
                tracking-tight
                text-[var(--text-primary)]
              "
            >
              CASE University
            </p>

            <p
              className="
                mt-0.5
                truncate
                text-[10px]
                font-bold
                uppercase
                tracking-[0.14em]
                text-[var(--text-muted)]
              "
            >
              Investing Academy
            </p>
          </div>
        </Link>
      </div>

      <nav
        aria-label="CASE University navigation"
        className="
          min-h-0
          flex-1
          overflow-y-auto
          px-3
          py-4
        "
      >
        <div className="space-y-3">
          {visibleNavigationSections.map(
            (
              section,
              sectionIndex,
            ) => {
              const isActiveSection =
                sectionIndex ===
                activeSectionIndex;

              const firstEnabledHref =
                getFirstEnabledHref(
                  section,
                );

              const sectionAvailable =
                Boolean(
                  firstEnabledHref,
                );

              return (
                <section
                  key={
                    section.label
                  }
                  className="
                    overflow-hidden
                    rounded-xl
                  "
                >
                  <button
                    type="button"
                    onClick={() =>
                      handleSectionClick(
                        section,
                        sectionIndex,
                      )
                    }
                    disabled={
                      !sectionAvailable
                    }
                    aria-expanded={
                      isActiveSection
                    }
                    className={[
                      "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left outline-none transition",
                      "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                      isActiveSection
                        ? "bg-[var(--sidebar-active-background)] text-[var(--primary)]"
                        : sectionAvailable
                          ? "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--text-primary)]"
                          : "cursor-not-allowed text-[var(--text-muted)] opacity-70",
                    ].join(" ")}
                  >
                    <span
                      className="
                        text-[10px]
                        font-extrabold
                        uppercase
                        tracking-[0.16em]
                      "
                    >
                      {section.label}
                    </span>

                    <ChevronIcon
                      expanded={
                        isActiveSection
                      }
                    />
                  </button>

                  {isActiveSection ? (
                    <div
                      className="
                        mt-1
                        space-y-1
                        pb-1
                      "
                    >
                      {section.items.map(
                        (item) => {
                          const active =
                            isItemActive(
                              pathname,
                              item.href,
                            );

                          if (
                            item.disabled ||
                            !item.href
                          ) {
                            return (
                              <div
                                key={
                                  item.label
                                }
                                className="
                                  flex
                                  min-h-10
                                  cursor-not-allowed
                                  items-center
                                  gap-3
                                  rounded-xl
                                  px-3
                                  py-2
                                  text-sm
                                  font-semibold
                                  text-[var(--text-muted)]
                                  opacity-70
                                "
                              >
                                <span
                                  className="
                                    flex
                                    h-8
                                    w-8
                                    shrink-0
                                    items-center
                                    justify-center
                                    rounded-lg
                                    bg-[var(--surface-muted)]
                                  "
                                >
                                  {item.icon}
                                </span>

                                <span
                                  className="
                                    min-w-0
                                    flex-1
                                    truncate
                                  "
                                >
                                  {item.label}
                                </span>

                                {item.badge ? (
                                  <span
                                    className="
                                      rounded-full
                                      border
                                      border-[var(--border-subtle)]
                                      bg-[var(--surface-muted)]
                                      px-2
                                      py-0.5
                                      text-[9px]
                                      font-extrabold
                                      uppercase
                                      tracking-[0.1em]
                                      text-[var(--text-muted)]
                                    "
                                  >
                                    {item.badge}
                                  </span>
                                ) : null}
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={
                                item.label
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
                                "group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold outline-none transition",
                                "focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
                                active
                                  ? "bg-[var(--sidebar-active-background)] text-[var(--primary)]"
                                  : "text-[var(--text-secondary)] hover:bg-[var(--sidebar-hover-background)] hover:text-[var(--text-primary)]",
                              ].join(" ")}
                            >
                              <span
                                className={[
                                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition",
                                  active
                                    ? "bg-[var(--primary-soft)] text-[var(--primary)]"
                                    : "bg-[var(--surface-muted)] text-[var(--text-muted)] group-hover:text-[var(--primary)]",
                                ].join(" ")}
                              >
                                {item.icon}
                              </span>

                              <span
                                className="
                                  min-w-0
                                  flex-1
                                  truncate
                                "
                              >
                                {item.label}
                              </span>

                              {item.badge ? (
                                <span
                                  className="
                                    rounded-full
                                    border
                                    border-[var(--border-subtle)]
                                    bg-[var(--surface-muted)]
                                    px-2
                                    py-0.5
                                    text-[9px]
                                    font-extrabold
                                    uppercase
                                    tracking-[0.1em]
                                    text-[var(--text-muted)]
                                  "
                                >
                                  {item.badge}
                                </span>
                              ) : null}
                            </Link>
                          );
                        },
                      )}
                    </div>
                  ) : null}
                </section>
              );
            },
          )}
        </div>
      </nav>

      <div
        className="
          border-t
          border-[var(--sidebar-border)]
          px-4
          py-4
        "
      >
        <div
          className="
            rounded-xl
            border
            border-[var(--border-subtle)]
            bg-[var(--surface-muted)]
            px-3
            py-3
          "
        >
          <p
            className="
              text-[10px]
              font-extrabold
              uppercase
              tracking-[0.14em]
              text-[var(--text-muted)]
            "
          >
            Learning platform
          </p>

          <p
            className="
              mt-1
              text-xs
              font-semibold
              leading-5
              text-[var(--text-secondary)]
            "
          >
            Build investing knowledge one lesson at a time.
          </p>
        </div>
      </div>
    </aside>
  );
}