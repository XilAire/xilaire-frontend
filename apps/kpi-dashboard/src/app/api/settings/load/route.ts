// File: apps/kpi-dashboard/src/app/api/settings/route.ts

import { supabase } from '../../../../lib/supabaseClient';
import { getUserIdFromRequest } from '../../../../lib/getUserId';

export async function GET() {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle(); // ← graceful handling for no rows returned

  if (error && error.code !== 'PGRST116') {
    console.error('Load settings error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to load settings' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      theme: data?.theme ?? 'light',
      notifications_enabled: data?.notifications_enabled ?? false,
      default_bot: data?.default_bot ?? null,
      default_metric: data?.default_metric ?? null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

export async function POST(request: Request) {
  const userId = await getUserIdFromRequest();
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { theme, notifications_enabled, default_bot, default_metric } = await request.json();

  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      theme,
      notifications_enabled,
      default_bot,
      default_metric,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Save settings error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to save settings' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}
