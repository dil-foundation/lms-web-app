import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Plug, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Video,
  CreditCard,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { integrationService, type Integration, type IntegrationStats } from '@/services/integrationService';

interface IntegrationAPIsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

interface IntegrationDisplay extends Integration {
  description: string;
  icon: React.ElementType;
  category: 'Communication' | 'Payment' | 'Productivity';
}

// Helper function to get integration display data
const getIntegrationDisplayData = (integration: Integration): IntegrationDisplay => {
  const displayData: Record<string, { description: string; icon: React.ElementType; category: 'Communication' | 'Payment' | 'Productivity' }> = {
    'Zoom': {
      description: 'Video conferencing and virtual classroom integration',
      icon: Video,
      category: 'Communication'
    },
    'Stripe': {
      description: 'Payment processing for course enrollments and subscriptions',
      icon: CreditCard,
      category: 'Payment'
    }
  };

  const defaultData = {
    description: 'External service integration',
    icon: Plug,
    category: 'Productivity' as const
  };

  const data = displayData[integration.name] || defaultData;
  
  return {
    ...integration,
    ...data
  };
};

const getStatusColor = (status: Integration['status']) => {
  switch (status) {
    case 'enabled':
      return 'bg-green-500/10 text-green-700 dark:text-green-400';
    case 'disabled':
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
    case 'error':
      return 'bg-red-500/10 text-red-700 dark:text-red-400';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400';
  }
};

const getStatusIcon = (status: Integration['status']) => {
  switch (status) {
    case 'enabled':
      return CheckCircle;
    case 'disabled':
      return XCircle;
    case 'error':
      return AlertTriangle;
    default:
      return XCircle;
  }
};

export const IntegrationAPIs = ({ userProfile }: IntegrationAPIsProps) => {
  const [integrations, setIntegrations] = useState<IntegrationDisplay[]>([]);
  const [stats, setStats] = useState<IntegrationStats>({ total: 0, active: 0, configured: 0, errors: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = ['all', 'Communication', 'Payment'];
  
  const filteredIntegrations = selectedCategory === 'all' 
    ? integrations 
    : integrations.filter(integration => integration.category === selectedCategory);

  // Load integrations on component mount
  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        setLoading(true);
        
        // Load integrations and stats first
        const [integrationsData, statsData] = await Promise.all([
          integrationService.getIntegrations(),
          integrationService.getIntegrationStats()
        ]);
        
        // If no integrations exist, initialize defaults
        if (integrationsData.length === 0) {
          await integrationService.initializeDefaultIntegrations();
          
          // Reload after initialization
          const [newIntegrationsData, newStatsData] = await Promise.all([
            integrationService.getIntegrations(),
            integrationService.getIntegrationStats()
          ]);
          
          const displayIntegrations = newIntegrationsData.map(getIntegrationDisplayData);
          setIntegrations(displayIntegrations);
          setStats(newStatsData);
        } else {
          // Map to display format
          const displayIntegrations = integrationsData.map(getIntegrationDisplayData);
          setIntegrations(displayIntegrations);
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error loading integrations:', error);
        toast.error('Failed to load integrations');
      } finally {
        setLoading(false);
      }
    };

    loadIntegrations();
  }, []);

  const handleToggleIntegration = async (integrationId: string) => {
    const integration = integrations.find(i => i.id === integrationId);
    if (!integration) return;

    const newStatus = integration.status === 'enabled' ? 'disabled' : 'enabled';
    
    try {
      await integrationService.updateIntegrationStatus(integrationId, newStatus);
      
      setIntegrations(prev => prev.map(integration => {
        if (integration.id === integrationId) {
          return { ...integration, status: newStatus };
        }
        return integration;
      }));
      
      // Update stats
      const updatedStats = await integrationService.getIntegrationStats();
      setStats(updatedStats);
      
      toast.success(`${integration.name} ${newStatus === 'enabled' ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling integration:', error);
      toast.error('Failed to update integration status');
    }
  };


  const formatLastSync = (lastSync?: string | null) => {
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Integration APIs
          </h1>
          <p className="text-muted-foreground">
            Central hub to manage connections with external tools and services
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Integrations</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-blue-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-yellow-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configured</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.configured}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-red-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.errors}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredIntegrations.map((integration) => {
          const StatusIcon = getStatusIcon(integration.status);
          const IntegrationIcon = integration.icon;
          
          return (
            <Card key={integration.id} className="relative">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-muted rounded-lg">
                      <IntegrationIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <Badge variant="outline" className="mt-1">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(integration.status)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {integration.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
                
                {integration.status === 'error' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Connection error. Please check configuration and try again.
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2 text-sm">
                  {integration.version && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span>{integration.version}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span>{formatLastSync(integration.last_sync)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Configured:</span>
                    <span>{integration.is_configured ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integration.status === 'enabled'}
                      onCheckedChange={() => handleToggleIntegration(integration.id)}
                    />
                    <Label className="text-sm">
                      {integration.status === 'enabled' ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};