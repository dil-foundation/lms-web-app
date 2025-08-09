import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Eye, 
  AlertTriangle, 
  Save, 
  Users, 
  Clock, 
  Award,
  Activity,
  CheckCircle,
  AlertCircle,
  Lock,
  Brain,
  Zap,
  Target,
  TrendingUp
} from 'lucide-react';
import { useState } from 'react';

interface AISafetyEthicsSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AISafetyEthicsSettings = ({ userProfile }: AISafetyEthicsSettingsProps) => {
  const [settings, setSettings] = useState({
    biasMonitoring: true,
    qualityFlagging: true,
    ethicalGuidelines: true,
    customPrompts: false,
    privacyMode: true,
    auditLevel: 'moderate'
  });

  const [activeTab, setActiveTab] = useState('monitoring');

  // Mock safety analytics data
  const safetyAnalytics = {
    totalScans: 15420,
    flaggedResponses: 23,
    avgResponseTime: 1.2,
    safetyScore: 98.5
  };

  const handleSave = () => {
    // Save logic here
    console.log('Safety settings saved:', settings);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'monitoring':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Monitoring & Detection"
              description="AI response monitoring and bias detection systems"
              icon={Eye}
              status="active"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Bias Monitoring</label>
                      <AlertTriangle className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Flag AI responses for potential cultural, gender, or linguistic bias
                    </p>
                  </div>
                  <Switch 
                    checked={settings.biasMonitoring}
                    onCheckedChange={(checked) => setSettings({...settings, biasMonitoring: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Quality Flagging</label>
                      <Target className="w-3 h-3 text-[#1582B4]" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allow users to flag AI-generated content for review
                    </p>
                  </div>
                  <Switch 
                    checked={settings.qualityFlagging}
                    onCheckedChange={(checked) => setSettings({...settings, qualityFlagging: checked})}
                  />
                </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'ethics':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Ethical Controls"
              description="Enforce ethical guidelines and behavior standards"
              icon={Brain}
              status="active"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Ethical Guidelines</label>
                      <Shield className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Prevent unethical, unsafe, or age-inappropriate responses
                    </p>
                  </div>
                  <Switch 
                    checked={settings.ethicalGuidelines}
                    onCheckedChange={(checked) => setSettings({...settings, ethicalGuidelines: checked})}
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Custom Prompts</label>
                      <Zap className="w-3 h-3 text-[#1582B4]" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allow instructors to modify AI prompts for personalized feedback
                    </p>
                  </div>
                  <Switch 
                    checked={settings.customPrompts}
                    onCheckedChange={(checked) => setSettings({...settings, customPrompts: checked})}
                  />
                </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Privacy & Auditing"
              description="Student privacy protection and response auditing"
              icon={Lock}
              status="active"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Privacy Mode</label>
                      <Lock className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Anonymize student data in AI evaluations and logs
                    </p>
                  </div>
                  <Switch 
                    checked={settings.privacyMode}
                    onCheckedChange={(checked) => setSettings({...settings, privacyMode: checked})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Audit Level</label>
                  <Select 
                    value={settings.auditLevel} 
                    onValueChange={(value) => setSettings({...settings, auditLevel: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None - No logging</SelectItem>
                      <SelectItem value="light">Light - Basic logging</SelectItem>
                      <SelectItem value="moderate">Moderate - Standard logging</SelectItem>
                      <SelectItem value="strict">Strict - Full audit trail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'quality':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Quality Assurance"
              description="Content quality monitoring and improvement systems"
              icon={CheckCircle}
              status="active"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Auto-Quality Check</label>
                      <CheckCircle className="w-3 h-3 text-primary" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically review AI responses for accuracy and relevance
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium">Feedback Loop</label>
                      <TrendingUp className="w-3 h-3 text-[#1582B4]" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use flagged responses to improve AI performance
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </SettingCard>
          </div>
        );

      default:
        return null;
    }
  };

  const SettingCard = ({ 
    title, 
    description, 
    icon: Icon, 
    children, 
    status = 'active',
    className = '' 
  }: {
    title: string;
    description: string;
    icon: any;
    children: React.ReactNode;
    status?: 'active' | 'inactive' | 'warning';
    className?: string;
  }) => (
    <Card className={`group overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border-0 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center shadow-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge 
            variant={status === 'active' ? 'default' : status === 'warning' ? 'secondary' : 'outline'}
            className={status === 'active' ? 'bg-primary/10 text-primary border-primary/20' : ''}
          >
            {status === 'active' ? 'Active' : status === 'warning' ? 'Warning' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-primary" />
              </div>
                             <div>
                 <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                   AI Safety & Ethics
                 </h1>
                 <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                   Manage AI usage policies, ethical behavior controls, and quality oversight
                 </p>
               </div>
            </div>
            

          </div>
        </div>
      </div>

      {/* Persistent Safety Metrics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">AI Safety Performance Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safetyAnalytics.totalScans.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">AI response scans</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Flagged Responses</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safetyAnalytics.flaggedResponses}</div>
              <p className="text-xs text-muted-foreground">Content flagged for review</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safetyAnalytics.avgResponseTime}s</div>
              <p className="text-xs text-muted-foreground">Average processing time</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Safety Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{safetyAnalytics.safetyScore}%</div>
              <p className="text-xs text-muted-foreground">Overall safety rating</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-8 w-fit border-b border-border">
        {[
          { id: 'monitoring', label: 'Monitoring', icon: Eye },
          { id: 'ethics', label: 'Ethics', icon: Brain },
          { id: 'privacy', label: 'Privacy', icon: Lock },
          { id: 'quality', label: 'Quality', icon: CheckCircle }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium transition-all duration-200 border-b-2 ${
              activeTab === tab.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] p-6 bg-gradient-to-br from-white/50 via-white/30 to-gray-50/30 dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-800/30 rounded-2xl border border-border/50">
        {renderTabContent()}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSave}
          className="group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 hover:scale-105"
        >
          <Save className="w-4 h-4 mr-2 group-hover:animate-pulse" />
          Save Safety & Ethics Settings
        </Button>
      </div>
    </div>
  );
};
