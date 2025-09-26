-- Create offline_content_progress table for offline learning sync
-- This table specifically tracks progress for offline learning content

CREATE TABLE IF NOT EXISTS public.offline_content_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    content_id UUID NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    score NUMERIC(5,2) NULL,
    time_spent INTEGER NULL DEFAULT 0,
    completed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sync_status TEXT NOT NULL DEFAULT 'pending',
    sync_attempts INTEGER NOT NULL DEFAULT 0,
    last_sync_attempt TIMESTAMPTZ NULL,
    version INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, content_id)
);

CREATE INDEX IF NOT EXISTS idx_offline_content_progress_user_id ON public.offline_content_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_content_progress_course_id ON public.offline_content_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_offline_content_progress_content_id ON public.offline_content_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_offline_content_progress_completed ON public.offline_content_progress(completed);
CREATE INDEX IF NOT EXISTS idx_offline_content_progress_user_course ON public.offline_content_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_offline_content_progress_sync_status ON public.offline_content_progress(sync_status);

ALTER TABLE public.offline_content_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own offline progress" ON public.offline_content_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own offline progress" ON public.offline_content_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offline progress" ON public.offline_content_progress
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and teachers can view all offline progress" ON public.offline_content_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'teacher')
        )
    );

CREATE OR REPLACE FUNCTION update_offline_content_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_offline_content_progress_updated_at
    BEFORE UPDATE ON public.offline_content_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_offline_content_progress_updated_at();

COMMENT ON TABLE public.offline_content_progress IS 'Tracks user progress for offline learning content items with sync capabilities';
