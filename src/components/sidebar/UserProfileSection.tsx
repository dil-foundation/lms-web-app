import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayName, type UserRole } from '@/config/roleNavigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/useUserProfile';

interface UserProfileSectionProps {
  // Remove profile prop - we'll get it directly from the hook
}

export const UserProfileSection = ({}: UserProfileSectionProps = {}) => {
  const { profile, loading, refreshKey } = useUserProfile();
  const [forceUpdateKey, setForceUpdateKey] = useState(0);
  
  // Listen for profile updates from other components (desktop fix)
  useEffect(() => {
    const handleProfileUpdate = (event: CustomEvent) => {
      console.log('=== SIDEBAR DEBUG: Profile update event received ===', event.detail);
      setForceUpdateKey(prev => prev + 1);
    };
    
    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);
  
  if (loading || !profile) {
    return (
      <div className="flex items-center space-x-1.5 md:space-x-2 lg:space-x-3 p-2 md:p-2.5 lg:p-4 pt-5 md:pt-6 lg:pt-10 border-t border-border">
        <Skeleton className="h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 rounded-full" />
        <div className="flex-1 space-y-1 md:space-y-1.5 lg:space-y-2 min-w-0">
          <Skeleton className="h-2.5 md:h-3 lg:h-4 w-3/4" />
          <Skeleton className="h-2 md:h-2.5 lg:h-3 w-1/2" />
        </div>
      </div>
    );
  }

  const displayName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email || 'User';

  const getInitials = () => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name.charAt(0)}${profile.last_name.charAt(0)}`.toUpperCase();
    }
    if (profile.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const combinedRefreshKey = refreshKey + forceUpdateKey;
  const cacheParam = `v=${combinedRefreshKey}&t=${Date.now()}`;
  
  console.log('=== SIDEBAR RENDER ===');
  console.log('Profile avatar_url:', profile.avatar_url);
  console.log('RefreshKey:', refreshKey);
  console.log('ForceUpdateKey:', forceUpdateKey);
  console.log('Combined key:', combinedRefreshKey);
  
  return (
    <div className="flex items-center space-x-1.5 md:space-x-2 lg:space-x-3 p-2 md:p-2.5 lg:p-4 flex-shrink-0">
      <Avatar className="h-7 w-7 md:h-8 md:w-8 lg:h-10 lg:w-10" key={`avatar-sidebar-${combinedRefreshKey}`}>
        <AvatarImage 
          src={profile.avatar_url && profile.avatar_url !== 'null' ? `${profile.avatar_url}?${cacheParam}` : undefined} 
          alt={displayName}
          onLoad={() => console.log('=== SIDEBAR: Avatar loaded successfully ===')}
          onError={() => console.log('=== SIDEBAR: Avatar failed to load ===')}
        />
        <AvatarFallback className="bg-primary text-primary-foreground text-[10px] md:text-xs lg:text-sm">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] md:text-xs lg:text-sm font-medium text-foreground truncate leading-snug">
          {displayName}
        </p>
        <div className="flex items-center space-x-1 md:space-x-1.5 lg:space-x-2 mt-0.5 md:mt-1 lg:mt-2">
          <Badge className="text-[9px] md:text-[10px] lg:text-xs text-white px-1 md:px-1.5 lg:px-2 py-0.5" style={{ backgroundColor: '#1582B4' }}>
            {getRoleDisplayName(profile.role)}
          </Badge>
        </div>
      </div>
    </div>
  );
};
