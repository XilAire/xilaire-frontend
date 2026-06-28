"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/getProfile";

type CaseUserMenuProps = {
  profile?: Profile;
};

export default function CaseUserMenu({
  profile,
}: CaseUserMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    router.push("/auth/signin");
    router.refresh();
  }

  const email = profile?.email ?? "Unknown User";
  const roleName = profile?.role ?? "User";

  return (
    <div className="relative">
      {/* TRIGGER */}
      <button
        onClick={() => setOpen(!open)}
        className="
          flex items-center gap-2
          rounded-md border border-slate-700
          bg-slate-800 px-3 py-1.5
          text-xs text-slate-200
          hover:bg-slate-700 transition
        "
      >
        <span>{email}</span>
        <svg
          className="h-3 w-3 text-slate-400"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {/* MENU */}
      {open && (
        <div
          className="
            absolute right-0 mt-2 w-48
            rounded-md border border-slate-700
            bg-slate-900 shadow-lg
            z-50
          "
        >
          <div className="px-3 py-2 text-xs text-slate-400 border-b border-slate-800">
            <div className="font-medium text-slate-200">
              {email}
            </div>
            <div>{roleName}</div>
          </div>

          <button
            onClick={handleLogout}
            className="
              w-full text-left
              px-3 py-2 text-xs
              text-slate-200 hover:bg-slate-800
            "
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
