import { supabase } from './supabaseClient';

export async function fetchKpiMetrics(
  startDate: string,
  endDate: string,
  bot?: string,
  metric?: string
) {
  // Normalize dates to full day range
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(23, 59, 59, 999);

  let query = supabase
    .from('kpi_metrics')
    .select('*')
    .gte('timestamp', start.toISOString())
    .lte('timestamp', end.toISOString());

  // Apply optional filters if present
  if (bot) {
    query = query.eq('bot', bot);
  }
  if (metric) {
    query = query.eq('metric', metric);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching KPI metrics:', error);
    return [];
  }

  return data;
}
