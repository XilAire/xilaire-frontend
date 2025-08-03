import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Initialize Supabase client with service role key for full access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ykjbvimhgebeemoneduy.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE'; // Replace with your key or env var

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  global: {
    headers: {
      apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlramJ2aW1oZ2ViZWVtb25lZHV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMTI0ODgsImV4cCI6MjA2NzY4ODQ4OH0.cJErcCjPkCW6wXTnAjCbjm9enLbEPzEaUdIPzAjGwmI',
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlramJ2aW1oZ2ViZWVtb25lZHV5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjExMjQ4OCwiZXhwIjoyMDY3Njg4NDg4fQ.K8dBvCY3gGW9fR1GadDCk8CZUBelHODzXvtd1eZpdbg',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
  },
});

export async function GET() {
  const { data, count, error } = await supabase
    .from('tickets')
    .select('*', { count: 'exact' })
    .eq('status', 'open');

  if (error) {
    console.error('Error fetching tickets:', error.message);
    return NextResponse.json({ count: 0, error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    count: count ?? 0,
    sampleTickets: data?.slice(0, 5) || [],
  });
}
