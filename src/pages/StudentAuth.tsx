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
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
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
      console.log('🔐 Attempting student signup...');
      const { data, error } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
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
        console.log('🔐 Student signup successful:', data.user.email);
        toast.success('Account created successfully!');
        // Force page refresh to ensure clean state
        window.location.href = '/dashboard';
      }
    } catch (error: any) {
      console.error('🔐 Student signup error:', error);
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
              <CardTitle className="text-2xl font-bold">Student Portal</CardTitle>
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
                          setAuthError(''); // Clear auth error when email changes
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
                            setAuthError(''); // Clear auth error when password changes
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
                        to="/forgot-password?role=student"
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
                      <Label htmlFor="grade">Grade</Label>
                      <Select 
                        value={signupData.grade} 
                        onValueChange={(value) => {
                          setSignupData({ ...signupData, grade: value });
                          handleFieldValidation('grade', value);
                        }}
                      >
                        <SelectTrigger className={validationErrors.grade ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select your grade" />
                        </SelectTrigger>
                        <SelectContent>
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
                        <p className="text-sm text-red-500">{validationErrors.grade}</p>
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
                          className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-accent/20"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
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
                          className={validationErrors.confirmPassword ? 'border-red-500 pr-10' : 'pr-10'}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-accent/20"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {validationErrors.confirmPassword && (
                        <p className="text-sm text-red-500">{validationErrors.confirmPassword}</p>
                      )}
                    </div>
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

export default StudentAuth;
