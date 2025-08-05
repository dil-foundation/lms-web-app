import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  User, 
  Shield, 
  Settings, 
  Smartphone, 
  Globe, 
  Eye, 
  EyeOff, 
  Upload, 
  Trash2, 
  LogOut, 
  Monitor, 
  Bell, 
  Lock,
  Calendar,
  CheckCircle,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
  timezone: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileFormSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export default function ProfileSettings() {
  const { user, signOut } = useAuth();
  const { profile, loading, error } = useUserProfile();
  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    inApp: true,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
      timezone: 'UTC',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (profile) {
      setAvatarUrl(profile.avatar_url);
      profileForm.reset({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phoneNumber: profile.phone_number || '',
        timezone: profile.timezone || 'UTC',
      });
    }
  }, [profile, profileForm]);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingAvatar(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('dil-lms')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('dil-lms')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success('Profile picture updated successfully');
    } catch (error: any) {
      toast.error('Failed to upload profile picture', { description: error.message });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onProfileUpdate = async (data: ProfileFormData) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          phone_number: data.phoneNumber,
          timezone: data.timezone,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile', { description: error.message });
    }
  };

  const onPasswordUpdate = async (data: PasswordFormData) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (error) throw error;

      passwordForm.reset();
      toast.success('Password updated successfully');
    } catch (error: any) {
      toast.error('Failed to update password', { description: error.message });
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    // Here you would implement the actual theme change logic
    toast.success(`Theme changed to ${newTheme}`);
  };

  if (loading) {
    return (
      <div className="space-y-8 mx-auto p-4">
        {/* Premium Header Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
          <div className="relative p-8 rounded-3xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                    Profile Settings
                  </h1>
                  <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                    Manage your account preferences and security
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-screen text-center">
        <h2 className="text-xl font-semibold text-destructive mb-2">Error loading profile</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    );
  }

  const displayName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User' : 'User';

  return (
    <div className="min-h-full bg-background">
      {/* Premium Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5"></div>
        <div className="relative border-b border-border bg-card">
          <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Profile Settings
                </h1>
                <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                  Manage your account preferences and security
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-none px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Profile Picture Section */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <User className="w-6 h-6 text-primary" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-3xl font-bold">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Upload New Picture
                      </Button>
                    </Label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                  </div>
                  {avatarUrl && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setAvatarUrl(null)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Picture
                    </Button>
                  )}
                  {isUploadingAvatar && (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <User className="w-6 h-6 text-primary" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileUpdate)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...profileForm.register('firstName')}
                      className="bg-background border-border"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...profileForm.register('lastName')}
                      className="bg-background border-border"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="text-sm text-destructive">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="phoneNumber"
                        {...profileForm.register('phoneNumber')}
                        className="bg-background border-border pl-10"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="timezone"
                        {...profileForm.register('timezone')}
                        className="bg-background border-border pl-10"
                        placeholder="UTC"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted border-border"
                  />
                  <p className="text-sm text-muted-foreground">Contact support to change your email address</p>
                </div>

                <Button type="submit" className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary">
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Shield className="w-6 h-6 text-primary" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Password Change */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Change Password</h4>
                <form onSubmit={passwordForm.handleSubmit(onPasswordUpdate)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="currentPassword"
                        type={showPassword ? 'text' : 'password'}
                        {...passwordForm.register('currentPassword')}
                        className="bg-background border-border pl-10 pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        {...passwordForm.register('newPassword')}
                        className="bg-background border-border"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          {...passwordForm.register('confirmPassword')}
                          className="bg-background border-border pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                  
                  <Button type="submit" variant="outline">
                    Update Password
                  </Button>
                </form>
              </div>

              <Separator />

              {/* Two-Factor Authentication */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-semibold text-foreground">Two-Factor Authentication</h4>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  checked={twoFactorEnabled}
                  onCheckedChange={setTwoFactorEnabled}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preferences */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <Settings className="w-6 h-6 text-primary" />
                Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Theme Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Theme</h4>
                <div className="grid grid-cols-3 gap-3">
                  {(['light', 'dark', 'auto'] as const).map((themeOption) => (
                    <Button
                      key={themeOption}
                      variant={theme === themeOption ? 'default' : 'outline'}
                      onClick={() => handleThemeChange(themeOption)}
                      className="flex items-center gap-2"
                    >
                      <Monitor className="w-4 h-4" />
                      {themeOption.charAt(0).toUpperCase() + themeOption.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive updates via email</p>
                    </div>
                    <Switch
                      checked={notifications.email}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, email: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive push notifications</p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, push: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">In-App Notifications</p>
                      <p className="text-sm text-muted-foreground">Show notifications within the app</p>
                    </div>
                    <Switch
                      checked={notifications.inApp}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, inApp: checked }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card className="bg-card border border-border backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-xl">
                <CheckCircle className="w-6 h-6 text-primary" />
                Account Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                      Active
                    </Badge>
                    <span className="text-sm text-muted-foreground">Member since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Your account is in good standing</p>
                </div>
                <Button 
                  variant="outline" 
                  onClick={signOut}
                  className="text-destructive hover:text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 