
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
        src="/lovable-uploads/a57a9111-68d4-4579-88d1-e5416fca8758.png" 
        alt="DIL" 
        className="h-8 w-auto"
      />
    </button>
  );
};
