"use client";

import { createContext, useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export const AuthContext = createContext<any>(null);

export default function SupabaseProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initial load
    supabasePlatform.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    // Listen to login/logout events
    const { data: listener } = supabasePlatform.auth.onAuthStateChange(
      (_, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user }}>
      {children}
    </AuthContext.Provider>
  );
}
