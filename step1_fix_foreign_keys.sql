-- ============================================================================
-- STEP 1: FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================
-- This script fixes foreign key relationships for the zoom_meetings table
-- Run this before any other steps
-- ============================================================================

BEGIN;

DO $$
BEGIN
    RAISE NOTICE 'Step 1: Fixing foreign key constraints...';
END $$;

-- Drop existing foreign key constraints if they exist
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_teacher_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_student_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_course_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_class_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_participant_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_participant_id_fkey 
FOREIGN KEY (participant_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;

DO $$
BEGIN
    RAISE NOTICE 'Step 1 completed: Foreign key constraints fixed successfully!';
END $$;

COMMIT;

