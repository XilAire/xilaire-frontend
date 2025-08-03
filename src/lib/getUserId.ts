import { cookies } from 'next/headers';
import { supabase } from './supabaseClient';

export async function getUserIdFromRequest() {
  const cookieStore = await cookies(); // ✅ needs `await`
  const token = cookieStore.get('sb-access-token')?.value;

  if (!token) return null;

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) {
    console.error('Error getting user:', error.message);
    return null;
  }

  return user?.id || null;
}
