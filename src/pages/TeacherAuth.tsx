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
        email: !loginData.email ? 'Email is required' : '',
        password: !loginData.password ? 'Password is required' : ''
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
        console.log('🔐 Teacher login successful:', data.user.email);
        toast.success('Welcome back!');
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
      }
    } catch (error: any) {
      console.error('🔐 Teacher signup error:', error);
      toast.error(error.message || 'Failed to create account');
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
            Back to role selection
          </Button>

          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold">Teacher Portal</CardTitle>
              <CardDescription>
                Sign in to your account or create a new one
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login" className="space-y-4 mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
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
                        className={loginValidationErrors.email ? 'border-red-500' : ''}
                      />
                      {loginValidationErrors.email && (
                        <p className="text-sm text-red-500">{loginValidationErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
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
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <div className="text-center">
                      <Link 
                        to="/forgot-password?role=teacher"
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot Password?
                      </Link>
                    </div>
                  </form>
                </TabsContent>
                
                <TabsContent value="signup" className="space-y-4 mt-6">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname">First Name</Label>
                        <Input
                          id="signup-firstname"
                          type="text"
                          placeholder="First name"
                          value={signupData.firstName}
                          onChange={(e) => {
                            setSignupData({ ...signupData, firstName: e.target.value });
                            handleFieldValidation('firstName', e.target.value);
                          }}
                          className={validationErrors.firstName ? 'border-red-500' : ''}
                        />
                        {validationErrors.firstName && (
                          <p className="text-sm text-red-500">{validationErrors.firstName}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname">Last Name</Label>
                        <Input
                          id="signup-lastname"
                          type="text"
                          placeholder="Last name"
                          value={signupData.lastName}
                          onChange={(e) => {
                            setSignupData({ ...signupData, lastName: e.target.value });
                            handleFieldValidation('lastName', e.target.value);
                          }}
                          className={validationErrors.lastName ? 'border-red-500' : ''}
                        />
                        {validationErrors.lastName && (
                          <p className="text-sm text-red-500">{validationErrors.lastName}</p>
                        )}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="Enter your email"
                        value={signupData.email}
                        onChange={(e) => {
                          setSignupData({ ...signupData, email: e.target.value });
                          handleFieldValidation('email', e.target.value);
                        }}
                        className={validationErrors.email ? 'border-red-500' : ''}
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-red-500">{validationErrors.email}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacher-id">Teacher ID</Label>
                      <Input
                        id="teacher-id"
                        type="text"
                        placeholder="Enter your Teacher ID"
                        value={signupData.teacherId}
                        onChange={(e) => {
                          setSignupData({ ...signupData, teacherId: e.target.value });
                          handleFieldValidation('teacherId', e.target.value);
                        }}
                        className={validationErrors.teacherId ? 'border-red-500' : ''}
                      />
                      {validationErrors.teacherId && (
                        <p className="text-sm text-red-500">{validationErrors.teacherId}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
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
                          className={`pr-10 ${validationErrors.password ? 'border-red-500' : ''}`}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-[50%] transform -translate-y-[50%] text-gray-500"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {validationErrors.password && (
                        <p className="text-sm text-red-500">{validationErrors.password}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
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
                          className={`pr-10 ${validationErrors.confirmPassword ? 'border-red-500' : ''}`}
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-[50%] transform -translate-y-[50%] text-gray-500"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                      )}
                    </div>
                    {signupSuccessMessage && (
                      <p className="text-sm text-green-600 text-center py-2">{signupSuccessMessage}</p>
                    )}
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Creating account...' : 'Create Account'}
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
