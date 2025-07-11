import { useEffect } from 'react';
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ContentLoader } from "@/components/ContentLoader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

const profileFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

const passwordFormSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

const ProfileSettings = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfileForm,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

  useEffect(() => {
    if (profile) {
      resetProfileForm({
        firstName: profile.first_name || "",
        lastName: profile.last_name || "",
      });
    }
  }, [profile, resetProfileForm]);

  const onProfileUpdate: SubmitHandler<ProfileFormValues> = async (data) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update profile.", { description: error.message });
    }
  };

  const onPasswordUpdate: SubmitHandler<PasswordFormValues> = async (data) => {
    if (!user) return;
    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });
      if (passwordError) throw passwordError;

      // After a successful password update, check if we need to update the metadata
      if (user.user_metadata?.password_setup_required) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, password_setup_required: false }
        });
        if (metaError) {
          // Log this error, but don't block the user since the password was updated.
          console.error("Failed to update password_setup_required flag:", metaError);
        }
      }

      toast.success("Password updated successfully! You will be logged out for security.");
      resetPasswordForm();
      
      // Log out the user to ensure the new session uses the password.
      setTimeout(() => supabase.auth.signOut(), 2000);

    } catch (error: any) {
      toast.error("Failed to update password.", { description: error.message });
    }
  };

  if (profileLoading) {
    return <ContentLoader message="Loading profile settings..." />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile Settings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details here.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit(onProfileUpdate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...registerProfile("firstName")} />
                {profileErrors.firstName && (
                  <p className="text-sm text-red-500">{profileErrors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...registerProfile("lastName")} />
                {profileErrors.lastName && (
                  <p className="text-sm text-red-500">{profileErrors.lastName.message}</p>
                )}
              </div>
              <Button type="submit" disabled={isSubmittingProfile}>
                {isSubmittingProfile ? "Updating..." : "Update Profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password here. This will log you out from other devices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {user?.user_metadata?.password_setup_required && (
              <Alert variant="destructive" className="mb-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Action Required: Set Your Password</AlertTitle>
                <AlertDescription>
                  Your account was created by an administrator. To secure your account, please set a password now.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handlePasswordSubmit(onPasswordUpdate)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" {...registerPassword("newPassword")} />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-500">{passwordErrors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" {...registerPassword("confirmPassword")} />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-500">{passwordErrors.confirmPassword.message}</p>
                )}
              </div>
              <Button type="submit" disabled={isSubmittingPassword}>
                {isSubmittingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSettings; 