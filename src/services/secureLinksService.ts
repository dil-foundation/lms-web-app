import { supabase } from '@/integrations/supabase/client';

export interface SecureLink {
  id: string;
  role: string;
  token: string;
  full_url: string;
  expiry: string;
  status: 'active' | 'expired' | 'used' | 'deactivated';
  used_by?: string;
  used_at?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  expiry_days: number;
  observer_role: string; // The actual role for form validation
}

export interface SecureLinkInsert {
  role: string;
  token: string;
  full_url: string;
  expiry: string;
  status: 'active' | 'expired' | 'used' | 'deactivated';
  created_by: string;
  expiry_days: number;
  observer_role: string;
}

export interface SecureLinkUpdate {
  status?: 'active' | 'expired' | 'used' | 'deactivated';
  used_by?: string;
  used_at?: string;
  updated_at?: string;
}

class SecureLinksService {
  private static readonly TABLE_NAME = 'secure_links';

  /**
   * Create a new secure link in the database
   */
  static async createLink(linkData: SecureLinkInsert): Promise<SecureLink> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          ...linkData,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Database error creating secure link:', error);
        throw new Error(`Failed to create secure link: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data returned from secure link creation');
      }

      return this.transformDatabaseRecord(data);
    } catch (error: any) {
      console.error('Error creating secure link:', error);
      throw new Error(error.message || 'Failed to create secure link');
    }
  }

  /**
   * Get all secure links for the current user
   */
  static async getLinks(userId: string, limit = 100, offset = 0): Promise<SecureLink[]> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Database error fetching secure links:', error);
        throw new Error(`Failed to fetch secure links: ${error.message}`);
      }

      return (data || []).map(this.transformDatabaseRecord);
    } catch (error: any) {
      console.error('Error fetching secure links:', error);
      throw new Error(error.message || 'Failed to fetch secure links');
    }
  }

  /**
   * Get a specific secure link by ID
   */
  static async getLinkById(linkId: string, userId: string): Promise<SecureLink | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', linkId)
        .eq('created_by', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        console.error('Database error fetching secure link:', error);
        throw new Error(`Failed to fetch secure link: ${error.message}`);
      }

      return data ? this.transformDatabaseRecord(data) : null;
    } catch (error: any) {
      console.error('Error fetching secure link by ID:', error);
      throw new Error(error.message || 'Failed to fetch secure link');
    }
  }

  /**
   * Get a secure link by token (for validation during form access)
   */
  static async getLinkByToken(token: string): Promise<SecureLink | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Record not found
          return null;
        }
        console.error('Database error fetching secure link by token:', error);
        throw new Error(`Failed to validate secure link: ${error.message}`);
      }

      return data ? this.transformDatabaseRecord(data) : null;
    } catch (error: any) {
      console.error('Error fetching secure link by token:', error);
      throw new Error(error.message || 'Failed to validate secure link');
    }
  }

  /**
   * Update an existing secure link
   */
  static async updateLink(
    linkId: string, 
    updates: SecureLinkUpdate, 
    userId: string
  ): Promise<SecureLink> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkId)
        .eq('created_by', userId)
        .select()
        .single();

      if (error) {
        console.error('Database error updating secure link:', error);
        throw new Error(`Failed to update secure link: ${error.message}`);
      }

      if (!data) {
        throw new Error('Secure link not found or no permission to update');
      }

      return this.transformDatabaseRecord(data);
    } catch (error: any) {
      console.error('Error updating secure link:', error);
      throw new Error(error.message || 'Failed to update secure link');
    }
  }

  /**
   * Delete a secure link
   */
  static async deleteLink(linkId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', linkId)
        .eq('created_by', userId);

      if (error) {
        console.error('Database error deleting secure link:', error);
        throw new Error(`Failed to delete secure link: ${error.message}`);
      }

      return true;
    } catch (error: any) {
      console.error('Error deleting secure link:', error);
      throw new Error(error.message || 'Failed to delete secure link');
    }
  }

  /**
   * Mark a secure link as used
   */
  static async markLinkAsUsed(token: string, usedBy: string): Promise<SecureLink | null> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          status: 'used',
          used_by: usedBy,
          used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('token', token)
        .select()
        .single();

      if (error) {
        console.error('Database error marking link as used:', error);
        throw new Error(`Failed to mark link as used: ${error.message}`);
      }

      return data ? this.transformDatabaseRecord(data) : null;
    } catch (error: any) {
      console.error('Error marking link as used:', error);
      throw new Error(error.message || 'Failed to mark link as used');
    }
  }

  /**
   * Update expired links (called periodically)
   */
  static async updateExpiredLinks(userId: string): Promise<number> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          status: 'expired',
          updated_at: now,
        })
        .eq('created_by', userId)
        .eq('status', 'active')
        .lt('expiry', now)
        .select();

      if (error) {
        console.error('Database error updating expired links:', error);
        throw new Error(`Failed to update expired links: ${error.message}`);
      }

      return data?.length || 0;
    } catch (error: any) {
      console.error('Error updating expired links:', error);
      throw new Error(error.message || 'Failed to update expired links');
    }
  }

  /**
   * Get summary statistics for secure links
   */
  static async getLinkStatistics(userId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    usedLinks: number;
    deactivatedLinks: number;
    expiredLinks: number;
  }> {
    try {
      // Get all links for the user
      const { data: links, error } = await supabase
        .from(this.TABLE_NAME)
        .select('status')
        .eq('created_by', userId);

      if (error) {
        console.error('Database error fetching link statistics:', error);
        throw new Error(`Failed to fetch statistics: ${error.message}`);
      }

      const linksData = links || [];
      
      // Calculate statistics
      const totalLinks = linksData.length;
      const activeLinks = linksData.filter(l => l.status === 'active').length;
      const usedLinks = linksData.filter(l => l.status === 'used').length;
      const deactivatedLinks = linksData.filter(l => l.status === 'deactivated').length;
      const expiredLinks = linksData.filter(l => l.status === 'expired').length;

      return {
        totalLinks,
        activeLinks,
        usedLinks,
        deactivatedLinks,
        expiredLinks,
      };
    } catch (error: any) {
      console.error('Error getting link statistics:', error);
      throw new Error(error.message || 'Failed to get link statistics');
    }
  }

  /**
   * Transform database record to our interface format
   */
  private static transformDatabaseRecord(record: any): SecureLink {
    return {
      id: record.id,
      role: record.role,
      token: record.token,
      full_url: record.full_url,
      expiry: record.expiry,
      status: record.status,
      used_by: record.used_by,
      used_at: record.used_at,
      created_at: record.created_at,
      updated_at: record.updated_at,
      created_by: record.created_by,
      expiry_days: record.expiry_days,
      observer_role: record.observer_role,
    };
  }

  /**
   * Check if the secure_links table exists and create it if needed
   */
  static async ensureTableExists(): Promise<void> {
    try {
      // This is a utility method that could be used to create the table
      // In a real production environment, you would use migrations instead
      console.log('Table creation should be handled by database migrations');
    } catch (error: any) {
      console.error('Error ensuring table exists:', error);
    }
  }
}

export default SecureLinksService; 