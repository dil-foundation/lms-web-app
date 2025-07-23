import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Database, ExternalLink, CheckCircle } from 'lucide-react';

interface DatabaseSetupAlertProps {
  error: string;
}

export const DatabaseSetupAlert: React.FC<DatabaseSetupAlertProps> = ({ error }) => {
  const isDatabaseTableError = error.includes('Database table not set up yet') || 
                               error.includes('relation "public.observation_reports" does not exist');

  if (!isDatabaseTableError) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800 mb-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-orange-600" />
          <div>
            <CardTitle className="text-orange-800 dark:text-orange-200">Database Setup Required</CardTitle>
            <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
              The observation reports table needs to be created in your database
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <h4 className="font-semibold text-orange-800 dark:text-orange-200 mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Quick Setup Instructions
          </h4>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-decimal list-inside">
            <li>Open your <strong>Supabase Dashboard</strong> in a new tab</li>
            <li>Navigate to the <strong>SQL Editor</strong> section</li>
            <li>Copy the SQL script from the migration file below</li>
            <li>Paste and <strong>Run</strong> the SQL script</li>
            <li>Refresh this page to start using the database</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
            Open Supabase Dashboard
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => {
              const sqlContent = `-- Create observation_reports table
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
CREATE POLICY "Users can view their own observation reports" ON observation_reports
    FOR SELECT USING (auth.uid() = submitted_by);
CREATE POLICY "Users can insert their own observation reports" ON observation_reports
    FOR INSERT WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Users can update their own observation reports" ON observation_reports
    FOR UPDATE USING (auth.uid() = submitted_by);
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
    EXECUTE FUNCTION update_updated_at_column();`;
              
              navigator.clipboard.writeText(sqlContent);
              alert('SQL script copied to clipboard! Paste it in your Supabase SQL Editor.');
            }}
          >
            Copy SQL Script
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-3 rounded">
          <strong>Note:</strong> This is a one-time setup. Once the table is created, 
          all your observation reports will be stored securely in the database with 
          proper user isolation and performance optimization.
        </div>
      </CardContent>
    </Card>
  );
}; 