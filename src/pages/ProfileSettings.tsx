import { useState, useEffect, useRef } from 'react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
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
  BookOpen,
  Key,
  Mail,
  Crop as CropIcon,
  RotateCcw,
  Check,
  X,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import AccessLogService from '@/services/accessLogService';
import SupabaseMFAService from '@/services/supabaseMFAService';
import { ContentLoader } from '@/components/ContentLoader';

const profileFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().optional(),
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

const resetPasswordSchema = z.object({
  mfaCode: z.string().optional(),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ProfileSettings() {
  const { user, signOut } = useAuth();
  const { profile, loading, error, refreshProfile, refreshKey } = useUserProfile();
  const [searchParams] = useSearchParams();
  

  
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [notifications, setNotifications] = useState({
    push: false,
    inApp: true,
  });

  // Image cropper state
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropping, setIsCropping] = useState(false);

  const [isAvatarLoading, setIsAvatarLoading] = useState(false);
  const [isAvatarUpdating, setIsAvatarUpdating] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Password reset dialog state
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [showResetMFACode, setShowResetMFACode] = useState(false);
  // Note: isMFAEnabled now represents whether MFA is required for the user's role based on global security settings
  const [isMFAEnabled, setIsMFAEnabled] = useState(false);
  const [isCheckingMFA, setIsCheckingMFA] = useState(true);
  
  // Ref to prevent multiple dialog openings (more reliable than state for this use case)
  const hasShownResetDialogRef = useRef(false);
  const resetDialogProcessedRef = useRef(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phoneNumber: '',
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

  const resetPasswordForm = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      mfaCode: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Check for reset source parameter on component mount
  useEffect(() => {
    // Prevent multiple dialog openings
    if (hasShownResetDialogRef.current || showResetDialog || resetDialogProcessedRef.current) {
      console.log('Dialog already shown, open, or processed, skipping...');
      return;
    }
    
    const source = searchParams.get('source');
    const hasProcessedReset = sessionStorage.getItem('profileSettings_resetProcessed');
    const dialogShownThisSession = sessionStorage.getItem('profileSettings_dialogShownThisSession');
    
    // If we've already shown the dialog in this session, don't show it again
    if (dialogShownThisSession === 'true') {
      console.log('Dialog already shown this session, skipping...');
      return;
    }
    
    if (source === 'reset' && !hasProcessedReset) {
      console.log('Opening reset dialog - source=reset, no processed reset');
      hasShownResetDialogRef.current = true;
      resetDialogProcessedRef.current = true;
      setShowResetDialog(true);
      sessionStorage.setItem('profileSettings_shouldShowDialog', 'true');
      sessionStorage.setItem('profileSettings_dialogShownThisSession', 'true');
      // Clear the URL parameter to prevent showing dialog on refresh
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('source');
      window.history.replaceState({}, '', newUrl.toString());
    } else if (source === 'reset' && hasProcessedReset) {
      // Check if we should still show the dialog (in case of remount)
      const shouldShowDialog = sessionStorage.getItem('profileSettings_shouldShowDialog');
      if (shouldShowDialog === 'true') {
        console.log('Opening reset dialog - shouldShowDialog=true');
        hasShownResetDialogRef.current = true;
        resetDialogProcessedRef.current = true;
        setShowResetDialog(true);
        sessionStorage.removeItem('profileSettings_shouldShowDialog');
        sessionStorage.setItem('profileSettings_dialogShownThisSession', 'true');
      }
    }
  }, [searchParams]);
  
  // Cleanup effect to reset refs when component unmounts
  useEffect(() => {
    return () => {
      hasShownResetDialogRef.current = false;
      resetDialogProcessedRef.current = false;
    };
  }, []);

  // Check MFA status on component mount
  useEffect(() => {
    const checkMFAStatus = async () => {
      try {
        // Check if the user has MFA factors set up
        const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
        const hasMFASetup = factors?.totp?.[0]?.status === 'verified';
        console.log('User MFA setup status:', hasMFASetup);
        setIsMFAEnabled(hasMFASetup);
      } catch (error) {
        console.error('Error checking MFA status:', error);
        setIsMFAEnabled(false);
      } finally {
        setIsCheckingMFA(false);
      }
    };

    if (user) {
      checkMFAStatus();
    }
  }, [user]);

  useEffect(() => {
    if (profile) {
      console.log('Profile loaded:', profile);
      console.log('Profile avatar_url:', profile.avatar_url);
      profileForm.reset({
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        phoneNumber: profile.phone_number || '',
      });
      
      // Load notification preferences from profile
      if (profile.notification_preferences) {
        setNotifications(profile.notification_preferences);
      }
      
      // Load theme preference from profile and apply it
      if (profile.theme_preference && (profile.theme_preference === 'light' || profile.theme_preference === 'dark')) {
        const profileTheme = profile.theme_preference as 'light' | 'dark';
        setTheme(profileTheme);
        
        // Apply the theme to the document and localStorage
        if (profileTheme === 'dark') {
          document.documentElement.classList.add('dark');
          localStorage.setItem('theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          localStorage.setItem('theme', 'light');
        }
        
        // Dispatch custom event to notify other components (like header theme toggle)
        window.dispatchEvent(new CustomEvent('themeChanged', { 
          detail: { theme: profileTheme } 
        }));
      }
    }
  }, [profile, profileForm]);

  // Initialize theme from localStorage or system preference when component mounts
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      // Dispatch event to sync with header
      window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: 'dark' } 
      }));
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      // Dispatch event to sync with header
      window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: 'light' } 
      }));
    }

    // Listen for theme changes from other components (like header theme toggle)
    const handleCustomThemeChange = (e: CustomEvent) => {
      const { theme } = e.detail;
      setTheme(theme as 'light' | 'dark');
    };

    window.addEventListener('themeChanged', handleCustomThemeChange as EventListener);

    return () => {
      window.removeEventListener('themeChanged', handleCustomThemeChange as EventListener);
    };
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
  };

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('handleAvatarUpload called', event.target.files);
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      // Reset the file input for invalid file type
      event.target.value = '';
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      // Reset the file input for invalid file size
      event.target.value = '';
      return;
    }

    console.log('File validation passed, reading file...');

    const reader = new FileReader();
    reader.onload = () => {
      console.log('File read successfully, opening cropper...');
      setSelectedImage(reader.result as string);
      setShowImageCropper(true);
      // Reset crop to default
      setCrop({
        unit: '%',
        width: 100,
        height: 100,
        x: 0,
        y: 0,
      });
    };
    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      toast.error('Error reading the selected file');
      // Reset the file input for file reading errors
      event.target.value = '';
    };
    reader.readAsDataURL(file);
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
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      
      // Log profile update
      const fieldsUpdated = [];
      if (data.firstName !== profile?.first_name) fieldsUpdated.push('first_name');
      if (data.lastName !== profile?.last_name) fieldsUpdated.push('last_name');
      if (data.phoneNumber !== profile?.phone_number) fieldsUpdated.push('phone_number');
      
      if (fieldsUpdated.length > 0) {
        await AccessLogService.logProfileUpdate(
          user.id,
          user.email || 'unknown@email.com',
          fieldsUpdated,
          'success'
        );
      }
    } catch (error: any) {
      toast.error('Failed to update profile', { description: error.message });
    }
  };

  const onPasswordUpdate = async (data: PasswordFormData) => {
    try {
      // Check if user has MFA set up first
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const hasMFASetup = factors?.totp?.[0]?.status === 'verified';
      
      if (hasMFASetup) {
        // User has MFA, we need to verify it first
        console.log('MFA setup detected - proceeding with verification');
        
        // Validate MFA code format (6 digits)
        const mfaCodeRegex = /^\d{6}$/;
        if (!mfaCodeRegex.test(data.currentPassword)) {
          toast.error('MFA is enabled for your account. Please enter a 6-digit code from your authenticator app.');
          return;
        }

        // Get the TOTP factor
        const totpFactor = factors.totp?.[0];
        if (!totpFactor) {
          throw new Error('MFA factor not found');
        }
        
        // Get a challenge for the TOTP factor
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });
        
        if (challengeError) throw challengeError;
        
        // Now verify the challenge with the MFA code
        const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challengeData.id,
          code: data.currentPassword
        });
        
        if (verifyError) {
          if (verifyError.message.includes('Invalid code')) {
            toast.error('Invalid MFA code. Please check your authenticator app and try again.');
          } else {
            throw verifyError;
          }
          return;
        }
        
        // Now try to update the password with the re-authenticated session
        const { error: updateError } = await supabase.auth.updateUser({
          password: data.newPassword
        });
        
        if (updateError) {
          if (updateError.message.includes('insufficient_aal')) {
            toast.error('Additional authentication required. Please try again or contact support.');
          } else {
            throw updateError;
          }
          return;
        }
      } else {
        // User doesn't have MFA set up, try normal password update
        console.log('No MFA setup detected - trying normal password update');
        const { error } = await supabase.auth.updateUser({
          password: data.newPassword
        });
        
        if (error) {
          if (error.message.includes('insufficient_aal')) {
            toast.error('Authentication error. Please try again or contact support.');
          } else {
            throw error;
          }
          return;
        }
      }

      passwordForm.reset();
      toast.success('Password updated successfully');
      
      // Log password update
      await AccessLogService.logSecurityEvent(
        user.id,
        user.email || 'unknown@email.com',
        'Password Changed',
        'medium',
        'User successfully changed their password'
      );
    } catch (error: any) {
      console.error('Password update error:', error);
      
      // Handle specific error cases
      if (error.message.includes('insufficient_aal')) {
        toast.error('Additional authentication required. Please try again or contact support.', { 
          description: 'Your account requires additional verification to change the password.' 
        });
      } else if (error.message.includes('Invalid code')) {
        toast.error('Invalid MFA code. Please check your authenticator app and try again.');
      } else {
        toast.error('Failed to update password', { description: error.message });
      }
    }
  };

  const onResetPassword = async (data: ResetPasswordFormData) => {
    setIsResettingPassword(true);
    try {
      // Check if user has MFA set up first
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      const hasMFASetup = factors?.totp?.[0]?.status === 'verified';
      
      if (hasMFASetup) {
        // User has MFA, we need to verify it first
        console.log('MFA setup detected during reset - proceeding with verification');
        
        // For reset password, we need to get the MFA code from the form
        const mfaCode = resetPasswordForm.getValues('mfaCode');
        
        // Validate MFA code format (6 digits)
        const mfaCodeRegex = /^\d{6}$/;
        if (!mfaCode || !mfaCodeRegex.test(mfaCode)) {
          toast.error('MFA is enabled for your account. Please enter a 6-digit code from your authenticator app.');
          setIsResettingPassword(false);
          return;
        }

        // Get the TOTP factor
        const totpFactor = factors.totp?.[0];
        if (!totpFactor) {
          throw new Error('MFA factor not found');
        }
        
        // Get a challenge for the TOTP factor
        const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
          factorId: totpFactor.id
        });
        
        if (challengeError) throw challengeError;
        
        // Now verify the challenge with the MFA code
        const { data: verifyData, error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totpFactor.id,
          challengeId: challengeData.id,
          code: mfaCode
        });
        
        if (verifyError) {
          if (verifyError.message.includes('Invalid code')) {
            toast.error('Invalid MFA code. Please check your authenticator app and try again.');
          } else {
            throw verifyError;
          }
          setIsResettingPassword(false);
          return;
        }
        
        // Now try to update the password with the re-authenticated session
        const { error: updateError } = await supabase.auth.updateUser({
          password: data.newPassword
        });
        
        if (updateError) {
          if (updateError.message.includes('insufficient_aal')) {
            toast.error('Additional authentication required. Please try again or contact support.');
          } else {
            throw updateError;
          }
          setIsResettingPassword(false);
          return;
        }
      } else {
        // User doesn't have MFA set up, try normal password update
        console.log('No MFA setup detected during reset - trying normal password update');
        const { error } = await supabase.auth.updateUser({
          password: data.newPassword
        });
        
        if (error) {
          if (error.message.includes('insufficient_aal')) {
            toast.error('Authentication error. Please try again or contact support.');
          } else {
            throw error;
          }
          setIsResettingPassword(false);
          return;
        }
      }

      toast.success('Password updated successfully', {
        description: 'Your password has been reset.'
      });
      setShowResetDialog(false);
      sessionStorage.setItem('profileSettings_resetProcessed', 'true'); // Set flag only after successful reset
      sessionStorage.removeItem('profileSettings_shouldShowDialog');
      sessionStorage.removeItem('profileSettings_dialogShownThisSession');
      resetPasswordForm.reset();
      // Reset the refs to allow dialog to be opened again
      hasShownResetDialogRef.current = false;
      resetDialogProcessedRef.current = false;
      
      // Log password reset
      await AccessLogService.logSecurityEvent(
        user.id,
        user.email || 'unknown@email.com',
        'Password Reset',
        'high',
        'User successfully reset their password via reset flow'
      );
    } catch (error: any) {
      console.error('Password reset error:', error);
      
      // Handle specific error cases
      if (error.message.includes('insufficient_aal')) {
        toast.error('Additional authentication required. Please try again or contact support.', { 
          description: 'Your account requires additional verification to reset the password.' 
        });
      } else if (error.message.includes('Invalid code')) {
        toast.error('Invalid MFA code. Please check your authenticator app and try again.');
      } else {
        toast.error('Failed to reset password', { description: error.message });
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark') => {
    if (!user) return;
    
    try {
      // Apply theme immediately to the document
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ theme_preference: newTheme })
        .eq('id', user.id);

      if (error) throw error;

      setTheme(newTheme);
      toast.success(`Theme changed to ${newTheme} mode`);
      
      // Dispatch custom event to notify other components (like header theme toggle)
      window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: newTheme } 
      }));
      
      // Log theme change
      await AccessLogService.logProfileUpdate(
        user.id,
        user.email || 'unknown@email.com',
        ['theme_preference'],
        'success'
      );
    } catch (error: any) {
      toast.error('Failed to update theme preference', { description: error.message });
    }
  };

  const handleNotificationChange = async (type: 'push' | 'inApp', checked: boolean) => {
    if (!user) return;
    
    try {
      const updatedNotifications = { ...notifications, [type]: checked };
      
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updatedNotifications })
        .eq('id', user.id);

      if (error) throw error;

      setNotifications(updatedNotifications);
      toast.success(`${type === 'push' ? 'Real time' : 'System'} notifications ${checked ? 'enabled' : 'disabled'}`);
      
      // Log notification preference change
      await AccessLogService.logProfileUpdate(
        user.id,
        user.email || 'unknown@email.com',
        ['notification_preferences'],
        'success'
      );
    } catch (error: any) {
      toast.error('Failed to update notification preferences', { description: error.message });
    }
  };

  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<Blob> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/jpeg', 0.9);
    });
  };

  const handleCropComplete = async () => {
    if (!completedCrop || !imgRef.current || !user) return;

    setIsCropping(true);
    setIsAvatarLoading(true);
    setIsAvatarUpdating(true);
    try {
      // Get the cropped image as a blob
      const croppedImageBlob = await getCroppedImg(imgRef.current, completedCrop);
      
      // Create a file from the blob
      const file = new File([croppedImageBlob], `avatar-${user.id}-${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload to Supabase storage
      const filePath = `avatars/${user.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('dil-lms-public')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('dil-lms-public')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);
      console.log('File path:', filePath);

      // Update the profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Close cropper UI
      console.log('Avatar upload complete - URL:', publicUrl);
      console.log('Current profile avatar_url before refresh:', profile?.avatar_url);
      console.log('Current refreshKey before refresh:', refreshKey);
      setShowImageCropper(false);
      setSelectedImage(null);
      
      toast.success('Profile picture updated successfully');
      
      // Log the update
      await AccessLogService.logProfileUpdate(
        user.id,
        user.email || 'unknown@email.com',
        ['avatar_url'],
        'success'
      );
      
      // Update local profile state immediately to prevent flickering
      if (profile) {
        const updatedProfile = { ...profile, avatar_url: publicUrl };
        // We'll let the refreshProfile handle the state update properly
      }
      
      // Force refresh the profile data to sync all components
      console.log('=== DESKTOP DEBUG: Starting profile refresh ===');
      await refreshProfile();
      console.log('=== DESKTOP DEBUG: Profile refresh completed ===');
      
      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { avatarUrl: publicUrl, timestamp: Date.now() } 
      }));
      
      // Reload the profile settings component to ensure all data is fresh
      console.log('=== RELOADING PROFILE SETTINGS COMPONENT ===');
      window.location.reload();
    } catch (error: any) {
      toast.error('Failed to upload profile picture', { description: error.message });
    } finally {
      setIsCropping(false);
      setIsAvatarLoading(false);
      setIsAvatarUpdating(false);
    }
  };

  const handleCancelCrop = () => {
    setShowImageCropper(false);
    setSelectedImage(null);
    setCrop({
      unit: '%',
      width: 100,
      height: 100,
      x: 0,
      y: 0,
    });
    
    // Reset the file input so the same file can be selected again
    const fileInput = document.getElementById('avatar-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user || !profile?.avatar_url) return;

    setIsAvatarUpdating(true);
    
    // Store the original URL for file deletion
    const originalAvatarUrl = profile.avatar_url;

    try {
      // Extract the file path from the avatar URL (use the original URL before clearing)
      const urlParts = originalAvatarUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `avatars/${fileName}`;

      console.log('Removing avatar file:', filePath);

      // Delete the file from storage
      const { error: deleteError } = await supabase.storage
        .from('dil-lms-public')
        .remove([filePath]);

      if (deleteError) {
        console.error('Error deleting file from storage:', deleteError);
        // Continue with database update even if storage delete fails
      }

      // Update the profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Clear any cached images
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      
      toast.success('Profile picture removed successfully');
      
      // Log the removal
      await AccessLogService.logProfileUpdate(
        user.id,
        user.email || 'unknown@email.com',
        ['avatar_url'],
        'success'
      );

      // Refresh the profile data to sync all components
      await refreshProfile();
      
      // Dispatch event for other components to update
      window.dispatchEvent(new CustomEvent('profileUpdated', { 
        detail: { avatarUrl: null, timestamp: Date.now() } 
      }));
    } catch (error: any) {
      toast.error('Failed to remove profile picture', { description: error.message });
    } finally {
      setIsAvatarUpdating(false);
    }
  };

  if (loading) {
    return <ContentLoader message="Loading profile settings..." />;
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
      {/* Password Reset Dialog */}
      <Dialog 
        key="reset-password-dialog"
        open={showResetDialog} 
                onOpenChange={(open) => {
          console.log('Dialog onOpenChange called with:', open);
          setShowResetDialog(open);
          if (!open) {
            console.log('Dialog closing - resetting form and states');
            // Reset the form when dialog is closed
            resetPasswordForm.reset();
            setShowResetNewPassword(false);
            setShowResetConfirmPassword(false);
            setShowResetMFACode(false);
            // Clear sessionStorage when dialog is closed manually
            sessionStorage.removeItem('profileSettings_shouldShowDialog');
            sessionStorage.removeItem('profileSettings_dialogShownThisSession');
            // Reset the refs to allow dialog to be opened again
            hasShownResetDialogRef.current = false;
            resetDialogProcessedRef.current = false;
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Set New Password
            </DialogTitle>
            <DialogDescription>
              Enter your new password below. Make sure it's secure and easy to remember.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={resetPasswordForm.handleSubmit(onResetPassword)} className="space-y-4">
            {/* MFA Code field - only show if MFA is enabled */}
            {isMFAEnabled && (
              <div className="space-y-2">
                <Label htmlFor="reset-mfaCode">MFA Code</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="reset-mfaCode"
                    type={showResetMFACode ? 'text' : 'password'}
                    {...resetPasswordForm.register('mfaCode')}
                    className="pl-10 pr-10"
                    placeholder="Enter your 6-digit MFA code"
                    maxLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                    onClick={() => setShowResetMFACode(!showResetMFACode)}
                  >
                    {showResetMFACode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  MFA is enabled for your account. Enter the 6-digit code from your authenticator app.
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="reset-newPassword">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-newPassword"
                  type={showResetNewPassword ? 'text' : 'password'}
                  {...resetPasswordForm.register('newPassword')}
                  className="pl-10 pr-10"
                  placeholder="Enter your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                >
                  {showResetNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {resetPasswordForm.formState.errors.newPassword && (
                <p className="text-sm text-destructive">{resetPasswordForm.formState.errors.newPassword.message}</p>
              )}
              <div className="text-xs text-muted-foreground">
                Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-confirmPassword"
                  type={showResetConfirmPassword ? 'text' : 'password'}
                  {...resetPasswordForm.register('confirmPassword')}
                  className="pl-10 pr-10"
                  placeholder="Confirm your new password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                  onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                >
                  {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
              {resetPasswordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">{resetPasswordForm.formState.errors.confirmPassword.message}</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowResetDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isResettingPassword}
                className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                {isResettingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Dialog */}
      <Dialog 
        open={showImageCropper} 
        onOpenChange={(open) => {
          if (!open) {
            handleCancelCrop();
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="w-5 h-5 text-primary" />
              Crop Profile Picture
            </DialogTitle>
            <DialogDescription>
              Drag to select the area you want to crop. The image will be cropped to a square format.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedImage && (
              <div className="flex justify-center">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  circularCrop
                  className="max-w-full max-h-96"
                >
                  <img
                    ref={imgRef}
                    alt="Crop preview"
                    src={selectedImage}
                    className="max-w-full max-h-96 object-contain"
                    onLoad={(e) => {
                      const { width, height } = e.currentTarget;
                      const size = Math.min(width, height);
                      setCrop({
                        unit: 'px',
                        width: size,
                        height: size,
                        x: (width - size) / 2,
                        y: (height - size) / 2,
                      });
                    }}
                  />
                </ReactCrop>
              </div>
            )}
            
            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelCrop}
                disabled={isCropping}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropComplete}
                disabled={!completedCrop || isCropping}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
              >
                {isCropping ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Picture
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                <Avatar className="h-24 w-24" key={`avatar-profile-${refreshKey}`}>
                  <AvatarImage 
                    src={profile?.avatar_url && profile.avatar_url !== 'null' ? `${profile.avatar_url}?v=${refreshKey}` : undefined} 
                    alt={displayName}
                    onLoad={() => {
                      console.log('=== PROFILE SETTINGS: Avatar image loaded successfully ===');
                      console.log('Loaded avatar URL:', profile?.avatar_url);
                      console.log('RefreshKey:', refreshKey);
                      setIsAvatarLoading(false);
                    }}
                    onError={(e) => {
                      console.error('=== PROFILE SETTINGS: Avatar image failed to load ===', e);
                      console.log('Failed avatar URL:', profile?.avatar_url);
                      console.log('RefreshKey:', refreshKey);
                      setIsAvatarLoading(false);
                    }}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-3xl font-bold">
                    {isAvatarLoading || isUploadingAvatar || isAvatarUpdating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      getInitials(displayName)
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-4">
                  <div>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                      disabled={isUploadingAvatar}
                    />
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        console.log('Upload button clicked');
                        const input = document.getElementById('avatar-upload') as HTMLInputElement;
                        if (input) {
                          console.log('File input found, triggering click');
                          input.click();
                        } else {
                          console.error('File input not found');
                        }
                      }}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="w-4 h-4" />
                      Upload New Picture
                    </Button>
                  </div>
                  {profile?.avatar_url && (
                    <Button 
                      variant="ghost" 
                      onClick={handleRemoveAvatar}
                      className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
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
                
                <div className="space-y-2">
                  <Label htmlFor="profile-phoneNumber">Phone Number</Label>
                  <div className="relative">
                    <Smartphone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="profile-phoneNumber"
                      {...profileForm.register('phoneNumber')}
                      className="bg-background border-border pl-10"
                      placeholder="+1 (555) 123-4567"
                    />
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
                {isCheckingMFA ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Checking security settings...
                  </div>
                ) : (
                  <form onSubmit={passwordForm.handleSubmit(onPasswordUpdate)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">
                        {isMFAEnabled ? 'MFA Code' : 'Current Password'}
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type={showPassword ? 'text' : 'password'}
                          placeholder={isMFAEnabled ? 'Enter your 6-digit MFA code' : 'Enter your current password'}
                          {...passwordForm.register('currentPassword')}
                          className="bg-background border-border pl-10 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                      {isMFAEnabled && (
                        <p className="text-xs text-muted-foreground">
                          MFA is enabled for your account. Enter the 6-digit code from your authenticator app to verify your identity.
                        </p>
                      )}
                      {!isMFAEnabled && (
                        <p className="text-xs text-muted-foreground">
                          Enter your current password to update your password.
                        </p>
                      )}
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
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-muted/50 hover:text-foreground"
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
                )}
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
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('light')}
                    className="flex items-center gap-2"
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    onClick={() => handleThemeChange('dark')}
                    className="flex items-center gap-2"
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Notification Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-foreground">Notifications</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">Real Time Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive real time notifications</p>
                    </div>
                    <Switch
                      checked={notifications.push}
                      onCheckedChange={(checked) => handleNotificationChange('push', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">System Notifications</p>
                      <p className="text-sm text-muted-foreground">Show system notifications within the app</p>
                    </div>
                    <Switch
                      checked={notifications.inApp}
                      onCheckedChange={(checked) => handleNotificationChange('inApp', checked)}
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
                  className="text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
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