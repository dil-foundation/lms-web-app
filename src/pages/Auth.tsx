
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the new role selection page
    navigate('/auth', { replace: true });
  }, [navigate]);

  return null;
};

export default Auth;
