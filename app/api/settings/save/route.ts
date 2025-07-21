import { supabase } from '@/lib/supabaseClient';
import { getUserIdFromRequest } from '@/lib/getUserId';

export async function POST(req: Request) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await req.json();

  const { theme, notifications_enabled } = body;

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      theme,
      notifications_enabled,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Save settings error:', error);
    return new Response(JSON.stringify({ error: 'Failed to save settings' }), { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }));
}
