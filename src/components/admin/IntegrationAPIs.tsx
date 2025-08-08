import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Plug, 
  Search, 
  Info, 
  CheckCircle, 
  Clock, 
  XCircle,
  Users,
  MessageSquare,
  Video,
  Building,
  Shield,
  UserCheck
} from 'lucide-react';

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
  icon: any;
  status: 'connected' | 'pending' | 'error' | 'disconnected';
  category: string;
  lastSync?: string;
}

export const IntegrationAPIs = ({ userProfile }: IntegrationAPIsProps) => {
  // Mock data for integrations
  const integrations: Integration[] = [
    {
      id: 'sso',
      name: 'Single Sign-On (SSO)',
      description: 'Enable seamless authentication with your organization\'s identity provider',
      icon: Shield,
      status: 'connected',
      category: 'Authentication',
      lastSync: '2 hours ago'
    },
    {
      id: 'hr-system',
      name: 'HR Management System',
      description: 'Sync employee data and organizational structure automatically',
      icon: Users,
      status: 'pending',
      category: 'HR & People',
    },
    {
      id: 'crm',
      name: 'Customer Relationship Management',
      description: 'Integrate customer data and training records with your CRM',
      icon: Building,
      status: 'disconnected',
      category: 'Business',
    },
    {
      id: 'slack',
      name: 'Slack',
      description: 'Send notifications and enable learning discussions in Slack channels',
      icon: MessageSquare,
      status: 'connected',
      category: 'Communication',
      lastSync: '5 minutes ago'
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      description: 'Integrate with Teams for virtual classrooms and notifications',
      icon: MessageSquare,
      status: 'error',
      category: 'Communication',
    },
    {
      id: 'zoom',
      name: 'Zoom',
      description: 'Schedule and manage virtual learning sessions through Zoom',
      icon: Video,
      status: 'connected',
      category: 'Video Conferencing',
      lastSync: '1 hour ago'
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Disconnected</Badge>;
    }
  };

  const getActionButton = (status: string) => {
    switch (status) {
      case 'connected':
        return <Button variant="outline" size="sm">Disconnect</Button>;
      case 'pending':
        return <Button variant="outline" size="sm" disabled>Connecting...</Button>;
      case 'error':
        return <Button variant="default" size="sm">Retry</Button>;
      default:
        return <Button variant="default" size="sm">Connect</Button>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <Plug className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Integration APIs
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Central hub to manage connections with external tools and services
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search integrations..." 
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              Filter by Category
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="bg-gradient-to-br from-card to-primary/2 hover:shadow-lg transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                    <integration.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold">{integration.name}</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground hover:text-primary cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{integration.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.category}</p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {integration.description}
              </p>
              
              <div className="flex items-center justify-between">
                {getStatusBadge(integration.status)}
                {integration.lastSync && (
                  <span className="text-xs text-muted-foreground">
                    Last sync: {integration.lastSync}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                {getActionButton(integration.status)}
                <Button variant="ghost" size="sm">
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Connected</p>
                <p className="text-2xl font-bold text-green-600">3</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-yellow-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">1</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-red-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Errors</p>
                <p className="text-2xl font-bold text-red-600">1</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-gray-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-2xl font-bold text-gray-600">1</p>
              </div>
              <Plug className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
