"use client";

import { useRouter } from "next/navigation";
import { supabaseCaseTrades } from "@/lib/supabase/client";

interface CaseProfileMenuProps {
  email: string;
  roleName: string;
  compact?: boolean;
}

export default function CaseProfileMenu({
  email,
  roleName,
  compact = false,
}: CaseProfileMenuProps) {
  const router = useRouter();

  async function handleLogout() {
    await supabaseCaseTrades.auth.signOut();
    router.push("/auth/signin");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {!compact && (
        <div className="text-right leading-tight">
          <div className="text-sm font-medium text-slate-200">
            {email}
          </div>
          <div className="text-xs text-slate-400">
            {roleName}
          </div>
        </div>
      )}

      <button
        onClick={handleLogout}
        className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
      >
        Sign out
      </button>
    </div>
  );
}
