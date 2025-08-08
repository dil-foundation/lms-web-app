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
  Palette
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
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">Active</Badge>;
      case 'suspended':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Suspended</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Multitenancy
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Manage different organizations, regions, and brands using the same LMS
                </p>
              </div>
            </div>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Add Organization
            </Button>
          </div>
        </div>
      </div>

      {/* Organizations Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-card to-green-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Organizations</p>
                <p className="text-2xl font-bold text-green-600">{organizations.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-blue-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">
                  {organizations.reduce((sum, org) => sum + org.userCount, 0).toLocaleString()}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-purple-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Courses</p>
                <p className="text-2xl font-bold text-purple-600">
                  {organizations.reduce((sum, org) => sum + org.courseCount, 0)}
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-orange-500/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Regions</p>
                <p className="text-2xl font-bold text-orange-600">
                  {new Set(organizations.map(org => org.region)).size}
                </p>
              </div>
              <MapPin className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {organizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between p-4 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors">
                <div className="flex items-center gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={org.logo} alt={org.name} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary font-semibold">
                      {org.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{org.name}</h3>
                      <span className="text-lg">{org.flag}</span>
                      {getStatusBadge(org.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{org.region}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{org.userCount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{org.courseCount}</p>
                    <p className="text-xs text-muted-foreground">Courses</p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pause className="h-4 w-4 mr-2" />
                        {org.status === 'suspended' ? 'Activate' : 'Suspend'}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Tenant Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="themes" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="themes">Themes & Branding</TabsTrigger>
              <TabsTrigger value="courses">Course Management</TabsTrigger>
              <TabsTrigger value="users">User Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="themes" className="space-y-4 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Logo Upload</h3>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drag & drop your organization logo here
                    </p>
                    <Button variant="outline" size="sm">
                      Choose File
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Theme Colors</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'].map((color, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-card/50 cursor-pointer">
                        <div 
                          className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
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
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="mx-auto h-12 w-12 mb-4" />
                <p>Course management per tenant coming soon...</p>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="mt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>User management per tenant coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
