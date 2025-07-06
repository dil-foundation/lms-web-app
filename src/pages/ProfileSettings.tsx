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
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || 'Invalid password format.');
      return;
    }

    const confirmPasswordValidation = validateConfirmPassword(password, confirmPassword);
    if (!confirmPasswordValidation.isValid) {
      setPasswordError(confirmPasswordValidation.error || 'Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error('Failed to update password. Please try again.');
      console.error('Password update error:', error);
    } else {
      toast.success('Password updated successfully!');
      setPassword('');
      setConfirmPassword('');
    }
    setIsUpdatingPassword(false);
  };

  return (
    <div className="p-6 space-y-6">
      {isPasswordRecovery && (
        <Alert variant="warning">
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
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              <Button type="submit" disabled={isUpdatingPassword}>
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings; 