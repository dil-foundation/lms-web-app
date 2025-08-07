import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Bot, Settings2, Save } from 'lucide-react';

interface AITutorSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AITutorSettings = ({ userProfile }: AITutorSettingsProps) => {
  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                AI Tutor Settings
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Configure how the AI Tutor behaves across the platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Card */}
      <Card className="bg-gradient-to-br from-card to-primary/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            AI Tutor Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          
          {/* Language Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Language & Input Settings
            </h3>
            
            {/* Allow Urdu Input */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="urdu-input" className="text-sm font-medium">
                    Allow Urdu Input
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable students to communicate with the AI tutor using Urdu language input
                </p>
              </div>
              <Switch id="urdu-input" />
            </div>

            {/* Auto-Translation Support */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="auto-translation" className="text-sm font-medium">
                    Auto-Translation Support
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Automatically translate student responses and AI feedback between English and Urdu
                </p>
              </div>
              <Switch id="auto-translation" />
            </div>
          </div>

          {/* Feedback Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              Feedback & Correction Settings
            </h3>
            
            {/* Grammar Correction */}
            <div className="flex items-center justify-between p-4 rounded-lg border bg-card/50">
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <label htmlFor="grammar-correction" className="text-sm font-medium">
                    Grammar Correction Enabled
                  </label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enable real-time grammar correction and suggestions during practice sessions
                </p>
              </div>
              <Switch id="grammar-correction" />
            </div>

            {/* Tone of Feedback */}
            <div className="space-y-3 p-4 rounded-lg border bg-card/50">
              <div className="space-y-1">
                <label htmlFor="feedback-tone" className="text-sm font-medium">
                  Tone of Feedback
                </label>
                <p className="text-xs text-muted-foreground">
                  Set the communication style for AI tutor feedback and interactions
                </p>
              </div>
              <Select>
                <SelectTrigger id="feedback-tone" className="w-full">
                  <SelectValue placeholder="Select feedback tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="formal">Formal</SelectItem>
                  <SelectItem value="encouraging">Encouraging</SelectItem>
                  <SelectItem value="strict">Strict</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AI Behavior Settings */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground border-b pb-2">
              AI Behavior Settings
            </h3>
            
            {/* AI Tutor Role Mode */}
            <div className="space-y-3 p-4 rounded-lg border bg-card/50">
              <div className="space-y-1">
                <label htmlFor="role-mode" className="text-sm font-medium">
                  AI Tutor Role Mode
                </label>
                <p className="text-xs text-muted-foreground">
                  Define how the AI tutor should interact with students during learning sessions
                </p>
              </div>
              <Select>
                <SelectTrigger id="role-mode" className="w-full">
                  <SelectValue placeholder="Select AI tutor role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach">Coach</SelectItem>
                  <SelectItem value="peer">Peer</SelectItem>
                  <SelectItem value="examiner">Examiner</SelectItem>
                  <SelectItem value="tutor">Tutor</SelectItem>
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
