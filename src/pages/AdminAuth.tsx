import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

const AdminAuth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({ 
    email: '', 
    password: '' 
  });
  
  const [loginValidationErrors, setLoginValidationErrors] = useState({
    email: '',
    password: ''
  });
  
  const [authError, setAuthError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');

    if (!loginData.email || !loginData.password) {
      setLoginValidationErrors({
        email: !loginData.email ? t('auth.errors.email_required') : '',
        password: !loginData.password ? t('auth.errors.password_required') : ''
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting admin login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;
      
      if (data.user) {
        // After successful login, check if the user has the 'admin' role.
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error(t('auth.errors.fetch_profile_error'));
        }

        if (profile.role !== 'admin') {
          await supabase.auth.signOut(); // Log out non-admin users immediately
          setAuthError(t('auth.errors.admin_access_denied'));
          setIsLoading(false);
          return;
        }

        console.log('🔐 Admin login successful:', data.user.email);
        toast.success(t('auth.success.welcome_back'));
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('🔐 Admin login error:', error);
      if (error.message.includes('Email not confirmed')) {
        setAuthError(t('auth.errors.email_not_verified'));
      } else {
        setAuthError(t('auth.errors.invalid_credentials_admin'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="mb-4 p-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('auth.back_to_role_selection')}
          </Button>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t('auth.admin.title')}</CardTitle>
              <CardDescription>
                {t('auth.admin.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t('auth.form.email_label')}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder={t('auth.form.email_placeholder')}
                    value={loginData.email}
                    onChange={(e) => {
                      setLoginData({ ...loginData, email: e.target.value });
                      setLoginValidationErrors({ ...loginValidationErrors, email: '' });
                      setAuthError('');
                    }}
                    className={loginValidationErrors.email ? 'border-red-500' : ''}
                  />
                  {loginValidationErrors.email && (
                    <p className="text-sm text-red-500">{loginValidationErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t('auth.form.password_label')}</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder={t('auth.form.password_placeholder')}
                      value={loginData.password}
                      onChange={(e) => {
                        setLoginData({ ...loginData, password: e.target.value });
                        setLoginValidationErrors({ ...loginValidationErrors, password: '' });
                        setAuthError('');
                      }}
                      className={`pr-10 ${loginValidationErrors.password ? 'border-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-[50%] transform -translate-y-[50%] text-gray-500"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {loginValidationErrors.password && (
                    <p className="text-sm text-red-500">{loginValidationErrors.password}</p>
                  )}
                  {authError && (
                    <p className="text-sm text-red-500 mt-1 font-semibold">{authError}</p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={isLoading}
                >
                  {isLoading ? t('auth.buttons.signing_in') : t('auth.buttons.sign_in')}
                </Button>
                <div className="text-center">
                  <Link 
                    to="/forgot-password?role=admin"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('auth.links.forgot_password')}
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth; 