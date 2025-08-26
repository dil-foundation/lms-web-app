import { supabase } from '@/integrations/supabase/client';

export interface AdminSettings {
  system_name: string;
  maintenance_mode: boolean;
  system_notifications: boolean;
  email_notifications: boolean;
  push_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

class AdminSettingsService {
  /**
   * Get the current admin settings
   */
  async getSettings(): Promise<AdminSettings> {
    try {
      const { data, error } = await supabase.rpc('get_admin_settings');
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        // Return default settings if none exist
        return {
          system_name: 'DIL Learning Platform',
          maintenance_mode: false,
          system_notifications: true,
          email_notifications: true,
          push_notifications: false
        };
      }

      return data[0];
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      throw new Error('Failed to fetch admin settings');
    }
  }

  /**
   * Update admin settings
   */
  async updateSettings(settings: Partial<AdminSettings>): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('update_admin_settings', {
        p_system_name: settings.system_name,
        p_maintenance_mode: settings.maintenance_mode,
        p_system_notifications: settings.system_notifications,
        p_email_notifications: settings.email_notifications,
        p_push_notifications: settings.push_notifications
      });

      if (error) {
        throw new Error(error.message);
      }

      return data === true;
    } catch (error) {
      console.error('Error updating admin settings:', error);
      throw new Error('Failed to update admin settings');
    }
  }

  /**
   * Reset settings to defaults
   */
  async resetSettings(): Promise<AdminSettings> {
    try {
      const defaultSettings = {
        system_name: 'DIL Learning Platform',
        maintenance_mode: false,
        system_notifications: true,
        email_notifications: true,
        push_notifications: false
      };

      await this.updateSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Error resetting admin settings:', error);
      throw new Error('Failed to reset admin settings');
    }
  }
}

export default new AdminSettingsService();
