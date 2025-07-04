
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { Navigation } from './Navigation';
import { AuthButton } from './AuthButton';

interface MobileMenuProps {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

export const MobileMenu = ({ user, loading, signOut }: MobileMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const closeMobileMenu = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden flex items-center space-x-2">
        <ThemeToggle />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="transition-all duration-300"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Navigation 
              user={user} 
              isMobile={true} 
              onLinkClick={closeMobileMenu} 
            />

            <div className="px-3 py-2">
              <AuthButton 
                user={user} 
                loading={loading} 
                signOut={signOut} 
                isMobile={true}
                onButtonClick={closeMobileMenu}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
