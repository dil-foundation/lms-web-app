import { memo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
interface LogoProps {
  className?: string;
}
export const Logo = memo(({
  className = ""
}: LogoProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const handleLogoClick = () => {
    if (location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/')) {
      localStorage.setItem('cameFromDashboard', 'true');
    } else {
      localStorage.removeItem('cameFromDashboard');
    }
    navigate('/');
  };
  return <button onClick={handleLogoClick} className={`flex items-center hover-scale transition-all duration-300 ${className}`}>
      <img src="/lovable-uploads/016ec8c7-bb16-4595-ab96-d96c8c779aa2.png" alt="DIL" className="h-10 sm:h-12 md:h-14 w-auto" />
    </button>;
});

Logo.displayName = 'Logo';