-- ============================================================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- ============================================================================
-- This script grants appropriate permissions to authenticated and service roles
-- Required for users to interact with the tables
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Step 5: Granting permissions...';
END $$;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zoom_meetings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_participants TO authenticated;
GRANT SELECT ON public.meeting_notifications TO authenticated;
GRANT SELECT ON public.integrations TO authenticated;

-- Grant full access to service role
GRANT ALL ON public.zoom_meetings TO service_role;
GRANT ALL ON public.meeting_participants TO service_role;
GRANT ALL ON public.meeting_notifications TO service_role;
GRANT ALL ON public.integrations TO service_role;

DO $$
BEGIN
    RAISE NOTICE 'Step 5 completed: All permissions granted successfully!';
END $$;

COMMIT;

