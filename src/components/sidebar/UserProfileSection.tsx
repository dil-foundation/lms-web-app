import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayName, type UserRole } from '@/config/roleNavigation';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: UserRole;
  [key: string]: any;
};


interface UserProfileSectionProps {
  profile: Profile | null;
}

export const UserProfileSection = ({ profile }: UserProfileSectionProps) => {
  if (!profile) {
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
      <Avatar className="h-10 w-10">
        <AvatarImage src="" alt={displayName} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {getInitials()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {getRoleDisplayName(profile.role)}
          </Badge>
        </div>
      </div>
    </div>
  );
};
