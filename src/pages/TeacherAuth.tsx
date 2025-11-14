import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, Users, Lock, UserPlus } from 'lucide-react';
import { 
  validateFirstName, 
  validateLastName, 
  validateEmail, 
  validatePassword, 
  validateConfirmPassword,
  validateTeacherId
} from '@/utils/validation';
import { SupabaseMFAVerification } from '@/components/auth/SupabaseMFAVerification';
import SupabaseMFAService from '@/services/supabaseMFAService';
import { useAuth } from '@/contexts/AuthContext';
import AccessLogService from '@/services/accessLogService';
import LoginSecurityService from '@/services/loginSecurityService';
import { updateUserLastActive } from '@/services/userActivityService';

const TeacherAuth = () => {
  const navigate = useNavigate();
  const { setPendingMFAUser } = useAuth();
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
  
  // MFA verification states
  const [showMFAVerification, setShowMFAVerification] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  

  
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
        email: !loginData.email ? 'Email is required' : '',
        password: !loginData.password ? 'Password is required' : ''
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log('🔐 Attempting teacher login...');
      
      // Check if user is already blocked before attempting authentication
      const securityStatus = await LoginSecurityService.checkLoginSecurity(
        loginData.email,
        undefined, // IP address (can be enhanced later)
        navigator.userAgent
      );

      if (securityStatus.isBlocked) {
        const blockMessage = securityStatus.blockReason === 'Too many failed login attempts' 
          ? `Account temporarily blocked due to too many failed login attempts. Please try again after 24 hours.`
          : `Account temporarily blocked: ${securityStatus.blockReason}`;
        
        setAuthError(blockMessage);
        setIsLoading(false);
        return;
      }

      // Sign in and get user data
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginData.email,
        password: loginData.password,
      });

      if (signInError) throw signInError;
      
      if (user) {
        // Get profile data while authenticated
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          throw new Error('Could not fetch user profile.');
        }

        // Allow only teachers to access teacher portal
        if (profile.role !== 'teacher') {
          await supabase.auth.signOut();
          setAuthError(`Access denied. Please use the ${profile.role} portal to log in.`);
          setIsLoading(false);
          return;
        }

        // Check if MFA is required and if user has MFA set up
        const isMFARequired = await SupabaseMFAService.checkMFARequirement();
        
        // Get MFA status while authenticated
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        if (factorsError) throw factorsError;
        
        const totpFactor = factors.totp?.[0];
        const mfaStatus = {
          isEnabled: totpFactor?.status === 'verified',
          isSetupComplete: totpFactor?.status === 'verified',
          factors: factors.totp || []
        };
        
        console.log('MFA Required:', isMFARequired, 'MFA Status:', mfaStatus);

        if (isMFARequired && mfaStatus.isSetupComplete) {
          // MFA is required and user has it set up, show verification dialog
          console.log('🔐 MFA verification required for teacher login');
          setPendingUser(user);
          setPendingMFAUser(user); // Set in auth context
          setShowMFAVerification(true);
          setIsLoading(false);
          return;
        }

        // No MFA required, proceed with normal login
        console.log('🔐 Teacher login successful (no MFA required):', user.email);

        // Update last active timestamp
        await updateUserLastActive(user.id);

        // Handle successful login security
        await LoginSecurityService.handleSuccessfulLogin(
          user.email || loginData.email,
          undefined, // IP address (can be enhanced later)
          navigator.userAgent
        );

        toast.success('Welcome back!');
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('🔐 Teacher login error:', error);
      
      // Handle failed login security
      try {
        let reason = 'Invalid credentials';
        if (error.message === 'Email not confirmed') {
          reason = 'Email not confirmed';
        } else if (error.message.includes('Invalid login credentials')) {
          reason = 'Invalid email or password';
        } else if (error.message.includes('Too many requests')) {
          reason = 'Too many login attempts';
        }
        
        const failedLoginResult = await LoginSecurityService.handleFailedLogin(
          loginData.email,
          reason,
          undefined, // IP address (can be enhanced later)
          navigator.userAgent
        );

        // Update error message based on security status
        if (failedLoginResult.blocked) {
          const blockMessage = failedLoginResult.blockReason === 'Too many failed login attempts' 
            ? `Account temporarily blocked due to too many failed login attempts. Please try again after 24 hours.`
            : `Account temporarily blocked: ${failedLoginResult.blockReason}`;
          
          setAuthError(blockMessage);
        } else {
          const remainingAttempts = failedLoginResult.remainingAttempts;
          if (remainingAttempts <= 2) {
            setAuthError(`Invalid credentials. Warning: ${remainingAttempts} login attempt${remainingAttempts !== 1 ? 's' : ''} remaining before account is blocked.`);
          } else {
            setAuthError('Invalid credentials.');
          }
        }
      } catch (logError) {
        console.error('Error handling failed login security:', logError);
        setAuthError('Invalid credentials.');
      }
      
      if (error.message === 'Email not confirmed') {
        try {
          await supabase.auth.resend({
            type: 'signup',
            email: loginData.email,
          });
          setAuthError('Please verify your Email Address, we have sent a new verification link to your email');
        } catch (resendError) {
          console.error('Failed to resend verification email:', resendError);
          setAuthError('Invalid Credentials.');
        }
      } else {
        setAuthError('Invalid Credentials.');
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
        firstName: !signupData.firstName ? 'First name is required' : '',
        lastName: !signupData.lastName ? 'Last name is required' : '',
        email: !signupData.email ? 'Email is required' : '',
        password: !signupData.password ? 'Password is required' : '',
        confirmPassword: !signupData.confirmPassword ? 'Please confirm your password' : '',
        teacherId: !signupData.teacherId ? 'Teacher ID is required' : ''
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
      return;
    }

    setIsLoading(true);

    try {
      // Check if user exists and is confirmed before attempting signup
      const { data: isConfirmed, error: rpcError } = await supabase.rpc('check_user_status', {
        user_email: signupData.email,
      });

      if (rpcError) {
        console.error('Error checking user status:', rpcError);
        setValidationErrors(prev => ({
          ...prev,
          email: 'Could not verify email. Please try again.'
        }));
        setIsLoading(false);
        return;
      }

      if (isConfirmed) {
        console.log('🔐 Signup attempt for existing confirmed user:', signupData.email);
        setValidationErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists.'
        }));
        toast.error('An account with this email already exists. Please sign in instead.');
        setIsLoading(false);
        return;
      }
      
      console.log('🔐 Attempting teacher signup...');
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
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
          setSignupSuccessMessage('Account created successfully! Please check your email for a verification link.');
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
            toast.error('Failed to update your information. Please try again.');
          } else {
            setSignupSuccessMessage('Your information has been updated. Please check your email for a verification link.');
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
      if (error.message && error.message.includes('already registered')) {
        setValidationErrors(prev => ({
          ...prev,
          email: 'An account with this email already exists.'
        }));
      } else {
        toast.error(error.message || 'Failed to create account');
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
                <Users className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Teacher Portal
              </CardTitle>
              <CardDescription className="text-lg leading-relaxed">
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-8">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/50 rounded-2xl p-1">
                  <TabsTrigger value="login" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300">
                    Sign Up
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-6 mt-8">
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
                        to="/forgot-password?role=teacher"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300 font-medium"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-6 mt-8">
                  <form onSubmit={handleSignup} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <Label htmlFor="signup-firstname" className="text-base font-medium">First Name</Label>
                        <Input
                          id="signup-firstname"
                          type="text"
                          placeholder="First name"
                          value={signupData.firstName}
                          onChange={(e) => {
                            setSignupData({ ...signupData, firstName: e.target.value });
                            handleFieldValidation('firstName', e.target.value);
                          }}
                          className={`h-12 text-base rounded-xl border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            validationErrors.firstName ? 'border-red-500' : 'border-border/50'
                          }`}
                        />
                        {validationErrors.firstName && (
                          <p className="text-sm text-red-500 font-medium">{validationErrors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-3">
                        <Label htmlFor="signup-lastname" className="text-base font-medium">Last Name</Label>
                        <Input
                          id="signup-lastname"
                          type="text"
                          placeholder="Last name"
                          value={signupData.lastName}
                          onChange={(e) => {
                            setSignupData({ ...signupData, lastName: e.target.value });
                            handleFieldValidation('lastName', e.target.value);
                          }}
                          className={`h-12 text-base rounded-xl border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            validationErrors.lastName ? 'border-red-500' : 'border-border/50'
                          }`}
                        />
                        {validationErrors.lastName && (
                          <p className="text-sm text-red-500 font-medium">{validationErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="signup-email" className="text-base font-medium">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupData.email}
                        onChange={(e) => {
                          setSignupData({ ...signupData, email: e.target.value });
                          handleFieldValidation('email', e.target.value);
                        }}
                        className={`h-12 text-base rounded-xl border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          validationErrors.email ? 'border-red-500' : 'border-border/50'
                        }`}
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-red-500 font-medium">{validationErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="teacher-id" className="text-base font-medium">Teacher ID</Label>
                      <Input
                        id="teacher-id"
                        type="text"
                        placeholder="Enter your Teacher ID"
                        value={signupData.teacherId}
                        onChange={(e) => {
                          setSignupData({ ...signupData, teacherId: e.target.value });
                          handleFieldValidation('teacherId', e.target.value);
                        }}
                        className={`h-12 text-base rounded-xl border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          validationErrors.teacherId ? 'border-red-500' : 'border-border/50'
                        }`}
                      />
                      {validationErrors.teacherId && (
                        <p className="text-sm text-red-500 font-medium">{validationErrors.teacherId}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="signup-password" className="text-base font-medium">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showSignupPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={signupData.password}
                          onChange={(e) => {
                            setSignupData({ ...signupData, password: e.target.value });
                            handleFieldValidation('password', e.target.value);
                          }}
                          className={`h-12 text-base rounded-xl border-2 pr-12 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            validationErrors.password ? 'border-red-500' : 'border-border/50'
                          }`}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-[50%] transform -translate-y-[50%] text-muted-foreground hover:text-primary transition-colors duration-300"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {validationErrors.password && (
                        <p className="text-sm text-red-500 font-medium">{validationErrors.password}</p>
                      )}
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="confirm-password" className="text-base font-medium">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm your password"
                          value={signupData.confirmPassword}
                          onChange={(e) => {
                            setSignupData({ ...signupData, confirmPassword: e.target.value });
                            handleFieldValidation('confirmPassword', e.target.value);
                          }}
                          className={`h-12 text-base rounded-xl border-2 pr-12 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                            validationErrors.confirmPassword ? 'border-red-500' : 'border-border/50'
                          }`}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-[50%] transform -translate-y-[50%] text-muted-foreground hover:text-primary transition-colors duration-300"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-5 w-5" />
                          ) : (
                            <Eye className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-500 font-medium">{validationErrors.confirmPassword}</p>
                      )}
                    </div>
                    {signupSuccessMessage && (
                      <p className="text-sm text-green-600 text-center py-3 bg-green-50 rounded-xl border border-green-200 font-medium">
                        {signupSuccessMessage}
                      </p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          Creating account...
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <UserPlus className="mr-2 h-5 w-5" />
                          Create Account
                        </div>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MFA Verification Dialog */}
      <SupabaseMFAVerification
        isOpen={showMFAVerification}
        onClose={() => {
          setShowMFAVerification(false);
          setPendingUser(null);
          setPendingMFAUser(null);
          // Sign out the user if they cancel MFA verification
          supabase.auth.signOut();
        }}
        onSuccess={async () => {
          setShowMFAVerification(false);
          setPendingUser(null);
          setPendingMFAUser(null);

          // Update last active timestamp after MFA verification
          if (pendingUser?.id) {
            await updateUserLastActive(pendingUser.id);
          }

          console.log('🔐 MFA verification successful, redirecting to dashboard...');
          toast.success('Welcome back!');
          window.location.href = '/dashboard';
        }}
        onBack={() => {
          setShowMFAVerification(false);
          setPendingUser(null);
          setPendingMFAUser(null);
          // Sign out the user if they go back from MFA verification
          supabase.auth.signOut();
        }}
        userEmail={pendingUser?.email || ''}
      />

    </div>
  );
};

export default TeacherAuth;
