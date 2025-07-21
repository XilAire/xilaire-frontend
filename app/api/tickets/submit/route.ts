import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const { subject, message } = body;

  if (!subject || !message) {
    return NextResponse.json({ error: 'Missing subject or message' }, { status: 400 });
  }

  const { data, error } = await supabase.from('tickets').insert([
    {
      subject,
      message,
      // ❌ No need to send user_id — it's auto-injected by trigger
    },
  ]);

  if (error) {
    console.error('[Ticket Submission Error]', error.message);
    return NextResponse.json({ error: 'Error creating ticket' }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
