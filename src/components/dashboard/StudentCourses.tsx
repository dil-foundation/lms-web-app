import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/EmptyState';
import { BookOpen } from 'lucide-react';
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
}

interface StudentCoursesProps {
  userProfile: Profile;
}

export const StudentCourses = ({ userProfile }: StudentCoursesProps) => {
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
          return { ...course, image_url: imageUrl, progress: 0 };
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
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">
            View and manage your enrolled courses.
          </p>
        </div>
        <div className="py-12">
          <ContentLoader message="Loading your courses..." />
        </div>
      </div>
    );
  }

  // Show empty state if no courses
  if (courses.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
          <p className="text-muted-foreground">
            View and manage your enrolled courses.
          </p>
        </div>
        <EmptyState
          title="No Courses Enrolled"
          description="Wait for the teacher to enroll you into a course"
          icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Courses</h1>
        <p className="text-muted-foreground">
          View and manage your enrolled courses.
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <img 
              src={course.image_url} 
              alt={course.title} 
              className="w-full h-40 object-cover" 
            />
            <CardHeader>
              <CardTitle className="truncate">{course.title}</CardTitle>
              <p className="text-sm text-muted-foreground truncate">{course.subtitle}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="w-full bg-muted rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all" 
                  style={{ width: `${course.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{course.progress || 0}% Complete</span>
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/dashboard/course/${course.id}`}>
                    {course.progress && course.progress > 0 ? 'Continue' : 'Start Course'}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}; 