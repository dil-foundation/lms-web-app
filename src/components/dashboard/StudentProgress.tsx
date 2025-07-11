import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/EmptyState';
import { 
  TrendingUp, 
  BookOpen, 
  Target, 
  Clock, 
  Award, 
  Calendar,
  BarChart3,
  CheckCircle,
  Flame,
  Trophy,
  Star,
  PlayCircle,
  Activity
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ContentLoader } from '../ContentLoader';

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  [key: string]: any;
};

interface Course {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  progress?: number;
  totalLessons?: number;
  completedLessons?: number;
  lastAccessed?: string;
}

interface StudentProgressProps {
  userProfile: Profile;
}

export const StudentProgress = ({ userProfile }: StudentProgressProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data for comprehensive progress tracking
  const mockProgressData = {
    totalCourses: 0,
    coursesInProgress: 0,
    coursesCompleted: 0,
    totalLessons: 0,
    completedLessons: 0,
    overallProgress: 0,
    studyStreak: 0,
    totalStudyTime: 0, // in hours
    thisWeekStudyTime: 0,
    averageSessionTime: 0,
    longestStreak: 0,
    certificatesEarned: 0,
    pointsEarned: 0,
    badgesEarned: 0,
    weeklyGoal: 10, // hours
    weeklyProgress: 0
  };

  const mockRecentActivities = [
    // Empty for demo - will show empty state
  ];

  const mockAchievements = [
    {
      id: 1,
      title: "First Steps",
      description: "Complete your first lesson",
      icon: Star,
      earned: false,
      earnedDate: null
    },
    {
      id: 2,
      title: "Week Warrior",
      description: "Study for 7 consecutive days",
      icon: Flame,
      earned: false,
      earnedDate: null
    },
    {
      id: 3,
      title: "Course Conqueror",
      description: "Complete your first course",
      icon: Trophy,
      earned: false,
      earnedDate: null
    }
  ];

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_student_courses');

      if (error) {
        console.error("Error fetching student courses:", error);
        toast.error("Failed to load your courses.", {
          description: "Please try reloading the page.",
        });
      } else if (data) {
        const coursesWithImages = await Promise.all(data.map(async (course) => {
          let imageUrl = '/placeholder.svg';
          if (course.image_url) {
            const { data: signedUrlData, error } = await supabase.storage
              .from('dil-lms')
              .createSignedUrl(course.image_url, 60);

            if (error) {
              console.error(`Failed to get signed URL for course image: ${course.image_url}`, error);
            } else {
              imageUrl = signedUrlData.signedUrl;
            }
          }
          return { 
            ...course, 
            image_url: imageUrl, 
            progress: 0,
            totalLessons: 0,
            completedLessons: 0,
            lastAccessed: new Date().toISOString()
          };
        }));
        setCourses(coursesWithImages);
      }
      setLoading(false);
    };

    fetchCourses();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
          <p className="text-muted-foreground">
            Track your learning journey and achievements.
          </p>
        </div>
        <div className="py-12">
          <ContentLoader message="Loading your progress..." />
        </div>
      </div>
    );
  }

  // Show empty state if no courses
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
          <p className="text-muted-foreground">
            Track your learning journey and achievements.
          </p>
        </div>
        <EmptyState
          title="No Progress to Track"
          description="Start learning by enrolling in courses to see your progress here"
          icon={<TrendingUp className="h-8 w-8 text-muted-foreground" />}
        />
      </div>
    );
  }

  // Calculate dynamic progress based on available courses
  const totalCourses = courses.length;
  const coursesInProgress = courses.filter(c => c.progress && c.progress > 0 && c.progress < 100).length;
  const coursesCompleted = courses.filter(c => c.progress === 100).length;
  const overallProgress = totalCourses > 0 ? Math.round(courses.reduce((acc, course) => acc + (course.progress || 0), 0) / totalCourses) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Learning Progress</h1>
        <p className="text-muted-foreground">
          Track your learning journey and achievements.
        </p>
      </div>

      {/* Progress Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overall Progress</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallProgress}%</div>
            <p className="text-xs text-muted-foreground">
              Across all courses
            </p>
            <Progress value={overallProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses in Progress</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coursesInProgress}</div>
            <p className="text-xs text-muted-foreground">
              of {totalCourses} total courses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Lessons</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProgressData.completedLessons}</div>
            <p className="text-xs text-muted-foreground">
              of {mockProgressData.totalLessons} total lessons
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Streak</CardTitle>
            <Flame className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockProgressData.studyStreak}</div>
            <p className="text-xs text-muted-foreground">
              {mockProgressData.studyStreak === 1 ? 'Day' : 'Days'} in a row
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Course Progress Detail */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Course Progress Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {courses.map((course) => (
              <div key={course.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={course.image_url} 
                      alt={course.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <h4 className="font-medium">{course.title}</h4>
                      <p className="text-sm text-muted-foreground">{course.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={course.progress === 100 ? "default" : course.progress && course.progress > 0 ? "secondary" : "outline"}>
                      {course.progress === 100 ? "Completed" : course.progress && course.progress > 0 ? "In Progress" : "Not Started"}
                    </Badge>
                    <span className="text-sm font-medium">{course.progress || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{course.completedLessons || 0} of {course.totalLessons || 0} lessons</span>
                  <span>Last accessed: {course.lastAccessed ? new Date(course.lastAccessed).toLocaleDateString() : 'Never'}</span>
                </div>
                <Progress value={course.progress || 0} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Study Statistics & Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Study Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Study Time</span>
                <span className="text-sm">{mockProgressData.totalStudyTime}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">This Week</span>
                <span className="text-sm">{mockProgressData.thisWeekStudyTime}h</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Session</span>
                <span className="text-sm">{mockProgressData.averageSessionTime}min</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Longest Streak</span>
                <span className="text-sm">{mockProgressData.longestStreak} days</span>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Weekly Goal</span>
                  <span className="text-sm">{mockProgressData.thisWeekStudyTime}h / {mockProgressData.weeklyGoal}h</span>
                </div>
                <Progress value={(mockProgressData.thisWeekStudyTime / mockProgressData.weeklyGoal) * 100} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mockRecentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
                <p className="text-xs text-muted-foreground mt-1">Start learning to see your progress here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mockRecentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Achievements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockAchievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`p-4 rounded-lg border ${
                  achievement.earned 
                    ? 'bg-primary/10 border-primary/20' 
                    : 'bg-muted/50 border-muted'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    achievement.earned 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <achievement.icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{achievement.title}</h4>
                    <p className="text-xs text-muted-foreground">{achievement.description}</p>
                    {achievement.earned && achievement.earnedDate && (
                      <p className="text-xs text-primary mt-1">
                        Earned {new Date(achievement.earnedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 