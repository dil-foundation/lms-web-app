# Fix Zoom OAuth Integration Check

## Problem
The `getZoomIntegrationStatus()` method in `src/services/meetingService.ts` is checking for `api_key` but your OAuth credentials use `client_id` and `client_secret`.

## Solution
Replace lines 91-96 in `src/services/meetingService.ts`:

### OLD CODE (lines 91-96):
```javascript
const enabled = data?.status === 'enabled' && data?.is_configured && data?.settings?.api_key;

return {
  enabled,
  config: enabled ? data.settings as ZoomApiConfig : undefined
};
```

### NEW CODE (replace with):
```javascript
// Check for OAuth credentials (client_id = api_key, client_secret = api_secret)
const hasOAuthCredentials = data?.settings?.client_id && data?.settings?.client_secret;
const hasLegacyCredentials = data?.settings?.api_key;
const enabled = data?.status === 'enabled' && data?.is_configured && (hasOAuthCredentials || hasLegacyCredentials);

console.log('Zoom integration check:', {
  status: data?.status,
  is_configured: data?.is_configured,
  hasOAuthCredentials,
  hasLegacyCredentials,
  enabled
});

return {
  enabled,
  config: enabled ? {
    // Map OAuth credentials to expected format
    api_key: data.settings.client_id || data.settings.api_key,
    api_secret: data.settings.client_secret || data.settings.api_secret,
    webhook_url: data.settings.webhook_url || '',
    // Include OAuth-specific fields
    account_id: data.settings.account_id,
    user_id: data.settings.user_id
  } : undefined
};
```

## What This Fix Does:

1. **Checks for OAuth credentials**: `client_id` and `client_secret` (your current setup)
2. **Maintains backward compatibility**: Still works with legacy `api_key` setups
3. **Maps credentials correctly**: `client_id` → `api_key`, `client_secret` → `api_secret`
4. **Adds debug logging**: Shows exactly what's being checked
5. **Includes OAuth fields**: Passes through `account_id` and `user_id` for the Edge Function

## After Applying This Fix:

Your meeting creation will work because:
- ✅ It will find your `client_id` and `client_secret`
- ✅ It will map them to `api_key` and `api_secret` 
- ✅ It will return `enabled: true`
- ✅ The Edge Function will get the OAuth credentials it needs

## Test It:
After making this change, try creating a meeting. You should see the debug log in your browser console showing the integration check results.
