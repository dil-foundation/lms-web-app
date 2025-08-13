-- Migration: Fix course deletion trigger conflict
-- This fixes the error "tuple to be deleted was already modified by an operation triggered by the current command"
-- The issue occurs when there's a BEFORE DELETE trigger on the courses table that tries to update the updated_at column
-- during deletion, causing a conflict.

-- First, let's check if there's an updated_at trigger on the courses table and remove it if it exists
DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;

-- Create a new trigger function that only updates updated_at for UPDATE operations, not DELETE
CREATE OR REPLACE FUNCTION update_courses_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update updated_at for UPDATE operations, not DELETE
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    
    -- For DELETE operations, just return the OLD record without modification
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    -- For INSERT operations, return NEW as is
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create a new trigger that only fires on UPDATE operations
CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON public.courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_courses_updated_at_column();

-- Add a comment to document this fix
COMMENT ON FUNCTION update_courses_updated_at_column() IS 'Updates updated_at timestamp only on UPDATE operations to prevent conflicts during DELETE operations';

-- Also, let's ensure the courses table has the updated_at column if it doesn't exist
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create an index on updated_at for better performance
CREATE INDEX IF NOT EXISTS idx_courses_updated_at ON public.courses(updated_at DESC);
