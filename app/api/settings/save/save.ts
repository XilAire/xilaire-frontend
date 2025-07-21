import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id, theme, notifications_enabled } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }

  try {
    // Upsert user settings (insert or update)
    const { error } = await supabase
      .from('user_settings')
      .upsert([
        {
          user_id,
          theme,
          notifications_enabled,
          updated_at: new Date().toISOString(),
        },
      ])
      .eq('user_id', user_id);

    if (error) {
      console.error('[Save Settings Error]', error);
      return res.status(500).json({ error: 'Failed to save settings' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[API ERROR]', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}
