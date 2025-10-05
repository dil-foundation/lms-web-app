-- ============================================================================
-- STEP 7: VERIFICATION
-- ============================================================================
-- This script verifies that all previous steps completed successfully
-- Run this after all other steps to confirm the setup
-- ============================================================================

DO $$
DECLARE
    zoom_integration_count INTEGER;
    zoom_policies_count INTEGER;
    participants_policies_count INTEGER;
    notifications_policies_count INTEGER;
    integrations_policies_count INTEGER;
    foreign_keys_count INTEGER;
BEGIN
    RAISE NOTICE 'Step 7: Verifying setup...';
    RAISE NOTICE '';
    
    -- Check zoom integration exists
    SELECT COUNT(*) INTO zoom_integration_count 
    FROM public.integrations 
    WHERE name = 'zoom';
    
    -- Count policies
    SELECT COUNT(*) INTO zoom_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'zoom_meetings';
    
    SELECT COUNT(*) INTO participants_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'meeting_participants';
    
    SELECT COUNT(*) INTO notifications_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'meeting_notifications';
    
    SELECT COUNT(*) INTO integrations_policies_count
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'integrations';
    
    -- Count foreign keys on zoom_meetings
    SELECT COUNT(*) INTO foreign_keys_count
    FROM information_schema.table_constraints
    WHERE table_name = 'zoom_meetings' 
    AND constraint_type = 'FOREIGN KEY';
    
    -- Display results
    RAISE NOTICE '========================================';
    RAISE NOTICE 'VERIFICATION RESULTS:';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Foreign Keys:';
    RAISE NOTICE '  zoom_meetings foreign keys: % (expected: 5)', foreign_keys_count;
    RAISE NOTICE '';
    RAISE NOTICE 'RLS Policies:';
    RAISE NOTICE '  zoom_meetings policies: % (expected: 4)', zoom_policies_count;
    RAISE NOTICE '  meeting_participants policies: % (expected: 5)', participants_policies_count;
    RAISE NOTICE '  meeting_notifications policies: % (expected: 2)', notifications_policies_count;
    RAISE NOTICE '  integrations policies: % (expected: 2)', integrations_policies_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Integration:';
    RAISE NOTICE '  Zoom integration exists: %', (zoom_integration_count > 0);
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    
    IF zoom_integration_count > 0 AND 
       zoom_policies_count = 4 AND 
       participants_policies_count = 5 AND
       notifications_policies_count = 2 AND
       integrations_policies_count = 2 AND
       foreign_keys_count = 5 THEN
        RAISE NOTICE 'STATUS: ✓ SUCCESS';
        RAISE NOTICE 'All configurations applied correctly!';
    ELSE
        RAISE WARNING 'STATUS: ⚠ WARNING';
        RAISE WARNING 'Some configurations may be incomplete.';
        RAISE WARNING 'Please review the counts above.';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Configure production Zoom OAuth credentials';
    RAISE NOTICE '2. Set integration status to "enabled"';
    RAISE NOTICE '3. Test meeting creation with a teacher account';
    RAISE NOTICE '4. Test meeting viewing with student accounts';
    RAISE NOTICE '5. Verify class enrollment-based access';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
END $$;

