-- Minimal class support - just add the column
-- This is the safest approach to start with

-- Add class_id column to zoom_meetings table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'zoom_meetings' AND column_name = 'class_id') THEN
        ALTER TABLE public.zoom_meetings 
        ADD COLUMN class_id UUID REFERENCES classes(id) ON DELETE SET NULL;
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_zoom_meetings_class_id ON zoom_meetings(class_id);
    END IF;
END $$;

-- Add helpful comment
COMMENT ON COLUMN zoom_meetings.class_id IS 'Reference to classes table for class-based meetings (preferred over course_id)';
