import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Target, CheckCircle, Award } from 'lucide-react';
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
  // You might want to add progress data here later
  progress?: number;
}

interface StudentDashboardProps {
  userProfile: Profile;
}

export const StudentDashboard = ({ userProfile }: StudentDashboardProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Here we can also fetch image URLs if needed
        const coursesWithImages = await Promise.all(data.map(async (course) => {
          let imageUrl = '/placeholder.svg';
          if (course.image_url) {
            const { data: signedUrlData, error } = await supabase.storage
              .from('dil-lms')
              .createSignedUrl(course.image_url, 60); // Creates a secure URL valid for 60 seconds

            if (error) {
              console.error(`Failed to get signed URL for course image: ${course.image_url}`, error);
            } else {
              imageUrl = signedUrlData.signedUrl;
            }
          }
          return { ...course, image_url: imageUrl, progress: 0 }; // Static 0% progress
        }));
        setCourses(coursesWithImages);
      }
      setLoading(false);
    };

    fetchCourses();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome, {userProfile.first_name}!</h1>
        <p className="text-muted-foreground">Let's continue your learning journey.</p>
      </div>

      <div className="grid grid-cols-2 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">Ready to be completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Courses</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.filter(c => c.progress && c.progress > 0 && c.progress < 100).length}</div>
            <p className="text-xs text-muted-foreground">Currently in progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Courses</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.filter(c => c.progress === 100).length}</div>
            <p className="text-xs text-muted-foreground">Congratulations!</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificates Earned</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Keep up the great work</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight mb-4">My Courses</h2>
        {loading ? (
          <div className="py-12">
            <ContentLoader message="Loading your courses..." />
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map(course => (
              <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <img src={course.image_url} alt={course.title} className="w-full h-40 object-cover" />
                <CardHeader>
                  <CardTitle className="truncate">{course.title}</CardTitle>
                  <p className="text-sm text-muted-foreground truncate">{course.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${course.progress}%` }}></div>
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-sm font-medium">{course.progress}% Complete</span>
                    <Button asChild variant="secondary" size="sm">
                      <Link to={`/dashboard/course/${course.id}/content`}>
                        {course.progress && course.progress > 0 ? 'Continue' : 'Start Course'}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <h3 className="text-lg font-medium text-muted-foreground">No Courses Found</h3>
            <p className="text-sm text-muted-foreground mt-1">You haven't been enrolled in any courses yet.</p>
            <Button asChild className="mt-4">
              <Link to="/courses">Browse Courses</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
