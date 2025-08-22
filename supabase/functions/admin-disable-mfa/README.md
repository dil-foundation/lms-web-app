# Admin Disable MFA Edge Function

This edge function allows administrators to properly disable MFA for users by:

1. Removing all TOTP MFA factors from the user's account
2. Updating the user's metadata to indicate MFA is disabled
3. Logging the action for audit purposes

## Usage

The function is called from the admin dashboard when an administrator clicks the "Disable MFA" button for a user.

## Security

- Only users with 'admin' role can call this function
- Requires valid authentication token
- Logs all actions for audit trail

## Deployment

Deploy this function using:

```bash
supabase functions deploy admin-disable-mfa
```
