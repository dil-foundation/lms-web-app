-- Migration: Comprehensive trigger fix for courses table
-- This script addresses all potential trigger conflicts on the courses table

-- 1. First, let's check and remove ALL triggers on the courses table
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- Drop all triggers on the courses table
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'courses' 
        AND trigger_schema = 'public'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON public.courses CASCADE';
    END LOOP;
END $$;

-- 2. Ensure the courses table has the updated_at column
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Create a simple, safe trigger function that only handles UPDATE operations
CREATE OR REPLACE FUNCTION update_courses_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update updated_at for UPDATE operations
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at = NOW();
        RETURN NEW;
    END IF;
    
    -- For all other operations, return the appropriate record without modification
    IF TG_OP = 'INSERT' THEN
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    
    -- This should never be reached, but just in case
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 4. Create a trigger that ONLY fires on UPDATE operations
CREATE TRIGGER update_courses_updated_at 
    BEFORE UPDATE ON public.courses 
    FOR EACH ROW 
    EXECUTE FUNCTION update_courses_updated_at_column();

-- 5. Add comments for documentation
COMMENT ON FUNCTION update_courses_updated_at_column() IS 'Updates updated_at timestamp only on UPDATE operations to prevent conflicts during DELETE operations';
COMMENT ON TRIGGER update_courses_updated_at ON public.courses IS 'Automatically updates updated_at column on course updates only';

-- 6. Create index on updated_at for better performance
CREATE INDEX IF NOT EXISTS idx_courses_updated_at ON public.courses(updated_at DESC);

-- 7. Verify the trigger setup
DO $$
DECLARE
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers 
    WHERE event_object_table = 'courses' 
    AND trigger_schema = 'public';
    
    RAISE NOTICE 'Number of triggers on courses table: %', trigger_count;
    
    IF trigger_count = 0 THEN
        RAISE NOTICE 'No triggers found on courses table - this is good for deletion operations';
    ELSIF trigger_count = 1 THEN
        RAISE NOTICE 'One trigger found on courses table - should be the UPDATE trigger only';
    ELSE
        RAISE WARNING 'Multiple triggers found on courses table - this might cause issues';
    END IF;
END $$;
