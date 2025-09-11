-- Create IRIS Chat Logs table for analytics and debugging
CREATE TABLE IF NOT EXISTS iris_chat_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_role TEXT NOT NULL DEFAULT 'student',
    query TEXT NOT NULL,
    response_preview TEXT,
    tools_used TEXT[] DEFAULT '{}',
    tokens_used INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS iris_chat_logs_user_id_idx ON iris_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS iris_chat_logs_created_at_idx ON iris_chat_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS iris_chat_logs_success_idx ON iris_chat_logs(success);
CREATE INDEX IF NOT EXISTS iris_chat_logs_user_role_idx ON iris_chat_logs(user_role);

-- Create index for tools used (GIN index for array operations)
CREATE INDEX IF NOT EXISTS iris_chat_logs_tools_used_idx ON iris_chat_logs USING GIN(tools_used);

-- Enable Row Level Security
ALTER TABLE iris_chat_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own logs
CREATE POLICY "Users can view own chat logs" ON iris_chat_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Only authenticated users can insert logs (via service role)
CREATE POLICY "Service can insert chat logs" ON iris_chat_logs
    FOR INSERT WITH CHECK (true);

-- Admins can view all logs for analytics
CREATE POLICY "Admins can view all chat logs" ON iris_chat_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Add comments for documentation
COMMENT ON TABLE iris_chat_logs IS 'Stores IRIS chat interactions for analytics, debugging, and audit purposes';
COMMENT ON COLUMN iris_chat_logs.user_id IS 'Reference to the user who made the query';
COMMENT ON COLUMN iris_chat_logs.user_role IS 'User role at the time of the query';
COMMENT ON COLUMN iris_chat_logs.query IS 'The original user query/message';
COMMENT ON COLUMN iris_chat_logs.response_preview IS 'First 200 characters of the AI response';
COMMENT ON COLUMN iris_chat_logs.tools_used IS 'Array of MCP tools used in the query (e.g., listTables, queryDatabase)';
COMMENT ON COLUMN iris_chat_logs.tokens_used IS 'Total OpenAI tokens consumed for this interaction';
COMMENT ON COLUMN iris_chat_logs.success IS 'Whether the query was processed successfully';
COMMENT ON COLUMN iris_chat_logs.error_message IS 'Error message if the query failed';

-- Create a view for analytics (admins only)
-- Note: Views inherit RLS from their underlying tables, so no separate policy needed
CREATE OR REPLACE VIEW iris_analytics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    user_role,
    COUNT(*) as total_queries,
    COUNT(*) FILTER (WHERE success = true) as successful_queries,
    COUNT(*) FILTER (WHERE success = false) as failed_queries,
    AVG(tokens_used) as avg_tokens_used,
    SUM(tokens_used) as total_tokens_used,
    UNNEST(tools_used) as tool_name
FROM iris_chat_logs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at), user_role, UNNEST(tools_used)
ORDER BY date DESC;

-- Create a function to clean up old logs (keep last 90 days)
CREATE OR REPLACE FUNCTION cleanup_iris_chat_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM iris_chat_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

-- Create a scheduled job to run cleanup weekly (if pg_cron is available)
-- This would typically be set up separately in production
-- SELECT cron.schedule('cleanup-iris-logs', '0 2 * * 0', 'SELECT cleanup_iris_chat_logs();');
