import { createClient } from '@supabase/supabase-js';

export function createSecurityAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL_SECURITY!,
    process.env.SUPABASE_SERVICE_ROLE_KEY_SECURITY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}
