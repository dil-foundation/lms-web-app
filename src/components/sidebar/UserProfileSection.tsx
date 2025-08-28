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
  
  if (loading || !profile) {
    return (
      <div className="flex items-center space-x-3 p-4 pt-10 border-t border-border">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
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

  return (
    <div className="flex items-center space-x-3 p-4">
      <Avatar className="h-10 w-10" key={`avatar-sidebar-${refreshKey}`}>
        <AvatarImage 
          src={profile.avatar_url && profile.avatar_url !== 'null' ? `${profile.avatar_url}?v=${refreshKey}` : undefined} 
          alt={displayName} 
        />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        <div className="flex items-center space-x-2 mt-2">
          <Badge className="text-xs text-white" style={{ backgroundColor: '#1582B4' }}>
            {getRoleDisplayName(profile.role)}
          </Badge>
        </div>
      </div>
    </div>
  );
};
