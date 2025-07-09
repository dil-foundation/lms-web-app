import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { validatePassword, validateConfirmPassword } from '@/utils/validation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

const ProfileSettings = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile(user);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [grade, setGrade] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordValidationErrors, setPasswordValidationErrors] = useState({
    password: '',
    confirmPassword: '',
  });
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [needsReauthentication, setNeedsReauthentication] = useState(false);
  const [reauthEmailSent, setReauthEmailSent] = useState(false);

  useEffect(() => {
    const checkAal = async () => {
      if (user) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const aal = (data.session.user as any).aal;
          if (aal === 'aal1') {
            setNeedsReauthentication(true);
          } else {
            setNeedsReauthentication(false);
          }
        }
      }
    };
    checkAal();
  }, [user]);

  useEffect(() => {
    if (sessionStorage.getItem('passwordRecovery') === 'true') {
      setIsPasswordRecovery(true);
      sessionStorage.removeItem('passwordRecovery');
    }
  }, []);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      if (profile.role === 'student' && profile.grade) {
        setGrade(profile.grade.toString());
      }
      if (profile.role === 'teacher' && profile.teacher_id) {
        setTeacherId(profile.teacher_id);
      }
    }
  }, [profile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);

    const updatedMetadata = {
      first_name: firstName,
      last_name: lastName,
      ...(profile?.role === 'student' && { grade }),
      ...(profile?.role === 'teacher' && { teacher_id: teacherId }),
    };

    // Update public.profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update(updatedMetadata)
      .eq('id', user.id);

    if (profileError) {
      toast.error('Failed to update profile. Please try again.');
      console.error('Profile update error:', profileError);
      setIsUpdatingProfile(false);
      return;
    }

    // Update auth.users metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: updatedMetadata,
    });

    if (authError) {
      toast.error('Failed to update session data. Please try again.');
      console.error('Auth update error:', authError);
    } else {
      toast.success('Profile updated successfully!');
    }
    
    setIsUpdatingProfile(false);
  };

  const handlePasswordFieldValidation = (field: 'password' | 'confirmPassword', value: string) => {
    let validation;
    if (field === 'password') {
      validation = validatePassword(value);
      if (confirmPassword) {
        const confirmValidation = validateConfirmPassword(value, confirmPassword);
        setPasswordValidationErrors(prev => ({
          ...prev,
          confirmPassword: confirmValidation.isValid ? '' : confirmValidation.error || '',
        }));
      }
    } else { // confirmPassword
      validation = validateConfirmPassword(password, value);
    }

    setPasswordValidationErrors(prev => ({
      ...prev,
      [field]: validation.isValid ? '' : validation.error || '',
    }));
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Re-validate all fields on submit
    handlePasswordFieldValidation('password', password);
    handlePasswordFieldValidation('confirmPassword', confirmPassword);

    // Check validation state after updates
    const passwordIsValid = validatePassword(password).isValid;
    const confirmPasswordIsValid = validateConfirmPassword(password, confirmPassword).isValid;

    if (!passwordIsValid || !confirmPasswordIsValid) {
      toast.error('Please fix the errors before submitting.');
      return;
    }
    
    setIsUpdatingPassword(true);

    if (isPasswordRecovery) {
      // User came from a password reset link. Use edge function to bypass AAL check.
      try {
        const { error } = await supabase.functions.invoke('reset-password', {
          body: { password },
        });

        if (error) throw error;
        
        toast.success('Password updated successfully!');
        setPassword('');
        setConfirmPassword('');
        sessionStorage.removeItem('passwordRecovery');
        setIsPasswordRecovery(false);
        // We can also remove the alert after success
        const alert = document.getElementById('password-recovery-alert');
        if (alert) alert.style.display = 'none';
        
      } catch (error: any) {
        toast.error(error.message || 'Failed to update password. Please try again.');
        console.error('Password reset error:', error);
      }
    } else {
      // This is a standard password change for a logged-in user. AAL check applies.
      if (needsReauthentication) {
        // User logged in with magic link, needs re-auth email.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error('Failed to send confirmation email. Please try again.');
          console.error('Re-authentication trigger error:', error);
        } else {
          toast.success('Confirmation email sent! Please check your inbox to complete the password change.');
          setReauthEmailSent(true); 
          setPassword('');
          setConfirmPassword('');
        }
      } else {
        // User logged in with password, can update directly.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          if (error.message.includes('New password should be different')) {
            // This error is now less likely to be hit by user due to client-side validation, but good to keep.
            setPasswordValidationErrors(prev => ({ ...prev, password: 'New password must be different from your old password.' }));
          } else {
            toast.error('Failed to update password. Please try again.');
          }
          console.error('Password update error:', error);
        } else {
          toast.success('Password updated successfully!');
          setPassword('');
          setConfirmPassword('');
        }
      }
    }

    setIsUpdatingPassword(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      {isPasswordRecovery && (
        <Alert variant="warning" id="password-recovery-alert">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Update Your Password</AlertTitle>
          <AlertDescription>
            You have successfully initiated a password reset. Please enter and confirm your new password below.
          </AlertDescription>
        </Alert>
      )}
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent>
            {profileLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                
                {profile?.role === 'student' && (
                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your grade" />
                      </SelectTrigger>
                      <SelectContent>
                        {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Grade</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {profile?.role === 'teacher' && (
                  <div className="space-y-2">
                    <Label htmlFor="teacherId">Teacher ID</Label>
                    <Input id="teacherId" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} />
                  </div>
                )}

                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password here. This will log you out from other devices.</CardDescription>
          </CardHeader>
          <CardContent>
            {needsReauthentication && !isPasswordRecovery ? (
              reauthEmailSent ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Confirmation Email Sent</AlertTitle>
                  <AlertDescription>
                    We've sent a confirmation link to your email. Please click it to finalize your password change.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                   <Alert variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Confirm Password Change</AlertTitle>
                    <AlertDescription>
                      Because you signed in with a secure link, you need to confirm your new password via email.
                    </AlertDescription>
                  </Alert>
                  <form onSubmit={handlePasswordUpdate} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword-reauth">New Password</Label>
                      <Input 
                        id="newPassword-reauth" 
                        type="password" 
                        value={password} 
                        onChange={(e) => {
                          setPassword(e.target.value);
                          handlePasswordFieldValidation('password', e.target.value);
                        }}
                        className={passwordValidationErrors.password ? 'border-red-500' : ''}
                      />
                      {passwordValidationErrors.password && <p className="text-sm text-red-500">{passwordValidationErrors.password}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword-reauth">Confirm New Password</Label>
                      <Input 
                        id="confirmPassword-reauth" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          handlePasswordFieldValidation('confirmPassword', e.target.value);
                        }}
                        className={passwordValidationErrors.confirmPassword ? 'border-red-500' : ''}
                      />
                      {passwordValidationErrors.confirmPassword && <p className="text-sm text-red-500">{passwordValidationErrors.confirmPassword}</p>}
                    </div>
                    <Button type="submit" disabled={isUpdatingPassword} className="w-full">
                      {isUpdatingPassword ? 'Sending...' : 'Send Confirmation Email'}
                    </Button>
                  </form>
                </div>
              )
            ) : (
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input 
                    id="newPassword" 
                    type="password" 
                    value={password} 
                    onChange={(e) => {
                      setPassword(e.target.value);
                      handlePasswordFieldValidation('password', e.target.value);
                    }}
                    className={passwordValidationErrors.password ? 'border-red-500' : ''}
                  />
                  {passwordValidationErrors.password && <p className="text-sm text-red-500">{passwordValidationErrors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      handlePasswordFieldValidation('confirmPassword', e.target.value);
                    }}
                    className={passwordValidationErrors.confirmPassword ? 'border-red-500' : ''}
                  />
                  {passwordValidationErrors.confirmPassword && <p className="text-sm text-red-500">{passwordValidationErrors.confirmPassword}</p>}
                </div>
                <Button type="submit" disabled={isUpdatingPassword}>
                  {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings; 