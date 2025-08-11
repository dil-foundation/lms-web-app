import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Save, 
  Globe, 
  Users, 
  Shield, 
  Brain, 
  BarChart3, 
  Database, 
  Bell, 
  Upload,
  Download,
  Activity,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lock,
  Eye,
  Zap,
  Target,
  TrendingUp,
  FileText,
  Mail,
  Smartphone,
  Monitor,
  Server,
  BookOpen,
  MessageSquare,
  GraduationCap,
  Target as TargetIcon,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAILMS } from '@/contexts/AILMSContext';

const AdminSettings: React.FC = () => {
  console.log('🚀 AdminSettings component function called');
  const { user } = useAuth();
  const { profile, loading } = useUserProfile();
  const { isAIMode, isLMSMode } = useAILMS();
  const [activeTab, setActiveTab] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  
  // System Configuration
  const [systemConfig, setSystemConfig] = useState({
    siteName: 'Digital Innovation Learning',
    siteDescription: 'Advanced Learning Management System with AI-Powered Tutoring',
    defaultLanguage: 'en',
    defaultTimezone: 'UTC',
    maxFileSize: '50',
    maxUsers: '10000',
    maintenanceMode: false,
    allowGuestAccess: false,
    enableAnalytics: true,
    enableAuditLogs: true
  });

  // User Management Settings
  const [userSettings, setUserSettings] = useState({
    autoUserApproval: false,
    requireEmailVerification: true,
    defaultUserRole: 'student',
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    enableTwoFactor: true,
    allowProfileUpdates: true,
    enableUserImports: true
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    passwordMinLength: '8',
    requireSpecialChars: true,
    enableBruteForceProtection: true,
    enableIPWhitelist: false,
    enableSessionEncryption: true,
    enableAuditTrail: true,
    dataRetentionDays: '365'
  });

  // AI & ML Settings
  const [aiSettings, setAiSettings] = useState({
    enableAITutoring: true,
    enableBiasMonitoring: true,
    enableContentModeration: true,
    aiResponseTimeout: '10',
    enableAIAnalytics: true,
    enableCustomPrompts: false,
    aiSafetyLevel: 'high',
    enableLearningAdaptation: true
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    systemNotifications: true,
    smsNotifications: false,
    pushNotifications: true,
    weeklyReports: true,
    securityAlerts: true,
    userActivityDigest: false
  });

  // Performance & Analytics
  const [performanceSettings, setPerformanceSettings] = useState({
    enableRealTimeMonitoring: true,
    enablePerformanceMetrics: true,
    enableUserAnalytics: true,
    enableCourseAnalytics: true,
    enablePredictiveAnalytics: true,
    dataExportFrequency: 'weekly',
    enableAPIMonitoring: true
  });

  // AI-Specific Settings
  const [aiTutorSettings, setAiTutorSettings] = useState({
    enableAITutoring: true,
    aiModelVersion: 'gpt-4',
    responseTimeout: '15',
    maxConversationLength: '50',
    enableVoiceInteraction: true,
    enableMultilingualSupport: true,
    difficultyScaling: 'adaptive',
    enablePersonalizedLearning: true,
    aiPersonality: 'friendly',
    enableBiasMonitoring: true,
    contentModerationLevel: 'strict',
    enableLearningAnalytics: true,
    aiResponseStyle: 'conversational'
  });

  // LMS-Specific Settings
  const [lmsSettings, setLmsSettings] = useState({
    maxCoursesPerUser: '10',
    maxFileSize: '100',
    enableDiscussionForums: true,
    enableAssignmentSubmission: true,
    enableGradebook: true,
    enableCourseTemplates: true,
    enableBulkUserImport: true,
    enableAdvancedReporting: true,
    enableCourseAnalytics: true,
    enableUserProgressTracking: true,
    enableCertificateGeneration: true,
    enableOfflineMode: false
  });
  
  useEffect(() => {
    console.log('🔧 AdminSettings component mounted successfully');
    console.log('👤 Current user:', user);
    console.log('👥 User profile:', profile);
    console.log('🎭 User role:', profile?.role);
    console.log('⏳ Loading state:', loading);
    console.log('🤖 AI Mode:', isAIMode);
    console.log('📚 LMS Mode:', isLMSMode);
  }, [user, profile, loading, isAIMode, isLMSMode]);

  // Set default active tab based on mode
  useEffect(() => {
    if (isAIMode) {
      setActiveTab('ai-tutor');
    } else {
      setActiveTab('lms');
    }
  }, [isAIMode]);

  // Check if user has admin access based on their role
  const hasAdminAccess = profile?.role === 'admin';

  // If still loading, show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading admin settings...</p>
          <p className="text-sm text-gray-500 mt-2">Loading state: {loading}</p>
          <p className="text-sm text-gray-500">Profile: {profile ? 'Loaded' : 'Not loaded'}</p>
          <p className="text-sm text-gray-500">User: {user ? 'Authenticated' : 'Not authenticated'}</p>
        </div>
      </div>
    );
  }

  // If no admin access, show access denied message
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You don't have permission to access Admin Settings. This area is restricted to administrators only.
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-left">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Current User:</strong> {user?.email || 'Unknown'}<br/>
              <strong>User Role:</strong> {profile?.role || 'Not available'}<br/>
              <strong>Required Role:</strong> Administrator<br/>
              <strong>Contact:</strong> Your system administrator
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSave = async (section: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`${section} settings saved successfully!`);
      
      // Here you would typically make an API call to save the settings
      console.log(`Saving ${section} settings:`, {
        systemConfig,
        userSettings,
        securitySettings,
        aiSettings,
        notificationSettings,
        performanceSettings
      });
    } catch (error) {
      toast.error(`Failed to save ${section} settings`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    setIsLoading(true);
    try {
      const savePromises = [
        handleSave('System'),
        handleSave('User Management'),
        handleSave('Security'),
        handleSave('Notifications'),
        handleSave('Performance')
      ];

      // Add mode-specific settings
      if (isAIMode) {
        savePromises.push(handleSave('AI Tutor'));
      } else {
        savePromises.push(handleSave('LMS'));
      }

      await Promise.all(savePromises);
      toast.success('All settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save some settings');
    } finally {
      setIsLoading(false);
    }
  };

  const getSystemHealth = () => {
    return {
      status: 'healthy',
      uptime: '99.9%',
      activeUsers: 1247,
      systemLoad: '23%',
      databaseConnections: 45,
      lastBackup: '2 hours ago'
    };
  };

  const systemHealth = getSystemHealth();

  return (
    <div className="space-y-8 mx-auto max-w-7xl">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
      <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl flex items-center justify-center shadow-lg">
                <Settings className="w-8 h-8 text-primary" />
              </div>
        <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                  Admin Settings
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                  {isAIMode 
                    ? 'Configure AI Tutor settings, safety policies, and learning behavior'
                    : 'Configure LMS settings, course policies, and platform behavior'
                  }
                </p>
                <div className="mt-3">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                    {isAIMode ? 'AI Tutor Mode' : 'LMS Mode'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* System Health Indicator */}
              <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-700/30">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                  System: {systemHealth.status}
                </span>
        </div>
              
              <Button 
                onClick={handleSaveAll} 
                disabled={isLoading}
                className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save All Changes
                  </>
                )}
        </Button>
      </div>
          </div>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.uptime}</div>
            <p className="text-xs text-muted-foreground">
              Platform availability
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Load</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.systemLoad}</div>
            <p className="text-xs text-muted-foreground">
              Current performance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Backup</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.lastBackup}</div>
            <p className="text-xs text-muted-foreground">
              Data protection
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isAIMode ? 'grid-cols-5' : 'grid-cols-6'} bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl`}>
          <TabsTrigger 
            value="general" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <Globe className="w-4 h-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger 
            value="users" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <Users className="w-4 h-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger 
            value="security" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <Shield className="w-4 h-4 mr-2" />
            Security
          </TabsTrigger>
          {isAIMode ? (
            <TabsTrigger 
              value="ai-tutor" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
            >
              <Brain className="w-4 h-4 mr-2" />
              AI Tutor
            </TabsTrigger>
          ) : (
            <TabsTrigger 
              value="lms" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              LMS
            </TabsTrigger>
          )}
          <TabsTrigger 
            value="notifications" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                System Configuration
            </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure basic system settings and platform behavior
              </CardDescription>
          </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="siteName" className="text-base font-semibold text-gray-900 dark:text-gray-100">Site Name</Label>
                <Input
                  id="siteName"
                    value={systemConfig.siteName}
                    onChange={(e) => setSystemConfig({...systemConfig, siteName: e.target.value})}
                  placeholder="Enter site name"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
                <div className="space-y-3">
                  <Label htmlFor="defaultLanguage" className="text-base font-semibold text-gray-900 dark:text-gray-100">Default Language</Label>
                  <Select value={systemConfig.defaultLanguage} onValueChange={(value) => setSystemConfig({...systemConfig, defaultLanguage: value})}>
                    <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                    <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                      <SelectItem value="en" className="text-base py-3 hover:bg-primary/5 rounded-xl">English</SelectItem>
                      <SelectItem value="es" className="text-base py-3 hover:bg-primary/5 rounded-xl">Spanish</SelectItem>
                      <SelectItem value="fr" className="text-base py-3 hover:bg-primary/5 rounded-xl">French</SelectItem>
                      <SelectItem value="de" className="text-base py-3 hover:bg-primary/5 rounded-xl">German</SelectItem>
                      <SelectItem value="ar" className="text-base py-3 hover:bg-primary/5 rounded-xl">Arabic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

              <div className="space-y-3">
                <Label htmlFor="siteDescription" className="text-base font-semibold text-gray-900 dark:text-gray-100">Site Description</Label>
              <Textarea
                id="siteDescription"
                  value={systemConfig.siteDescription}
                  onChange={(e) => setSystemConfig({...systemConfig, siteDescription: e.target.value})}
                placeholder="Enter site description"
                rows={3}
                  className="text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10 resize-none"
              />
            </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="maxFileSize" className="text-base font-semibold text-gray-900 dark:text-gray-100">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                    value={systemConfig.maxFileSize}
                    onChange={(e) => setSystemConfig({...systemConfig, maxFileSize: e.target.value})}
                    placeholder="50"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="maxUsers" className="text-base font-semibold text-gray-900 dark:text-gray-100">Max Users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    value={systemConfig.maxUsers}
                    onChange={(e) => setSystemConfig({...systemConfig, maxUsers: e.target.value})}
                    placeholder="10000"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Maintenance Mode</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Put the platform in maintenance mode</p>
                </div>
                <Switch
                    checked={systemConfig.maintenanceMode}
                    onCheckedChange={(checked) => setSystemConfig({...systemConfig, maintenanceMode: checked})}
                    className="data-[state=checked]:bg-primary"
                />
              </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Analytics</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Collect and analyze user behavior data</p>
                </div>
                <Switch
                    checked={systemConfig.enableAnalytics}
                    onCheckedChange={(checked) => setSystemConfig({...systemConfig, enableAnalytics: checked})}
                    className="data-[state=checked]:bg-primary"
                />
              </div>
            </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('System')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save System Settings
                </Button>
              </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* Users Settings Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                User Management Settings
            </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure user registration, roles, and session management
              </CardDescription>
          </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="defaultUserRole" className="text-base font-semibold text-gray-900 dark:text-gray-100">Default User Role</Label>
                  <Select value={userSettings.defaultUserRole} onValueChange={(value) => setUserSettings({...userSettings, defaultUserRole: value})}>
                    <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                      <SelectItem value="student" className="text-base py-3 hover:bg-primary/5 rounded-xl">Student</SelectItem>
                      <SelectItem value="teacher" className="text-base py-3 hover:bg-primary/5 rounded-xl">Teacher</SelectItem>
                      <SelectItem value="admin" className="text-base py-3 hover:bg-primary/5 rounded-xl">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="sessionTimeout" className="text-base font-semibold text-gray-900 dark:text-gray-100">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={userSettings.sessionTimeout}
                    onChange={(e) => setUserSettings({...userSettings, sessionTimeout: e.target.value})}
                    placeholder="30"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Auto User Approval</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Automatically approve new user registrations</p>
                  </div>
                  <Switch
                    checked={userSettings.autoUserApproval}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, autoUserApproval: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Two-Factor Authentication</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Require 2FA for all users</p>
                  </div>
                  <Switch
                    checked={userSettings.enableTwoFactor}
                    onCheckedChange={(checked) => setUserSettings({...userSettings, enableTwoFactor: checked})}
                    className="data-[state=checked]:bg-primary"
                />
              </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('User Management')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save User Settings
              </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* Security Settings Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                Security Configuration
              </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure security policies, password requirements, and access controls
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="passwordMinLength" className="text-base font-semibold text-gray-900 dark:text-gray-100">Minimum Password Length</Label>
                  <Input
                    id="passwordMinLength"
                    type="number"
                    value={securitySettings.passwordMinLength}
                    onChange={(e) => setSecuritySettings({...securitySettings, passwordMinLength: e.target.value})}
                    placeholder="8"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="dataRetentionDays" className="text-base font-semibold text-gray-900 dark:text-gray-100">Data Retention (days)</Label>
                  <Input
                    id="dataRetentionDays"
                    type="number"
                    value={securitySettings.dataRetentionDays}
                    onChange={(e) => setSecuritySettings({...securitySettings, dataRetentionDays: e.target.value})}
                    placeholder="365"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
      </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Require Special Characters</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enforce complex password requirements</p>
              </div>
              <Switch
                    checked={securitySettings.requireSpecialChars}
                    onCheckedChange={(checked) => setSecuritySettings({...securitySettings, requireSpecialChars: checked})}
                    className="data-[state=checked]:bg-primary"
              />
            </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Audit Trail</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Log all system activities for security monitoring</p>
              </div>
              <Switch
                    checked={securitySettings.enableAuditTrail}
                    onCheckedChange={(checked) => setSecuritySettings({...securitySettings, enableAuditTrail: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('Security')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Security Settings
                </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* AI Tutor Settings Tab */}
        <TabsContent value="ai-tutor" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                AI Tutor Configuration
            </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure AI tutoring behavior, safety measures, and learning adaptation
              </CardDescription>
          </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="aiModelVersion" className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Model Version</Label>
                  <Select value={aiTutorSettings.aiModelVersion} onValueChange={(value) => setAiTutorSettings({...aiTutorSettings, aiModelVersion: value})}>
                    <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                      <SelectItem value="gpt-4" className="text-base py-3 hover:bg-primary/5 rounded-xl">GPT-4 (Latest)</SelectItem>
                      <SelectItem value="gpt-3.5" className="text-base py-3 hover:bg-primary/5 rounded-xl">GPT-3.5 (Fast)</SelectItem>
                      <SelectItem value="claude" className="text-base py-3 hover:bg-primary/5 rounded-xl">Claude (Alternative)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="responseTimeout" className="text-base font-semibold text-gray-900 dark:text-gray-100">Response Timeout (seconds)</Label>
                  <Input
                    id="responseTimeout"
                    type="number"
                    value={aiTutorSettings.responseTimeout}
                    onChange={(e) => setAiTutorSettings({...aiTutorSettings, responseTimeout: e.target.value})}
                    placeholder="15"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="difficultyScaling" className="text-base font-semibold text-gray-900 dark:text-gray-100">Difficulty Scaling</Label>
                  <Select value={aiTutorSettings.difficultyScaling} onValueChange={(value) => setAiTutorSettings({...aiTutorSettings, difficultyScaling: value})}>
                    <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="Select scaling" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                      <SelectItem value="adaptive" className="text-base py-3 hover:bg-primary/5 rounded-xl">Adaptive (Recommended)</SelectItem>
                      <SelectItem value="fixed" className="text-base py-3 hover:bg-primary/5 rounded-xl">Fixed Level</SelectItem>
                      <SelectItem value="progressive" className="text-base py-3 hover:bg-primary/5 rounded-xl">Progressive Increase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="aiPersonality" className="text-base font-semibold text-gray-900 dark:text-gray-100">AI Personality</Label>
                  <Select value={aiTutorSettings.aiPersonality} onValueChange={(value) => setAiTutorSettings({...aiTutorSettings, aiPersonality: value})}>
                    <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="Select personality" />
                </SelectTrigger>
                    <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                      <SelectItem value="friendly" className="text-base py-3 hover:bg-primary/5 rounded-xl">Friendly & Encouraging</SelectItem>
                      <SelectItem value="professional" className="text-base py-3 hover:bg-primary/5 rounded-xl">Professional & Formal</SelectItem>
                      <SelectItem value="casual" className="text-base py-3 hover:bg-primary/5 rounded-xl">Casual & Relaxed</SelectItem>
                </SelectContent>
              </Select>
            </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Voice Interaction</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Allow students to interact via voice</p>
                  </div>
                  <Switch
                    checked={aiTutorSettings.enableVoiceInteraction}
                    onCheckedChange={(checked) => setAiTutorSettings({...aiTutorSettings, enableVoiceInteraction: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Personalized Learning</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Adapt AI responses to individual learning styles</p>
                  </div>
                  <Switch
                    checked={aiTutorSettings.enablePersonalizedLearning}
                    onCheckedChange={(checked) => setAiTutorSettings({...aiTutorSettings, enablePersonalizedLearning: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Bias Monitoring</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Monitor AI responses for potential bias</p>
                  </div>
                  <Switch
                    checked={aiTutorSettings.enableBiasMonitoring}
                    onCheckedChange={(checked) => setAiTutorSettings({...aiTutorSettings, enableBiasMonitoring: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('AI Tutor')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save AI Tutor Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LMS Settings Tab */}
        <TabsContent value="lms" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                LMS Configuration
              </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure course management, user limits, and learning platform behavior
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="maxCoursesPerUser" className="text-base font-semibold text-gray-900 dark:text-gray-100">Max Courses Per User</Label>
                  <Input
                    id="maxCoursesPerUser"
                    type="number"
                    value={lmsSettings.maxCoursesPerUser}
                    onChange={(e) => setLmsSettings({...lmsSettings, maxCoursesPerUser: e.target.value})}
                    placeholder="10"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="maxFileSize" className="text-base font-semibold text-gray-900 dark:text-gray-100">Max File Size (MB)</Label>
              <Input
                    id="maxFileSize"
                type="number"
                    value={lmsSettings.maxFileSize}
                    onChange={(e) => setLmsSettings({...lmsSettings, maxFileSize: e.target.value})}
                    placeholder="100"
                    className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Discussion Forums</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Allow students to participate in course discussions</p>
                  </div>
                  <Switch
                    checked={lmsSettings.enableDiscussionForums}
                    onCheckedChange={(checked) => setLmsSettings({...lmsSettings, enableDiscussionForums: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Assignment Submission</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Allow students to submit assignments online</p>
                  </div>
                  <Switch
                    checked={lmsSettings.enableAssignmentSubmission}
                    onCheckedChange={(checked) => setLmsSettings({...lmsSettings, enableAssignmentSubmission: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Gradebook</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Track and display student grades and progress</p>
                  </div>
                  <Switch
                    checked={lmsSettings.enableGradebook}
                    onCheckedChange={(checked) => setLmsSettings({...lmsSettings, enableGradebook: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Enable Course Templates</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Provide pre-built course structure templates</p>
                  </div>
                  <Switch
                    checked={lmsSettings.enableCourseTemplates}
                    onCheckedChange={(checked) => setLmsSettings({...lmsSettings, enableCourseTemplates: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('LMS')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save LMS Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure system notifications and communication preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Email Notifications</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Send important updates via email</p>
                  </div>
                  <Switch
                    checked={notificationSettings.emailNotifications}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, emailNotifications: checked})}
                    className="data-[state=checked]:bg-primary"
              />
            </div>
                
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Security Alerts</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Receive immediate security notifications</p>
              </div>
              <Switch
                    checked={notificationSettings.securityAlerts}
                    onCheckedChange={(checked) => setNotificationSettings({...notificationSettings, securityAlerts: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('Notifications')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Notification Settings
                </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* Performance Settings Tab */}
        <TabsContent value="performance" className="space-y-6">
          <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
            <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                Performance & Analytics
              </CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-300 mt-1">
                Configure performance monitoring and analytics collection
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label htmlFor="dataExportFrequency" className="text-base font-semibold text-gray-900 dark:text-gray-100">Data Export Frequency</Label>
                  <Select value={performanceSettings.dataExportFrequency} onValueChange={(value) => setPerformanceSettings({...performanceSettings, dataExportFrequency: value})}>
                    <SelectTrigger className="h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl bg-white dark:bg-gray-800">
                      <SelectItem value="daily" className="text-base py-3 hover:bg-primary/5 rounded-xl">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-base py-3 hover:bg-primary/5 rounded-xl">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-base py-3 hover:bg-primary/5 rounded-xl">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Real-Time Monitoring</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Monitor system performance in real-time</p>
                  </div>
                  <Switch
                    checked={performanceSettings.enableRealTimeMonitoring}
                    onCheckedChange={(checked) => setPerformanceSettings({...performanceSettings, enableRealTimeMonitoring: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
      </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                  <div className="space-y-1">
                    <Label className="text-base font-semibold text-gray-900 dark:text-gray-100">Predictive Analytics</Label>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Enable AI-powered predictive insights</p>
                  </div>
                  <Switch
                    checked={performanceSettings.enablePredictiveAnalytics}
                    onCheckedChange={(checked) => setPerformanceSettings({...performanceSettings, enablePredictiveAnalytics: checked})}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button 
                  onClick={() => handleSave('Performance')}
                  disabled={isLoading}
                  className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Performance Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}; 

export default AdminSettings;