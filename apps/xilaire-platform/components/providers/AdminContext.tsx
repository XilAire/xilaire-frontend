"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createBrowserClient } from "@supabase/ssr";

type Role = "master_admin" | "super_admin" | "admin" | "user";

interface AdminContextValue {
  loading: boolean;
  role: Role | null;
  orgId: string | null;
  canSwitchOrg: boolean;

  isMasterAdmin: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [canSwitchOrg, setCanSwitchOrg] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_PLATFORM!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PLATFORM!
  );

  useEffect(() => {
    let mounted = true;

    async function loadAdminContext() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      const meta = user?.app_metadata;

      setRole(meta?.role ?? null);
      setOrgId(meta?.org_id ?? null);
      setCanSwitchOrg(Boolean(meta?.can_switch_org));

      setLoading(false);
    }

    loadAdminContext();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const value = useMemo<AdminContextValue>(
    () => ({
      loading,
      role,
      orgId,
      canSwitchOrg,

      isMasterAdmin: role === "master_admin",
      isSuperAdmin: role === "super_admin",
      isAdmin: role === "admin" || role === "super_admin" || role === "master_admin",
    }),
    [loading, role, orgId, canSwitchOrg]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdmin must be used inside <AdminProvider>");
  }
  return ctx;
}
