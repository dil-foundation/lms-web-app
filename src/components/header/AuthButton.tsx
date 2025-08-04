import { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, User, Settings, ChevronDown, Home, Shield, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const AuthButton = () => {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleLoginClick = () => {
    navigate('/auth');
  };

  // Smart dashboard logic - only show on homepage when user is authenticated
  const showDashboardButton = user && location.pathname === '/';

  // Get user role from profile data (more reliable than user metadata)
  const userRole = (profile?.role || user?.user_metadata?.role || 'student').toLowerCase();

  // Debug: Log role detection for troubleshooting
  console.log('AuthButton - Role Detection:', {
    profileRole: profile?.role,
    metadataRole: user?.user_metadata?.role,
    finalRole: userRole,
    profile: profile,
    user: user
  });

  if (user) {
    return (
      <div className="flex items-center gap-3">
        {/* Dashboard Button (Smart Logic) */}
        {showDashboardButton && (
          <Link to="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 group"
            >
              <Home className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors duration-300" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors duration-300">
                Go to Dashboard
              </span>
            </Button>
          </Link>
        )}

        {/* User Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 group"
          >
            <User className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors duration-300" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors duration-300 truncate max-w-[120px]">
              {profile?.first_name && profile?.last_name 
                ? `${profile.first_name} ${profile.last_name}`
                : profile?.first_name 
                ? profile.first_name
                : user.email?.split('@')[0] || 'User'}
            </span>
            <ChevronDown className={cn(
              "h-4 w-4 ml-2 text-gray-600 dark:text-gray-400 transition-all duration-300",
              isDropdownOpen && "rotate-180"
            )} />
        </Button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-card/95 backdrop-blur-md border border-border shadow-xl shadow-black/10 transition-all duration-300 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
              <div className="p-2 space-y-1">
                {/* Profile Header */}
                <div className="px-3 py-2 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {userRole}
                  </p>
                </div>

                {/* Menu Items - Role-based filtering */}
                <Link
                  to="/dashboard/profile-settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 group"
                >
                  <User className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors duration-200" />
                  Profile Settings
                </Link>

                {/* Role-specific settings */}
                {userRole === 'admin' && (
                  <Link
                    to="/dashboard/admin-settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 group"
                  >
                    <Shield className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors duration-200" />
                    Admin Settings
                  </Link>
                )}

                {userRole === 'teacher' && (
                  <Link
                    to="/dashboard/teacher-settings"
                    onClick={() => setIsDropdownOpen(false)}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all duration-200 group"
                  >
                    <GraduationCap className="h-4 w-4 mr-3 text-gray-500 dark:text-gray-400 group-hover:text-primary transition-colors duration-200" />
                    Teacher Settings
                  </Link>
                )}

                <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-1" />

                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all duration-200 group"
                >
                  <LogOut className="h-4 w-4 mr-3 text-red-500 dark:text-red-400 group-hover:text-red-600 transition-colors duration-200" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLoginClick}
      className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 group"
    >
      <LogIn className="h-4 w-4 mr-2 text-gray-600 dark:text-gray-400 group-hover:text-primary transition-colors duration-300" />
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors duration-300">
        Login
      </span>
    </Button>
  );
};
