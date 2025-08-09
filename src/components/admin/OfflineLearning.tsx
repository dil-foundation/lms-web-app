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
  Search
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
        return <Badge variant="default" className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Downloaded</Badge>;
      case 'downloading':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200"><Download className="w-3 h-3 mr-1" />Downloading</Badge>;
      case 'error':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  const getSyncBadge = (status: string) => {
    switch (status) {
      case 'up-to-date':
        return <Badge variant="outline" className="text-green-700 border-green-200">Up to date</Badge>;
      case 'pending':
        return <Badge variant="outline" className="text-yellow-700 border-yellow-200">Updates pending</Badge>;
      case 'syncing':
        return <Badge variant="outline" className="text-blue-700 border-blue-200"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Syncing</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getActionButton = (course: Course) => {
    const baseClasses = "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md";
    
    switch (course.downloadStatus) {
      case 'downloaded':
        return (
          <Button 
            variant="outline" 
            size="sm"
            className={`${baseClasses} hover:bg-red-50 hover:border-red-200 hover:text-red-700 dark:hover:bg-red-900/20`}
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
            className="opacity-60 cursor-not-allowed"
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
            className="opacity-60 cursor-not-allowed"
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
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <Download className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                Offline Learning
              </h1>
              <p className="text-lg text-muted-foreground font-light">
                Manage downloadable learning content and sync status
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <Card className="bg-gradient-to-br from-card to-primary/2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Used Storage</span>
              <span className="text-sm text-muted-foreground">
                {usedStorage.toFixed(1)} GB of {totalStorage} GB
              </span>
            </div>
            <Progress value={(usedStorage / totalStorage) * 100} className="h-2" />
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {courses.filter(c => c.downloadStatus === 'downloaded').length}
                </p>
                <p className="text-xs text-muted-foreground">Downloaded</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {courses.filter(c => c.downloadStatus === 'downloading').length}
                </p>
                <p className="text-xs text-muted-foreground">Downloading</p>
              </div>
              <div>
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
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input 
                placeholder="Search courses..." 
                className="pl-10"
              />
            </div>
            <Tabs defaultValue="all" className="w-auto">
              <TabsList>
                <TabsTrigger value="all">All Courses</TabsTrigger>
                <TabsTrigger value="offline">Available Offline</TabsTrigger>
                <TabsTrigger value="online">Online Only</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Course List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Course Library
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {courses.map((course) => (
              <div key={course.id} className="group p-6 rounded-xl border border-border/50 bg-gradient-to-br from-card to-card/50 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      {getFormatIcon(course.format)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg text-foreground truncate">{course.title}</h3>
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">{course.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{course.description}</p>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex flex-col items-end gap-2 ml-4">
                    {getStatusBadge(course.downloadStatus)}
                    {course.syncStatus && getSyncBadge(course.syncStatus)}
                  </div>
                </div>

                {/* Progress Bar (if downloading) */}
                {course.downloadStatus === 'downloading' && course.downloadProgress && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">Downloading...</span>
                      <span className="text-sm text-muted-foreground">{course.downloadProgress}%</span>
                    </div>
                    <Progress value={course.downloadProgress} className="h-2" />
                  </div>
                )}

                {/* Footer Row */}
                <div className="flex items-center justify-between pt-4 border-t border-border/50">
                  {/* File Info */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-4 h-4" />
                      <span>{course.fileSize}</span>
                    </div>
                    {course.lastSynced && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>Last synced: {course.lastSynced}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    {/* Offline Toggle */}
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-lg">
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Automatic Sync</h3>
              <p className="text-sm text-muted-foreground">
                Automatically download updates for offline courses
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Switch defaultChecked />
              <Button 
                variant="outline"
                className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary"
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
