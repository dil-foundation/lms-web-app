import { supabase } from '@/integrations/supabase/client';

export interface Integration {
  id: string;
  name: string;
  type: 'communication' | 'payment' | 'productivity';
  status: 'enabled' | 'disabled' | 'error';
  settings: Record<string, any>;
  is_configured: boolean;
  last_sync: string | null;
  version: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStats {
  total: number;
  active: number;
  configured: number;
  errors: number;
}

class IntegrationService {
  async getIntegrations(): Promise<Integration[]> {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching integrations:', error);
      throw new Error('Failed to fetch integrations');
    }

    return data || [];
  }

  async getIntegrationStats(): Promise<IntegrationStats> {
    const integrations = await this.getIntegrations();
    
    return {
      total: integrations.length,
      active: integrations.filter(i => i.status === 'enabled').length,
      configured: integrations.filter(i => i.is_configured).length,
      errors: integrations.filter(i => i.status === 'error').length,
    };
  }

  async updateIntegrationStatus(id: string, status: 'enabled' | 'disabled'): Promise<void> {
    console.log('Updating integration status:', { id, status });
    
    const { data, error } = await supabase
      .from('integrations')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    console.log('Update result:', { data, error });

    if (error) {
      console.error('Error updating integration status:', error);
      throw new Error('Failed to update integration status');
    }

    if (!data || data.length === 0) {
      console.error('No rows updated - integration ID might not exist:', id);
      throw new Error('Integration not found or no changes made');
    }
  }

  async updateIntegrationSettings(id: string, settings: Record<string, any>): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .update({ 
        settings,
        is_configured: Object.keys(settings).length > 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating integration settings:', error);
      throw new Error('Failed to update integration settings');
    }
  }

  async createIntegration(integration: Omit<Integration, 'id' | 'created_at' | 'updated_at'>): Promise<Integration> {
    const { data, error } = await supabase
      .from('integrations')
      .insert([integration])
      .select()
      .single();

    if (error) {
      console.error('Error creating integration:', error);
      throw new Error('Failed to create integration');
    }

    return data;
  }

  async deleteIntegration(id: string): Promise<void> {
    const { error } = await supabase
      .from('integrations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting integration:', error);
      throw new Error('Failed to delete integration');
    }
  }

  // Get available integrations that can be added
  getAvailableIntegrations(): Array<{
    name: string;
    type: 'communication' | 'payment' | 'productivity';
    description: string;
    icon: string;
  }> {
    return [
      {
        name: 'Slack',
        type: 'communication',
        description: 'Team communication and collaboration platform for course discussions and notifications.',
        icon: 'MessageSquare'
      },
      {
        name: 'Stripe',
        type: 'payment',
        description: 'Payment processing for course enrollments and subscriptions.',
        icon: 'CreditCard'
      },
      {
        name: 'OneDrive',
        type: 'productivity',
        description: 'Cloud storage integration for course materials and student file sharing.',
        icon: 'Cloud'
      },
      {
        name: 'Google Drive',
        type: 'productivity',
        description: 'Google cloud storage for collaborative documents and file management.',
        icon: 'HardDrive'
      },
      {
        name: 'Figma',
        type: 'productivity',
        description: 'Design collaboration tool for creative courses and design projects.',
        icon: 'Palette'
      },
      {
        name: 'Miro',
        type: 'productivity',
        description: 'Online whiteboard platform for visual collaboration and brainstorming.',
        icon: 'Layout'
      },
      {
        name: 'Jira',
        type: 'productivity',
        description: 'Project management and issue tracking for software development courses.',
        icon: 'Briefcase'
      }
    ];
  }

  // Initialize default integrations if they don't exist
  async initializeDefaultIntegrations(): Promise<void> {
    try {
      const existingIntegrations = await this.getIntegrations();
      const existingNames = existingIntegrations.map(i => i.name.toLowerCase());

      const defaultIntegrations = [
        {
          name: 'Zoom',
          type: 'communication' as const,
          status: 'disabled' as const,
          settings: {},
          is_configured: false,
          last_sync: null,
          version: 'v5.17.0'
        },
        {
          name: 'Stripe',
          type: 'payment' as const,
          status: 'disabled' as const,
          settings: {},
          is_configured: false,
          last_sync: null,
          version: 'v2023-10-16'
        }
      ];

      for (const integration of defaultIntegrations) {
        if (!existingNames.includes(integration.name.toLowerCase())) {
          try {
            await this.createIntegration(integration);
            console.log(`Created default integration: ${integration.name}`);
          } catch (error) {
            // Check if it's a duplicate key error, which we can safely ignore
            if (error.message?.includes('duplicate key value violates unique constraint')) {
              console.log(`Integration ${integration.name} already exists, skipping...`);
            } else {
              console.error(`Failed to create default integration ${integration.name}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error initializing default integrations:', error);
      // Don't throw the error - we want the component to still load even if initialization fails
    }
  }
}

export const integrationService = new IntegrationService();
