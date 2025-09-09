-- Create AI Safety & Ethics Settings table
-- This table stores system-wide AI safety and ethics configuration settings
-- Only admins can manage these settings

CREATE TABLE IF NOT EXISTS ai_safety_ethics_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Content Safety Settings
    content_filtering BOOLEAN DEFAULT true,
    toxicity_detection BOOLEAN DEFAULT true,
    bias_detection BOOLEAN DEFAULT true,
    inappropriate_content_blocking BOOLEAN DEFAULT true,
    harmful_content_prevention BOOLEAN DEFAULT true,
    misinformation_detection BOOLEAN DEFAULT true,
    
    -- Privacy & Data Protection Settings
    data_encryption BOOLEAN DEFAULT true,
    personal_data_protection BOOLEAN DEFAULT true,
    conversation_logging BOOLEAN DEFAULT true,
    data_retention_limit INTEGER DEFAULT 90 CHECK (data_retention_limit >= 30 AND data_retention_limit <= 365),
    
    -- Bias & Fairness Settings
    gender_bias_monitoring BOOLEAN DEFAULT true,
    cultural_bias_detection BOOLEAN DEFAULT true,
    age_appropriate_responses BOOLEAN DEFAULT true,
    inclusive_language BOOLEAN DEFAULT true,
    emotional_safety_checks BOOLEAN DEFAULT true,
    
    -- Monitoring & Alerts Settings
    real_time_monitoring BOOLEAN DEFAULT true,
    alert_threshold INTEGER DEFAULT 75 CHECK (alert_threshold >= 50 AND alert_threshold <= 100),
    automatic_escalation BOOLEAN DEFAULT true,
    admin_notifications BOOLEAN DEFAULT true,
    contextual_safety_analysis BOOLEAN DEFAULT true,
    
    -- Compliance & Reporting Settings
    compliance_reporting BOOLEAN DEFAULT true,
    audit_trail BOOLEAN DEFAULT true,
    incident_reporting BOOLEAN DEFAULT true,
    regular_assessments BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ai_safety_ethics_settings_updated_at ON ai_safety_ethics_settings(updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE ai_safety_ethics_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies - Only admins can access AI safety settings
CREATE POLICY "Admins can view AI safety ethics settings" ON ai_safety_ethics_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can insert AI safety ethics settings" ON ai_safety_ethics_settings
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update AI safety ethics settings" ON ai_safety_ethics_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete AI safety ethics settings" ON ai_safety_ethics_settings
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to automatically update metadata
CREATE OR REPLACE FUNCTION set_ai_safety_ethics_settings_metadata()
RETURNS TRIGGER AS $$
BEGIN
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
CREATE TRIGGER trigger_set_ai_safety_ethics_settings_metadata
    BEFORE INSERT OR UPDATE ON ai_safety_ethics_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_ai_safety_ethics_settings_metadata();

-- Create function to get AI safety ethics settings with defaults
CREATE OR REPLACE FUNCTION get_ai_safety_ethics_settings()
RETURNS TABLE (
    content_filtering BOOLEAN,
    toxicity_detection BOOLEAN,
    bias_detection BOOLEAN,
    inappropriate_content_blocking BOOLEAN,
    harmful_content_prevention BOOLEAN,
    misinformation_detection BOOLEAN,
    data_encryption BOOLEAN,
    personal_data_protection BOOLEAN,
    conversation_logging BOOLEAN,
    data_retention_limit INTEGER,
    gender_bias_monitoring BOOLEAN,
    cultural_bias_detection BOOLEAN,
    age_appropriate_responses BOOLEAN,
    inclusive_language BOOLEAN,
    emotional_safety_checks BOOLEAN,
    real_time_monitoring BOOLEAN,
    alert_threshold INTEGER,
    automatic_escalation BOOLEAN,
    admin_notifications BOOLEAN,
    contextual_safety_analysis BOOLEAN,
    compliance_reporting BOOLEAN,
    audit_trail BOOLEAN,
    incident_reporting BOOLEAN,
    regular_assessments BOOLEAN
) AS $$
DECLARE
    settings_record ai_safety_ethics_settings%ROWTYPE;
BEGIN
    -- Get the most recent settings record
    SELECT * INTO settings_record 
    FROM ai_safety_ethics_settings 
    ORDER BY updated_at DESC
    LIMIT 1;
    
    -- Return settings or defaults if no record exists
    RETURN QUERY SELECT 
        COALESCE(settings_record.content_filtering, true),
        COALESCE(settings_record.toxicity_detection, true),
        COALESCE(settings_record.bias_detection, true),
        COALESCE(settings_record.inappropriate_content_blocking, true),
        COALESCE(settings_record.harmful_content_prevention, true),
        COALESCE(settings_record.misinformation_detection, true),
        COALESCE(settings_record.data_encryption, true),
        COALESCE(settings_record.personal_data_protection, true),
        COALESCE(settings_record.conversation_logging, true),
        COALESCE(settings_record.data_retention_limit, 90),
        COALESCE(settings_record.gender_bias_monitoring, true),
        COALESCE(settings_record.cultural_bias_detection, true),
        COALESCE(settings_record.age_appropriate_responses, true),
        COALESCE(settings_record.inclusive_language, true),
        COALESCE(settings_record.emotional_safety_checks, true),
        COALESCE(settings_record.real_time_monitoring, true),
        COALESCE(settings_record.alert_threshold, 75),
        COALESCE(settings_record.automatic_escalation, true),
        COALESCE(settings_record.admin_notifications, true),
        COALESCE(settings_record.contextual_safety_analysis, true),
        COALESCE(settings_record.compliance_reporting, true),
        COALESCE(settings_record.audit_trail, true),
        COALESCE(settings_record.incident_reporting, true),
        COALESCE(settings_record.regular_assessments, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default settings record
INSERT INTO ai_safety_ethics_settings (
    content_filtering,
    toxicity_detection,
    bias_detection,
    inappropriate_content_blocking,
    harmful_content_prevention,
    misinformation_detection,
    data_encryption,
    personal_data_protection,
    conversation_logging,
    data_retention_limit,
    gender_bias_monitoring,
    cultural_bias_detection,
    age_appropriate_responses,
    inclusive_language,
    emotional_safety_checks,
    real_time_monitoring,
    alert_threshold,
    automatic_escalation,
    admin_notifications,
    contextual_safety_analysis,
    compliance_reporting,
    audit_trail,
    incident_reporting,
    regular_assessments
) VALUES (
    true, true, true, true, true, true,  -- Content Safety
    true, true, true, 90,                -- Privacy & Data Protection
    true, true, true, true, true,        -- Bias & Fairness
    true, 75, true, true, true,          -- Monitoring & Alerts
    true, true, true, true               -- Compliance & Reporting
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_safety_ethics_settings TO authenticated;
GRANT EXECUTE ON FUNCTION get_ai_safety_ethics_settings() TO authenticated;

-- Add comment for documentation
COMMENT ON TABLE ai_safety_ethics_settings IS 'Stores AI safety and ethics configuration settings - admin access only';
