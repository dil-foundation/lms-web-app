-- Complete script to add Zoom integration back to the integrations table
-- This script will insert the Zoom integration with proper OAuth configuration

-- First, ensure the integrations table exists and has the correct structure
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disabled',
    settings JSONB DEFAULT '{}',
    is_configured BOOLEAN DEFAULT false,
    last_sync TIMESTAMPTZ,
    version TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT integrations_status_check CHECK (status IN ('enabled', 'disabled', 'error')),
    CONSTRAINT integrations_type_check CHECK (type IN ('communication', 'payment', 'productivity'))
);

-- Insert the Zoom integration with OAuth configuration
INSERT INTO public.integrations (
    name, 
    type, 
    status, 
    settings, 
    is_configured,
    version,
    created_at,
    updated_at
) VALUES (
    'zoom',
    'communication',
    'enabled',  -- Set to enabled for immediate use
    jsonb_build_object(
        'account_id', 'UA0zcLpEQPaROFpWodJmtQ',
        'client_id', 'QOQDHNeuS2yRkPePoq4_BQ',
        'client_secret', '57ZqZBVlnf10ZTP981ifIsZcVcGUuxtN',
        'user_id', 'ashwin@infiniai.tech',
        'webhook_url', '',
        'api_version', 'v2',
        'auth_type', 'oauth'
    ),
    true,  -- Mark as configured
    'oauth_2024',
    timezone('utc'::text, now()),
    timezone('utc'::text, now())
) ON CONFLICT (name) DO UPDATE SET
    type = EXCLUDED.type,
    status = EXCLUDED.status,
    settings = EXCLUDED.settings,
    is_configured = EXCLUDED.is_configured,
    version = EXCLUDED.version,
    updated_at = timezone('utc'::text, now());

-- Verify the insertion
SELECT 
    id,
    name,
    type,
    status,
    is_configured,
    settings,
    version,
    created_at,
    updated_at
FROM public.integrations 
WHERE name = 'zoom';

-- Show what needs to be replaced
DO $$
BEGIN
    RAISE NOTICE '=== ZOOM INTEGRATION ADDED ===';
    RAISE NOTICE 'Status: The Zoom integration has been added to your database.';
    RAISE NOTICE '';
    RAISE NOTICE '📋 NEXT STEPS:';
    RAISE NOTICE '1. Get your Zoom OAuth credentials from https://marketplace.zoom.us/';
    RAISE NOTICE '2. Create a "Server-to-Server OAuth" app';
    RAISE NOTICE '3. Replace the placeholder values in the settings:';
    RAISE NOTICE '   - YOUR_ZOOM_ACCOUNT_ID_HERE → Your Account ID';
    RAISE NOTICE '   - YOUR_ZOOM_CLIENT_ID_HERE → Your Client ID';
    RAISE NOTICE '   - YOUR_ZOOM_CLIENT_SECRET_HERE → Your Client Secret';
    RAISE NOTICE '   - YOUR_ZOOM_USER_EMAIL_HERE → Your Zoom account email';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 To update with real credentials, run:';
    RAISE NOTICE 'UPDATE public.integrations SET settings = jsonb_build_object(';
    RAISE NOTICE '    ''account_id'', ''your_actual_account_id'',';
    RAISE NOTICE '    ''client_id'', ''your_actual_client_id'',';
    RAISE NOTICE '    ''client_secret'', ''your_actual_client_secret'',';
    RAISE NOTICE '    ''user_id'', ''your-email@domain.com'',';
    RAISE NOTICE '    ''webhook_url'', '''',';
    RAISE NOTICE '    ''api_version'', ''v2'',';
    RAISE NOTICE '    ''auth_type'', ''oauth''';
    RAISE NOTICE ') WHERE name = ''zoom'';';
END $$;

-- Ensure proper permissions are set
GRANT SELECT, UPDATE ON public.integrations TO authenticated;
GRANT SELECT ON public.integrations TO anon;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_integrations_name ON public.integrations(name);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON public.integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON public.integrations(type);

-- Enable RLS if not already enabled
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies
DROP POLICY IF EXISTS "integrations_select_policy" ON public.integrations;
CREATE POLICY "integrations_select_policy" ON public.integrations
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "integrations_service_policy" ON public.integrations;
CREATE POLICY "integrations_service_policy" ON public.integrations
    FOR ALL TO service_role
    USING (true);

-- Final verification
DO $$
DECLARE
    zoom_count INTEGER;
    zoom_record RECORD;
BEGIN
    SELECT COUNT(*) INTO zoom_count FROM public.integrations WHERE name = 'zoom';
    
    IF zoom_count > 0 THEN
        SELECT * INTO zoom_record FROM public.integrations WHERE name = 'zoom';
        RAISE NOTICE '✅ SUCCESS: Zoom integration added successfully!';
        RAISE NOTICE 'ID: %', zoom_record.id;
        RAISE NOTICE 'Status: %', zoom_record.status;
        RAISE NOTICE 'Configured: %', zoom_record.is_configured;
    ELSE
        RAISE WARNING '❌ ERROR: Zoom integration was not added properly';
    END IF;
END $$;
