"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

type Role = "student" | "admin" | string | null;

export function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (!currentUser) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .maybeSingle();

      setRole((profile?.role as Role) ?? "student");
      setIsLoading(false);
    };

    load();
  }, []);

  // Close menus on route change
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  const isAdmin = role === "admin";

  const navLinkClasses = (href: string) => {
    const active = pathname === href;
    return [
      "text-sm px-3 py-1.5 rounded-md transition-colors",
      active
        ? "bg-slate-100 font-medium text-slate-900"
        : "text-slate-700 hover:bg-slate-100",
    ].join(" ");
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth/signin");
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() ?? "U";

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/xilaire-security-logo.png"
            alt="XilAire Security"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <span className="hidden text-base font-semibold text-[#0A233F] sm:inline">
            XilAire Security
          </span>
        </Link>

        {/* Desktop nav (center-left) */}
        <nav className="hidden flex-1 items-center justify-center gap-2 md:flex">
          <Link href="/" className={navLinkClasses("/")}>
            Home
          </Link>
          <Link
            href="/courses/catalog"
            className={navLinkClasses("/courses/catalog")}
          >
            Courses
          </Link>
          <Link href="/faq" className={navLinkClasses("/faq")}>
            FAQ
          </Link>
          <Link href="/about" className={navLinkClasses("/about")}>
            About
          </Link>
          <Link href="/contact" className={navLinkClasses("/contact")}>
            Contact
          </Link>
        </nav>

        {/* Right side: user / auth + mobile toggle */}
        <div className="flex items-center gap-2">
          {/* Desktop user area */}
          <div className="hidden items-center gap-2 md:flex">
            {isLoading ? (
              <span className="text-xs text-slate-500">Checking…</span>
            ) : !user ? (
              <Link
                href="/auth/signin"
                className="rounded-md border px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
            ) : (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((s) => !s)}
                  className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-200"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0A233F] text-[13px] font-semibold text-white">
                    {userInitial}
                  </span>
                  <span className="max-w-[140px] truncate">
                    {user.email}
                  </span>
                  <span className="text-[10px]">▾</span>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border bg-white p-1 text-sm shadow-lg origin-top-right transform transition duration-150 ease-out">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/certificates"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      My certificates
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      Profile &amp; settings
                    </Link>

                    {isAdmin && (
                      <>
                        <div className="my-1 border-t" />
                        <Link
                          href="/admin/progress"
                          onClick={() => setUserMenuOpen(false)}
                          className="block rounded px-3 py-2 hover:bg-slate-100"
                        >
                          Admin – Progress
                        </Link>
                        <Link
                          href="/admin/certificates"
                          onClick={() => setUserMenuOpen(false)}
                          className="block rounded px-3 py-2 hover:bg-slate-100"
                        >
                          Admin – Certificates
                        </Link>
                        <Link
                          href="/admin/students"
                          onClick={() => setUserMenuOpen(false)}
                          className="block rounded px-3 py-2 hover:bg-slate-100"
                        >
                          Admin – Students
                        </Link>
                        {/* ✅ New admin contact-messages link (desktop dropdown) */}
                        <Link
                          href="/admin/contact-messages"
                          onClick={() => setUserMenuOpen(false)}
                          className="block rounded px-3 py-2 hover:bg-slate-100"
                        >
                          Admin – Contact messages
                        </Link>
                      </>
                    )}

                    <div className="my-1 border-t" />
                    <button
                      type="button"
                      onClick={signOut}
                      className="block w-full rounded px-3 py-2 text-left text-red-600 hover:bg-red-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 md:hidden"
            onClick={() => setMobileOpen((s) => !s)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileOpen && (
        <div className="border-t bg-white md:hidden">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-1 text-sm">
            <Link href="/" className={navLinkClasses("/")}>
              Home
            </Link>

            <Link
              href="/courses/catalog"
              className={navLinkClasses("/courses/catalog")}
            >
              Courses
            </Link>

            <Link href="/faq" className={navLinkClasses("/faq")}>
              FAQ
            </Link>

            <Link href="/about" className={navLinkClasses("/about")}>
              About
            </Link>

            <Link href="/contact" className={navLinkClasses("/contact")}>
              Contact
            </Link>

            <div className="h-px w-full bg-slate-100 my-2" />

            {isLoading ? (
              <p className="text-xs text-slate-500">Checking session…</p>
            ) : !user ? (
              <Link
                href="/auth/signin"
                className="inline-flex w-full items-center justify-center rounded-md border px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
            ) : (
              <>
                <p className="text-xs text-slate-600 mb-1">
                  Signed in as <span className="font-medium">{user.email}</span>
                </p>

                <Link
                  href="/dashboard"
                  className="block rounded px-3 py-2 hover:bg-slate-100"
                >
                  Dashboard
                </Link>
                <Link
                  href="/certificates"
                  className="block rounded px-3 py-2 hover:bg-slate-100"
                >
                  My certificates
                </Link>
                <Link
                  href="/profile"
                  className="block rounded px-3 py-2 hover:bg-slate-100"
                >
                  Profile &amp; settings
                </Link>

                {isAdmin && (
                  <>
                    <div className="my-1 border-t" />
                    <Link
                      href="/admin/progress"
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      Admin – Progress
                    </Link>
                    <Link
                      href="/admin/certificates"
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      Admin – Certificates
                    </Link>
                    <Link
                      href="/admin/students"
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      Admin – Students
                    </Link>
                    {/* ✅ New admin contact-messages link (mobile menu) */}
                    <Link
                      href="/admin/contact-messages"
                      className="block rounded px-3 py-2 hover:bg-slate-100"
                    >
                      Admin – Contact messages
                    </Link>
                  </>
                )}

                <div className="my-1 border-t" />
                <button
                  type="button"
                  onClick={signOut}
                  className="block w-full rounded px-3 py-2 text-left text-red-600 hover:bg-red-50"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
