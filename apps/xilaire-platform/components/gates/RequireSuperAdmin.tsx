"use client";

import { useAdmin } from "@/components/providers/AdminContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RequireSuperAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, isMasterAdmin, isSuperAdmin } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !(isMasterAdmin || isSuperAdmin)) {
      router.replace("/403");
    }
  }, [loading, isMasterAdmin, isSuperAdmin, router]);

  if (loading) return null;
  if (!(isMasterAdmin || isSuperAdmin)) return null;

  return <>{children}</>;
}
