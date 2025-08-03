import { NextResponse } from 'next/server'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/settings
export async function GET() {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Load settings error:', error);
    return NextResponse.json({ error: 'Failed to load settings', details: error }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/settings
export async function POST(request: Request) {
  const supabase = createServerComponentClient({ cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (!user || authError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { theme, notifications_enabled, default_bot, default_metric } = await request.json();

  const rpcPayload = {
    notifications_enabled,
    theme,
    updated_at: new Date().toISOString(),
    user_id: user.id,
    default_bot: default_bot ?? null,
    default_metric: default_metric ?? null
  };

  const { error } = await supabase.rpc('upsert_user_settings', {
    json_data: rpcPayload
  });

  if (error) {
    console.error('Save settings error:', error);
    return NextResponse.json({ error: 'Failed to save settings', details: error }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
