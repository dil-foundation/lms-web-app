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
  UserCheck,
  Filter,
  Settings,
  Activity,
  Database,
  Globe
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
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/30"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30"><XCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600">Disconnected</Badge>;
    }
  };

  const getActionButton = (status: string) => {
    const baseHoverClasses = "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md";
    
    switch (status) {
      case 'connected':
        return (
          <Button 
            variant="outline" 
            size="sm"
            className={`${baseHoverClasses} hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 dark:hover:border-red-800 dark:hover:text-red-400 border-2 rounded-xl`}
          >
            Disconnect
          </Button>
        );
      case 'pending':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            disabled
            className="opacity-60 cursor-not-allowed border-2 rounded-xl"
          >
            Connecting...
          </Button>
        );
      case 'error':
        return (
          <Button 
            variant="default" 
            size="sm"
            className={`${baseHoverClasses} bg-yellow-500 hover:bg-yellow-600 text-white hover:shadow-yellow-200/50 dark:hover:shadow-yellow-900/50 rounded-xl`}
          >
            Retry
          </Button>
        );
      default:
        return (
          <Button 
            variant="default" 
            size="sm"
            className={`${baseHoverClasses} bg-green-500 hover:bg-green-600 text-white hover:shadow-green-200/50 dark:hover:shadow-green-900/50 rounded-xl`}
          >
            Connect
          </Button>
        );
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
                <Plug className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Integration APIs
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-2">
                  Central hub to manage connections with external tools and services
                </p>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <Button 
                variant="outline"
                className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button 
                variant="outline"
                className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Moved above content, matching Overview page style */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connected</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">3</div>
            <p className="text-xs text-muted-foreground">
              Active integrations
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">1</div>
            <p className="text-xs text-muted-foreground">
              Awaiting setup
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">1</div>
            <p className="text-xs text-muted-foreground">
              Need attention
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <Plug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">1</div>
            <p className="text-xs text-muted-foreground">
              Ready to connect
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search integrations..." 
                className="pl-10 h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <Button 
              variant="outline"
              className="h-12 px-6 rounded-2xl bg-background border-2 border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter by Category
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <Card key={integration.id} className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                    <integration.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">{integration.name}</CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-4 h-4 text-muted-foreground hover:text-primary cursor-help transition-colors duration-200" />
                          </TooltipTrigger>
                          <TooltipContent className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
                            <p className="max-w-xs">{integration.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Badge variant="outline" className="mt-2 bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30">
                      {integration.category}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                {integration.description}
              </p>
              
              <div className="flex items-center justify-between">
                {getStatusBadge(integration.status)}
                {integration.lastSync && (
                  <span className="text-xs text-muted-foreground bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                    Last sync: {integration.lastSync}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                {getActionButton(integration.status)}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary hover:shadow-md rounded-xl"
                >
                  Configure
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
