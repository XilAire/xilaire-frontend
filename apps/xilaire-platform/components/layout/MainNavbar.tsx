"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export default function MainNavbar() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-sky-500" />
          <span className="text-lg font-semibold tracking-wide">
            XilAire Technologies
          </span>
        </Link>

        <nav className="hidden gap-6 text-sm md:flex">
          {navLinks.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/" && pathname.startsWith(link.href));

            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  "transition hover:text-sky-400" +
                  (active ? " text-sky-400 font-semibold" : " text-slate-300")
                }
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/auth/signin"
            className="hidden text-sm text-slate-300 md:inline"
          >
            Sign in
          </Link>
          <Link href="/auth/signup">
            <Button variant="primary" className="text-sm px-4 py-2">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
