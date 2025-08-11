import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Download, 
  HardDrive, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  FileVideo,
  FileText,
  FileAudio,
  Image,
  Filter,
  Search,
  Settings,
  Database,
  Globe,
  Activity
} from 'lucide-react';
import { Input } from '@/components/ui/input';

interface OfflineLearningProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

interface Course {
  id: string;
  title: string;
  description: string;
  format: 'video' | 'text' | 'audio' | 'mixed';
  fileSize: string;
  downloadStatus: 'available' | 'downloading' | 'downloaded' | 'error';
  lastSynced?: string;
  syncStatus: 'up-to-date' | 'pending' | 'syncing';
  downloadProgress?: number;
  offlineEnabled: boolean;
  category: string;
}

export const OfflineLearning = ({ userProfile }: OfflineLearningProps) => {
  // Mock data for courses
  const courses: Course[] = [
    {
      id: 'course-1',
      title: 'Introduction to Machine Learning',
      description: 'Comprehensive course covering ML fundamentals and applications',
      format: 'video',
      fileSize: '2.4 GB',
      downloadStatus: 'downloaded',
      lastSynced: '2 hours ago',
      syncStatus: 'up-to-date',
      offlineEnabled: true,
      category: 'Technology'
    },
    {
      id: 'course-2',
      title: 'Business Communication Skills',
      description: 'Essential communication skills for professional environments',
      format: 'mixed',
      fileSize: '1.8 GB',
      downloadStatus: 'downloading',
      downloadProgress: 65,
      syncStatus: 'syncing',
      offlineEnabled: true,
      category: 'Business'
    },
    {
      id: 'course-3',
      title: 'Project Management Fundamentals',
      description: 'Learn the basics of effective project management',
      format: 'text',
      fileSize: '245 MB',
      downloadStatus: 'available',
      lastSynced: '1 day ago',
      syncStatus: 'pending',
      offlineEnabled: false,
      category: 'Management'
    },
    {
      id: 'course-4',
      title: 'Digital Marketing Strategies',
      description: 'Modern approaches to digital marketing and social media',
      format: 'video',
      fileSize: '3.1 GB',
      downloadStatus: 'error',
      lastSynced: '3 days ago',
      syncStatus: 'pending',
      offlineEnabled: true,
      category: 'Marketing'
    },
    {
      id: 'course-5',
      title: 'Financial Planning Basics',
      description: 'Personal and business financial planning essentials',
      format: 'audio',
      fileSize: '892 MB',
      downloadStatus: 'downloaded',
      lastSynced: '5 hours ago',
      syncStatus: 'up-to-date',
      offlineEnabled: true,
      category: 'Finance'
    }
  ];

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'video':
        return <FileVideo className="w-5 h-5 text-blue-600" />;
      case 'audio':
        return <FileAudio className="w-5 h-5 text-green-600" />;
      case 'text':
        return <FileText className="w-5 h-5 text-gray-600" />;
      case 'mixed':
        return <Image className="w-5 h-5 text-purple-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'downloaded':
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-700/30"><CheckCircle className="w-3 h-3 mr-1" />Downloaded</Badge>;
      case 'downloading':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-700/30"><Download className="w-3 h-3 mr-1" />Downloading</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-700/30"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600">Available</Badge>;
    }
  };

  const getSyncBadge = (status: string) => {
    switch (status) {
      case 'up-to-date':
        return <Badge variant="outline" className="text-green-700 border-green-200 dark:text-green-300 dark:border-green-700/30">Up to date</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-200 dark:text-yellow-300 dark:border-yellow-700/30">Updates pending</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="text-blue-700 border-blue-200 dark:text-blue-300 dark:border-blue-700/30"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-600">Unknown</Badge>;
    }
  };

  const getActionButton = (course: Course) => {
    const baseClasses = "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md rounded-xl";
    
    switch (course.downloadStatus) {
      case 'downloaded':
        return (
          <Button 
            variant="outline" 
            size="sm"
            className={`${baseClasses} hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20 border-2`}
          >
            Remove
          </Button>
        );
      case 'downloading':
        return (
          <Button 
            variant="outline" 
            size="sm" 
            disabled
            className="opacity-60 cursor-not-allowed border-2 rounded-xl"
          >
            Downloading...
          </Button>
        );
      case 'error':
        return (
          <Button 
            variant="default" 
            size="sm"
            className={`${baseClasses} bg-yellow-500 hover:bg-yellow-600 text-white`}
          >
            Retry
          </Button>
        );
      default:
        return course.offlineEnabled ? 
          <Button 
            variant="default" 
            size="sm"
            className={`${baseClasses} bg-green-500 hover:bg-green-600 text-white`}
          >
            Download
          </Button> : 
          <Button 
            variant="outline" 
            size="sm" 
            disabled
            className="opacity-60 cursor-not-allowed border-2 rounded-xl"
          >
            Online Only
          </Button>;
    }
  };

  // Calculate storage usage
  const totalStorage = 50; // GB
  const usedStorage = courses
    .filter(course => course.downloadStatus === 'downloaded')
    .reduce((total, course) => {
      const size = parseFloat(course.fileSize.replace(/[^\d.]/g, ''));
      const unit = course.fileSize.includes('GB') ? 1 : 0.001;
      return total + (size * unit);
    }, 0);

  return (
    <div className="space-y-8">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary/3 to-[#1582B4]/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  Offline Learning
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-2">
                  Manage downloadable learning content and sync status
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
            <CardTitle className="text-sm font-medium">Downloaded Courses</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {courses.filter(c => c.downloadStatus === 'downloaded').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Available offline
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Currently Downloading</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {courses.filter(c => c.downloadStatus === 'downloading').length}
            </div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {usedStorage.toFixed(1)} GB
            </div>
            <p className="text-xs text-muted-foreground">
              Of {totalStorage} GB total
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Only</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {courses.filter(c => !c.offlineEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Require internet
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Storage Usage */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            <HardDrive className="h-6 w-6 text-primary" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Used Storage</span>
              <span className="text-sm text-muted-foreground">
                {usedStorage.toFixed(1)} GB of {totalStorage} GB
              </span>
            </div>
            <Progress value={(usedStorage / totalStorage) * 100} className="h-3 rounded-full" />
            <div className="grid grid-cols-3 gap-6 text-center">
              <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl">
                <p className="text-2xl font-bold text-green-600">
                  {courses.filter(c => c.downloadStatus === 'downloaded').length}
                </p>
                <p className="text-xs text-muted-foreground">Downloaded</p>
              </div>
              <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl">
                <p className="text-2xl font-bold text-blue-600">
                  {courses.filter(c => c.downloadStatus === 'downloading').length}
                </p>
                <p className="text-xs text-muted-foreground">Downloading</p>
              </div>
              <div className="bg-primary/5 dark:bg-primary/10 p-4 rounded-xl">
                <p className="text-2xl font-bold text-gray-600">
                  {courses.filter(c => !c.offlineEnabled).length}
                </p>
                <p className="text-xs text-muted-foreground">Online Only</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search courses..." 
                className="pl-10 h-12 text-lg font-medium border-2 rounded-2xl transition-all duration-300 focus:scale-[1.02] focus:shadow-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
                <TabsTrigger value="all" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200">All Courses</TabsTrigger>
                <TabsTrigger value="offline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200">Available Offline</TabsTrigger>
                <TabsTrigger value="online" className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-xl transition-all duration-200">Online Only</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Course List */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            <Download className="h-6 w-6 text-primary" />
            Course Library
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {courses.map((course) => (
              <div key={course.id} className="group p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-1">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                      {getFormatIcon(course.format)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-xl text-foreground truncate bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">{course.title}</h3>
                        <Badge variant="secondary" className="text-sm bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30">{course.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{course.description}</p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-3 ml-4">
                    {getStatusBadge(course.downloadStatus)}
                    {course.syncStatus && getSyncBadge(course.syncStatus)}
                  </div>
                </div>

                {/* Progress Bar (if downloading) */}
                {course.downloadStatus === 'downloading' && course.downloadProgress && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-foreground">Downloading...</span>
                      <span className="text-sm text-muted-foreground">{course.downloadProgress}%</span>
                    </div>
                    <Progress value={course.downloadProgress} className="h-3 rounded-full" />
                  </div>
                )}

                {/* Footer Row */}
                <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                  {/* File Info */}
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                      <HardDrive className="w-4 h-4" />
                      <span className="font-medium">{course.fileSize}</span>
                    </div>
                    {course.lastSynced && (
                      <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded-lg">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Last synced: {course.lastSynced}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-4">
                    {/* Offline Toggle */}
                    <div className="flex items-center gap-3 bg-primary/5 dark:bg-primary/10 px-4 py-2 rounded-xl">
                      <label htmlFor={`offline-${course.id}`} className="text-sm font-medium text-foreground cursor-pointer">
                        Offline
                      </label>
                      <Switch 
                        id={`offline-${course.id}`}
                        checked={course.offlineEnabled}
                        size="sm"
                      />
                    </div>
                    
                    {/* Action Button */}
                    <div className="ml-2">
                      {getActionButton(course)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-6">
          <CardTitle className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
            <RefreshCw className="h-6 h-6 text-primary" />
            Sync Management
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">Automatic Sync</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Automatically download updates for offline courses
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch defaultChecked />
              <Button 
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary rounded-xl border-2"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
