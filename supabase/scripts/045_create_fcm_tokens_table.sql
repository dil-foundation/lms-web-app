-- Create fcm_tokens table
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, token)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_created_at ON fcm_tokens(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own tokens
CREATE POLICY "Users can view their own FCM tokens" ON fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Users can only insert their own tokens
CREATE POLICY "Users can insert their own FCM tokens" ON fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can only update their own tokens
CREATE POLICY "Users can update their own FCM tokens" ON fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can only delete their own tokens
CREATE POLICY "Users can delete their own FCM tokens" ON fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_fcm_tokens_updated_at
    BEFORE UPDATE ON fcm_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE fcm_tokens IS 'Stores FCM registration tokens for push notifications';
COMMENT ON COLUMN fcm_tokens.user_id IS 'References the user this token belongs to';
COMMENT ON COLUMN fcm_tokens.token IS 'FCM registration token';
