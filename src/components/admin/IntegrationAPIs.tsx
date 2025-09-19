import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Plug, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Video,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';

interface IntegrationAPIsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'Communication' | 'Payment' | 'Productivity';
  status: 'enabled' | 'disabled' | 'error';
  isConfigured: boolean;
  lastSync?: string;
  version?: string;
  settings?: {
    apiKey?: string;
    webhookUrl?: string;
    [key: string]: any;
  };
}

const mockIntegrations: Integration[] = [
  {
    id: 'zoom',
    name: 'Zoom',
    description: 'Video conferencing and virtual classroom integration',
    icon: Video,
    category: 'Communication',
    status: 'enabled',
    isConfigured: true,
    lastSync: '2024-01-15T10:30:00Z',
    version: 'v5.17.0',
    settings: {
      apiKey: '****-****-****-1234',
      webhookUrl: 'https://your-domain.com/webhooks/zoom'
    }
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing for course enrollments and subscriptions',
    icon: CreditCard,
    category: 'Payment',
    status: 'enabled',
    isConfigured: true,
    lastSync: '2024-01-15T09:15:00Z',
    version: 'v2023-10-16',
    settings: {
      apiKey: '****-****-****-5678',
      webhookUrl: 'https://your-domain.com/webhooks/stripe'
    }
  }
];

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
  const [integrations, setIntegrations] = useState<Integration[]>(mockIntegrations);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [configureIntegration, setConfigureIntegration] = useState<Integration | null>(null);
  const [configForm, setConfigForm] = useState<Record<string, string>>({});

  const categories = ['all', 'Communication', 'Payment'];
  
  const filteredIntegrations = selectedCategory === 'all' 
    ? integrations 
    : integrations.filter(integration => integration.category === selectedCategory);

  const handleToggleIntegration = (integrationId: string) => {
    setIntegrations(prev => prev.map(integration => {
      if (integration.id === integrationId) {
        const newStatus = integration.status === 'enabled' ? 'disabled' : 'enabled';
        toast.success(`${integration.name} ${newStatus === 'enabled' ? 'enabled' : 'disabled'} successfully`);
        return { ...integration, status: newStatus };
      }
      return integration;
    }));
  };

  const handleConfigureIntegration = (integration: Integration) => {
    setConfigureIntegration(integration);
    setConfigForm(integration.settings || {});
  };

  const handleSaveConfiguration = () => {
    if (!configureIntegration) return;

    setIntegrations(prev => prev.map(integration => {
      if (integration.id === configureIntegration.id) {
        return {
          ...integration,
          settings: configForm,
          isConfigured: Object.keys(configForm).length > 0,
          lastSync: new Date().toISOString()
        };
      }
      return integration;
    }));

    toast.success(`${configureIntegration.name} configuration saved successfully`);
    setConfigureIntegration(null);
    setConfigForm({});
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never';
    return new Date(lastSync).toLocaleString();
  };

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
            <div className="text-2xl font-bold">{integrations.length}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-card to-blue-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {integrations.filter(i => i.status === 'enabled').length}
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
              {integrations.filter(i => i.isConfigured).length}
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
              {integrations.filter(i => i.status === 'error').length}
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
                    <span>{formatLastSync(integration.lastSync)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Configured:</span>
                    <span>{integration.isConfigured ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={integration.status === 'enabled'}
                      onCheckedChange={() => handleToggleIntegration(integration.id)}
                      disabled={!integration.isConfigured}
                    />
                    <Label className="text-sm">
                      {integration.status === 'enabled' ? 'Enabled' : 'Disabled'}
                    </Label>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConfigureIntegration(integration)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={!!configureIntegration} onOpenChange={() => setConfigureIntegration(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              {configureIntegration && (
                <>
                  <configureIntegration.icon className="h-5 w-5" />
                  <span>Configure {configureIntegration.name}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              Set up your {configureIntegration?.name} integration settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {configureIntegration?.id === 'zoom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Enter your Zoom API key"
                    value={configForm.apiKey || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook URL</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://your-domain.com/webhooks/zoom"
                    value={configForm.webhookUrl || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  />
                </div>
              </>
            )}
            
            {configureIntegration?.id === 'stripe' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Secret Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    placeholder="sk_test_..."
                    value={configForm.apiKey || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="webhookUrl">Webhook Endpoint</Label>
                  <Input
                    id="webhookUrl"
                    placeholder="https://your-domain.com/webhooks/stripe"
                    value={configForm.webhookUrl || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  />
                </div>
              </>
            )}
            
            {configureIntegration?.id === 'google-classroom' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">Google API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder="Enter your Google Classroom API key"
                    value={configForm.apiKey || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientId">Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="Enter your Google OAuth Client ID"
                    value={configForm.clientId || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, clientId: e.target.value }))}
                  />
                </div>
              </>
            )}
            
            {configureIntegration && ['canvas-lti', 'moodle'].includes(configureIntegration.id) && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    placeholder={`Enter your ${configureIntegration.name} API key`}
                    value={configForm.apiKey || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder={`https://your-${configureIntegration.id}.com`}
                    value={configForm.baseUrl || ''}
                    onChange={(e) => setConfigForm(prev => ({ ...prev, baseUrl: e.target.value }))}
                  />
                </div>
              </>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigureIntegration(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfiguration}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};