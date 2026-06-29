"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "./lib/supabaseBrowser"; // ⬅️ update path if needed

export function SupabaseDebugClient() {
  useEffect(() => {
    (window as any).supabase = supabaseBrowser;
    console.log("[SupabaseDebugClient] window.supabase attached");
  }, []);

  return null;
}
