-- Migration: Update Access Log Actions to Human-Readable Names
-- Description: Changes technical action names to user-friendly descriptions
-- Date: 2024-01-15

-- Update existing access log entries to use human-readable action names
UPDATE access_logs 
SET action = CASE 
  WHEN action = 'user_login' THEN 'User Logged In'
  WHEN action = 'user_logout' THEN 'User Logged Out'
  WHEN action = 'admin_disable_mfa_for_user' THEN 'Admin Disabled MFA for User'
  WHEN action = 'admin_enable_mfa_for_user' THEN 'Admin Enabled MFA for User'
  WHEN action = 'admin_disable_mfa_error' THEN 'Admin MFA Disable Failed'
  WHEN action = 'admin_enable_mfa_error' THEN 'Admin MFA Enable Failed'
  WHEN action = 'mfa_verification' THEN 'MFA Code Verification'
  WHEN action = 'mfa_setup_completed' THEN 'MFA Setup Completed'
  WHEN action = 'mfa_setup_started' THEN 'MFA Setup Started'
  WHEN action = 'mfa_disabled' THEN 'MFA Disabled'
  WHEN action = 'mfa_enabled' THEN 'MFA Enabled'
  WHEN action = 'backup_code_used' THEN 'Backup Code Used'
  WHEN action = 'failed_login_attempt' THEN 'Failed Login Attempt'
  WHEN action = 'password_reset_requested' THEN 'Password Reset Requested'
  WHEN action = 'password_reset_completed' THEN 'Password Reset Completed'
  WHEN action = 'account_locked' THEN 'Account Locked'
  WHEN action = 'account_unlocked' THEN 'Account Unlocked'
  WHEN action = 'session_timeout' THEN 'Session Timed Out'
  WHEN action = 'admin_action' THEN 'Admin Action'
  WHEN action = 'disable_mfa_for_user' THEN 'MFA Disabled for User'
  WHEN action = 'admin_remove_mfa_for_user' THEN 'Admin Removed MFA for User'
  ELSE action -- Keep other actions as they are
END
WHERE action IN (
  'user_login', 'user_logout', 'admin_disable_mfa_for_user', 'admin_enable_mfa_for_user',
  'admin_disable_mfa_error', 'admin_enable_mfa_error', 'mfa_verification', 'mfa_setup_completed',
  'mfa_setup_started', 'mfa_disabled', 'mfa_enabled', 'backup_code_used', 'failed_login_attempt',
  'password_reset_requested', 'password_reset_completed', 'account_locked', 'account_unlocked',
  'session_timeout', 'admin_action', 'disable_mfa_for_user', 'admin_remove_mfa_for_user'
);

-- Update the AccessLogService to use human-readable action names
-- This will be done in the TypeScript code

-- Show the updated action names
SELECT DISTINCT action, COUNT(*) as count
FROM access_logs 
GROUP BY action
ORDER BY count DESC;

-- Add comment
COMMENT ON COLUMN access_logs.action IS 'Human-readable description of the action performed';
