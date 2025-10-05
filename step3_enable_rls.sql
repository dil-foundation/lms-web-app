-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================
-- This script enables RLS on all relevant tables
-- RLS must be enabled before creating policies
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Step 3: Enabling RLS on all tables...';
END $$;

ALTER TABLE zoom_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'Step 3 completed: RLS enabled on all tables!';
END $$;

COMMIT;

