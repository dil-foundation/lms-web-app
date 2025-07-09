import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      toast.error(t('profile_settings.personal_info.update_error_toast'));
      console.error('Profile update error:', profileError);
      setIsUpdatingProfile(false);
      return;
    }

    // Update auth.users metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: updatedMetadata,
    });

    if (authError) {
      toast.error(t('profile_settings.personal_info.auth_update_error_toast'));
      console.error('Auth update error:', authError);
    } else {
      toast.success(t('profile_settings.personal_info.update_success_toast'));
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
      toast.error(t('profile_settings.password.fix_errors_toast'));
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
        
        toast.success(t('profile_settings.password.update_success_toast'));
        setPassword('');
        setConfirmPassword('');
        sessionStorage.removeItem('passwordRecovery');
        setIsPasswordRecovery(false);
        // We can also remove the alert after success
        const alert = document.getElementById('password-recovery-alert');
        if (alert) alert.style.display = 'none';
        
      } catch (error: any) {
        toast.error(error.message || t('profile_settings.password.update_error_toast'));
        console.error('Password reset error:', error);
      }
    } else {
      // This is a standard password change for a logged-in user. AAL check applies.
      if (needsReauthentication) {
        // User logged in with magic link, needs re-auth email.
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          toast.error(t('profile_settings.password.reauth_email_error_toast'));
          console.error('Re-authentication trigger error:', error);
        } else {
          toast.success(t('profile_settings.password.reauth_email_sent_toast'));
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
            setPasswordValidationErrors(prev => ({ ...prev, password: t('profile_settings.password.new_password_different_error') }));
          } else {
            toast.error(t('profile_settings.password.update_error_toast'));
          }
          console.error('Password update error:', error);
        } else {
          toast.success(t('profile_settings.password.update_success_toast'));
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
          <AlertTitle>{t('profile_settings.password_recovery.title')}</AlertTitle>
          <AlertDescription>
            {t('profile_settings.password_recovery.description')}
          </AlertDescription>
        </Alert>
      )}
      <h1 className="text-2xl font-bold">{t('profile_settings.title')}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('profile_settings.personal_info.title')}</CardTitle>
            <CardDescription>{t('profile_settings.personal_info.description')}</CardDescription>
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
                  <Label htmlFor="firstName">{t('profile_settings.personal_info.first_name')}</Label>
                  <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t('profile_settings.personal_info.last_name')}</Label>
                  <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
                
                {profile?.role === 'student' && (
                  <div className="space-y-2">
                    <Label htmlFor="grade">{t('profile_settings.personal_info.grade')}</Label>
                    <Select value={grade} onValueChange={setGrade}>
                      <SelectTrigger id="grade">
                        <SelectValue placeholder={t('profile_settings.personal_info.select_grade_placeholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((g) => (
                          <SelectItem key={g} value={String(g)}>
                            {t('profile_settings.personal_info.grade_option', { grade: g })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {profile?.role === 'teacher' && (
                  <div className="space-y-2">
                    <Label htmlFor="teacherId">{t('profile_settings.personal_info.teacher_id')}</Label>
                    <Input id="teacherId" value={teacherId} onChange={(e) => setTeacherId(e.target.value)} />
                  </div>
                )}
                
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile ? t('profile_settings.personal_info.updating_button') : t('profile_settings.personal_info.update_button')}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>{t('profile_settings.password.title')}</CardTitle>
            <CardDescription>
             {t('profile_settings.password.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {needsReauthentication && !reauthEmailSent && (
              <Alert variant="warning" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('profile_settings.reauth_alert.title')}</AlertTitle>
                <AlertDescription>
                  {t('profile_settings.reauth_alert.description_part1')}{' '}
                  {t('profile_settings.reauth_alert.description_part2')}
                </AlertDescription>
              </Alert>
            )}

            {reauthEmailSent && (
               <Alert variant="default" className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t('profile_settings.reauth_alert.reauth_email_sent_title')}</AlertTitle>
                <AlertDescription>
                  {t('profile_settings.reauth_alert.reauth_email_sent')}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{t('profile_settings.password.new_password')}</Label>
                <Input 
                  id="password" 
                  type="password" 
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    handlePasswordFieldValidation('password', e.target.value);
                  }}
                />
                {passwordValidationErrors.password && <p className="text-sm text-red-500">{passwordValidationErrors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('profile_settings.password.confirm_new_password')}</Label>
                <Input 
                  id="confirmPassword" 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    handlePasswordFieldValidation('confirmPassword', e.target.value);
                  }}
                />
                {passwordValidationErrors.confirmPassword && <p className="text-sm text-red-500">{passwordValidationErrors.confirmPassword}</p>}
              </div>
              <Button type="submit" disabled={isUpdatingPassword || reauthEmailSent}>
                {isUpdatingPassword ? t('profile_settings.password.updating_button') : t('profile_settings.password.update_button')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings; 