import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { useUserProfile } from '@/hooks/useUserProfile';

const AdminAuth = () => {
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
        email: !loginData.email ? 'Email is required' : '',
        password: !loginData.password ? 'Password is required' : ''
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
          throw new Error('Could not fetch user profile.');
        }

        if (profile.role !== 'admin') {
          await supabase.auth.signOut(); // Log out non-admin users immediately
          setAuthError('Access denied. You do not have permission to log in here.');
          setIsLoading(false);
          return;
        }

        console.log('🔐 Admin login successful:', data.user.email);
        toast.success('Welcome back!');
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('🔐 Admin login error:', error);
      if (error.message.includes('Email not confirmed')) {
        setAuthError('Please verify your email address before logging in.');
      } else {
        setAuthError('Invalid credentials or access denied.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(var(--primary),0.03),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(var(--primary),0.02),transparent_50%)]"></div>
      
      <Header />
      <div className="pt-16 min-h-screen flex items-center justify-center px-4 relative z-10">
        <div className="w-full max-w-md mx-auto">
          <Button
            variant="ghost"
            onClick={() => navigate('/auth')}
            className="mb-8 p-3 hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-300 group border border-transparent hover:border-primary/20"
          >
            <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to role selection
          </Button>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-2xl shadow-primary/5 rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Admin Portal
              </CardTitle>
              <CardDescription className="text-lg leading-relaxed">
                Sign in to your administrator account
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="login-email" className="text-base font-medium">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="Enter your email"
                    value={loginData.email}
                    onChange={(e) => {
                      setLoginData({ ...loginData, email: e.target.value });
                      setLoginValidationErrors({ ...loginValidationErrors, email: '' });
                      setAuthError('');
                    }}
                    className={`h-12 text-base rounded-xl border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                      loginValidationErrors.email ? 'border-red-500' : 'border-border/50'
                    }`}
                  />
                  {loginValidationErrors.email && (
                    <p className="text-sm text-red-500 font-medium">{loginValidationErrors.email}</p>
                  )}
                </div>
                <div className="space-y-3">
                  <Label htmlFor="login-password" className="text-base font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={loginData.password}
                      onChange={(e) => {
                        setLoginData({ ...loginData, password: e.target.value });
                        setLoginValidationErrors({ ...loginValidationErrors, password: '' });
                        setAuthError('');
                      }}
                      className={`h-12 text-base rounded-xl border-2 pr-12 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                        loginValidationErrors.password ? 'border-red-500' : 'border-border/50'
                      }`}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-[50%] transform -translate-y-[50%] text-muted-foreground hover:text-primary transition-colors duration-300"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {loginValidationErrors.password && (
                    <p className="text-sm text-red-500 font-medium">{loginValidationErrors.password}</p>
                  )}
                  {authError && (
                    <p className="text-sm text-red-500 font-semibold mt-2 p-3 bg-red-50 rounded-xl border border-red-200">
                      {authError}
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Signing in...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Lock className="mr-2 h-5 w-5" />
                      Sign In
                    </div>
                  )}
                </Button>
                <div className="text-center">
                  <Link 
                    to="/forgot-password?role=admin"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 font-medium"
                  >
                    Forgot Password?
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