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
  const displayData: Record<string, { description: string; icon: React.ElementType; category: 'Communication' | 'Payment' | 'Productivity'; displayName?: string }> = {
    'Zoom': {
      description: 'Virtual classroom and video conferencing solution for online learning and student meetings.',
      icon: Video,
      category: 'Communication',
      displayName: 'Zoom'
    },
    'zoom': {
      description: 'Virtual classroom and video conferencing solution for online learning and student meetings.',
      icon: Video,
      category: 'Communication',
      displayName: 'Zoom'
    },
    'Stripe': {
      description: 'Payment processing for course enrollments and subscriptions',
      icon: CreditCard,
      category: 'Payment',
      displayName: 'Stripe'
    }
  };

  const defaultData = {
    description: 'External service integration',
    icon: Plug,
    category: 'Productivity' as const
  };

  const data = displayData[integration.name] || displayData[integration.name.toLowerCase()] || defaultData;
  
  return {
    ...integration,
    ...data,
    name: data.displayName || integration.name
  };
};

const getStatusColor = (status: Integration['status']) => {
  switch (status) {
    case 'enabled':
      return 'bg-primary/10 text-primary dark:text-primary';
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
    if (!integration) {
      console.error('Integration not found:', integrationId);
      return;
    }

    const newStatus = integration.status === 'enabled' ? 'disabled' : 'enabled';
    
    console.log('Toggling integration:', {
      id: integrationId,
      name: integration.name,
      currentStatus: integration.status,
      newStatus
    });
    
    try {
      await integrationService.updateIntegrationStatus(integrationId, newStatus);
      console.log('Database update successful');
      
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
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-4 md:p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Plug className="w-5 h-5 md:w-6 md:h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Integration APIs
                </h1>
                <p className="text-sm md:text-lg text-muted-foreground font-light">
                  Central hub to manage connections with external tools and services
                </p>
              </div>
            </div>
          </div>
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
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.active}
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
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
        
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
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
            <Card key={integration.id} className="relative overflow-hidden flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl">
                      <IntegrationIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold">{integration.name}</CardTitle>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {integration.category}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Status Toggle in top right */}
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integration.status === 'enabled'}
                      onCheckedChange={() => handleToggleIntegration(integration.id)}
                    />
                  </div>
                </div>
                
                {/* Status Badge below header */}
                <div className="mt-3">
                  <Badge className={getStatusColor(integration.status)} variant="secondary">
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {integration.status}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between pt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {integration.description}
                  </p>
                  
                  {integration.status === 'error' && (
                    <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 dark:text-red-200">
                        Connection error. Please check configuration and try again.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                {/* Configuration Details - Always at bottom */}
                <div className="bg-muted/30 rounded-lg p-3 space-y-2 mt-4">
                  {integration.version && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-medium">{integration.version}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync:</span>
                    <span className="font-medium">{formatLastSync(integration.last_sync)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Configured:</span>
                    <span className={`font-medium ${integration.is_configured ? 'text-primary' : 'text-muted-foreground'}`}>
                      {integration.is_configured ? 'Yes' : 'No'}
                    </span>
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