import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import SecureLinksService, { 
  SecureLink as DbSecureLink,
  SecureLinkInsert,
  SecureLinkUpdate
} from '@/services/secureLinksService';

// Interface for compatibility with existing components
export interface SecureLink {
  id: string;
  role: string;
  token: string;
  fullUrl: string;
  expiry: Date;
  status: 'active' | 'expired' | 'used' | 'deactivated';
  usedBy?: string;
  usedAt?: Date;
  created: Date;
  createdBy: string;
  expiryDays: number;
  observerRole: string;
}

interface SecureLinksContextType {
  links: SecureLink[];
  addLink: (link: SecureLink) => Promise<void>;
  deleteLink: (linkId: string) => Promise<void>;
  getLink: (linkId: string) => SecureLink | undefined;
  updateLink: (linkId: string, updates: Partial<SecureLink>) => Promise<void>;
  validateToken: (token: string) => Promise<SecureLink | null>;
  markAsUsed: (token: string, usedBy: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  refreshLinks: () => Promise<void>;
  getStatistics: () => Promise<{
    totalLinks: number;
    activeLinks: number;
    usedLinks: number;
    deactivatedLinks: number;
    expiredLinks: number;
  }>;
}

const SecureLinksContext = createContext<SecureLinksContextType | undefined>(undefined);

export const useSecureLinks = () => {
  const context = useContext(SecureLinksContext);
  if (!context) {
    throw new Error('useSecureLinks must be used within a SecureLinksProvider');
  }
  return context;
};

interface SecureLinksProviderProps {
  children: ReactNode;
}

export const SecureLinksProvider: React.FC<SecureLinksProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [links, setLinks] = useState<SecureLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transform database record to component interface
  const transformDbRecord = (dbRecord: DbSecureLink): SecureLink => ({
    id: dbRecord.id,
    role: dbRecord.role,
    token: dbRecord.token,
    fullUrl: dbRecord.full_url,
    expiry: new Date(dbRecord.expiry),
    status: dbRecord.status,
    usedBy: dbRecord.used_by,
    usedAt: dbRecord.used_at ? new Date(dbRecord.used_at) : undefined,
    created: new Date(dbRecord.created_at),
    createdBy: dbRecord.created_by,
    expiryDays: dbRecord.expiry_days,
    observerRole: dbRecord.observer_role,
  });

  // Transform component interface to database record
  const transformToDbRecord = (link: SecureLink): SecureLinkInsert => ({
    role: link.role,
    token: link.token,
    full_url: link.fullUrl,
    expiry: link.expiry.toISOString(),
    status: link.status,
    created_by: user?.id || '',
    expiry_days: link.expiryDays,
    observer_role: link.observerRole,
  });

  // Load links from database
  const loadLinks = async () => {
    if (!user?.id) {
      setLinks([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      // First update expired links
      await SecureLinksService.updateExpiredLinks(user.id);
      
      // Then load all links
      const dbLinks = await SecureLinksService.getLinks(user.id);
      const transformedLinks = dbLinks.map(transformDbRecord);
      setLinks(transformedLinks);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to load secure links';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      console.error('Error loading secure links:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load links when user changes or component mounts
  useEffect(() => {
    loadLinks();
  }, [user?.id]);

  // Auto-refresh every 30 seconds to check for expired links
  useEffect(() => {
    if (!user?.id) return;

    const interval = setInterval(async () => {
      try {
        const expiredCount = await SecureLinksService.updateExpiredLinks(user.id);
        if (expiredCount > 0) {
          // Refresh links if any were expired
          await loadLinks();
        }
      } catch (err) {
        console.error('Error checking for expired links:', err);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user?.id]);

  const addLink = async (link: SecureLink): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      const dbRecord = transformToDbRecord(link);
      const createdLink = await SecureLinksService.createLink(dbRecord);
      const transformedLink = transformDbRecord(createdLink);
      
      // Update local state
      setLinks(prev => [transformedLink, ...prev]);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to create secure link';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteLink = async (linkId: string): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      await SecureLinksService.deleteLink(linkId, user.id);
      
      // Update local state
      setLinks(prev => prev.filter(link => link.id !== linkId));
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to delete secure link';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const getLink = (linkId: string): SecureLink | undefined => {
    return links.find(link => link.id === linkId);
  };

  const updateLink = async (linkId: string, updates: Partial<SecureLink>): Promise<void> => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      // Transform updates to database format
      const dbUpdates: SecureLinkUpdate = {
        updated_at: new Date().toISOString(),
      };

      if (updates.status) dbUpdates.status = updates.status;
      if (updates.usedBy) dbUpdates.used_by = updates.usedBy;
      if (updates.usedAt) dbUpdates.used_at = updates.usedAt.toISOString();

      const updatedLink = await SecureLinksService.updateLink(linkId, dbUpdates, user.id);
      const transformedLink = transformDbRecord(updatedLink);

      // Update local state
      setLinks(prev => 
        prev.map(link => 
          link.id === linkId 
            ? { ...link, ...transformedLink }
            : link
        )
      );
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to update secure link';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const validateToken = async (token: string): Promise<SecureLink | null> => {
    try {
      const dbLink = await SecureLinksService.getLinkByToken(token);
      return dbLink ? transformDbRecord(dbLink) : null;
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to validate token';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const markAsUsed = async (token: string, usedBy: string): Promise<void> => {
    try {
      const updatedLink = await SecureLinksService.markLinkAsUsed(token, usedBy);
      if (updatedLink) {
        const transformedLink = transformDbRecord(updatedLink);
        
        // Update local state if the link belongs to current user
        setLinks(prev => 
          prev.map(link => 
            link.token === token 
              ? { ...link, ...transformedLink }
              : link
          )
        );
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to mark link as used';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const refreshLinks = async (): Promise<void> => {
    await loadLinks();
  };

  const getStatistics = async () => {
    if (!user?.id) {
      throw new Error('User not authenticated');
    }

    try {
      return await SecureLinksService.getLinkStatistics(user.id);
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Failed to get statistics';
      
      // Handle specific database table not found error
      if (errorMessage.includes('relation "public.secure_links" does not exist')) {
        errorMessage = 'Database table not set up yet. Please run the database migration to create the secure_links table.';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const value: SecureLinksContextType = {
    links,
    addLink,
    deleteLink,
    getLink,
    updateLink,
    validateToken,
    markAsUsed,
    isLoading,
    error,
    refreshLinks,
    getStatistics,
  };

  return (
    <SecureLinksContext.Provider value={value}>
      {children}
    </SecureLinksContext.Provider>
  );
}; 