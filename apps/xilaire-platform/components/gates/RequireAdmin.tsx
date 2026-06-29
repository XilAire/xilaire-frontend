"use client";

import { useAdmin } from "@/components/providers/AdminContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { loading, isAdmin } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      router.replace("/403");
    }
  }, [loading, isAdmin, router]);

  if (loading) return null;
  if (!isAdmin) return null;

  return <>{children}</>;
}
