"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

type User = any;

interface AuthContextType {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = supabasePlatform;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Manually refresh logged-in user (used after password update, profile update, etc.)
   */
  const refreshUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    /**
     * Load initial user on mount
     */
    const loadInitialUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (isMounted) {
        setUser(data.user ?? null);
        setLoading(false);
      }
    };

    loadInitialUser();

    /**
     * Subscribe to Supabase auth changes
     * - login
     * - logout
     * - token refresh
     */
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
      }
    );

    /**
     * Cleanup
     */
    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <AuthContext.Provider value={{ user, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useUser = () => useContext(AuthContext);
