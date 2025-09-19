import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AccessLogService from '@/services/accessLogService';
import { AISafetyEthicsService, AISafetyEthicsSettings, defaultAISafetyEthicsSettings } from '@/services/aiSafetyEthicsService';
import { 
  Shield, 
  Lock, 
  Users, 
  Save,
  RefreshCw
} from 'lucide-react';

interface AISafetyEthicsSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AISafetyEthicsSettings = ({ userProfile }: AISafetyEthicsSettingsProps) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AISafetyEthicsSettings>(defaultAISafetyEthicsSettings);


  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const loadedSettings = await AISafetyEthicsService.getSettings();
        setSettings(loadedSettings);
      } catch (error) {
        console.error('Error loading AI Safety & Ethics settings:', error);
        toast.error('Failed to load settings. Using defaults.');
        setSettings(defaultAISafetyEthicsSettings);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await AISafetyEthicsService.saveSettings(settings);
      toast.success('AI Safety & Ethics settings saved successfully');

      // Log AI Safety & Ethics settings update
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AccessLogService.logAdminSettingsAction(
            user.id,
            user.email || 'unknown@email.com',
            'updated',
            'ai_safety_ethics_settings',
            {
              toxicity_detection: settings.toxicityDetection,
              inappropriate_content_blocking: settings.inappropriateContentBlocking,
              harmful_content_prevention: settings.harmfulContentPrevention,
              conversation_logging: settings.conversationLogging,
              data_retention_limit: settings.dataRetentionLimit
            }
          );
        }
      } catch (logError) {
        console.error('Error logging AI Safety & Ethics settings update:', logError);
      }
    } catch (error) {
      console.error('Error saving AI Safety & Ethics settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save AI Safety & Ethics settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await AISafetyEthicsService.resetSettings();
      setSettings(defaultAISafetyEthicsSettings);
      toast.success('AI Safety & Ethics settings reset to defaults');

      // Log AI Safety & Ethics settings reset
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await AccessLogService.logAdminSettingsAction(
            user.id,
            user.email || 'unknown@email.com',
            'reset',
            'ai_safety_ethics_settings',
            {
              toxicity_detection: defaultAISafetyEthicsSettings.toxicityDetection,
              inappropriate_content_blocking: defaultAISafetyEthicsSettings.inappropriateContentBlocking,
              harmful_content_prevention: defaultAISafetyEthicsSettings.harmfulContentPrevention,
              conversation_logging: defaultAISafetyEthicsSettings.conversationLogging,
              data_retention_limit: defaultAISafetyEthicsSettings.dataRetentionLimit
            }
          );
        }
      } catch (logError) {
        console.error('Error logging AI Safety & Ethics settings reset:', logError);
      }
    } catch (error) {
      console.error('Error resetting AI Safety & Ethics settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to reset AI Safety & Ethics settings');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading AI Safety & Ethics settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Safety & Ethics</h1>
            <p className="text-muted-foreground">Configure safety monitoring and ethical guidelines</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>


      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="content">Content Safety</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="bias">Bias & Fairness</TabsTrigger>
        </TabsList>

        {/* Content Safety */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Content Safety & Filtering
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Toxicity Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and prevent toxic language and behavior
                    </p>
                  </div>
                  <Switch
                    checked={settings.toxicityDetection}
                    onCheckedChange={(checked) => setSettings({...settings, toxicityDetection: checked})}
                  />
                </div>
                
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Inappropriate Content Blocking</Label>
                    <p className="text-sm text-muted-foreground">
                      Block content that violates community guidelines
                    </p>
                  </div>
                  <Switch
                    checked={settings.inappropriateContentBlocking}
                    onCheckedChange={(checked) => setSettings({...settings, inappropriateContentBlocking: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Harmful Content Prevention</Label>
                    <p className="text-sm text-muted-foreground">
                      Prevent generation of potentially harmful content
                    </p>
                  </div>
                  <Switch
                    checked={settings.harmfulContentPrevention}
                    onCheckedChange={(checked) => setSettings({...settings, harmfulContentPrevention: checked})}
                  />
                </div>
                
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy & Data Protection */}
        <TabsContent value="privacy">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Privacy & Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Conversation Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Log conversations for safety and improvement purposes
                    </p>
                  </div>
                  <Switch
                    checked={settings.conversationLogging}
                    onCheckedChange={(checked) => setSettings({...settings, conversationLogging: checked})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Data Retention Limit: {settings.dataRetentionLimit} days</Label>
                <Slider
                  value={[settings.dataRetentionLimit]}
                  onValueChange={(value) => setSettings({...settings, dataRetentionLimit: value[0]})}
                  max={365}
                  min={30}
                  step={30}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  How long to retain user data for safety analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bias & Fairness */}
        <TabsContent value="bias">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Bias & Fairness Monitoring
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Gender Bias Monitoring</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor for gender-based bias in responses
                    </p>
                  </div>
                  <Switch
                    checked={settings.genderBiasMonitoring}
                    onCheckedChange={(checked) => setSettings({...settings, genderBiasMonitoring: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Cultural Bias Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect cultural bias and stereotypes
                    </p>
                  </div>
                  <Switch
                    checked={settings.culturalBiasDetection}
                    onCheckedChange={(checked) => setSettings({...settings, culturalBiasDetection: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Age-Appropriate Responses</Label>
                    <p className="text-sm text-muted-foreground">
                      Ensure responses are appropriate for user age
                    </p>
                  </div>
                  <Switch
                    checked={settings.ageAppropriateResponses}
                    onCheckedChange={(checked) => setSettings({...settings, ageAppropriateResponses: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Inclusive Language</Label>
                    <p className="text-sm text-muted-foreground">
                      Promote inclusive and respectful language
                    </p>
                  </div>
                  <Switch
                    checked={settings.inclusiveLanguage}
                    onCheckedChange={(checked) => setSettings({...settings, inclusiveLanguage: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Emotional Safety Checks</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor emotional impact of AI interactions
                    </p>
                  </div>
                  <Switch
                    checked={settings.emotionalSafetyChecks}
                    onCheckedChange={(checked) => setSettings({...settings, emotionalSafetyChecks: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>
    </div>
  );
};
