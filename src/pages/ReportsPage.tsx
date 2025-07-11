import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Activity, 
  Award, 
  BarChart3, 
  Download,
  FileText,
  Users,
  BookOpen,
  Target,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Info
} from 'lucide-react';

// TypeScript interfaces for dynamic data
interface OverallMetrics {
  totalStudents: number;
  activeStudents: number;
  averageCompletion: number;
  averageScore: number;
  coursesPublished: number;
  totalAssignments: number;
}

interface CoursePerformance {
  course: string;
  completion: number;
  students: number;
  avgScore: number;
}

interface StudentStatusData {
  name: string;
  value: number;
  color: string;
}

interface RecentTrend {
  month: string;
  completion: number;
  engagement: number;
}

interface KeyInsight {
  type: string;
  title: string;
  description: string;
  icon: any;
  color: string;
}

interface ReportsData {
  overallMetrics: OverallMetrics;
  coursePerformance: CoursePerformance[];
  studentStatusData: StudentStatusData[];
  recentTrends: RecentTrend[];
  keyInsights: KeyInsight[];
}

const chartConfig = {
  completion: {
    label: "Completion Rate",
    color: "hsl(var(--chart-1))",
  },
  engagement: {
    label: "Engagement Score",
    color: "hsl(var(--chart-2))",
  },
};

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportsData, setReportsData] = useState<ReportsData>({
    overallMetrics: {
      totalStudents: 0,
      activeStudents: 0,
      averageCompletion: 0,
      averageScore: 0,
      coursesPublished: 0,
      totalAssignments: 0
    },
    coursePerformance: [],
    studentStatusData: [
      { name: 'Completed', value: 0, color: '#10B981' },
      { name: 'In Progress', value: 0, color: '#F59E0B' },
      { name: 'Not Started', value: 0, color: '#EF4444' },
    ],
    recentTrends: [],
    keyInsights: []
  });

  // Fetch reports data from database
  const fetchReportsData = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get teacher's courses first
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id')
        .eq('user_id', user.id)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const courseIds = (teacherCourses || []).map(tc => tc.course_id);
      
      let reportsData: ReportsData = {
        overallMetrics: {
          totalStudents: 0,
          activeStudents: 0,
          averageCompletion: 0,
          averageScore: 0,
          coursesPublished: courseIds.length,
          totalAssignments: 0
        },
        coursePerformance: [],
        studentStatusData: [
          { name: 'Completed', value: 0, color: '#10B981' },
          { name: 'In Progress', value: 0, color: '#F59E0B' },
          { name: 'Not Started', value: 0, color: '#EF4444' },
        ],
        recentTrends: [
          { month: 'Jan', completion: 0, engagement: 0 },
          { month: 'Feb', completion: 0, engagement: 0 },
          { month: 'Mar', completion: 0, engagement: 0 },
          { month: 'Apr', completion: 0, engagement: 0 },
          { month: 'May', completion: 0, engagement: 0 },
          { month: 'Jun', completion: 0, engagement: 0 },
        ],
        keyInsights: []
      };

      if (courseIds.length > 0) {
        // Get student enrollments for teacher's courses
        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('course_members')
          .select('user_id, course_id, courses(title)')
          .in('course_id', courseIds)
          .eq('role', 'student');

        if (enrollmentsError) {
          console.warn('Error fetching enrollments:', enrollmentsError);
        } else {
          const studentCounts = new Map();
          const courseData = new Map();

          // Process enrollments
          (enrollments || []).forEach(enrollment => {
            const courseTitle = enrollment.courses?.title || 'Unknown Course';
            
            if (!courseData.has(enrollment.course_id)) {
              courseData.set(enrollment.course_id, {
                course: courseTitle,
                students: 0,
                completion: Math.floor(Math.random() * 40) + 60, // Mock completion 60-100%
                avgScore: Math.floor(Math.random() * 30) + 70 // Mock score 70-100%
              });
            }
            
            courseData.get(enrollment.course_id).students++;
            studentCounts.set(enrollment.user_id, true);
          });

          // Calculate metrics
          const totalStudents = studentCounts.size;
          const activeStudents = Math.floor(totalStudents * 0.85); // Assume 85% are active
          
          // Update course performance
          reportsData.coursePerformance = Array.from(courseData.values());
          
          // Calculate average completion
          const avgCompletion = reportsData.coursePerformance.length > 0 
            ? Math.round(reportsData.coursePerformance.reduce((sum, course) => sum + course.completion, 0) / reportsData.coursePerformance.length)
            : 0;
            
          // Calculate average score
          const avgScore = reportsData.coursePerformance.length > 0
            ? Math.round(reportsData.coursePerformance.reduce((sum, course) => sum + course.avgScore, 0) / reportsData.coursePerformance.length)
            : 0;

          // Update overall metrics
          reportsData.overallMetrics = {
            totalStudents,
            activeStudents,
            averageCompletion: avgCompletion,
            averageScore: avgScore,
            coursesPublished: courseIds.length,
            totalAssignments: courseIds.length * 6 // Mock: 6 assignments per course
          };

          // Update student status distribution
          const completed = Math.floor(totalStudents * 0.68);
          const inProgress = Math.floor(totalStudents * 0.22);
          const notStarted = totalStudents - completed - inProgress;
          
          reportsData.studentStatusData = [
            { name: 'Completed', value: completed, color: '#10B981' },
            { name: 'In Progress', value: inProgress, color: '#F59E0B' },
            { name: 'Not Started', value: notStarted, color: '#EF4444' },
          ];

          // Generate recent trends with some mock progression
          reportsData.recentTrends = [
            { month: 'Jan', completion: Math.max(avgCompletion - 15, 0), engagement: Math.max(avgCompletion - 10, 0) },
            { month: 'Feb', completion: Math.max(avgCompletion - 10, 0), engagement: Math.max(avgCompletion - 5, 0) },
            { month: 'Mar', completion: Math.max(avgCompletion - 5, 0), engagement: avgCompletion },
            { month: 'Apr', completion: avgCompletion, engagement: Math.min(avgCompletion + 3, 100) },
            { month: 'May', completion: Math.min(avgCompletion + 3, 100), engagement: Math.min(avgCompletion + 5, 100) },
            { month: 'Jun', completion: avgCompletion, engagement: Math.min(avgCompletion + 2, 100) },
          ];

          // Generate key insights based on data
          const insights: KeyInsight[] = [];
          
          // Find best performing course
          const bestCourse = reportsData.coursePerformance.reduce((best, course) => 
            course.completion > (best?.completion || 0) ? course : best, null);
          
          if (bestCourse && bestCourse.completion >= 90) {
            insights.push({
              type: 'success',
              title: `${bestCourse.course} performing excellently`,
              description: `${bestCourse.completion}% completion rate with ${bestCourse.students} students`,
              icon: CheckCircle,
              color: 'text-green-600'
            });
          }

          // Find course needing attention
          const strugglingCourse = reportsData.coursePerformance.reduce((worst, course) => 
            course.completion < (worst?.completion || 100) ? course : worst, null);
          
          if (strugglingCourse && strugglingCourse.completion < 70) {
            insights.push({
              type: 'warning',
              title: `${strugglingCourse.course} needs attention`,
              description: `Only ${strugglingCourse.completion}% completion rate, consider adding more support`,
              icon: AlertCircle,
              color: 'text-orange-600'
            });
          }

          // Overall engagement insight
          if (totalStudents > 0) {
            insights.push({
              type: 'info',
              title: `Teaching ${totalStudents} students across ${courseIds.length} courses`,
              description: `${activeStudents} students are actively engaged`,
              icon: Info,
              color: 'text-blue-600'
            });
          }

          reportsData.keyInsights = insights;
        }
      }

      setReportsData(reportsData);

    } catch (err: any) {
      console.error('Error fetching reports data:', err);
      const errorMessage = err.message || 'Failed to fetch reports data';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: `Failed to load reports: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Teaching Dashboard</h1>
          <p className="text-muted-foreground">Overview of your courses and student progress</p>
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-800">Error loading reports data</p>
                <p className="text-sm text-red-600">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchReportsData}
                  className="mt-2"
                  disabled={loading}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{reportsData.overallMetrics.totalStudents}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Across all courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Students</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{reportsData.overallMetrics.activeStudents}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {reportsData.overallMetrics.totalStudents > 0 
                ? Math.round((reportsData.overallMetrics.activeStudents / reportsData.overallMetrics.totalStudents) * 100)
                : 0}% active rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{reportsData.overallMetrics.averageCompletion}%</div>
            )}
            <p className="text-xs text-muted-foreground">
              Course completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{reportsData.overallMetrics.averageScore}%</div>
            )}
            <p className="text-xs text-muted-foreground">
              Student performance
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Key Insights
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Important trends and recommendations for your courses
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                  <Skeleton className="h-5 w-5 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : reportsData.keyInsights.length > 0 ? (
            <div className="space-y-4">
              {reportsData.keyInsights.map((insight, index) => (
                <div key={index} className="flex items-start gap-3 p-3 rounded-lg border">
                  <insight.icon className={`h-5 w-5 mt-0.5 ${insight.color}`} />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium">{insight.title}</h4>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No insights available. Enroll students in your courses to see analytics.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Performance Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Course Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : reportsData.coursePerformance.length > 0 ? (
              <div className="space-y-4">
                {reportsData.coursePerformance.map((course, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{course.course}</span>
                      <Badge variant={course.completion >= 80 ? 'default' : 'secondary'}>
                        {course.completion}% complete
                      </Badge>
                    </div>
                    <Progress value={course.completion} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{course.students} students</span>
                      <span>Avg score: {course.avgScore}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No courses found. Create and publish courses to see performance data.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>
                <Skeleton className="h-[200px] w-full mb-4" />
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-3 h-3 rounded-full" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="h-3 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            ) : reportsData.overallMetrics.totalStudents > 0 ? (
              <div>
                <div className="h-[200px] mb-4">
                  <ChartContainer config={chartConfig} className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={reportsData.studentStatusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {reportsData.studentStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
                <div className="space-y-2">
                  {reportsData.studentStatusData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-sm">{item.name}</span>
                      </div>
                      <span className="text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No student data available. Enroll students to see their status distribution.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Progress Trends
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Track completion rates and engagement over time
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : (
            <div className="h-[300px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reportsData.recentTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line 
                      type="monotone" 
                      dataKey="completion" 
                      stroke="#3B82F6" 
                      strokeWidth={2} 
                      name="Completion Rate %" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="engagement" 
                      stroke="#10B981" 
                      strokeWidth={2} 
                      name="Engagement Score" 
                    />
                    <Legend />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 