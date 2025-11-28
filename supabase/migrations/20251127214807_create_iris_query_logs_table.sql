-- Create table to store IRIS user questions and errors
CREATE TABLE IF NOT EXISTS public.iris_query_logs (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    platform TEXT CHECK (platform IN ('lms', 'ai_tutor')),
    error_message TEXT,
    error_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

    -- Indexes for efficient querying
    CONSTRAINT iris_query_logs_question_check CHECK (length(question) > 0)
);

-- Create indexes
CREATE INDEX idx_iris_query_logs_user_id ON public.iris_query_logs(user_id);
CREATE INDEX idx_iris_query_logs_created_at ON public.iris_query_logs(created_at DESC);
CREATE INDEX idx_iris_query_logs_platform ON public.iris_query_logs(platform);
CREATE INDEX idx_iris_query_logs_errors ON public.iris_query_logs(error_message) WHERE error_message IS NOT NULL;

-- Enable RLS
ALTER TABLE public.iris_query_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own query logs
CREATE POLICY "Users can view own IRIS query logs"
    ON public.iris_query_logs
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own query logs
CREATE POLICY "Users can insert own IRIS query logs"
    ON public.iris_query_logs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Admins and super users can view all query logs
CREATE POLICY "Admins can view all IRIS query logs"
    ON public.iris_query_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_user')
        )
    );

-- Policy: Admins and super users can delete query logs (for data management)
CREATE POLICY "Admins can delete IRIS query logs"
    ON public.iris_query_logs
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_user')
        )
    );

-- Add comment to table
COMMENT ON TABLE public.iris_query_logs IS 'Stores user questions asked to IRIS AI assistant for analytics and debugging';
COMMENT ON COLUMN public.iris_query_logs.question IS 'The question asked by the user';
COMMENT ON COLUMN public.iris_query_logs.platform IS 'Platform context: lms or ai_tutor';
COMMENT ON COLUMN public.iris_query_logs.error_message IS 'Error message if the query failed';
COMMENT ON COLUMN public.iris_query_logs.error_details IS 'Additional error details in JSON format';
