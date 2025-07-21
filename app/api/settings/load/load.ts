
// pages/api/settings/load.ts
import { supabase } from '@/lib/supabaseClient';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { user_id, email } = req.query;

  if (!user_id && !email) {
    return res.status(400).json({ message: 'Missing user_id or email' });
  }

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .match(user_id ? { user_id } : { email })
    .single();

  if (error) {
    console.error('Error loading user settings:', error);
    return res.status(500).json({ message: 'Failed to load user settings' });
  }

  return res.status(200).json(data);
}
