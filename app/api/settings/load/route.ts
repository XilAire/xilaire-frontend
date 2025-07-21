import { supabase } from '@/lib/supabaseClient';
import { getUserIdFromRequest } from '@/lib/getUserId';

export async function GET() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Load settings error:', error);
    return new Response(JSON.stringify({ error: 'Failed to load settings' }), { status: 500 });
  }

  return new Response(JSON.stringify(data));
}
