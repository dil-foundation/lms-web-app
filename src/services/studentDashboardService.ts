import { supabase } from '@/integrations/supabase/client';

export interface StudentDashboardStats {
  enrolled_courses_count: number;
  total_lessons_count: number;
  completed_lessons_count: number;
  active_discussions_count: number;
  study_streak_days: number;
  total_study_time_minutes: number;
  average_grade: number;
  upcoming_assignments_count: number;
}

export interface StudentCourseWithProgress {
  course_id: string;
  title: string;
  subtitle: string;
  image_url: string;
  progress_percentage: number;
  total_lessons: number;
  completed_lessons: number;
  last_accessed: string;
}

const StudentDashboardService = {
  getStats: async (studentId: string): Promise<StudentDashboardStats> => {
    const { data, error } = await supabase.rpc('get_student_dashboard_stats', { student_id: studentId });
    if (error) throw new Error(error.message);
    return data[0];
  },

  getCoursesWithProgress: async (studentId: string): Promise<StudentCourseWithProgress[]> => {
    const { data, error } = await supabase.rpc('get_student_courses_with_progress', { student_id: studentId });
    if (error) throw new Error(error.message);
    
    // Process courses to create signed URLs for images
    const coursesWithSignedUrls = await Promise.all(data.map(async (course: any) => {
      let imageUrl = '/placeholder.svg';
      if (course.image_url) {
        const { data: signedUrlData } = await supabase.storage
          .from('dil-lms')
          .createSignedUrl(course.image_url, 3600);
        if (signedUrlData) {
          imageUrl = signedUrlData.signedUrl;
        }
      }
      return { 
        ...course,
        image_url: imageUrl
      };
    }));
    
    return coursesWithSignedUrls;
  },
};

export default StudentDashboardService; 