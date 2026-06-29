"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getStoredExperience, clearStoredExperience } from "@/lib/experience";

export default function MarketingHeader() {
  const router = useRouter();
  const [experience, setExperience] = useState<"individual" | "business" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setExperience(getStoredExperience());
  }, []);

  function handleSwitchExperience() {
    clearStoredExperience();
    router.push("/#choose-experience");
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur dark:bg-slate-800/80 dark:border-slate-700">
      <nav className="mx-auto max-w-7xl flex justify-between items-center px-6 py-4">

        {/* LOGO */}
        <a href="/" className="flex items-center gap-2">
          <img src="/icon.png" className="h-8 dark:hidden" alt="Logo" />
          <img
            src="/icon-light.png"
            className="h-8 hidden dark:block"
            alt="Logo Dark"
          />
          <span className="font-semibold text-sky-600 dark:text-sky-400">
            XilAire Technologies
          </span>
        </a>

        {/* LINKS */}
        <div className="hidden md:flex gap-6 text-sm text-slate-600 dark:text-slate-300">
          <a href="/">Home</a>
          <a href="/services">Services</a>
          <a href="/pricing">Pricing</a>
          <a href="/about">About</a>
          <a href="/contact">Contact</a>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3">
          <ThemeToggle storageKey="marketing-theme" />

          {/* SAFE: only render after mount */}
          {mounted && experience && (
            <button
              onClick={handleSwitchExperience}
              className="text-xs px-3 py-2 rounded border border-slate-300
                         dark:border-slate-600 text-slate-600 dark:text-slate-300
                         hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              Switch experience
            </button>
          )}

          {/* ✅ NEW — BOOK A CALL */}
          <a
            href="/book"
            className="hidden sm:inline-flex items-center rounded px-4 py-2 text-sm
                       border border-sky-500 text-sky-600
                       hover:bg-sky-50 dark:hover:bg-slate-700
                       dark:border-sky-400 dark:text-sky-300 transition"
          >
            Book a Call
          </a>

          <a
            href="/auth/signin"
            className="border px-4 py-2 rounded text-sm border-slate-300 dark:border-slate-600"
          >
            Sign in
          </a>

          <a
            href="/auth/signup"
            className="bg-sky-500 text-white px-4 py-2 rounded text-sm dark:bg-sky-600"
          >
            Get Started
          </a>
        </div>

      </nav>
    </header>
  );
}