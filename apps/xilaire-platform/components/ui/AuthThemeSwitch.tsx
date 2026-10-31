"use client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
export default function AuthThemeSwitch() {
  return <div className="fixed right-4 top-4 z-50 rounded-xl border border-border bg-surface shadow-sm" aria-label="Appearance settings"><ThemeToggle /></div>;
}
