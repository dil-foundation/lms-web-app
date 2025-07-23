import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface SecureLinksDatabaseSetupAlertProps {
  error: string;
}

export const SecureLinksDatabaseSetupAlert: React.FC<SecureLinksDatabaseSetupAlertProps> = ({ error }) => {
  const copyMigrationSQL = () => {
    const sqlContent = `-- Create secure_links table
CREATE TABLE IF NOT EXISTS secure_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Principal', 'ECE Observer', 'School Officer', 'Project Manager')),
    observer_role VARCHAR(50) NOT NULL CHECK (observer_role IN ('principal', 'ece', 'school-officer', 'project-manager')),
    token VARCHAR(255) NOT NULL UNIQUE,
    full_url TEXT NOT NULL,
    expiry TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'used', 'deactivated')),
    used_by VARCHAR(255),
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    expiry_days INTEGER NOT NULL CHECK (expiry_days > 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_secure_links_created_by ON secure_links(created_by);
CREATE INDEX IF NOT EXISTS idx_secure_links_token ON secure_links(token);
CREATE INDEX IF NOT EXISTS idx_secure_links_status ON secure_links(status);
CREATE INDEX IF NOT EXISTS idx_secure_links_expiry ON secure_links(expiry);
CREATE INDEX IF NOT EXISTS idx_secure_links_created_at ON secure_links(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_secure_links_observer_role ON secure_links(observer_role);

-- Enable Row Level Security (RLS)
ALTER TABLE secure_links ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure_links
CREATE POLICY "Users can view their own secure links" ON secure_links
    FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own secure links" ON secure_links
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own secure links" ON secure_links
    FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own secure links" ON secure_links
    FOR DELETE USING (auth.uid() = created_by);

-- Special policy for token validation (public access by token)
CREATE POLICY "Allow token validation by anyone" ON secure_links
    FOR SELECT USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_secure_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at column
CREATE TRIGGER update_secure_links_updated_at 
    BEFORE UPDATE ON secure_links 
    FOR EACH ROW 
    EXECUTE FUNCTION update_secure_links_updated_at();

-- Create function to automatically expire links
CREATE OR REPLACE FUNCTION expire_old_secure_links()
RETURNS void AS $$
BEGIN
    UPDATE secure_links 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active' AND expiry < NOW();
END;
$$ language 'plpgsql';

-- Create index for efficient expiry cleanup
CREATE INDEX IF NOT EXISTS idx_secure_links_active_expiry ON secure_links(expiry) WHERE status = 'active';`;

    navigator.clipboard.writeText(sqlContent).then(() => {
      toast.success('Migration SQL copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard.');
    });
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="space-y-4">
        <div>
          <strong>Database Setup Required</strong>
        </div>
        <p className="text-sm">
          The secure links database table is not set up yet. Please run the migration to create the necessary table and policies.
        </p>
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
            onClick={copyMigrationSQL}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy Migration SQL
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-2">
          <p><strong>Steps to set up:</strong></p>
          <ol className="list-decimal list-inside space-y-1 pl-2">
            <li>Open your Supabase dashboard</li>
            <li>Navigate to SQL Editor</li>
            <li>Copy and paste the migration SQL</li>
            <li>Run the SQL script</li>
            <li>Refresh this page</li>
          </ol>
        </div>
      </AlertDescription>
    </Alert>
  );
}; 