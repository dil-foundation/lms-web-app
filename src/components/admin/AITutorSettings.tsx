import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Settings2, 
  Save, 
  Globe, 
  MessageCircle, 
  Brain, 
  Shield, 
  Zap, 
  Target, 
  Users, 
  BookOpen, 
  Sparkles, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Activity,
  Clock,
  Award
} from 'lucide-react';
import { useState } from 'react';

interface AITutorSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AITutorSettings = ({ userProfile }: AITutorSettingsProps) => {
  const [settings, setSettings] = useState({
    urduInput: true,
    autoTranslation: true,
    grammarCorrection: true,
    feedbackTone: 'encouraging',
    roleMode: 'coach',
    adaptiveLearning: true,
    realTimeFeedback: true,
    progressTracking: true,
    safetyFilters: true,
    qualityOversight: true
  });

  const [activeTab, setActiveTab] = useState('general');

  // Mock analytics data
  const analyticsData = {
    activeStudents: 1247,
    avgSessionTime: 24,
    completionRate: 73,
    satisfactionScore: 4.8
  };

  const handleSave = () => {
    // Save logic here
    console.log('Settings saved:', settings);
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="space-y-6">
            {/* General Settings */}
            <SettingCard
              title="General Configuration"
              description="Basic AI Tutor settings and preferences"
              icon={Settings2}
              status="active"
            >
              <div className="space-y-4">
                                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Real-time Feedback</label>
                       <Zap className="w-3 h-3 text-primary" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Enable instant feedback during practice sessions
                     </p>
                   </div>
                   <Switch 
                     checked={settings.realTimeFeedback}
                     onCheckedChange={(checked) => setSettings({...settings, realTimeFeedback: checked})}
                   />
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Progress Tracking</label>
                       <TrendingUp className="w-3 h-3 text-[#1582B4]" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Track student progress and learning analytics
                     </p>
                   </div>
                   <Switch 
                     checked={settings.progressTracking}
                     onCheckedChange={(checked) => setSettings({...settings, progressTracking: checked})}
                   />
                 </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Language & Input Settings"
              description="Configure multilingual support and input preferences"
              icon={Globe}
              status="active"
            >
              <div className="space-y-4">
                                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Allow Urdu Input</label>
                       <Badge variant="outline" className="text-xs">Beta</Badge>
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Enable students to communicate with the AI tutor using Urdu
                     </p>
                   </div>
                   <Switch 
                     checked={settings.urduInput}
                     onCheckedChange={(checked) => setSettings({...settings, urduInput: checked})}
                   />
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Auto-Translation Support</label>
                       <Sparkles className="w-3 h-3 text-[#1582B4]" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Real-time translation between English and Urdu
                     </p>
                   </div>
                   <Switch 
                     checked={settings.autoTranslation}
                     onCheckedChange={(checked) => setSettings({...settings, autoTranslation: checked})}
                   />
                 </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'behavior':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Feedback & Correction"
              description="Configure AI feedback behavior and correction patterns"
              icon={MessageCircle}
              status="active"
            >
              <div className="space-y-4">
                                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Grammar Correction</label>
                       <Target className="w-3 h-3 text-primary" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Real-time grammar correction during practice
                     </p>
                   </div>
                   <Switch 
                     checked={settings.grammarCorrection}
                     onCheckedChange={(checked) => setSettings({...settings, grammarCorrection: checked})}
                   />
                 </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Feedback Tone</label>
                  <Select 
                    value={settings.feedbackTone} 
                    onValueChange={(value) => setSettings({...settings, feedbackTone: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="friendly">Friendly & Supportive</SelectItem>
                      <SelectItem value="formal">Professional & Formal</SelectItem>
                      <SelectItem value="encouraging">Encouraging & Motivational</SelectItem>
                      <SelectItem value="strict">Strict & Academic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingCard>

            <SettingCard
              title="AI Behavior & Role"
              description="Define how the AI tutor interacts with students"
              icon={Brain}
              status="active"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">AI Tutor Role Mode</label>
                  <Select 
                    value={settings.roleMode} 
                    onValueChange={(value) => setSettings({...settings, roleMode: value})}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coach">Coach - Motivational Guide</SelectItem>
                      <SelectItem value="peer">Peer - Collaborative Partner</SelectItem>
                      <SelectItem value="examiner">Examiner - Assessment Focus</SelectItem>
                      <SelectItem value="tutor">Tutor - Traditional Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Adaptive Learning</label>
                       <Zap className="w-3 h-3 text-[#1582B4]" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       AI adapts difficulty based on student performance
                     </p>
                   </div>
                   <Switch 
                     checked={settings.adaptiveLearning}
                     onCheckedChange={(checked) => setSettings({...settings, adaptiveLearning: checked})}
                   />
                 </div>
              </div>
            </SettingCard>
          </div>
        );

      case 'safety':
        return (
          <div className="space-y-6">
            <SettingCard
              title="Safety & Quality Oversight"
              description="Ensure ethical AI behavior and content quality"
              icon={Shield}
              status="active"
            >
              <div className="space-y-4">
                                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Safety Filters</label>
                       <Shield className="w-3 h-3 text-primary" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Content filtering and inappropriate response prevention
                     </p>
                   </div>
                   <Switch 
                     checked={settings.safetyFilters}
                     onCheckedChange={(checked) => setSettings({...settings, safetyFilters: checked})}
                   />
                 </div>

                 <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/5 transition-colors">
                   <div className="space-y-1">
                     <div className="flex items-center gap-2">
                       <label className="text-sm font-medium">Quality Oversight</label>
                       <CheckCircle className="w-3 h-3 text-[#1582B4]" />
                     </div>
                     <p className="text-xs text-muted-foreground">
                       Monitor and maintain response quality standards
                     </p>
                   </div>
                   <Switch 
                     checked={settings.qualityOversight}
                     onCheckedChange={(checked) => setSettings({...settings, qualityOversight: checked})}
                   />
                 </div>
              </div>
            </SettingCard>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-primary" />
              </div>
                             <div>
                 <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-primary leading-[1.2]">
                   AI Tutor Settings
                 </h1>
                 <p className="text-lg text-muted-foreground font-light mt-4 leading-relaxed">
                   Configure intelligent learning behavior and interaction patterns
                 </p>
               </div>
            </div>
            

          </div>
        </div>
      </div>

      {/* Persistent Performance Metrics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">AI Tutor Performance Metrics</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.activeStudents.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Currently learning</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Session Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.avgSessionTime}m</div>
              <p className="text-xs text-muted-foreground">Average duration</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.completionRate}%</div>
              <p className="text-xs text-muted-foreground">Course completion</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analyticsData.satisfactionScore}/5</div>
              <p className="text-xs text-muted-foreground">Student rating</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-8 w-fit border-b border-border">
        {[
          { id: 'general', label: 'General', icon: Settings2 },
          { id: 'language', label: 'Language', icon: Globe },
          { id: 'behavior', label: 'Behavior', icon: Brain },
          { id: 'safety', label: 'Safety', icon: Shield }
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
          Save AI Tutor Settings
        </Button>
      </div>
    </div>
  );
};
