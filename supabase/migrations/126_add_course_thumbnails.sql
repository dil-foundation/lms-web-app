-- Create course_thumbnails table
CREATE TABLE IF NOT EXISTS public.course_thumbnails (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    prompt TEXT NOT NULL,
    style TEXT NOT NULL DEFAULT 'academic',
    image_url TEXT NOT NULL,
    public_url TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_thumbnails_course_id ON public.course_thumbnails(course_id);
CREATE INDEX IF NOT EXISTS idx_course_thumbnails_generated_at ON public.course_thumbnails(generated_at DESC);

-- Enable RLS
ALTER TABLE public.course_thumbnails ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view thumbnails for courses they have access to
CREATE POLICY "Users can view course thumbnails for accessible courses" ON public.course_thumbnails
    FOR SELECT USING (
        course_id IN (
            SELECT c.id FROM public.courses c
            LEFT JOIN public.course_members cm ON c.id = cm.course_id
            WHERE cm.user_id = auth.uid() OR c.author_id = auth.uid()
        )
    );

-- Course authors can insert thumbnails for their courses
CREATE POLICY "Course authors can insert thumbnails" ON public.course_thumbnails
    FOR INSERT WITH CHECK (
        course_id IN (
            SELECT id FROM public.courses WHERE author_id = auth.uid()
        )
    );

-- Course authors can update thumbnails for their courses
CREATE POLICY "Course authors can update thumbnails" ON public.course_thumbnails
    FOR UPDATE USING (
        course_id IN (
            SELECT id FROM public.courses WHERE author_id = auth.uid()
        )
    );

-- Course authors can delete thumbnails for their courses
CREATE POLICY "Course authors can delete thumbnails" ON public.course_thumbnails
    FOR DELETE USING (
        course_id IN (
            SELECT id FROM public.courses WHERE author_id = auth.uid()
        )
    );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_course_thumbnails_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_course_thumbnails_updated_at
    BEFORE UPDATE ON public.course_thumbnails
    FOR EACH ROW
    EXECUTE FUNCTION update_course_thumbnails_updated_at();
