import { supabase } from '@/integrations/supabase/client';

const fcmService = {
  saveToken: async (token: string) => {
    const { error } = await supabase.rpc('save_fcm_token', { token_value: token });
    if (error) {
      console.error('Error saving FCM token:', error);
      throw error;
    }
  },
};

export default fcmService;
