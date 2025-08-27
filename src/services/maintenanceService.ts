import { supabase } from '@/integrations/supabase/client';

export interface MaintenanceStatus {
  maintenance_mode: boolean;
  system_name: string;
}

class MaintenanceService {
  /**
   * Check if the system is in maintenance mode
   */
  async getMaintenanceStatus(): Promise<MaintenanceStatus> {
    try {
      const { data, error } = await supabase.rpc('get_maintenance_mode_status');
      
      if (error) {
        throw new Error(error.message);
      }

      if (!data || data.length === 0) {
        // Return default status if no settings exist
        return {
          maintenance_mode: false,
          system_name: 'DIL Learning Platform'
        };
      }

      return data[0];
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      // Return default status on error to prevent blocking the app
      return {
        maintenance_mode: false,
        system_name: 'DIL Learning Platform'
      };
    }
  }

  /**
   * Check if maintenance mode is enabled (simple boolean check)
   */
  async isMaintenanceMode(): Promise<boolean> {
    try {
      const status = await this.getMaintenanceStatus();
      return status.maintenance_mode;
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      return false; // Default to false to prevent blocking the app
    }
  }
}

export default new MaintenanceService();
