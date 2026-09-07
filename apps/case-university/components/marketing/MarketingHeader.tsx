import Link from "next/link";

type MarketingHeaderProps = {
  isAuthenticated?: boolean;
};

const navItems = [
  {
    href: "/courses",
    label: "Courses",
  },
  {
    href: "/pricing",
    label: "Pricing",
  },
  {
    href: "/about",
    label: "About",
  },
  {
    href: "/legal",
    label: "Legal",
  },
];

export default function MarketingHeader({
  isAuthenticated = false,
}: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-default)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1400px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-2 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:gap-3"
          aria-label="CASE University home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-xs font-black text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] sm:h-10 sm:w-10 sm:text-sm">
            CU
          </span>

          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold tracking-tight text-[var(--text-primary)]">
              CASE University
            </span>

            <span className="mt-0.5 hidden truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] sm:block">
              Investing Academy
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-1 lg:flex"
        >
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-10 items-center rounded-xl px-4 text-sm font-bold text-[var(--text-muted)] outline-none transition hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {isAuthenticated ? (
            <Link
              href="/dashboard"
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-2.5 text-xs font-bold text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:min-h-10 sm:px-4 sm:text-sm"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/auth/signin"
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-2.5 text-xs font-bold text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:min-h-10 sm:px-4 sm:text-sm"
              >
                Sign in
              </Link>

              <Link
                href="/auth/register"
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--primary)] bg-[var(--surface-default)] px-2.5 text-xs font-bold text-[var(--primary)] transition hover:bg-[var(--primary-soft)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:min-h-10 sm:px-4 sm:text-sm"
              >
                <span className="sm:hidden">
                  Register
                </span>
                <span className="hidden sm:inline">
                  Create account
                </span>
              </Link>
            </>
          )}

          <Link
            href="/courses"
            className="inline-flex min-h-9 items-center justify-center rounded-xl bg-[var(--primary)] px-2.5 text-xs font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:min-h-10 sm:px-4 sm:text-sm"
          >
            <span className="sm:hidden">
              Courses
            </span>
            <span className="hidden sm:inline">
              Browse courses
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
