-- Create table to track student time spent on course content items (videos and quizzes)
-- This tracks individual sessions and aggregates total time spent

CREATE TABLE IF NOT EXISTS public.content_item_time_tracking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id uuid NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    lesson_content_id uuid NOT NULL REFERENCES public.course_lesson_content(id) ON DELETE CASCADE,
    content_type text NOT NULL CHECK (content_type IN ('video', 'quiz')),

    -- Session tracking
    session_id uuid NOT NULL DEFAULT gen_random_uuid(),
    session_start_at timestamptz NOT NULL DEFAULT now(),
    session_end_at timestamptz,

    -- Duration tracking (in seconds)
    session_duration integer, -- Calculated: session_end_at - session_start_at
    active_duration integer, -- Actual active time (excluding pauses for video, full time for quiz)

    -- Video-specific tracking
    video_start_position numeric(10, 2), -- Where video started playing (seconds)
    video_end_position numeric(10, 2), -- Where video ended/paused (seconds)
    video_total_length numeric(10, 2), -- Total video duration (seconds)
    pause_count integer DEFAULT 0, -- Number of times paused
    seek_count integer DEFAULT 0, -- Number of times seeked/jumped

    -- Quiz-specific tracking
    quiz_started_at timestamptz,
    quiz_submitted_at timestamptz,
    quiz_attempt_number integer, -- Links to quiz_attempts

    -- Engagement metrics
    interaction_events jsonb DEFAULT '[]'::jsonb, -- Detailed event log (play, pause, seek, etc.)

    -- Metadata
    completed boolean DEFAULT false, -- Whether this session completed the content
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_time_tracking_user_id ON public.content_item_time_tracking(user_id);
CREATE INDEX idx_time_tracking_content_id ON public.content_item_time_tracking(lesson_content_id);
CREATE INDEX idx_time_tracking_course_id ON public.content_item_time_tracking(course_id);
CREATE INDEX idx_time_tracking_lesson_id ON public.content_item_time_tracking(lesson_id);
CREATE INDEX idx_time_tracking_session_id ON public.content_item_time_tracking(session_id);
CREATE INDEX idx_time_tracking_content_type ON public.content_item_time_tracking(content_type);
CREATE INDEX idx_time_tracking_created_at ON public.content_item_time_tracking(created_at DESC);
CREATE INDEX idx_time_tracking_user_content ON public.content_item_time_tracking(user_id, lesson_content_id);

-- Add trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_time_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_time_tracking_updated_at
    BEFORE UPDATE ON public.content_item_time_tracking
    FOR EACH ROW
    EXECUTE FUNCTION public.update_time_tracking_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.content_item_time_tracking ENABLE ROW LEVEL SECURITY;

-- Students can view their own time tracking data
CREATE POLICY "Students can view own time tracking data"
    ON public.content_item_time_tracking
    FOR SELECT
    USING (auth.uid() = user_id);

-- Students can insert their own time tracking data
CREATE POLICY "Students can insert own time tracking data"
    ON public.content_item_time_tracking
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Students can update their own time tracking data
CREATE POLICY "Students can update own time tracking data"
    ON public.content_item_time_tracking
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Teachers can view time tracking for their course students
CREATE POLICY "Teachers can view student time tracking for their courses"
    ON public.content_item_time_tracking
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.courses c
            WHERE c.id = content_item_time_tracking.course_id
            AND c.creator_id = auth.uid()
        )
    );

-- Admins and super users can view all time tracking data
CREATE POLICY "Admins can view all time tracking data"
    ON public.content_item_time_tracking
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_user')
        )
    );

-- Admins can delete time tracking data (for data management)
CREATE POLICY "Admins can delete time tracking data"
    ON public.content_item_time_tracking
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('admin', 'super_user')
        )
    );

-- Create function to get aggregated time statistics for a student and content item
CREATE OR REPLACE FUNCTION public.get_content_time_statistics(
    p_user_id uuid,
    p_lesson_content_id uuid
)
RETURNS TABLE(
    total_sessions bigint,
    total_session_duration integer,
    total_active_duration integer,
    average_session_duration numeric,
    first_accessed_at timestamptz,
    last_accessed_at timestamptz,
    total_pause_count bigint,
    total_seek_count bigint,
    completion_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::bigint AS total_sessions,
        COALESCE(SUM(session_duration), 0)::integer AS total_session_duration,
        COALESCE(SUM(active_duration), 0)::integer AS total_active_duration,
        COALESCE(AVG(session_duration), 0)::numeric AS average_session_duration,
        MIN(session_start_at) AS first_accessed_at,
        MAX(COALESCE(session_end_at, session_start_at)) AS last_accessed_at,
        COALESCE(SUM(pause_count), 0)::bigint AS total_pause_count,
        COALESCE(SUM(seek_count), 0)::bigint AS total_seek_count,
        COUNT(*) FILTER (WHERE completed = true)::bigint AS completion_count
    FROM public.content_item_time_tracking
    WHERE user_id = p_user_id
    AND lesson_content_id = p_lesson_content_id;
END;
$$;

-- Create function to get time statistics for entire course
CREATE OR REPLACE FUNCTION public.get_course_time_statistics(
    p_user_id uuid,
    p_course_id uuid
)
RETURNS TABLE(
    content_type text,
    total_sessions bigint,
    total_active_duration integer,
    average_session_duration numeric,
    content_items_accessed bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        citt.content_type,
        COUNT(*)::bigint AS total_sessions,
        COALESCE(SUM(active_duration), 0)::integer AS total_active_duration,
        COALESCE(AVG(session_duration), 0)::numeric AS average_session_duration,
        COUNT(DISTINCT lesson_content_id)::bigint AS content_items_accessed
    FROM public.content_item_time_tracking citt
    WHERE citt.user_id = p_user_id
    AND citt.course_id = p_course_id
    GROUP BY citt.content_type;
END;
$$;

-- Create function to get detailed session history
CREATE OR REPLACE FUNCTION public.get_content_session_history(
    p_user_id uuid,
    p_lesson_content_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE(
    session_id uuid,
    session_start_at timestamptz,
    session_end_at timestamptz,
    session_duration integer,
    active_duration integer,
    video_start_position numeric,
    video_end_position numeric,
    pause_count integer,
    seek_count integer,
    completed boolean,
    interaction_events jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        citt.session_id,
        citt.session_start_at,
        citt.session_end_at,
        citt.session_duration,
        citt.active_duration,
        citt.video_start_position,
        citt.video_end_position,
        citt.pause_count,
        citt.seek_count,
        citt.completed,
        citt.interaction_events
    FROM public.content_item_time_tracking citt
    WHERE citt.user_id = p_user_id
    AND citt.lesson_content_id = p_lesson_content_id
    ORDER BY citt.session_start_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_content_time_statistics(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_time_statistics(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_content_session_history(uuid, uuid, integer) TO authenticated;

-- Add comment to table
COMMENT ON TABLE public.content_item_time_tracking IS 'Tracks detailed time spent by students on video and quiz content items, including session tracking, engagement metrics, and interaction events';
