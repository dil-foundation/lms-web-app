import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Plus, 
  MoreHorizontal, 
  Edit, 
  Pause, 
  Trash2,
  Users,
  BookOpen,
  MapPin,
  Upload,
  Palette,
  Filter,
  Settings,
  Globe,
  Activity,
  Database
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MultitenancyProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

interface Organization {
  id: string;
  name: string;
  logo?: string;
  region: string;
  flag: string;
  status: 'active' | 'suspended' | 'pending';
  userCount: number;
  courseCount: number;
  createdAt: string;
  theme: {
    primaryColor: string;
    logoUrl?: string;
  };
}

export const Multitenancy = ({ userProfile }: MultitenancyProps) => {
  // Mock data for organizations
  const organizations: Organization[] = [
    {
      id: 'org-1',
      name: 'Acme Corporation',
      logo: '/placeholder.svg',
      region: 'North America',
      flag: '🇺🇸',
      status: 'active',
      userCount: 1245,
      courseCount: 67,
      createdAt: '2023-01-15',
      theme: {
        primaryColor: '#3b82f6',
        logoUrl: '/placeholder.svg'
      }
    },
    {
      id: 'org-2',
      name: 'TechStart Ltd.',
      logo: '/placeholder.svg',
      region: 'Europe',
      flag: '🇬🇧',
      status: 'active',
      userCount: 892,
      courseCount: 45,
      createdAt: '2023-03-22',
      theme: {
        primaryColor: '#10b981',
      }
    },
    {
      id: 'org-3',
      name: 'Global Solutions Inc.',
      logo: '/placeholder.svg',
      region: 'Asia Pacific',
      flag: '🇸🇬',
      status: 'suspended',
      userCount: 567,
      courseCount: 23,
      createdAt: '2023-06-10',
      theme: {
        primaryColor: '#f59e0b',
      }
    },
    {
      id: 'org-4',
      name: 'Innovation Hub',
      region: 'Middle East',
      flag: '🇦🇪',
      status: 'pending',
      userCount: 0,
      courseCount: 0,
      createdAt: '2024-01-08',
      theme: {
        primaryColor: '#8b5cf6',
      }
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/30">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30">Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/30">Pending</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600">Unknown</Badge>;
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
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Multitenancy
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-2">
                  Manage different organizations, regions, and brands using the same LMS
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
              <Button className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Organization
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - Moved above content, matching Overview page style */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{organizations.length}</div>
            <p className="text-xs text-muted-foreground">
              Active tenants
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {organizations.reduce((sum, org) => sum + org.userCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all tenants
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {organizations.reduce((sum, org) => sum + org.courseCount, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Available content
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Regions</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {new Set(organizations.map(org => org.region)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              Global coverage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            <Building2 className="h-6 w-6 text-primary" />
            Organizations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {organizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 border-2 border-primary/20">
                    <AvatarImage src={org.logo} alt={org.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-semibold text-lg">
                      {org.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">{org.name}</h3>
                      <span className="text-2xl">{org.flag}</span>
                      {getStatusBadge(org.status)}
                    </div>
                    <p className="text-sm text-muted-foreground bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg inline-block">{org.region}</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="text-center bg-primary/5 dark:bg-primary/10 px-4 py-2 rounded-xl">
                    <p className="text-xl font-bold text-primary">{org.userCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div className="text-center bg-primary/5 dark:bg-primary/10 px-4 py-2 rounded-xl">
                    <p className="text-xl font-bold text-primary">{org.courseCount}</p>
                    <p className="text-xs text-muted-foreground">Courses</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="rounded-xl hover:bg-primary/10 hover:text-primary">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl bg-white dark:bg-gray-800">
                      <DropdownMenuItem className="rounded-lg hover:bg-primary/5">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="rounded-lg hover:bg-primary/5">
                        <Pause className="h-4 w-4 mr-2" />
                        {org.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tenant-specific Configuration */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            <Palette className="h-6 w-6 text-primary" />
            Tenant Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="themes" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
              <TabsTrigger value="themes" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200">Themes & Branding</TabsTrigger>
              <TabsTrigger value="courses" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200">Course Management</TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200">User Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="themes" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">Logo Upload</h3>
                  <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 text-center bg-primary/5 dark:bg-primary/10 hover:border-primary/50 transition-colors duration-200">
                    <Upload className="mx-auto h-12 w-12 text-primary mb-4" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Drag & drop your organization logo here
                    </p>
                    <Button variant="outline" size="sm" className="rounded-xl border-2 hover:bg-primary/10 hover:text-primary">
                      Choose File
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">Theme Colors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'].map((color, index) => (
                      <div key={index} className="flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:bg-primary/5 dark:hover:bg-primary/10 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md">
                        <div 
                          className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="courses" className="mt-6">
              <div className="text-center py-12 text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <BookOpen className="mx-auto h-16 w-16 mb-4 text-primary/50" />
                <p className="text-lg">Course management per tenant coming soon...</p>
                <p className="text-sm mt-2">This feature will allow you to manage courses independently for each organization.</p>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="mt-6">
              <div className="text-center py-12 text-muted-foreground bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <Users className="mx-auto h-16 w-16 mb-4 text-primary/50" />
                <p className="text-lg">User management per tenant coming soon...</p>
                <p className="text-sm mt-2">This feature will allow you to manage users independently for each organization.</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
