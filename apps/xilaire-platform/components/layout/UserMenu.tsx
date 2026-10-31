"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings, ChevronDown } from "lucide-react";

type UserMenuProfile = {
  full_name?: string | null;
  email?: string | null;
} | null;

export default function UserMenu({ profile }: { profile: UserMenuProfile }) {
  const router = useRouter();
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const name = profile?.full_name?.trim() || "Your account";
  const initials = name === "Your account" ? "U" : name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  async function handleLogout() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const result = await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      if (!result.ok) throw new Error("Logout request failed");
      router.push("/auth/signin");
      router.refresh();
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--surface-muted)] p-1 pr-2 text-[var(--text-primary)] transition hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-semibold text-[var(--primary-foreground)]">{initials}</span>
        <ChevronDown aria-hidden="true" className="h-4 w-4 text-[var(--text-muted)]" />
      </button>

      {open && (
        <div role="menu" aria-label="Account options" className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] py-2 text-[var(--text-primary)] shadow-lg">
          <div className="border-b border-[var(--border-subtle)] px-4 pb-3 pt-2">
            <p className="text-xs text-[var(--text-muted)]">Signed in as</p>
            <p className="mt-1 truncate text-sm font-semibold">{name}</p>
            {profile?.email && <p className="truncate text-xs text-[var(--text-secondary)]">{profile.email}</p>}
          </div>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); router.push("/settings"); }} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[var(--surface-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
            <Settings aria-hidden="true" className="h-4 w-4" /> Profile &amp; Settings
          </button>
          <button type="button" role="menuitem" disabled={signingOut} onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[var(--danger)] transition hover:bg-[var(--danger-soft)] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">
            <LogOut aria-hidden="true" className="h-4 w-4" /> {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
