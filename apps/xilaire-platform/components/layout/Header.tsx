"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Plus } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!
);

export default function HeaderBar({
  title,
  subtitle,
  showActions = false,
}: {
  title: string;
  subtitle?: string;
  showActions?: boolean;
}) {
  const [userEmail, setUserEmail] = useState("");
  const [initials, setInitials] = useState("");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setUserEmail(user.email);
        setInitials(
          user.email
            .split("@")[0]
            .split(".")
            .map((p) => p[0]?.toUpperCase())
            .join("")
        );
      }
    }
    load();
  }, []);

  return (
    <div className="flex items-center justify-between pb-6 pt-2">
      {/* Left: Titles */}
      <div>
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-3">

        {showActions && (
          <>
            <Link
              href="/helpdesk/tickets/new"
              className="px-4 py-2 rounded-lg border border-sky-700 text-sky-400 text-sm hover:bg-sky-950/40 transition flex items-center gap-1"
            >
              <Plus size={14} /> New Ticket
            </Link>

            <Link
              href="/automations/new"
              className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm transition flex items-center gap-1"
            >
              <Plus size={14} /> New Automation
            </Link>
          </>
        )}

        {/* USER AVATAR */}
        <div className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-700 text-white font-semibold text-sm">
          {initials || "?"}
        </div>
      </div>
    </div>
  );
}
