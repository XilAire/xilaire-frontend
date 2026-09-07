import Link from "next/link";

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

type MarketingHeaderProps = {
  isAuthenticated?: boolean;
};

export default function MarketingHeader({
  isAuthenticated = false,
}: MarketingHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface-default)_92%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 w-full max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          aria-label="CASE University home"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)] text-sm font-black text-[var(--primary-foreground)] shadow-[var(--shadow-primary)]">
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

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/legal"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-3 text-sm font-bold text-[var(--text-secondary)] shadow-[var(--shadow-xs)] transition hover:border-[var(--primary)] hover:text-[var(--primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] lg:hidden"
          >
            Legal
          </Link>

          <Link
            href={isAuthenticated ? "/dashboard" : "/auth/signin"}
            className="hidden min-h-10 items-center justify-center rounded-xl border border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] sm:inline-flex"
          >
            {isAuthenticated ? "Dashboard" : "Sign in"}
          </Link>

          <Link
            href="/courses"
            className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--primary-foreground)] shadow-[var(--shadow-primary)] transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Browse courses
          </Link>
        </div>
      </div>
    </header>
  );
}
