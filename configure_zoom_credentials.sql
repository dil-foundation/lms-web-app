-- Configure real Zoom credentials
-- Replace the placeholder values with your actual Zoom credentials

-- Update the Zoom integration with your real OAuth credentials
UPDATE public.integrations 
SET 
    status = 'enabled',
    is_configured = true,
    settings = jsonb_build_object(
        'account_id', 'YOUR_ZOOM_ACCOUNT_ID_HERE',
        'client_id', 'YOUR_ZOOM_CLIENT_ID_HERE', 
        'client_secret', 'YOUR_ZOOM_CLIENT_SECRET_HERE',
        'user_id', 'YOUR_ZOOM_USER_EMAIL_HERE',
        'webhook_url', 'YOUR_WEBHOOK_URL_HERE' -- Optional
    ),
    updated_at = timezone('utc'::text, now())
WHERE name = 'zoom';

-- Verify the configuration
SELECT 
    name,
    status,
    is_configured,
    settings,
    updated_at
FROM public.integrations 
WHERE name = 'zoom';

-- Instructions for getting Zoom credentials:
/*
To get your Zoom OAuth credentials:

1. Go to https://marketplace.zoom.us/
2. Sign in with your Zoom account
3. Click "Develop" → "Build App"
4. Choose "Server-to-Server OAuth" app type
5. Fill in the app information and get approval
6. Copy the following from your app credentials:
   - Account ID
   - Client ID
   - Client Secret

Replace the placeholder values above with your actual credentials:
- YOUR_ZOOM_ACCOUNT_ID_HERE → Your Account ID from the app
- YOUR_ZOOM_CLIENT_ID_HERE → Your Client ID from the app
- YOUR_ZOOM_CLIENT_SECRET_HERE → Your Client Secret from the app
- YOUR_ZOOM_USER_EMAIL_HERE → Your Zoom account email
- YOUR_WEBHOOK_URL_HERE → Optional webhook URL for meeting events

Example:
UPDATE public.integrations 
SET 
    settings = jsonb_build_object(
        'account_id', 'abc123def456',
        'client_id', 'xyz789uvw456', 
        'client_secret', 'secret123456',
        'user_id', 'your-email@domain.com',
        'webhook_url', 'https://yourdomain.com/webhook/zoom'
    )
WHERE name = 'zoom';
*/
