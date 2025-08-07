import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Shield, Eye, AlertTriangle, Save } from 'lucide-react';

interface AISafetyEthicsSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AISafetyEthicsSettings = ({ userProfile }: AISafetyEthicsSettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                AI Safety, Ethics & Quality Assurance
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Manage AI usage policies, ethical behavior controls, and quality oversight settings
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Safety & Ethics Settings Card */}
      <Card className="bg-gradient-to-br from-card to-primary/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Safety & Ethics Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Monitoring & Detection */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Monitoring & Detection
            </h3>
            
            {/* Enable Bias Monitoring */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="bias-monitoring" className="text-sm font-medium">
                    Enable Bias Monitoring
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Flag AI responses for potential cultural, gender, or linguistic bias
                </p>
              </div>
              <Switch id="bias-monitoring" />
            </div>

            {/* Content Quality Flagging */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="quality-flagging" className="text-sm font-medium">
                    Content Quality Flagging
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Allow users to flag AI-generated content for review
                </p>
              </div>
              <Switch id="quality-flagging" />
            </div>
          </div>

          {/* Ethical Controls */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Ethical Controls
            </h3>
            
            {/* Enforce Ethical Guidelines */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="ethical-guidelines" className="text-sm font-medium">
                    Enforce Ethical Guidelines
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Prevent the AI from responding to unethical, unsafe, or age-inappropriate prompts
                </p>
              </div>
              <Switch id="ethical-guidelines" />
            </div>

            {/* Allow Custom Prompt Injection */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="custom-prompts" className="text-sm font-medium">
                    Allow Custom Prompt Injection
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Let instructors modify AI prompts for personalized feedback
                </p>
              </div>
              <Switch id="custom-prompts" />
            </div>
          </div>

          {/* Privacy & Auditing */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Privacy & Auditing
            </h3>
            
            {/* Student Privacy Mode */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="privacy-mode" className="text-sm font-medium">
                    Student Privacy Mode
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anonymize student data in AI evaluations and logs
                </p>
              </div>
              <Switch id="privacy-mode" />
            </div>

            {/* Response Audit Level */}
            <div className="space-y-3 p-4 rounded-lg border bg-card/50">
              <div className="space-y-1">
                <label htmlFor="audit-level" className="text-sm font-medium">
                  Response Audit Level
                </label>
                <p className="text-xs text-muted-foreground">
                  Controls how often AI responses are logged and reviewed
                </p>
              </div>
              <Select>
                <SelectTrigger id="audit-level" className="w-full">
                  <SelectValue placeholder="Select audit level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <Button className="px-8 py-2 bg-primary hover:bg-primary/90">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
