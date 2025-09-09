import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import AccessLogService from '@/services/accessLogService';
import { AISafetyEthicsService, AISafetyEthicsSettings, defaultAISafetyEthicsSettings } from '@/services/aiSafetyEthicsService';
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Lock, 
  Users, 
  FileText,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Activity,
  Zap
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

  const [safetyMetrics, setSafetyMetrics] = useState({
    contentFiltered: 127,
    biasDetected: 23,
    incidentsReported: 5,
    complianceScore: 94
  });

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        const [loadedSettings, metrics] = await Promise.all([
          AISafetyEthicsService.getSettings(),
          AISafetyEthicsService.getSafetyMetrics()
        ]);
        setSettings(loadedSettings);
        setSafetyMetrics(metrics);
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
              content_filtering: settings.contentFiltering,
              toxicity_detection: settings.toxicityDetection,
              bias_detection: settings.biasDetection,
              data_encryption: settings.dataEncryption,
              real_time_monitoring: settings.realTimeMonitoring,
              alert_threshold: settings.alertThreshold,
              compliance_reporting: settings.complianceReporting
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
              content_filtering: defaultAISafetyEthicsSettings.contentFiltering,
              toxicity_detection: defaultAISafetyEthicsSettings.toxicityDetection,
              bias_detection: defaultAISafetyEthicsSettings.biasDetection,
              data_encryption: defaultAISafetyEthicsSettings.dataEncryption,
              real_time_monitoring: defaultAISafetyEthicsSettings.realTimeMonitoring,
              alert_threshold: defaultAISafetyEthicsSettings.alertThreshold,
              compliance_reporting: defaultAISafetyEthicsSettings.complianceReporting
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

      {/* Safety Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Content Filtered</p>
                <p className="text-2xl font-bold">{safetyMetrics.contentFiltered}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bias Detected</p>
                <p className="text-2xl font-bold">{safetyMetrics.biasDetected}</p>
              </div>
              <Eye className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Incidents</p>
                <p className="text-2xl font-bold">{safetyMetrics.incidentsReported}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Score</p>
                <p className="text-2xl font-bold">{safetyMetrics.complianceScore}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <Progress value={safetyMetrics.complianceScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="content">Content Safety</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="bias">Bias & Fairness</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
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
                    <Label>Content Filtering</Label>
                    <p className="text-sm text-muted-foreground">
                      Filter inappropriate or harmful content in real-time
                    </p>
                  </div>
                  <Switch
                    checked={settings.contentFiltering}
                    onCheckedChange={(checked) => setSettings({...settings, contentFiltering: checked})}
                  />
                </div>
                
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
                    <Label>Bias Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor and alert on potential bias in AI responses
                    </p>
                  </div>
                  <Switch
                    checked={settings.biasDetection}
                    onCheckedChange={(checked) => setSettings({...settings, biasDetection: checked})}
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
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Misinformation Detection</Label>
                    <p className="text-sm text-muted-foreground">
                      Detect and flag potential misinformation
                    </p>
                  </div>
                  <Switch
                    checked={settings.misinformationDetection}
                    onCheckedChange={(checked) => setSettings({...settings, misinformationDetection: checked})}
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
                    <Label>Data Encryption</Label>
                    <p className="text-sm text-muted-foreground">
                      Encrypt all user data and conversations
                    </p>
                  </div>
                  <Switch
                    checked={settings.dataEncryption}
                    onCheckedChange={(checked) => setSettings({...settings, dataEncryption: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Personal Data Protection</Label>
                    <p className="text-sm text-muted-foreground">
                      Protect and anonymize personal information
                    </p>
                  </div>
                  <Switch
                    checked={settings.personalDataProtection}
                    onCheckedChange={(checked) => setSettings({...settings, personalDataProtection: checked})}
                  />
                </div>
                
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

        {/* Monitoring & Alerts */}
        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Real-time Monitoring & Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Real-time Monitoring</Label>
                    <p className="text-sm text-muted-foreground">
                      Monitor AI interactions in real-time
                    </p>
                  </div>
                  <Switch
                    checked={settings.realTimeMonitoring}
                    onCheckedChange={(checked) => setSettings({...settings, realTimeMonitoring: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Automatic Escalation</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically escalate serious safety issues
                    </p>
                  </div>
                  <Switch
                    checked={settings.automaticEscalation}
                    onCheckedChange={(checked) => setSettings({...settings, automaticEscalation: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Admin Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send notifications to administrators
                    </p>
                  </div>
                  <Switch
                    checked={settings.adminNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, adminNotifications: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contextual Safety Analysis</Label>
                    <p className="text-sm text-muted-foreground">
                      Analyze safety within conversation context
                    </p>
                  </div>
                  <Switch
                    checked={settings.contextualSafetyAnalysis}
                    onCheckedChange={(checked) => setSettings({...settings, contextualSafetyAnalysis: checked})}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Alert Threshold: {settings.alertThreshold}%</Label>
                <Slider
                  value={[settings.alertThreshold]}
                  onValueChange={(value) => setSettings({...settings, alertThreshold: value[0]})}
                  max={100}
                  min={50}
                  step={5}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Confidence threshold for triggering safety alerts
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance & Reporting */}
        <TabsContent value="compliance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Compliance & Reporting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compliance Reporting</Label>
                    <p className="text-sm text-muted-foreground">
                      Generate compliance reports for regulatory requirements
                    </p>
                  </div>
                  <Switch
                    checked={settings.complianceReporting}
                    onCheckedChange={(checked) => setSettings({...settings, complianceReporting: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Audit Trail</Label>
                    <p className="text-sm text-muted-foreground">
                      Maintain detailed audit trail of all safety actions
                    </p>
                  </div>
                  <Switch
                    checked={settings.auditTrail}
                    onCheckedChange={(checked) => setSettings({...settings, auditTrail: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Incident Reporting</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically report safety incidents
                    </p>
                  </div>
                  <Switch
                    checked={settings.incidentReporting}
                    onCheckedChange={(checked) => setSettings({...settings, incidentReporting: checked})}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Regular Assessments</Label>
                    <p className="text-sm text-muted-foreground">
                      Conduct regular safety and ethics assessments
                    </p>
                  </div>
                  <Switch
                    checked={settings.regularAssessments}
                    onCheckedChange={(checked) => setSettings({...settings, regularAssessments: checked})}
                  />
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Compliance Standards</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">GDPR Compliance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">COPPA Compliance</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">AI Ethics Guidelines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm">Educational Safety Standards</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
