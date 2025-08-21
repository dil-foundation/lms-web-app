-- Create AI Tutor Settings table
CREATE TABLE IF NOT EXISTS ai_tutor_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    
    -- AI Behavior Settings
    personality_type TEXT DEFAULT 'encouraging' CHECK (personality_type IN ('encouraging', 'professional', 'friendly', 'academic')),
    response_style TEXT DEFAULT 'conversational' CHECK (response_style IN ('conversational', 'structured', 'interactive', 'concise')),
    adaptive_difficulty BOOLEAN DEFAULT true,
    context_awareness BOOLEAN DEFAULT true,
    
    -- Learning Parameters
    max_response_length INTEGER DEFAULT 150 CHECK (max_response_length >= 50 AND max_response_length <= 300),
    response_speed TEXT DEFAULT 'normal' CHECK (response_speed IN ('fast', 'normal', 'slow')),
    repetition_threshold INTEGER DEFAULT 3 CHECK (repetition_threshold >= 1 AND repetition_threshold <= 10),
    error_correction_style TEXT DEFAULT 'gentle' CHECK (error_correction_style IN ('gentle', 'direct', 'detailed', 'minimal')),
    
    -- Voice & Audio
    voice_enabled BOOLEAN DEFAULT true,
    voice_gender TEXT DEFAULT 'neutral' CHECK (voice_gender IN ('neutral', 'female', 'male')),
    speech_rate DECIMAL(3,1) DEFAULT 1.0 CHECK (speech_rate >= 0.5 AND speech_rate <= 2.0),
    audio_feedback BOOLEAN DEFAULT true,
    
    -- Content Customization
    cultural_sensitivity BOOLEAN DEFAULT true,
    age_appropriate BOOLEAN DEFAULT true,
    professional_context BOOLEAN DEFAULT false,
    custom_prompts TEXT DEFAULT '',
    
    -- Performance & Analytics
    learning_analytics BOOLEAN DEFAULT true,
    progress_tracking BOOLEAN DEFAULT true,
    performance_reports BOOLEAN DEFAULT true,
    data_retention INTEGER DEFAULT 90 CHECK (data_retention >= 30 AND data_retention <= 365),
    
    -- Advanced Features
    multilingual_support BOOLEAN DEFAULT true,
    emotional_intelligence BOOLEAN DEFAULT true,
    gamification_elements BOOLEAN DEFAULT true,
    real_time_adaptation BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_tutor_settings_user_id ON ai_tutor_settings(user_id);

-- Enable RLS
ALTER TABLE ai_tutor_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own AI tutor settings" ON ai_tutor_settings
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage AI tutor settings" ON ai_tutor_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to automatically set user_id and updated_by
CREATE OR REPLACE FUNCTION set_ai_tutor_settings_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id if not provided
    IF NEW.user_id IS NULL THEN
        NEW.user_id = auth.uid();
    END IF;
    
    -- Set updated_by and updated_at
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    
    -- Set created_by on insert
    IF TG_OP = 'INSERT' THEN
        NEW.created_by = auth.uid();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_set_ai_tutor_settings_metadata
    BEFORE INSERT OR UPDATE ON ai_tutor_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_ai_tutor_settings_metadata();

-- Create function to get AI tutor settings with defaults
CREATE OR REPLACE FUNCTION get_ai_tutor_settings()
RETURNS TABLE (
    personality_type TEXT,
    response_style TEXT,
    adaptive_difficulty BOOLEAN,
    context_awareness BOOLEAN,
    max_response_length INTEGER,
    response_speed TEXT,
    repetition_threshold INTEGER,
    error_correction_style TEXT,
    voice_enabled BOOLEAN,
    voice_gender TEXT,
    speech_rate DECIMAL,
    audio_feedback BOOLEAN,
    cultural_sensitivity BOOLEAN,
    age_appropriate BOOLEAN,
    professional_context BOOLEAN,
    custom_prompts TEXT,
    learning_analytics BOOLEAN,
    progress_tracking BOOLEAN,
    performance_reports BOOLEAN,
    data_retention INTEGER,
    multilingual_support BOOLEAN,
    emotional_intelligence BOOLEAN,
    gamification_elements BOOLEAN,
    real_time_adaptation BOOLEAN
) AS $$
DECLARE
    settings_record ai_tutor_settings%ROWTYPE;
BEGIN
    -- Try to get existing settings for current user
    SELECT * INTO settings_record 
    FROM ai_tutor_settings 
    WHERE user_id = auth.uid();
    
    -- Return settings or defaults
    RETURN QUERY SELECT 
        COALESCE(settings_record.personality_type, 'encouraging'::TEXT),
        COALESCE(settings_record.response_style, 'conversational'::TEXT),
        COALESCE(settings_record.adaptive_difficulty, true),
        COALESCE(settings_record.context_awareness, true),
        COALESCE(settings_record.max_response_length, 150),
        COALESCE(settings_record.response_speed, 'normal'::TEXT),
        COALESCE(settings_record.repetition_threshold, 3),
        COALESCE(settings_record.error_correction_style, 'gentle'::TEXT),
        COALESCE(settings_record.voice_enabled, true),
        COALESCE(settings_record.voice_gender, 'neutral'::TEXT),
        COALESCE(settings_record.speech_rate, 1.0::DECIMAL),
        COALESCE(settings_record.audio_feedback, true),
        COALESCE(settings_record.cultural_sensitivity, true),
        COALESCE(settings_record.age_appropriate, true),
        COALESCE(settings_record.professional_context, false),
        COALESCE(settings_record.custom_prompts, ''::TEXT),
        COALESCE(settings_record.learning_analytics, true),
        COALESCE(settings_record.progress_tracking, true),
        COALESCE(settings_record.performance_reports, true),
        COALESCE(settings_record.data_retention, 90),
        COALESCE(settings_record.multilingual_support, true),
        COALESCE(settings_record.emotional_intelligence, true),
        COALESCE(settings_record.gamification_elements, true),
        COALESCE(settings_record.real_time_adaptation, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_tutor_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_tutor_settings() TO authenticated;
