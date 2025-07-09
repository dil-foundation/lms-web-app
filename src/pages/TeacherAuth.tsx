import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { 
  validateFirstName, 
  validateLastName, 
  validateEmail, 
  validatePassword, 
  validateConfirmPassword,
  validateTeacherId
} from '@/utils/validation';

const TeacherAuth = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  // Password visibility states
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [signupSuccessMessage, setSignupSuccessMessage] = useState('');
  
  const [loginData, setLoginData] = useState({ 
    email: '', 
    password: '' 
  });

  // Login validation error states
  const [loginValidationErrors, setLoginValidationErrors] = useState({
    email: '',
    password: ''
  });

  // Auth error state
  const [authError, setAuthError] = useState('');
  
  const [signupData, setSignupData] = useState({ 
    firstName: '',
    lastName: '',
    email: '', 
    password: '', 
    confirmPassword: '',
    teacherId: ''
  });

  // Validation error states
  const [validationErrors, setValidationErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    teacherId: ''
  });

  // Handle field validation
  const handleFieldValidation = (field: string, value: string) => {
    let validation;
    
    switch (field) {
      case 'firstName':
        validation = validateFirstName(value);
        break;
      case 'lastName':
        validation = validateLastName(value);
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'password':
        validation = validatePassword(value);
        // Also re-validate confirm password if it exists
        if (signupData.confirmPassword) {
          const confirmValidation = validateConfirmPassword(value, signupData.confirmPassword);
          setValidationErrors(prev => ({
            ...prev,
            confirmPassword: confirmValidation.isValid ? '' : confirmValidation.error || ''
          }));
        }
        break;
      case 'confirmPassword':
        validation = validateConfirmPassword(signupData.password, value);
        break;
      case 'teacherId':
        validation = validateTeacherId(value);
        break;
      default:
        validation = { isValid: true };
    }
    
    setValidationErrors(prev => ({
      ...prev,
      [field]: validation.isValid ? '' : validation.error || ''
    }));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError(''); // Clear any previous auth errors

    // Add validation for login fields
    if (!loginData.email || !loginData.password) {
      setLoginValidationErrors({
        email: !loginData.email ? t('teacher_auth.login.email_required') : '',
        password: !loginData.password ? t('teacher_auth.login.password_required') : ''
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting teacher login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (error) throw error;
      
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profile) {
          throw new Error(t('teacher_auth.login.profile_fetch_error'));
        }

        if (profile.role !== 'teacher') {
          await supabase.auth.signOut();
          setAuthError(t('teacher_auth.login.wrong_portal_error', { role: profile.role }));
          setIsLoading(false);
          return;
        }

        console.log('🔐 Teacher login successful:', data.user.email);
        toast.success(t('teacher_auth.login.welcome_toast'));
        // Force page refresh to ensure clean state
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('🔐 Teacher login error:', error);
      if (error.message === 'Email not confirmed') {
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: loginData.email,
          });
          setAuthError(t('teacher_auth.login.unverified_email_error'));
        } catch (resendError) {
          console.error('Failed to resend verification email:', resendError);
          setAuthError(t('teacher_auth.login.invalid_credentials_error'));
        }
      } else {
        setAuthError(t('teacher_auth.login.invalid_credentials_error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupSuccessMessage('');
    
    // Validate all fields before submission
    const firstNameValidation = validateFirstName(signupData.firstName);
    const lastNameValidation = validateLastName(signupData.lastName);
    const emailValidation = validateEmail(signupData.email);
    const passwordValidation = validatePassword(signupData.password);
    const confirmPasswordValidation = validateConfirmPassword(signupData.password, signupData.confirmPassword);
    const teacherIdValidation = validateTeacherId(signupData.teacherId);

    // Check for empty fields first
    if (!signupData.firstName || !signupData.lastName || !signupData.email || 
        !signupData.password || !signupData.confirmPassword || !signupData.teacherId) {
      setValidationErrors({
        firstName: !signupData.firstName ? t('teacher_auth.signup.first_name_required') : '',
        lastName: !signupData.lastName ? t('teacher_auth.signup.last_name_required') : '',
        email: !signupData.email ? t('teacher_auth.signup.email_required') : '',
        password: !signupData.password ? t('teacher_auth.signup.password_required') : '',
        confirmPassword: !signupData.confirmPassword ? t('teacher_auth.signup.confirm_password_required') : '',
        teacherId: !signupData.teacherId ? t('teacher_auth.signup.teacher_id_required') : ''
      });
      return;
    }

    const hasErrors = !firstNameValidation.isValid || 
                     !lastNameValidation.isValid || 
                     !emailValidation.isValid || 
                     !passwordValidation.isValid || 
                     !confirmPasswordValidation.isValid ||
                     !teacherIdValidation.isValid;

    if (hasErrors) {
      setValidationErrors({
        firstName: firstNameValidation.error || '',
        lastName: lastNameValidation.error || '',
        email: emailValidation.error || '',
        password: passwordValidation.error || '',
        confirmPassword: confirmPasswordValidation.error || '',
        teacherId: teacherIdValidation.error || ''
      });
      toast.error(t('teacher_auth.signup.fix_errors_toast'));
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔐 Attempting teacher signup...');
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `https://dil.lovable.app/dashboard`,
          data: {
            role: 'teacher',
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            teacher_id: signupData.teacherId
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        const isNewUser = (Date.now() - new Date(data.user.created_at).getTime()) < 60000; // 1 minute threshold
        
        if (isNewUser) {
          console.log('🔐 Teacher signup successful:', data.user.email);
          setSignupSuccessMessage(t('teacher_auth.signup.success_message'));
          setSignupData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            teacherId: ''
          });
        } else {
          // This is an existing, unconfirmed user.
          // Update their metadata with the new information.
          console.log('🔐 Updating metadata for existing unconfirmed user:', data.user.email);
          const { error: invokeError } = await supabase.functions.invoke('update-unconfirmed-user', {
            body: { 
              userId: data.user.id,
              password: signupData.password,
              metadata: {
                first_name: signupData.firstName,
                last_name: signupData.lastName,
                teacher_id: signupData.teacherId
              } 
            }
          });

          if (invokeError) {
            console.error('Failed to update user metadata:', invokeError);
            toast.error(t('teacher_auth.signup.update_info_error_toast'));
          } else {
            setSignupSuccessMessage(t('teacher_auth.signup.update_info_success_message'));
            setSignupData({
              firstName: '',
              lastName: '',
              email: '',
              password: '',
              confirmPassword: '',
              teacherId: ''
            });
          }
        }
      }
    } catch (error: any) {
      console.error('🔐 Teacher signup error:', error);
      if (error.message.includes('User already registered')) {
        setValidationErrors(prev => ({
          ...prev,
          email: t('teacher_auth.signup.email_already_exists')
        }));
      } else {
        toast.error(error.message || t('teacher_auth.signup.fail_toast'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setLoginData(prev => ({ ...prev, [id]: value }));
  };

  const handleSignupInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setSignupData(prev => ({ ...prev, [id]: value }));
    handleFieldValidation(id, value);
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md mx-auto">
          <Link to="/auth" className="inline-flex items-center text-sm mb-4 hover:underline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('teacher_auth.back_to_role_selection')}
          </Link>
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">{t('teacher_auth.title')}</CardTitle>
              <CardDescription>{t('teacher_auth.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t('teacher_auth.login.tab')}</TabsTrigger>
                  <TabsTrigger value="signup">{t('teacher_auth.signup.tab')}</TabsTrigger>
                </TabsList>
                
                {/* Login Form */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('teacher_auth.login.email_label')}</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="m@example.com" 
                        value={loginData.email}
                        onChange={handleLoginInputChange}
                      />
                      {loginValidationErrors.email && <p className="text-sm text-red-500">{loginValidationErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('teacher_auth.login.password_label')}</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showLoginPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          value={loginData.password}
                          onChange={handleLoginInputChange}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground"
                        >
                          {showLoginPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {loginValidationErrors.password && <p className="text-sm text-red-500">{loginValidationErrors.password}</p>}
                    </div>
                    {authError && (
                      <div className="text-sm text-red-500 text-center">{authError}</div>
                    )}
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                      {isLoading ? t('teacher_auth.login.loading_button') : t('teacher_auth.login.button')}
                    </Button>
                    <div className="text-center text-sm">
                      <Link to="/forgot-password?role=teacher" className="underline hover:text-primary">
                        {t('teacher_auth.login.forgot_password')}
                      </Link>
                    </div>
                  </form>
                </TabsContent>
                
                {/* Signup Form */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">{t('teacher_auth.signup.first_name_label')}</Label>
                        <Input 
                          id="firstName" 
                          placeholder={t('teacher_auth.signup.first_name_placeholder')}
                          value={signupData.firstName}
                          onChange={handleSignupInputChange}
                          className={validationErrors.firstName ? 'border-red-500' : ''}
                        />
                        {validationErrors.firstName && <p className="text-sm text-red-500">{validationErrors.firstName}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">{t('teacher_auth.signup.last_name_label')}</Label>
                        <Input 
                          id="lastName" 
                          placeholder={t('teacher_auth.signup.last_name_placeholder')}
                          value={signupData.lastName}
                          onChange={handleSignupInputChange}
                          className={validationErrors.lastName ? 'border-red-500' : ''}
                        />
                        {validationErrors.lastName && <p className="text-sm text-red-500">{validationErrors.lastName}</p>}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">{t('teacher_auth.signup.email_label')}</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder={t('teacher_auth.signup.email_placeholder')}
                        value={signupData.email}
                        onChange={handleSignupInputChange}
                        className={validationErrors.email ? 'border-red-500' : ''}
                      />
                      {validationErrors.email && <p className="text-sm text-red-500">{validationErrors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">{t('teacher_auth.signup.password_label')}</Label>
                      <div className="relative">
                        <Input 
                          id="password" 
                          type={showSignupPassword ? 'text' : 'password'}
                          placeholder={t('teacher_auth.signup.password_placeholder')}
                          value={signupData.password}
                          onChange={handleSignupInputChange}
                          className={validationErrors.password ? 'border-red-500' : ''}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground"
                        >
                          {showSignupPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {validationErrors.password && <p className="text-sm text-red-500">{validationErrors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">{t('teacher_auth.signup.confirm_password_label')}</Label>
                      <div className="relative">
                        <Input 
                          id="confirmPassword" 
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder={t('teacher_auth.signup.confirm_password_placeholder')}
                          value={signupData.confirmPassword}
                          onChange={handleSignupInputChange}
                          className={validationErrors.confirmPassword ? 'border-red-500' : ''}
                        />
                         <button 
                          type="button" 
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 px-3 flex items-center text-muted-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5"/> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacherId">{t('teacher_auth.signup.teacher_id_label')}</Label>
                      <Input 
                        id="teacherId" 
                        placeholder={t('teacher_auth.signup.teacher_id_placeholder')}
                        value={signupData.teacherId}
                        onChange={handleSignupInputChange}
                        className={validationErrors.teacherId ? 'border-red-500' : ''}
                      />
                      {validationErrors.teacherId && <p className="text-sm text-red-500">{validationErrors.teacherId}</p>}
                    </div>
                    {signupSuccessMessage && <div className="text-sm text-green-600 text-center">{signupSuccessMessage}</div>}
                    <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                      {isLoading ? t('teacher_auth.signup.loading_button') : t('teacher_auth.signup.button')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TeacherAuth;
