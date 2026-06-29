"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabasePlatformClient";

export default function AdminShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        console.warn("No active Supabase session found");
      }

      setReady(true);
    };

    initialize();
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen text-slate-400">
        Loading...
      </div>
    );
  }

  return <>{children}</>;
}