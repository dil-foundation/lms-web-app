import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { Navigation } from './Navigation';
import { AuthButton } from './AuthButton';
import { useAuth } from '@/hooks/useAuth';

export const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="md:hidden">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full max-w-xs p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle className="text-lg font-semibold">Menu</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <Navigation user={user} isMobile onLinkClick={() => setIsOpen(false)} />
            <div className="border-t pt-4">
              <AuthButton />
            </div>
            <div className="border-t pt-4 flex justify-center">
              <ThemeToggle />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
