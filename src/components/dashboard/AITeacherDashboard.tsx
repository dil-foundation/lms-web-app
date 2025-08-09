import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';
import { 
  MessageCircle,
  TrendingUp,
  Users,
  Clock,
  Star,
  Activity,
  AlertTriangle,
  Timer,
  Repeat,
  UserX,
  Eye,
  GraduationCap,
  X
} from 'lucide-react';

interface AITeacherDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    teacher_id?: string;
  };
}

export const AITeacherDashboard = ({ userProfile }: AITeacherDashboardProps) => {
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Mock data for Learn Feature Engagement
  const mockEngagementData = {
    totalStudentsEngaged: 47,
    totalTimeSpent: 142.5, // hours
    avgResponsesPerStudent: 28,
    activeStudentsToday: 23
  };

  // Mock data for Top Used Practice Lessons
  const mockTopLessons = [
    { id: 1, name: "Daily Routine Conversations", stage: "Stage 1", accessCount: 156, trend: "up" },
    { id: 2, name: "Job Interview Practice", stage: "Stage 4", accessCount: 134, trend: "up" },
    { id: 3, name: "Academic Presentations", stage: "Stage 5", accessCount: 98, trend: "stable" },
    { id: 4, name: "Quick Response Challenges", stage: "Stage 2", accessCount: 87, trend: "up" },
    { id: 5, name: "Critical Thinking Dialogues", stage: "Stage 6", accessCount: 76, trend: "down" },
  ];

  // Mock data for Behavior Insights/Flags
  const mockBehaviorFlags = [
    { 
      type: "excessive_retries", 
      title: "High Retry Rate Detected", 
      description: "8 students showing excessive retries on Stage 2 lessons", 
      count: 8,
      severity: "warning",
      students: [
        { name: "Emma Johnson", retries: 12, lesson: "Daily Routine Conversations" },
        { name: "Alex Chen", retries: 9, lesson: "Quick Response Challenges" },
        { name: "Maria Rodriguez", retries: 8, lesson: "Daily Routine Conversations" },
        { name: "David Kim", retries: 7, lesson: "Listen and Reply" },
        { name: "Sarah Wilson", retries: 6, lesson: "Quick Response Challenges" },
        { name: "James Brown", retries: 6, lesson: "Daily Routine Conversations" },
        { name: "Lisa Davis", retries: 5, lesson: "Listen and Reply" },
        { name: "Michael Lee", retries: 5, lesson: "Quick Response Challenges" }
      ]
    },
    { 
      type: "stuck_stage", 
      title: "Students Stuck at Stages", 
      description: "8 students haven't progressed from their current stage in 7+ days", 
      count: 8,
      severity: "error",
      students: [
        { name: "Jennifer Garcia", daysStuck: 10, currentLesson: "Critical Thinking Dialogues", stage: "Stage 3" },
        { name: "Robert Martinez", daysStuck: 9, currentLesson: "Abstract Topic Monologue", stage: "Stage 4" },
        { name: "Amanda Taylor", daysStuck: 8, currentLesson: "Critical Thinking Dialogues", stage: "Stage 3" },
        { name: "Kevin Anderson", daysStuck: 7, currentLesson: "Problem Solving Simulations", stage: "Stage 5" },
        { name: "Rachel Thomas", daysStuck: 7, currentLesson: "Abstract Topic Monologue", stage: "Stage 4" },
        { name: "Sarah Mitchell", daysStuck: 12, currentLesson: "Daily Routine Conversations", stage: "Stage 1" },
        { name: "Michael Chen", daysStuck: 9, currentLesson: "Quick Response Practice", stage: "Stage 2" },
        { name: "Emily Rodriguez", daysStuck: 8, currentLesson: "Academic Presentations", stage: "Stage 5" }
      ]
    },
    { 
      type: "no_progress", 
      title: "Inactive Students", 
      description: "12 students with no activity in the last 5 days", 
      count: 12,
      severity: "info",
      students: [
        { name: "Christopher Jackson", lastActive: "6 days ago", stage: "Stage 2" },
        { name: "Ashley White", lastActive: "6 days ago", stage: "Stage 1" },
        { name: "Matthew Harris", lastActive: "7 days ago", stage: "Stage 4" },
        { name: "Jessica Martin", lastActive: "7 days ago", stage: "Stage 3" },
        { name: "Daniel Thompson", lastActive: "8 days ago", stage: "Stage 2" },
        { name: "Lauren Garcia", lastActive: "8 days ago", stage: "Stage 1" },
        { name: "Ryan Lewis", lastActive: "9 days ago", stage: "Stage 3" },
        { name: "Stephanie Robinson", lastActive: "9 days ago", stage: "Stage 2" },
        { name: "Brandon Clark", lastActive: "10 days ago", stage: "Stage 1" },
        { name: "Megan Rodriguez", lastActive: "10 days ago", stage: "Stage 4" },
        { name: "Tyler Walker", lastActive: "11 days ago", stage: "Stage 2" },
        { name: "Kayla Hall", lastActive: "12 days ago", stage: "Stage 1" }
      ]
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  AI Teacher Dashboard
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Welcome back, {userProfile.first_name}
                </p>
              </div>
            </div>
            
            {/* Filter Controls */}
            <div className="flex items-center gap-3">
              <Select defaultValue="all-time">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-time">All Time</SelectItem>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>



      {/* Learn Feature Engagement Summary */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Learn Feature Engagement Summary</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students Engaged</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockEngagementData.totalStudentsEngaged}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600 font-medium">{mockEngagementData.activeStudentsToday}</span> active today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Time Spent</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockEngagementData.totalTimeSpent}h</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Responses per Student</CardTitle>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockEngagementData.avgResponsesPerStudent}</div>
              <p className="text-xs text-muted-foreground">
                Per student this week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-card to-green-500/5 dark:bg-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">84%</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">+12%</span> from last week
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Used Practice Lessons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Top Used Practice Lessons
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lesson Name</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-right">Access Count</TableHead>
                  <TableHead className="w-[100px]">Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockTopLessons.map((lesson) => (
                  <TableRow key={lesson.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">{lesson.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {lesson.stage}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{lesson.accessCount}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {lesson.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {lesson.trend === 'down' && <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />}
                        {lesson.trend === 'stable' && <div className="h-4 w-4 bg-yellow-500 rounded-full" />}
                        <span className="text-xs text-muted-foreground capitalize">{lesson.trend}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Behavior Insights / Flags */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Behavior Insights & Flags</h2>
        </div>
        
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {mockBehaviorFlags.map((flag, index) => (
            <Alert key={index} className={`
              ${flag.severity === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : ''}
              ${flag.severity === 'warning' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30' : ''}
              ${flag.severity === 'info' ? 'border-[#1582B4]/20 bg-[#1582B4]/10 dark:border-[#1582B4]/30 dark:bg-[#1582B4]/20' : ''}
            `}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  flag.severity === 'error' ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400' : ''
                } ${
                  flag.severity === 'warning' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400' : ''
                } ${
                  flag.severity === 'info' ? 'bg-[#1582B4]/20 text-[#1582B4] dark:bg-[#1582B4]/20 dark:text-[#1582B4]/90' : ''
                }`}>
                  {flag.type === 'excessive_retries' && <Repeat className="h-4 w-4" />}
                  {flag.type === 'stuck_stage' && <AlertTriangle className="h-4 w-4" />}
                  {flag.type === 'no_progress' && <UserX className="h-4 w-4" />}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-sm">{flag.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {flag.count} students
                    </Badge>
                  </div>
                  <AlertDescription className="text-xs">
                    {flag.description}
                  </AlertDescription>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-7 text-xs mt-2"
                    onClick={() => {
                      setSelectedFlag(flag);
                      setIsModalOpen(true);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Alert>
          ))}
        </div>
      </div>

      {/* Student Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFlag?.type === 'excessive_retries' && <Repeat className="h-5 w-5 text-yellow-600" />}
              {selectedFlag?.type === 'stuck_stage' && <AlertTriangle className="h-5 w-5 text-red-600" />}
              {selectedFlag?.type === 'no_progress' && <UserX className="h-5 w-5 text-[#1582B4]" />}
              {selectedFlag?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedFlag?.description}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm">Affected Students ({selectedFlag?.count})</h3>
              <Badge variant="outline">
                {selectedFlag?.severity === 'error' && '🔴 High Priority'}
                {selectedFlag?.severity === 'warning' && '🟡 Medium Priority'}
                {selectedFlag?.severity === 'info' && '🔵 Low Priority'}
              </Badge>
            </div>
            
            <div className="max-h-96 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    {selectedFlag?.type === 'stuck_stage' && <TableHead>Stage</TableHead>}
                    <TableHead>
                      {selectedFlag?.type === 'excessive_retries' && 'Retries'}
                      {selectedFlag?.type === 'stuck_stage' && 'Days Stuck'}
                      {selectedFlag?.type === 'no_progress' && 'Last Active'}
                    </TableHead>
                    <TableHead>
                      {selectedFlag?.type === 'excessive_retries' && 'Current Lesson'}
                      {selectedFlag?.type === 'stuck_stage' && 'Current Lesson'}
                      {selectedFlag?.type === 'no_progress' && 'Stage'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedFlag?.students?.map((student: any, index: number) => (
                    <TableRow key={index} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{student.name}</TableCell>
                      {selectedFlag?.type === 'stuck_stage' ? (
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {student.stage}
                          </Badge>
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {selectedFlag?.type === 'excessive_retries' && (
                          <Badge variant="destructive" className="text-xs">
                            {student.retries} retries
                          </Badge>
                        )}
                        {selectedFlag?.type === 'stuck_stage' && (
                          <Badge variant="destructive" className="text-xs">
                            {student.daysStuck} days
                          </Badge>
                        )}
                        {selectedFlag?.type === 'no_progress' && (
                          <span className="text-muted-foreground text-sm">{student.lastActive}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {selectedFlag?.type === 'excessive_retries' && student.lesson}
                        {selectedFlag?.type === 'stuck_stage' && student.currentLesson}
                        {selectedFlag?.type === 'no_progress' && (
                          <Badge variant="outline" className="text-xs">
                            {student.stage}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Click on a student to view detailed progress
              </div>
              <div className="flex gap-2">
                <Button size="sm">
                  Send Reminder
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}; 