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
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">AI Tutor Settings</h1>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">Configure AI behavior and learning parameters</p>
          </div>
        </div>
        <ContentLoader message="Loading AI Tutor settings..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold truncate">AI Tutor Settings</h1>
              {hasUnsavedChanges && (
                <Badge variant="secondary" className="text-xs w-fit">
                  Unsaved changes
                </Badge>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground hidden sm:block">Configure AI behavior and learning parameters</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={saving}
            className="flex-1 sm:flex-none"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || validationErrors.length > 0}
            className="flex-1 sm:flex-none"
          >
            <Save className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">{saving ? 'Saving...' : 'Save Changes'}</span>
            <span className="sm:hidden">{saving ? 'Saving...' : 'Save'}</span>
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

      <Tabs defaultValue="behavior" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="behavior" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            <span className="hidden sm:inline">Behavior</span>
            <span className="sm:hidden">Behavior</span>
          </TabsTrigger>
          <TabsTrigger value="learning" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            <span className="hidden sm:inline">Learning</span>
            <span className="sm:hidden">Learning</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm px-2 sm:px-4 py-2">
            <span className="hidden sm:inline">Content</span>
            <span className="sm:hidden">Content</span>
          </TabsTrigger>
        </TabsList>

        {/* AI Behavior Settings */}
        <TabsContent value="behavior">
          <Card>
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Brain className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">AI Personality & Behavior</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="personalityType" className="text-sm sm:text-base">Personality Type</Label>
                  <Select
                    value={settings.personalityType}
                    onValueChange={(value) => updateSettings({ personalityType: value })}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="encouraging" className="text-sm sm:text-base">Encouraging & Supportive</SelectItem>
                      <SelectItem value="professional" className="text-sm sm:text-base">Professional & Direct</SelectItem>
                      <SelectItem value="friendly" className="text-sm sm:text-base">Friendly & Casual</SelectItem>
                      <SelectItem value="academic" className="text-sm sm:text-base">Academic & Formal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="responseStyle" className="text-sm sm:text-base">Response Style</Label>
                  <Select
                    value={settings.responseStyle}
                    onValueChange={(value) => updateSettings({ responseStyle: value })}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="conversational" className="text-sm sm:text-base">Conversational</SelectItem>
                      <SelectItem value="structured" className="text-sm sm:text-base">Structured & Organized</SelectItem>
                      <SelectItem value="interactive" className="text-sm sm:text-base">Interactive & Engaging</SelectItem>
                      <SelectItem value="concise" className="text-sm sm:text-base">Concise & Direct</SelectItem>
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
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">Learning Parameters</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="space-y-4 sm:space-y-6">
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base">Max Response Length: <span className="font-semibold">{settings.maxResponseLength}</span> words</Label>
                  <Slider
                    value={[settings.maxResponseLength]}
                    onValueChange={(value) => updateSettings({ maxResponseLength: value[0] })}
                    max={300}
                    min={50}
                    step={10}
                    className="w-full"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Maximum length for AI responses
                  </p>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  <Label className="text-sm sm:text-base">Repetition Threshold: <span className="font-semibold">{settings.repetitionThreshold}</span> attempts</Label>
                  <Slider
                    value={[settings.repetitionThreshold]}
                    onValueChange={(value) => updateSettings({ repetitionThreshold: value[0] })}
                    max={10}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Number of attempts before providing additional help
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-2">
                  <Label htmlFor="responseSpeed" className="text-sm sm:text-base">Response Speed</Label>
                  <Select
                    value={settings.responseSpeed}
                    onValueChange={(value) => updateSettings({ responseSpeed: value })}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast" className="text-sm sm:text-base">Fast (1-2 seconds)</SelectItem>
                      <SelectItem value="normal" className="text-sm sm:text-base">Normal (2-3 seconds)</SelectItem>
                      <SelectItem value="slow" className="text-sm sm:text-base">Slow (3-4 seconds)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="errorCorrectionStyle" className="text-sm sm:text-base">Error Correction Style</Label>
                  <Select
                    value={settings.errorCorrectionStyle}
                    onValueChange={(value) => updateSettings({ errorCorrectionStyle: value })}
                  >
                    <SelectTrigger className="h-10 sm:h-11 text-sm sm:text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gentle" className="text-sm sm:text-base">Gentle & Encouraging</SelectItem>
                      <SelectItem value="direct" className="text-sm sm:text-base">Direct & Clear</SelectItem>
                      <SelectItem value="detailed" className="text-sm sm:text-base">Detailed Explanation</SelectItem>
                      <SelectItem value="minimal" className="text-sm sm:text-base">Minimal Correction</SelectItem>
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
            <CardHeader className="px-4 sm:px-6 py-4">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="truncate">Content Customization</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-0">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-sm sm:text-base">Cultural Sensitivity</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Adapt content for cultural appropriateness
                    </p>
                  </div>
                  <Switch
                    checked={settings.culturalSensitivity}
                    onCheckedChange={(checked) => updateSettings({ culturalSensitivity: checked })}
                    className="self-start sm:self-auto"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-0">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-sm sm:text-base">Age Appropriate Content</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Filter content based on age appropriateness
                    </p>
                  </div>
                  <Switch
                    checked={settings.ageAppropriate}
                    onCheckedChange={(checked) => updateSettings({ ageAppropriate: checked })}
                    className="self-start sm:self-auto"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 py-2 sm:py-0">
                  <div className="space-y-0.5 flex-1">
                    <Label className="text-sm sm:text-base">Professional Context</Label>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Focus on professional and business scenarios
                    </p>
                  </div>
                  <Switch
                    checked={settings.professionalContext}
                    onCheckedChange={(checked) => updateSettings({ professionalContext: checked })}
                    className="self-start sm:self-auto"
                  />
                </div>
              </div>
              
              <div className="space-y-2 sm:space-y-3">
                <Label htmlFor="customPrompts" className="text-sm sm:text-base">Custom System Prompts</Label>
                <Textarea
                  id="customPrompts"
                  placeholder="Enter custom instructions for the AI tutor..."
                  value={settings.customPrompts}
                  onChange={(e) => updateSettings({ customPrompts: e.target.value })}
                  rows={4}
                  className="text-sm sm:text-base resize-none"
                />
                <p className="text-xs sm:text-sm text-muted-foreground">
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
