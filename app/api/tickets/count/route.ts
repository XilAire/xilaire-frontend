import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: NextRequest) {
  try {
    // Query the count of open tickets
    const { count, error } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true }) // head: true returns count only, no rows
      .eq('status', 'open');

    if (error) {
      return new Response(
        JSON.stringify({ count: 0, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ count: count ?? 0 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ count: 0, error: 'Unexpected error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
