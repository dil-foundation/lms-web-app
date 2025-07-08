import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayName, type UserRole } from '@/config/roleNavigation';
import { Database } from '@/integrations/supabase/types';
import { Skeleton } from '@/components/ui/skeleton';

type Profile = Database['public']['Tables']['profiles']['Row'];

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

  const userRole = profile.role as UserRole;
  const displayName = profile.full_name || profile.first_name || 'User';
  const initials = displayName
    .split(' ')
    .map(name => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center space-x-3 p-4 pt-10 border-t border-border">
      <Avatar className="h-10 w-10">
        <AvatarImage src="" alt={displayName} />
        <AvatarFallback className="bg-primary text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {displayName}
        </p>
        <div className="flex items-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            {getRoleDisplayName(userRole)}
          </Badge>
        </div>
      </div>
    </div>
  );
};
