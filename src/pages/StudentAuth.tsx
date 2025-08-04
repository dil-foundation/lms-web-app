import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Eye, EyeOff, GraduationCap, Lock, UserPlus } from 'lucide-react';
import { 
  validateFirstName, 
  validateLastName, 
  validateEmail, 
  validatePassword, 
  validateConfirmPassword, 
  validateGrade 
} from '@/utils/validation';

const StudentAuth = () => {
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
  
  // Add login validation error states
  const [loginValidationErrors, setLoginValidationErrors] = useState({
    email: '',
    password: ''
  });
  
  // Add state for auth error
  const [authError, setAuthError] = useState('');
  
  const [signupData, setSignupData] = useState({ 
    firstName: '',
    lastName: '',
    email: '', 
    password: '', 
    confirmPassword: '',
    grade: ''
  });

  // Validation error states
  const [validationErrors, setValidationErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    grade: ''
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
      case 'grade':
        validation = validateGrade(value);
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
      console.log('🔐 Attempting student login...');
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
          throw new Error('Could not fetch user profile.');
        }

        if (profile.role !== 'student') {
          await supabase.auth.signOut();
          setAuthError(`Please use the ${profile.role} portal to log in.`);
          setIsLoading(false);
          return;
        }

        console.log('🔐 Student login successful:', data.user.email);
        toast.success('Welcome back!');
        // Force page refresh to ensure clean state
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('🔐 Student login error:', error);
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
    const gradeValidation = validateGrade(signupData.grade);

    // Check for empty fields first
    if (!signupData.firstName || !signupData.lastName || !signupData.email || 
        !signupData.password || !signupData.confirmPassword || !signupData.grade) {
      setValidationErrors({
        firstName: !signupData.firstName ? 'First name is required' : '',
        lastName: !signupData.lastName ? 'Last name is required' : '',
        email: !signupData.email ? 'Email is required' : '',
        password: !signupData.password ? 'Password is required' : '',
        confirmPassword: !signupData.confirmPassword ? 'Please confirm your password' : '',
        grade: !signupData.grade ? 'Grade is required' : ''
      });
      return;
    }

    const hasErrors = !firstNameValidation.isValid || 
                     !lastNameValidation.isValid || 
                     !emailValidation.isValid || 
                     !passwordValidation.isValid || 
                     !confirmPasswordValidation.isValid || 
                     !gradeValidation.isValid;

    if (hasErrors) {
      setValidationErrors({
        firstName: firstNameValidation.error || '',
        lastName: lastNameValidation.error || '',
        email: emailValidation.error || '',
        password: passwordValidation.error || '',
        confirmPassword: confirmPasswordValidation.error || '',
        grade: gradeValidation.error || ''
      });
      toast.error('Please fix the validation errors before submitting');
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

      console.log('🔐 Attempting student signup...');
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `https://dil.lovable.app/dashboard`,
          data: {
            role: 'student',
            first_name: signupData.firstName,
            last_name: signupData.lastName,
            grade: signupData.grade
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        const isNewUser = (Date.now() - new Date(data.user.created_at).getTime()) < 60000; // 1 minute threshold

        if (isNewUser) {
          console.log('🔐 Student signup successful:', data.user.email);
          setSignupSuccessMessage('Account created successfully! Please check your email for a verification link.');
          setSignupData({
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            confirmPassword: '',
            grade: ''
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
                grade: signupData.grade
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
              grade: ''
            });
          }
        }
      }
    } catch (error: any) {
      console.error('🔐 Student signup error:', error);
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
            className="mb-8 p-3 hover:bg-primary/5 rounded-xl transition-all duration-300 group"
          >
            <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-1 transition-transform duration-300" />
            Back to role selection
          </Button>

          <Card className="bg-card/80 backdrop-blur-sm border border-border/50 shadow-2xl shadow-primary/5 rounded-3xl overflow-hidden">
            <CardHeader className="text-center pb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Student Portal
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
                          setAuthError(''); // Clear auth error when email changes
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
                            setAuthError(''); // Clear auth error when password changes
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
                        to="/forgot-password?role=student"
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
                      <Label htmlFor="grade" className="text-base font-medium">Grade</Label>
                      <Select 
                        value={signupData.grade} 
                        onValueChange={(value) => {
                          setSignupData({ ...signupData, grade: value });
                          handleFieldValidation('grade', value);
                        }}
                      >
                        <SelectTrigger className={`h-12 text-base rounded-xl border-2 transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20 ${
                          validationErrors.grade ? 'border-red-500' : 'border-border/50'
                        }`}>
                          <SelectValue placeholder="Select your grade" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-2">
                          <SelectItem value="1">1st Grade</SelectItem>
                          <SelectItem value="2">2nd Grade</SelectItem>
                          <SelectItem value="3">3rd Grade</SelectItem>
                          <SelectItem value="4">4th Grade</SelectItem>
                          <SelectItem value="5">5th Grade</SelectItem>
                          <SelectItem value="6">6th Grade</SelectItem>
                          <SelectItem value="7">7th Grade</SelectItem>
                          <SelectItem value="8">8th Grade</SelectItem>
                          <SelectItem value="9">9th Grade</SelectItem>
                          <SelectItem value="10">10th Grade</SelectItem>
                          <SelectItem value="11">11th Grade</SelectItem>
                          <SelectItem value="12">12th Grade</SelectItem>
                        </SelectContent>
                      </Select>
                      {validationErrors.grade && (
                        <p className="text-sm text-red-500 font-medium">{validationErrors.grade}</p>
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
    </div>
  );
};

export default StudentAuth;
