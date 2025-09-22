-- Fix foreign key relationships for zoom_meetings table
-- Run this in Supabase SQL Editor

-- First, let's make sure we have the correct foreign key constraints
-- Drop existing constraints if they exist
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_teacher_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_student_id_fkey;
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_course_id_fkey;

-- Add the correct foreign key constraints
-- Teacher ID should reference profiles table (not auth.users directly)
ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_teacher_id_fkey 
FOREIGN KEY (teacher_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Student ID should reference profiles table (not auth.users directly)
ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Course ID should reference courses table
ALTER TABLE zoom_meetings 
ADD CONSTRAINT zoom_meetings_course_id_fkey 
FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL;
