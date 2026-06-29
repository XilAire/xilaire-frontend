// apps/xilaire-security/app/lib/supabaseServer.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type SupaOpts = {
  writable?: boolean;
  headers?: Record<string, string>;
};

export function supabaseServer(opts?: SupaOpts) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_SECURITY!;

  // In practice cookies() is sync; we just relax the type for TS
  const cookieStore: any = cookies();
  const writable = !!opts?.writable;

  const cookieAdapter = {
    get(name: string) {
      return cookieStore.get?.(name)?.value;
    },

    set(name: string, value: string, options: CookieOptions) {
      if (!writable) return;
      try {
        cookieStore.set?.({ name, value, ...options });
      } catch {
        // ignore write errors on non-mutable contexts
      }
    },

    remove(name: string, options: CookieOptions) {
      if (!writable) return;
      try {
        cookieStore.set?.({ name, value: "", ...options });
      } catch {
        // ignore write errors
      }
    },
  };

  return createServerClient(url, key, {
    cookies: cookieAdapter,
    ...(opts?.headers ? { headers: opts.headers } : {}),
  });
}
