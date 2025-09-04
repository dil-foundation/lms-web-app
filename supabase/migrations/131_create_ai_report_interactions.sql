-- Create table for tracking AI report interactions
CREATE TABLE IF NOT EXISTS ai_report_interactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    response TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    model_used TEXT DEFAULT 'gpt-4',
    execution_time_ms INTEGER DEFAULT 0,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS (Row Level Security) policy
ALTER TABLE ai_report_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own interactions
CREATE POLICY "Users can view own AI report interactions" 
ON ai_report_interactions FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: System can insert interactions (for the Edge Function)
CREATE POLICY "System can insert AI report interactions" 
ON ai_report_interactions FOR INSERT 
WITH CHECK (true);

-- Policy: Admins can view all interactions
CREATE POLICY "Admins can view all AI report interactions" 
ON ai_report_interactions FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
);

-- Add indexes for performance
CREATE INDEX idx_ai_report_interactions_user_id ON ai_report_interactions(user_id);
CREATE INDEX idx_ai_report_interactions_created_at ON ai_report_interactions(created_at);
CREATE INDEX idx_ai_report_interactions_success ON ai_report_interactions(success);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_report_interactions_updated_at 
    BEFORE UPDATE ON ai_report_interactions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE ai_report_interactions IS 'Tracks interactions with the AI reports chatbot for analytics and monitoring';
COMMENT ON COLUMN ai_report_interactions.query IS 'The user query sent to the AI';
COMMENT ON COLUMN ai_report_interactions.response IS 'The AI generated response';
COMMENT ON COLUMN ai_report_interactions.tokens_used IS 'Number of tokens consumed by the OpenAI API call';
COMMENT ON COLUMN ai_report_interactions.model_used IS 'The OpenAI model used for generation';
COMMENT ON COLUMN ai_report_interactions.execution_time_ms IS 'Time taken to process the request in milliseconds';
COMMENT ON COLUMN ai_report_interactions.success IS 'Whether the AI interaction was successful';
COMMENT ON COLUMN ai_report_interactions.error_message IS 'Error message if the interaction failed';
