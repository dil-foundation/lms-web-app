
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'About', href: '/about' },
  { name: 'Features', href: '/features' },
  { name: 'Contact', href: '/contact' },
];

export const Navigation = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Don't render anything while loading or if user is authenticated
  if (loading || user) {
    return null;
  }

  return (
    <nav className="hidden md:flex items-center space-x-1">
      {navigation.map((item) => {
        const isActive = location.pathname === item.href;
        return (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 group",
              isActive
                ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                : "text-gray-700 dark:text-gray-300 hover:text-primary hover:bg-primary/5 border border-transparent hover:border-primary/20 hover:shadow-sm"
            )}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <span className="relative z-10 transition-all duration-300 group-hover:scale-105">
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
