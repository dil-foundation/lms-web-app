
import { useLocation, useNavigate } from 'react-router-dom';

interface LogoProps {
  className?: string;
}

export const Logo = ({ className = "" }: LogoProps) => {
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

  return (
    <button 
      onClick={handleLogoClick} 
      className={`flex items-center hover-scale transition-all duration-300 ${className}`}
    >
      <img 
        src="/dil-logo.png" 
        alt="DIL" 
        className="h-8 w-auto"
      />
    </button>
  );
};
