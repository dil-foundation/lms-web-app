import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Settings, 
  RotateCcw, 
  Clock, 
  Target, 
  Shield, 
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { QuizRetryService } from '@/services/quizRetryService';
import { QuizRetrySettings, DEFAULT_RETRY_SETTINGS } from '@/types/quizRetry';
import { toast } from 'sonner';

interface QuizRetrySettingsProps {
  lessonContentId: string;
  onSettingsChange?: (settings: QuizRetrySettings) => void;
}

export const QuizRetrySettings: React.FC<QuizRetrySettingsProps> = ({
  lessonContentId,
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<QuizRetrySettings>(DEFAULT_RETRY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, [lessonContentId]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const retrySettings = await QuizRetryService.getRetrySettings(lessonContentId);
      setSettings(retrySettings);
      setError(null);
    } catch (err) {
      setError('Failed to load retry settings');
      console.error('Error loading retry settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const success = await QuizRetryService.updateRetrySettings(lessonContentId, settings);
      
      if (success) {
        toast.success('Retry settings saved successfully');
        onSettingsChange?.(settings);
      } else {
        toast.error('Failed to save retry settings');
      }
    } catch (err) {
      toast.error('Failed to save retry settings');
      console.error('Error saving retry settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof QuizRetrySettings>(
    key: K,
    value: QuizRetrySettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_RETRY_SETTINGS);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Quiz Retry Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Quiz Retry Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure how students can retry this quiz
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Enable/Disable Retries */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="allow-retries" className="text-base font-medium">
              Allow Quiz Retries
            </Label>
            <p className="text-sm text-muted-foreground">
              Enable students to retry this quiz if they don't meet the passing threshold
            </p>
          </div>
          <Switch
            id="allow-retries"
            checked={settings.allowRetries}
            onCheckedChange={(checked) => updateSetting('allowRetries', checked)}
          />
        </div>

        {settings.allowRetries && (
          <>
            <Separator />

            {/* Max Retries */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Maximum Retry Attempts: {settings.maxRetries}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Total number of attempts allowed (including the first attempt)
                </p>
                <Slider
                  value={[settings.maxRetries]}
                  onValueChange={(value) => updateSetting('maxRetries', value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 attempt</span>
                  <span>5 attempts</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Retry Threshold */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Retry Threshold: {settings.retryThreshold}%
                </Label>
                <p className="text-sm text-muted-foreground">
                  Students can only retry if their score is below this threshold
                </p>
                <Slider
                  value={[settings.retryThreshold]}
                  onValueChange={(value) => updateSetting('retryThreshold', value[0])}
                  max={100}
                  min={0}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Cooldown Period */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-medium">
                  Cooldown Period: {settings.retryCooldownHours < 1 
                    ? `${Math.round(settings.retryCooldownHours * 60)} minutes` 
                    : `${settings.retryCooldownHours} hours`}
                </Label>
                <p className="text-sm text-muted-foreground">
                  Minimum time students must wait between retry attempts
                </p>
                <Slider
                  value={[settings.retryCooldownHours]}
                  onValueChange={(value) => updateSetting('retryCooldownHours', value[0])}
                  max={168} // 1 week
                  min={1/60} // 1 minute
                  step={1/60} // 1 minute steps
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 minute</span>
                  <span>1 week</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Advanced Settings */}
            <div className="space-y-4">
              <h4 className="text-lg font-medium flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Advanced Settings
              </h4>

              {/* Teacher Approval */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="require-approval" className="text-base font-medium">
                    Require Teacher Approval
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Students must request approval for retry attempts
                  </p>
                </div>
                <Switch
                  id="require-approval"
                  checked={settings.requireTeacherApproval}
                  onCheckedChange={(checked) => updateSetting('requireTeacherApproval', checked)}
                />
              </div>

              {/* Generate New Questions */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="generate-questions" className="text-base font-medium">
                    Generate New Questions
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Show different questions for retry attempts (if available)
                  </p>
                </div>
                <Switch
                  id="generate-questions"
                  checked={settings.generateNewQuestions}
                  onCheckedChange={(checked) => updateSetting('generateNewQuestions', checked)}
                />
              </div>

              {/* Study Materials */}
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="require-study" className="text-base font-medium">
                    Require Study Materials
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Students must complete additional study materials before retrying
                  </p>
                </div>
                <Switch
                  id="require-study"
                  checked={settings.requireStudyMaterials}
                  onCheckedChange={(checked) => updateSetting('requireStudyMaterials', checked)}
                />
              </div>
            </div>

            {/* Summary */}
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Current Configuration:</strong> Students can retry up to {settings.maxRetries} times 
                if they score below {settings.retryThreshold}%, with a {settings.retryCooldownHours < 1 
                  ? `${Math.round(settings.retryCooldownHours * 60)}-minute` 
                  : `${settings.retryCooldownHours}-hour`} cooldown 
                between attempts{settings.requireTeacherApproval ? ' (teacher approval required)' : ''}.
              </AlertDescription>
            </Alert>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            disabled={saving}
          >
            Reset to Defaults
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
