
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export const Header = () => {
  const [isDark, setIsDark] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showBackToDashboard, setShowBackToDashboard] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    // Check if user came from dashboard when on home page
    if (location.pathname === '/') {
      const cameFromDashboard = localStorage.getItem('cameFromDashboard') === 'true';
      setShowBackToDashboard(cameFromDashboard);
    } else {
      setShowBackToDashboard(false);
    }
  }, [location.pathname]);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogoClick = () => {
    if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')) {
      localStorage.setItem('cameFromDashboard', 'true');
    } else {
      localStorage.removeItem('cameFromDashboard');
    }
    navigate('/');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isAuthPage = location.pathname === '/auth';
  const isHomePage = location.pathname === '/';

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'glass bg-background/80 border-b border-border shadow-sm animate-fade-in' 
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button onClick={handleLogoClick} className="flex items-center hover-scale transition-all duration-300">
            <img 
              src="/dil-logo.png" 
              alt="DIL" 
              className="h-8 w-auto"
            />
          </button>

          {/* Desktop Navigation - Right Aligned */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="transition-all duration-300 hover-scale"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Navigation Links */}
            <nav className="flex items-center space-x-6">
              {!isHomePage && (
                <Link to="/" className="text-foreground hover:text-primary transition-all duration-300 relative group">
                  Home
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )}
              
              {showBackToDashboard && user && (
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-all duration-300 relative group">
                  Go back to Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )}
              
              {user && !showBackToDashboard && !isHomePage && (
                <Link to="/dashboard" className="text-foreground hover:text-primary transition-all duration-300 relative group">
                  Dashboard
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                </Link>
              )}
            </nav>

            {/* Auth Button */}
            {!loading && (
              <>
                {user ? (
                  <Button 
                    onClick={handleSignOut}
                    variant="default" 
                    className="bg-primary hover:bg-primary/90 hover-scale transition-all duration-300"
                  >
                    Logout
                  </Button>
                ) : !isAuthPage && (
                  <Link to="/auth">
                    <Button variant="default" className="bg-primary hover:bg-primary/90 hover-scale transition-all duration-300">
                      Sign In
                    </Button>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="transition-all duration-300 hover-scale"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="transition-all duration-300"
            >
              {isMobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {!isHomePage && (
                <Link 
                  to="/" 
                  className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
              )}
              
              {showBackToDashboard && user && (
                <Link 
                  to="/dashboard" 
                  className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Go back to Dashboard
                </Link>
              )}
              
              {user && !showBackToDashboard && !isHomePage && (
                <Link 
                  to="/dashboard" 
                  className="block px-3 py-2 text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}

              {!loading && (
                <div className="px-3 py-2">
                  {user ? (
                    <Button 
                      onClick={() => {
                        handleSignOut();
                        setIsMobileMenuOpen(false);
                      }}
                      variant="default" 
                      className="w-full bg-primary hover:bg-primary/90"
                    >
                      Logout
                    </Button>
                  ) : !isAuthPage && (
                    <Link to="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="default" className="w-full bg-primary hover:bg-primary/90">
                        Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
