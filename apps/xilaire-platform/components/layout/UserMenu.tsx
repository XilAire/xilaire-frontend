"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UserMenu({ profile }: { profile: any }) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "U";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/signin");
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setOpen(!open)}
        className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center 
                   text-slate-200 font-semibold hover:bg-slate-600 transition"
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-48 rounded-lg border border-slate-800 
                     bg-slate-900 shadow-xl py-2 z-50"
        >
          <div className="px-4 py-2 text-xs text-slate-400">
            Signed in as
          </div>

          <div className="px-4 pb-2 text-sm text-slate-300 font-medium">
            {profile?.full_name}
          </div>

          <div className="border-t border-slate-800 my-2"></div>

          <button
            onClick={() => router.push("/settings")}
            className="w-full text-left px-4 py-2 text-sm text-slate-300 
                       hover:bg-slate-800 transition"
          >
            Profile & Settings
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm text-red-300 
                       hover:bg-red-900/30 transition"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
