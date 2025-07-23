-- Create observation_reports table
CREATE TABLE IF NOT EXISTS observation_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    observer_name VARCHAR(255) NOT NULL,
    observer_role VARCHAR(50) NOT NULL CHECK (observer_role IN ('principal', 'ece', 'school-officer', 'project-manager')),
    school_name VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    observation_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    lesson_code VARCHAR(100) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'draft')),
    form_data JSONB NOT NULL,
    submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    show_teal_observations BOOLEAN DEFAULT false,
    observer_id UUID,
    school_id UUID,
    teacher_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_observation_reports_submitted_by ON observation_reports(submitted_by);
CREATE INDEX IF NOT EXISTS idx_observation_reports_created_at ON observation_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_observation_reports_observation_date ON observation_reports(observation_date DESC);
CREATE INDEX IF NOT EXISTS idx_observation_reports_observer_role ON observation_reports(observer_role);
CREATE INDEX IF NOT EXISTS idx_observation_reports_school_name ON observation_reports(school_name);
CREATE INDEX IF NOT EXISTS idx_observation_reports_status ON observation_reports(status);

-- Enable Row Level Security (RLS)
ALTER TABLE observation_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own reports
CREATE POLICY "Users can view their own observation reports" ON observation_reports
    FOR SELECT USING (auth.uid() = submitted_by);

-- Users can only insert their own reports
CREATE POLICY "Users can insert their own observation reports" ON observation_reports
    FOR INSERT WITH CHECK (auth.uid() = submitted_by);

-- Users can only update their own reports
CREATE POLICY "Users can update their own observation reports" ON observation_reports
    FOR UPDATE USING (auth.uid() = submitted_by);

-- Users can only delete their own reports
CREATE POLICY "Users can delete their own observation reports" ON observation_reports
    FOR DELETE USING (auth.uid() = submitted_by);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_observation_reports_updated_at 
    BEFORE UPDATE ON observation_reports 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE observation_reports IS 'Stores observation reports submitted by field auditors and compliance assessors';
COMMENT ON COLUMN observation_reports.observer_role IS 'Role of the observer: principal, ece, school-officer, or project-manager';
COMMENT ON COLUMN observation_reports.form_data IS 'Complete form data stored as JSON for detailed analysis and reporting';
COMMENT ON COLUMN observation_reports.overall_score IS 'Calculated overall score from 0-100 based on assessment criteria';
COMMENT ON COLUMN observation_reports.show_teal_observations IS 'Whether TEAL (Technology Enhanced Active Learning) observations were included';
COMMENT ON COLUMN observation_reports.submitted_by IS 'References the user who submitted this report'; 