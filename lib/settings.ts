// lib/settings.ts

import { supabase } from './supabaseClient';

export async function getUserSettings(userId: string) {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching settings:', error);
    return null;
  }

  return data;
}

export async function saveUserSettings(userId: string, updates: Partial<{ theme: string; notifications_enabled: boolean }>) {
  const { error } = await supabase
    .from('user_settings')
    .upsert({
      user_id: userId,
      ...updates,
      updated_at: new Date().toISOString(),
    }, { onConflict: ['user_id'] });

  if (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}
