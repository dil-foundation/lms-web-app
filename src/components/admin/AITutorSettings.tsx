import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ContentLoader } from '@/components/ContentLoader';
import { useAITutorSettings } from '@/hooks/useAITutorSettings';
import { 
  Bot, 
  Brain, 
  MessageSquare, 
  Target,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

interface AITutorSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AITutorSettings = ({ userProfile }: AITutorSettingsProps) => {
  const {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    saveSettings,
    resetSettings,
    hasUnsavedChanges,
    validationErrors
  } = useAITutorSettings();

  const handleSave = async () => {
    try {
      await saveSettings();
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  const handleReset = async () => {
    try {
      await resetSettings();
    } catch (error) {
      // Error is already handled by the hook
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Tutor Settings</h1>
            <p className="text-muted-foreground">Configure AI behavior and learning parameters</p>
          </div>
        </div>
        <ContentLoader message="Loading AI Tutor settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">AI Tutor Settings</h1>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Configure AI behavior and learning parameters</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={saving}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || validationErrors.length > 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              <p className="font-medium">Please fix the following errors:</p>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index} className="text-sm">{error}</li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Success indicator when settings are saved */}
      {!hasUnsavedChanges && !loading && !error && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Settings are up to date and saved successfully.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="behavior" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="behavior">Behavior</TabsTrigger>
          <TabsTrigger value="learning">Learning</TabsTrigger>
          <TabsTrigger value="content">Content</TabsTrigger>
        </TabsList>

        {/* AI Behavior Settings */}
        <TabsContent value="behavior">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI Personality & Behavior
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="personalityType">Personality Type</Label>
                  <Select
                    value={settings.personalityType}
                    onValueChange={(value) => updateSettings({ personalityType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="encouraging">Encouraging & Supportive</SelectItem>
                      <SelectItem value="professional">Professional & Direct</SelectItem>
                      <SelectItem value="friendly">Friendly & Casual</SelectItem>
                      <SelectItem value="academic">Academic & Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responseStyle">Response Style</Label>
                  <Select
                    value={settings.responseStyle}
                    onValueChange={(value) => updateSettings({ responseStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational">Conversational</SelectItem>
                      <SelectItem value="structured">Structured & Organized</SelectItem>
                      <SelectItem value="interactive">Interactive & Engaging</SelectItem>
                      <SelectItem value="concise">Concise & Direct</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Parameters */}
        <TabsContent value="learning">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Learning Parameters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Max Response Length: {settings.maxResponseLength} words</Label>
                  <Slider
                    value={[settings.maxResponseLength]}
                    onValueChange={(value) => updateSettings({ maxResponseLength: value[0] })}
                    max={300}
                    min={50}
                    step={10}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum length for AI responses
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>Repetition Threshold: {settings.repetitionThreshold} attempts</Label>
                  <Slider
                    value={[settings.repetitionThreshold]}
                    onValueChange={(value) => updateSettings({ repetitionThreshold: value[0] })}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of attempts before providing additional help
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="responseSpeed">Response Speed</Label>
                  <Select
                    value={settings.responseSpeed}
                    onValueChange={(value) => updateSettings({ responseSpeed: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast (1-2 seconds)</SelectItem>
                      <SelectItem value="normal">Normal (2-3 seconds)</SelectItem>
                      <SelectItem value="slow">Slow (3-4 seconds)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="errorCorrectionStyle">Error Correction Style</Label>
                  <Select
                    value={settings.errorCorrectionStyle}
                    onValueChange={(value) => updateSettings({ errorCorrectionStyle: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gentle">Gentle & Encouraging</SelectItem>
                      <SelectItem value="direct">Direct & Clear</SelectItem>
                      <SelectItem value="detailed">Detailed Explanation</SelectItem>
                      <SelectItem value="minimal">Minimal Correction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* Content Customization */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Content Customization
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cultural Sensitivity</Label>
                    <p className="text-sm text-muted-foreground">
                      Adapt content for cultural appropriateness
                    </p>
                  </div>
                  <Switch
                    checked={settings.culturalSensitivity}
                    onCheckedChange={(checked) => updateSettings({ culturalSensitivity: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Age Appropriate Content</Label>
                    <p className="text-sm text-muted-foreground">
                      Filter content based on age appropriateness
                    </p>
                  </div>
                  <Switch
                    checked={settings.ageAppropriate}
                    onCheckedChange={(checked) => updateSettings({ ageAppropriate: checked })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Professional Context</Label>
                    <p className="text-sm text-muted-foreground">
                      Focus on professional and business scenarios
                    </p>
                  </div>
                  <Switch
                    checked={settings.professionalContext}
                    onCheckedChange={(checked) => updateSettings({ professionalContext: checked })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customPrompts">Custom System Prompts</Label>
                                  <Textarea
                    id="customPrompts"
                    placeholder="Enter custom instructions for the AI tutor..."
                    value={settings.customPrompts}
                    onChange={(e) => updateSettings({ customPrompts: e.target.value })}
                  rows={4}
                />
                <p className="text-sm text-muted-foreground">
                  Additional instructions to customize AI behavior
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
};
