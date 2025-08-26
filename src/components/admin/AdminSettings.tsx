import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Settings, 
  Server, 
  Bell,
  Save,
  RefreshCw,
  Loader2
} from 'lucide-react';
import AdminSettingsService, { type AdminSettings } from '@/services/adminSettingsService';

const AdminSettings: React.FC = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [settings, setSettings] = useState({
    // System Settings
    systemName: 'DIL Learning Platform',
    maintenanceMode: false,
    
    // Notifications
    systemNotifications: true,
    pushNotifications: false
  });
  const [originalSettings, setOriginalSettings] = useState(settings);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const dbSettings = await AdminSettingsService.getSettings();
      
      // Convert database format to component format
      const componentSettings = {
        systemName: dbSettings.system_name,
        maintenanceMode: dbSettings.maintenance_mode,
        systemNotifications: dbSettings.system_notifications,
        pushNotifications: dbSettings.push_notifications
      };
      
      setSettings(componentSettings);
      setOriginalSettings(componentSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert component format to database format
      const dbSettings = {
        system_name: settings.systemName,
        maintenance_mode: settings.maintenanceMode,
        system_notifications: settings.systemNotifications,
        email_notifications: true, // Keep email notifications enabled in database
        push_notifications: settings.pushNotifications
      };

      await AdminSettingsService.updateSettings(dbSettings);
      setOriginalSettings(settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      // Load current settings from database (this will restore the original values)
      const currentSettings = await AdminSettingsService.getSettings();
      
      // Convert database format to component format
      const componentSettings = {
        systemName: currentSettings.system_name,
        maintenanceMode: currentSettings.maintenance_mode,
        systemNotifications: currentSettings.system_notifications,
        pushNotifications: currentSettings.push_notifications
      };
      
      setSettings(componentSettings);
      setOriginalSettings(componentSettings);
      toast.success('Settings reset successfully');
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setResetting(false);
    }
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-lg">Loading settings...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Settings</h1>
            <p className="text-muted-foreground">Configure system-wide settings and preferences</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={resetting || saving || loading}
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {resetting ? 'Resetting...' : 'Reset'}
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || resetting || loading || !hasUnsavedChanges}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="systemName">System Name</Label>
                <Input
                  id="systemName"
                  value={settings.systemName}
                  onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                  disabled={saving || resetting}
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Maintenance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Temporarily disable access for maintenance
                    </p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({...settings, maintenanceMode: checked})}
                    disabled={saving || resetting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>



        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notification Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>System Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable system-wide notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.systemNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, systemNotifications: checked})}
                    disabled={saving || resetting}
                  />
                </div>
                

                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Real Time Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send real-time notifications
                    </p>
                  </div>
                  <Switch
                    checked={settings.pushNotifications}
                    onCheckedChange={(checked) => setSettings({...settings, pushNotifications: checked})}
                    disabled={saving || resetting}
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

export default AdminSettings;
