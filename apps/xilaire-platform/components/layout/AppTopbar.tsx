"use client";

import Link from "next/link";
import { Plus, Ticket, Sparkles } from "lucide-react";

import Button from "@/components/ui/Button";
import UserMenu from "./UserMenu";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

type AppTopbarProps = {
  title?: string;
  subtitle?: string;
  profile?: any;
};

export default function AppTopbar({
  title = "Dashboard",
  subtitle = "Overview of your bots, tickets, and automations.",
  profile,
}: AppTopbarProps) {
  return (
    <header
      className="
        sticky top-0 z-30
        border-b border-slate-800
        bg-slate-950/95
        backdrop-blur
        transition-colors
      "
    >
      <div className="flex min-h-[76px] items-center justify-between gap-4 px-5 py-4 lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="
                inline-flex items-center rounded-full
                border border-sky-500/20 bg-sky-500/10
                px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]
                text-sky-300
              "
            >
              XilAire Platform
            </span>
          </div>

          <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-white">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1 max-w-3xl truncate text-sm text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <ThemeToggle />
          </div>

          <Link href="/tickets">
            <Button
              variant="outline"
              className="
                inline-flex h-10 items-center gap-2 rounded-xl
                border-slate-700 bg-slate-900 px-4 text-sm font-medium text-slate-200
                hover:border-slate-600 hover:bg-slate-800
                dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800
              "
            >
              <Ticket className="h-4 w-4" />
              New ticket
            </Button>
          </Link>

          <Link href="/automations/new">
            <Button
              className="
                inline-flex h-10 items-center gap-2 rounded-xl
                bg-sky-600 px-4 text-sm font-semibold text-white
                hover:bg-sky-500
                dark:bg-sky-600 dark:hover:bg-sky-500
              "
            >
              <Sparkles className="h-4 w-4" />
              New automation
            </Button>
          </Link>

          <div className="ml-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            <UserMenu profile={profile} />
          </div>
        </div>
      </div>
    </header>
  );
}