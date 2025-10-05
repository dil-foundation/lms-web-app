-- ============================================================================
-- STEP 6: CONFIGURE ZOOM INTEGRATION
-- ============================================================================
-- This script creates/updates the zoom integration record
-- Update the settings with your actual production credentials before running
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Step 6: Configuring zoom integration...';
END $$;

-- Insert or update zoom integration record
-- Note: Update the settings with your actual production credentials
INSERT INTO public.integrations (name, type, status, settings, is_configured) 
VALUES (
    'zoom', 
    'communication', 
    'disabled',  -- Set to 'enabled' once you've configured production credentials
    '{"api_key": "", "api_secret": "", "user_id": ""}', 
    false  -- Set to true once configured
)
ON CONFLICT (name) 
DO UPDATE SET 
    updated_at = timezone('utc'::text, now());

DO $$
BEGIN
    RAISE NOTICE 'Step 6 completed: Zoom integration record created/updated!';
    RAISE NOTICE 'IMPORTANT: Update the integration settings with production credentials!';
END $$;

COMMIT;

-- ============================================================================
-- MANUAL CONFIGURATION REQUIRED
-- ============================================================================
-- After running this script, update the zoom integration with your credentials:
--
-- UPDATE public.integrations 
-- SET 
--     settings = jsonb_set(
--         jsonb_set(
--             jsonb_set(
--                 settings,
--                 '{api_key}',
--                 '"your-production-api-key"'
--             ),
--             '{api_secret}',
--             '"your-production-api-secret"'
--         ),
--         '{user_id}',
--         '"your-production-user-id"'
--     ),
--     status = 'enabled',
--     is_configured = true,
--     updated_at = timezone('utc'::text, now())
-- WHERE name = 'zoom';
-- ============================================================================

