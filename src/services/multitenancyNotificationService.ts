import { supabase } from '@/integrations/supabase/client';

export interface MultitenancyNotificationData {
  entityType: 'country' | 'region' | 'city' | 'project' | 'board' | 'school';
  action: 'created' | 'updated' | 'deleted';
  entityName: string;
  entityCode?: string;
  entityId: string;
  parentEntity?: {
    type: string;
    name: string;
  };
  performedBy: {
    id: string;
    name: string;
  };
}

class MultitenancyNotificationService {
  /**
   * Get all admin users from the database
   */
  private static async getAllAdmins(): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching admin users:', error);
        return [];
      }

      return data?.map(admin => ({
        id: admin.id,
        name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin',
        email: admin.email || ''
      })) || [];
    } catch (error) {
      console.error('Error getting admin users:', error);
      return [];
    }
  }

  /**
   * Send notification to all admins about multitenancy changes
   */
  static async notifyAdmins(notificationData: MultitenancyNotificationData): Promise<void> {
    try {
      const admins = await this.getAllAdmins();
      
      if (admins.length === 0) {
        console.warn('No admin users found to notify');
        return;
      }

      const { entityType, action, entityName, entityCode, parentEntity, performedBy } = notificationData;
      
      // Create notification title and body
      const actionText = action === 'created' ? 'created' : action === 'updated' ? 'updated' : 'deleted';
      const entityTypeText = this.getEntityTypeText(entityType);
      const parentText = parentEntity ? ` under ${parentEntity.type} "${parentEntity.name}"` : '';
      
      const title = `${entityTypeText} ${actionText.charAt(0).toUpperCase() + actionText.slice(1)}`;
      const body = `${entityTypeText} "${entityName}"${entityCode ? ` (${entityCode})` : ''} has been ${actionText}${parentText} by ${performedBy.name}`;

      // Send notification to all admins
      const adminIds = admins.map(admin => admin.id);
      
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'multitenancy_change',
          title: title,
          body: body,
          data: {
            entityType: entityType,
            action: action,
            entityId: notificationData.entityId,
            entityName: entityName,
            entityCode: entityCode,
            parentEntity: parentEntity,
            performedBy: performedBy,
            timestamp: new Date().toISOString()
          },
          targetUsers: adminIds
        }
      });

      console.log(`✅ Notified ${adminIds.length} admins about ${entityType} ${action}`);
    } catch (error) {
      console.error('Error sending multitenancy notifications:', error);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Get human-readable entity type text
   */
  private static getEntityTypeText(entityType: string): string {
    const typeMap: Record<string, string> = {
      'country': 'Country',
      'region': 'Region', 
      'city': 'City',
      'project': 'Project',
      'board': 'Board',
      'school': 'School'
    };
    return typeMap[entityType] || entityType;
  }

  /**
   * Notify about country changes
   */
  static async notifyCountryChange(
    action: 'created' | 'updated' | 'deleted',
    country: { id: string; name: string; code: string },
    performedBy: { id: string; name: string }
  ): Promise<void> {
    await this.notifyAdmins({
      entityType: 'country',
      action,
      entityName: country.name,
      entityCode: country.code,
      entityId: country.id,
      performedBy
    });
  }

  /**
   * Notify about region changes
   */
  static async notifyRegionChange(
    action: 'created' | 'updated' | 'deleted',
    region: { id: string; name: string; code: string },
    country: { name: string },
    performedBy: { id: string; name: string }
  ): Promise<void> {
    await this.notifyAdmins({
      entityType: 'region',
      action,
      entityName: region.name,
      entityCode: region.code,
      entityId: region.id,
      parentEntity: {
        type: 'Country',
        name: country.name
      },
      performedBy
    });
  }

  /**
   * Notify about city changes
   */
  static async notifyCityChange(
    action: 'created' | 'updated' | 'deleted',
    city: { id: string; name: string; code: string },
    region: { name: string },
    country: { name: string },
    performedBy: { id: string; name: string }
  ): Promise<void> {
    await this.notifyAdmins({
      entityType: 'city',
      action,
      entityName: city.name,
      entityCode: city.code,
      entityId: city.id,
      parentEntity: {
        type: 'Region',
        name: `${region.name}, ${country.name}`
      },
      performedBy
    });
  }

  /**
   * Notify about project changes
   */
  static async notifyProjectChange(
    action: 'created' | 'updated' | 'deleted',
    project: { id: string; name: string; code: string },
    city: { name: string },
    performedBy: { id: string; name: string }
  ): Promise<void> {
    await this.notifyAdmins({
      entityType: 'project',
      action,
      entityName: project.name,
      entityCode: project.code,
      entityId: project.id,
      parentEntity: {
        type: 'City',
        name: city.name
      },
      performedBy
    });
  }

  /**
   * Notify about board changes
   */
  static async notifyBoardChange(
    action: 'created' | 'updated' | 'deleted',
    board: { id: string; name: string; code: string },
    project: { name: string },
    performedBy: { id: string; name: string }
  ): Promise<void> {
    await this.notifyAdmins({
      entityType: 'board',
      action,
      entityName: board.name,
      entityCode: board.code,
      entityId: board.id,
      parentEntity: {
        type: 'Project',
        name: project.name
      },
      performedBy
    });
  }

  /**
   * Notify about school changes
   */
  static async notifySchoolChange(
    action: 'created' | 'updated' | 'deleted',
    school: { id: string; name: string; code: string },
    board: { name: string },
    performedBy: { id: string; name: string }
  ): Promise<void> {
    await this.notifyAdmins({
      entityType: 'school',
      action,
      entityName: school.name,
      entityCode: school.code,
      entityId: school.id,
      parentEntity: {
        type: 'Board',
        name: board.name
      },
      performedBy
    });
  }
}

export default MultitenancyNotificationService;
