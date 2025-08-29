
import { useState, useEffect, memo } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ThemeToggle = memo(() => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Initial theme setup
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    const isDarkTheme = initialTheme === 'dark';
    setIsDark(isDarkTheme);
    
    if (isDarkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Listen for theme changes from other components
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue;
        setIsDark(newTheme === 'dark');
        
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    const handleCustomThemeChange = (e: CustomEvent) => {
      const { theme } = e.detail;
      setIsDark(theme === 'dark');
    };

    // Watch for direct DOM changes to the dark class (extra safety measure)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const hasDarkClass = document.documentElement.classList.contains('dark');
          setIsDark(hasDarkClass);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChanged', handleCustomThemeChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChanged', handleCustomThemeChange as EventListener);
      observer.disconnect();
    };
  }, []);

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

    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('themeChanged', { 
      detail: { theme: newTheme ? 'dark' : 'light' } 
    }));
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-10 w-10 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent/5 hover:text-foreground dark:hover:bg-gray-800 group"
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      <div className="relative z-10">
        {isDark ? (
          <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300 group-hover:scale-110 group-hover:rotate-12 group-hover:text-primary" />
        ) : (
          <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12 group-hover:text-primary" />
        )}
      </div>
    </Button>
  );
});

ThemeToggle.displayName = 'ThemeToggle';
