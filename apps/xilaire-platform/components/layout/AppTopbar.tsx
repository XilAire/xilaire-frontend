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
        border-b border-[var(--border-default)]
        bg-[var(--surface-elevated)]/95
        backdrop-blur
        transition-colors
      "
    >
      <div className="flex min-h-[76px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="
                inline-flex items-center rounded-full
                border border-sky-500/20 bg-sky-500/10
                px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]
                text-sky-700 dark:text-sky-300
              "
            >
              XilAire Platform
            </span>
          </div>

          <h1 className="mt-2 truncate text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>

          {subtitle && (
            <p className="mt-1 max-w-3xl truncate text-sm text-[var(--text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 lg:gap-3">
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-muted)] p-1">
            <ThemeToggle />
          </div>

          <Link href="/tickets" className="hidden sm:block">
            <Button
              variant="outline"
              className="
                inline-flex h-10 items-center gap-2 rounded-xl
                border-[var(--border-default)] bg-[var(--surface-default)] px-4 text-sm font-medium text-foreground
                hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]
                dark:border-[var(--border-default)] dark:bg-[var(--surface-default)] dark:text-foreground dark:hover:bg-[var(--surface-hover)]
              "
            >
              <Ticket className="h-4 w-4" />
              New ticket
            </Button>
          </Link>

          <Link href="/automations/new" className="hidden lg:block">
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

          <UserMenu profile={profile} />
        </div>
      </div>
    </header>
  );
}