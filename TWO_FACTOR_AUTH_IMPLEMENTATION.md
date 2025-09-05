# Two-Factor Authentication (2FA) Implementation

This document describes the implementation of two-factor authentication in the DIL-LMS platform.

## Overview

The 2FA system allows administrators to require all users to set up two-factor authentication for enhanced security. When enabled, users are prompted to complete 2FA setup before they can access the platform.

## Features

### For Administrators
- **Enable/Disable 2FA**: Toggle 2FA requirement for all users
- **User Management**: View users who haven't completed 2FA setup
- **Send Reminders**: Send notification reminders to users
- **Statistics**: View 2FA adoption rates and statistics
- **Individual Management**: Disable 2FA for specific users if needed

### For Users
- **Setup Process**: Guided 2FA setup with QR code scanning
- **Backup Codes**: Generate and save backup codes for account recovery
- **Authenticator Apps**: Support for popular apps (Google Authenticator, Authy, etc.)
- **Blocking Interface**: Cannot access platform until 2FA is completed

## Implementation Details

### Database Schema

The following fields are added to the `profiles` table:

```sql
ALTER TABLE profiles 
ADD COLUMN two_factor_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN two_factor_secret TEXT,
ADD COLUMN two_factor_backup_codes TEXT[],
ADD COLUMN two_factor_setup_completed_at TIMESTAMP WITH TIME ZONE;
```

### Key Components

#### 1. TwoFactorRequirement Component
- **Location**: `src/components/auth/TwoFactorRequirement.tsx`
- **Purpose**: Wrapper component that checks 2FA status and shows setup dialog
- **Integration**: Wraps the main app content in `App.tsx`

#### 2. TwoFactorSetup Component
- **Location**: `src/components/auth/TwoFactorSetup.tsx`
- **Purpose**: Handles the 2FA setup process
- **Features**:
  - QR code generation for authenticator apps
  - Backup codes generation and download
  - Code verification
  - Step-by-step guided setup

#### 3. useTwoFactorAuth Hook
- **Location**: `src/hooks/useTwoFactorAuth.ts`
- **Purpose**: Manages 2FA state and provides utility functions
- **Features**:
  - Check 2FA requirement status
  - Mark 2FA as completed
  - Get users without 2FA
  - Send reminders

#### 4. TwoFactorService
- **Location**: `src/services/twoFactorService.ts`
- **Purpose**: Handles 2FA operations
- **Features**:
  - Generate setup data (secret, QR code, backup codes)
  - Verify TOTP codes
  - Enable/disable 2FA for users
  - Check 2FA status

#### 5. AdminSecurity Component Updates
- **Location**: `src/components/admin/AdminSecurity.tsx`
- **Purpose**: Admin interface for 2FA management
- **Features**:
  - 2FA statistics display
  - User management table
  - Send reminder functionality
  - Individual user 2FA control

### Database Functions

#### 1. get_users_without_2fa()
Returns users who haven't completed 2FA setup.

#### 2. update_user_2fa_status()
Updates a user's 2FA status and related fields.

#### 3. get_2fa_statistics()
Returns 2FA adoption statistics.

### Security Considerations

1. **Row Level Security (RLS)**: All 2FA operations are protected by RLS policies
2. **Secret Storage**: 2FA secrets are stored securely in the database
3. **Backup Codes**: Generated backup codes are stored encrypted
4. **Session Management**: 2FA status is checked on every session
5. **Admin Controls**: Only administrators can manage 2FA settings

## Setup Process

### For Administrators

1. **Enable 2FA**:
   - Navigate to Admin Dashboard → Security
   - Toggle "Two-Factor Authentication" to ON
   - Save changes

2. **Monitor Users**:
   - View the "Two-Factor Authentication Users" section
   - See which users haven't completed setup
   - Send reminders if needed

3. **Manage Individual Users**:
   - Disable 2FA for specific users if necessary
   - View setup completion statistics

### For Users

1. **First Login After 2FA Enable**:
   - User sees blocking overlay with setup requirement
   - Cannot proceed without completing 2FA

2. **Setup Process**:
   - Scan QR code with authenticator app
   - Save backup codes securely
   - Verify setup with 6-digit code
   - Setup complete, access granted

3. **Subsequent Logins**:
   - Normal login process
   - 2FA status is maintained

## Configuration

### Environment Variables

No additional environment variables are required for the basic implementation.

### Backend Integration

The current implementation uses mock services that can be replaced with real backend endpoints:

- `/api/auth/2fa/setup` - Generate 2FA setup data
- `/api/auth/2fa/verify` - Verify 2FA codes
- `/api/auth/2fa/disable` - Disable 2FA for user

### TOTP Library Integration

For production use, replace the mock TOTP verification with a real library:

```typescript
// Install: npm install otplib
import { authenticator } from 'otplib';

// Replace mock verification with:
return authenticator.verify({ token: code, secret: secret });
```

## User Experience

### Setup Flow
1. **Blocking Overlay**: Users see a clear message about 2FA requirement
2. **Guided Setup**: Step-by-step instructions with visual aids
3. **QR Code**: Easy scanning with popular authenticator apps
4. **Backup Codes**: Clear instructions for saving recovery codes
5. **Verification**: Simple 6-digit code entry
6. **Success**: Immediate access after successful setup

### Admin Experience
1. **Simple Toggle**: Easy enable/disable of 2FA requirement
2. **User Overview**: Clear view of who needs to complete setup
3. **Reminder System**: Built-in notification system
4. **Statistics**: Real-time adoption metrics
5. **Individual Control**: Manage specific users as needed

## Testing

### Test Scenarios

1. **Admin Enables 2FA**:
   - Toggle 2FA setting
   - Verify users are prompted on next login

2. **User Setup Process**:
   - Complete 2FA setup
   - Verify access is granted
   - Test backup codes

3. **Admin Management**:
   - View user statistics
   - Send reminders
   - Disable 2FA for specific users

4. **Error Handling**:
   - Invalid codes
   - Network errors
   - Setup cancellation

## Future Enhancements

1. **Real TOTP Library**: Replace mock verification with proper TOTP
2. **Email Notifications**: Send actual email reminders
3. **SMS 2FA**: Add SMS-based 2FA option
4. **Hardware Keys**: Support for FIDO2/U2F keys
5. **Advanced Policies**: Role-based 2FA requirements
6. **Audit Logging**: Track 2FA setup and usage events

## Troubleshooting

### Common Issues

1. **QR Code Not Working**:
   - Ensure authenticator app supports TOTP
   - Check device camera permissions
   - Try manual secret entry

2. **Backup Codes Not Working**:
   - Verify codes are entered correctly
   - Check for extra spaces
   - Ensure codes are saved properly

3. **Setup Not Completing**:
   - Check network connection
   - Verify code is current (30-second window)
   - Try refreshing the page

### Support

For technical support or questions about the 2FA implementation, please refer to the development team or create an issue in the project repository.
