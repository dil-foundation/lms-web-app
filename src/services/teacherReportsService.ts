import { supabase } from '@/integrations/supabase/client';

// TypeScript interfaces for teacher reports
export interface TeacherOverallMetrics {
  totalStudents: number;
  activeStudents: number;
  averageCompletion: number;
  averageScore: number;
  coursesPublished: number;
  totalAssignments: number;
  totalEnrollments: number;
  averageEngagement: number;
}

export interface CoursePerformanceData {
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  totalStudents: number;
  activeStudents: number;
  completionRate: number;
  averageScore: number;
  totalAssignments: number;
  completedAssignments: number;
  lastActivity: string;
}

export interface StudentProgressData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  enrollmentDate: string;
  lastActivity: string;
  completionRate: number;
  averageScore: number;
  assignmentsCompleted: number;
  totalAssignments: number;
  status: 'active' | 'inactive' | 'completed' | 'at-risk';
}

export interface AssignmentPerformanceData {
  assignmentId: string;
  assignmentTitle: string;
  courseTitle: string;
  totalSubmissions: number;
  averageScore: number;
  completionRate: number;
  dueDate: string;
  status: 'upcoming' | 'active' | 'overdue' | 'completed';
}

export interface MonthlyTrendData {
  month: string;
  enrollments: number;
  completions: number;
  averageScore: number;
  activeStudents: number;
}

export interface StudentStatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface KeyInsight {
  type: 'success' | 'warning' | 'info' | 'error';
  title: string;
  description: string;
  icon: string;
  color: string;
  action?: string;
}

export interface TeacherReportsData {
  overallMetrics: TeacherOverallMetrics;
  coursePerformance: CoursePerformanceData[];
  studentProgress: StudentProgressData[];
  assignmentPerformance: AssignmentPerformanceData[];
  monthlyTrends: MonthlyTrendData[];
  studentStatusDistribution: StudentStatusDistribution[];
  keyInsights: KeyInsight[];
}

export class TeacherReportsService {
  private teacherId: string;

  constructor(teacherId: string) {
    this.teacherId = teacherId;
  }

  async fetchTeacherReports(): Promise<TeacherReportsData> {
    try {
      // Get teacher's courses
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select(`
          course_id,
          courses (
            id,
            title,
            description,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', this.teacherId)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const courseIds = (teacherCourses || []).map(tc => tc.course_id);

      if (courseIds.length === 0) {
        return this.getEmptyReportsData();
      }

      // Get all student enrollments for teacher's courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_members')
        .select(`
          user_id,
          course_id,
          created_at
        `)
        .in('course_id', courseIds)
        .eq('role', 'student');

      if (enrollmentsError) throw enrollmentsError;

      // Get student profiles separately
      const studentIds = [...new Set((enrollments || []).map(e => e.user_id))];
      const { data: studentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email
        `)
        .in('id', studentIds);

      if (profilesError) throw profilesError;

      // Get course details separately
      const { data: courseDetails, error: courseDetailsError } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          description
        `)
        .in('id', courseIds);

      if (courseDetailsError) throw courseDetailsError;

      // Get assignments from course_lessons where type = 'assignment'
      let assignments: any[] = [];
      let submissions: any[] = [];
      
      try {
        const { data: assignmentsData, error: assignmentsError } = await supabase
          .from('course_lessons')
          .select(`
            id,
            title,
            content,
            type,
            due_date,
            created_at,
            section_id,
            course_sections!course_lessons_section_id_fkey (
              course_id
            )
          `)
          .eq('type', 'assignment')
          .in('section_id', (await supabase
            .from('course_sections')
            .select('id')
            .in('course_id', courseIds)
          ).data?.map(s => s.id) || []);

        if (assignmentsError) {
          console.warn('Error fetching assignments from course_lessons:', assignmentsError);
        } else {
          assignments = (assignmentsData || []).map(lesson => ({
            id: lesson.id,
            title: lesson.title,
            description: lesson.content || '',
            course_id: lesson.course_sections?.course_id,
            due_date: lesson.due_date,
            created_at: lesson.created_at
          }));
        }

        // Get assignment submissions
        if (assignments.length > 0) {
          const { data: submissionsData, error: submissionsError } = await supabase
            .from('assignment_submissions')
            .select(`
              id,
              assignment_id,
              user_id,
              submitted_at,
              grade,
              feedback,
              status
            `)
            .in('assignment_id', assignments.map(a => a.id));

          if (submissionsError) {
            console.warn('Error fetching assignment submissions:', submissionsError);
          } else {
            submissions = (submissionsData || []).map(sub => ({
              id: sub.id,
              assignment_id: sub.assignment_id,
              student_id: sub.user_id,
              submitted_at: sub.submitted_at,
              score: sub.grade,
              feedback: sub.feedback,
              status: sub.status
            }));
          }
        }
      } catch (error) {
        console.warn('Error fetching assignments data:', error);
        // Continue without assignments data
      }

      // Get course progress data from user_course_progress
      const { data: courseProgress, error: progressError } = await supabase
        .from('user_course_progress')
        .select(`
          id,
          user_id,
          course_id,
          lesson_id,
          completed_at,
          created_at,
          updated_at,
          progress_seconds
        `)
        .in('course_id', courseIds);

      if (progressError) {
        console.warn('Error fetching course progress:', progressError);
        // Continue without progress data
      }

      // Process the data
      const reportsData = this.processReportsData(
        teacherCourses || [],
        enrollments || [],
        studentProfiles || [],
        courseDetails || [],
        assignments || [],
        submissions || [],
        courseProgress || []
      );

      return reportsData;

    } catch (error) {
      console.error('Error fetching teacher reports:', error);
      throw error;
    }
  }

  private processReportsData(
    teacherCourses: any[],
    enrollments: any[],
    studentProfiles: any[],
    courseDetails: any[],
    assignments: any[],
    submissions: any[],
    courseProgress: any[]
  ): TeacherReportsData {
    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(
      teacherCourses,
      enrollments,
      assignments,
      submissions,
      courseProgress
    );

    // Calculate course performance
    const coursePerformance = this.calculateCoursePerformance(
      teacherCourses,
      enrollments,
      courseDetails,
      assignments,
      submissions,
      courseProgress
    );

    // Calculate student progress
    const studentProgress = this.calculateStudentProgress(
      enrollments,
      studentProfiles,
      courseDetails,
      assignments,
      submissions,
      courseProgress
    );

    // Calculate assignment performance
    const assignmentPerformance = this.calculateAssignmentPerformance(
      assignments,
      submissions,
      courseDetails
    );

    // Calculate monthly trends
    const monthlyTrends = this.calculateMonthlyTrends(enrollments, courseProgress);

    // Calculate student status distribution
    const studentStatusDistribution = this.calculateStudentStatusDistribution(studentProgress);

    // Generate key insights
    const keyInsights = this.generateKeyInsights(
      overallMetrics,
      coursePerformance,
      studentProgress
    );

    return {
      overallMetrics,
      coursePerformance,
      studentProgress,
      assignmentPerformance,
      monthlyTrends,
      studentStatusDistribution,
      keyInsights
    };
  }

  private calculateOverallMetrics(
    teacherCourses: any[],
    enrollments: any[],
    assignments: any[],
    submissions: any[],
    courseProgress: any[]
  ): TeacherOverallMetrics {
    const uniqueStudents = new Set(enrollments.map(e => e.user_id));
    const totalStudents = uniqueStudents.size;

    // Calculate active students (students with recent activity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeStudents = courseProgress.filter(
      cp => new Date(cp.updated_at) > thirtyDaysAgo
    ).length;

    // Calculate average completion (based on completed lessons)
    const avgCompletion = courseProgress.length > 0
      ? (courseProgress.filter(cp => cp.completed_at).length / courseProgress.length) * 100
      : 0;

    // Calculate average score
    const avgScore = submissions.length > 0
      ? submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length
      : 0;

    // Calculate average engagement (based on submission frequency or course progress)
    let avgEngagement = 0;
    if (totalStudents > 0) {
      if (submissions.length > 0) {
        avgEngagement = submissions.length / totalStudents;
      } else {
        // Fallback: use course progress as engagement indicator
        avgEngagement = courseProgress.length / totalStudents;
      }
    }

    return {
      totalStudents,
      activeStudents,
      averageCompletion: Math.round(avgCompletion),
      averageScore: Math.round(avgScore),
      coursesPublished: teacherCourses.length,
      totalAssignments: assignments.length,
      totalEnrollments: enrollments.length,
      averageEngagement: Math.round(avgEngagement * 100)
    };
  }

  private calculateCoursePerformance(
    teacherCourses: any[],
    enrollments: any[],
    courseDetails: any[],
    assignments: any[],
    submissions: any[],
    courseProgress: any[]
  ): CoursePerformanceData[] {
    return teacherCourses.map(tc => {
      const courseId = tc.course_id;
      const course = courseDetails.find(c => c.id === courseId) || { title: 'Unknown Course', description: '' };
      
      // Get students for this course
      const courseEnrollments = enrollments.filter(e => e.course_id === courseId);
      const courseStudents = new Set(courseEnrollments.map(e => e.user_id));
      
      // Get assignments for this course
      const courseAssignments = assignments.filter(a => a.course_id === courseId);
      
      // Get submissions for this course
      const courseSubmissions = submissions.filter(s => 
        courseAssignments.some(a => a.id === s.assignment_id)
      );
      
      // Get progress for this course
      const courseProgressData = courseProgress.filter(cp => cp.course_id === courseId);
      
      // Calculate completion rate (based on completed lessons)
      const completionRate = courseProgressData.length > 0
        ? (courseProgressData.filter(cp => cp.completed_at).length / courseProgressData.length) * 100
        : 0;
      
      // Calculate average score
      const avgScore = courseSubmissions.length > 0
        ? courseSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / courseSubmissions.length
        : 0;
      
      // Calculate active students (with recent activity)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const activeStudents = courseProgressData.filter(
        cp => new Date(cp.updated_at) > thirtyDaysAgo
      ).length;
      
      // Get last activity
      const lastActivity = courseProgressData.length > 0
        ? new Date(Math.max(...courseProgressData.map(cp => new Date(cp.updated_at).getTime()))).toISOString()
        : new Date().toISOString();

      return {
        courseId,
        courseTitle: course.title,
        courseDescription: course.description,
        totalStudents: courseStudents.size,
        activeStudents,
        completionRate: Math.round(completionRate),
        averageScore: Math.round(avgScore),
        totalAssignments: courseAssignments.length,
        completedAssignments: courseSubmissions.length,
        lastActivity
      };
    });
  }

  private calculateStudentProgress(
    enrollments: any[],
    studentProfiles: any[],
    courseDetails: any[],
    assignments: any[],
    submissions: any[],
    courseProgress: any[]
  ): StudentProgressData[] {
    return enrollments.map(enrollment => {
      const studentId = enrollment.user_id;
      const courseId = enrollment.course_id;
      
      // Get student profile
      const studentProfile = studentProfiles.find(p => p.id === studentId);
      const studentName = studentProfile 
        ? `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim() || 'Unknown Student'
        : 'Unknown Student';
      const studentEmail = studentProfile?.email || '';
      
      // Get course details
      const course = courseDetails.find(c => c.id === courseId) || { title: 'Unknown Course' };
      
      // Get student's submissions for this course
      const courseAssignments = assignments.filter(a => a.course_id === courseId);
      const studentSubmissions = submissions.filter(s => 
        s.student_id === studentId && 
        courseAssignments.some(a => a.id === s.assignment_id)
      );
      
      // Get student's progress for this course
      const studentProgressEntries = courseProgress.filter(cp => 
        cp.user_id === studentId && cp.course_id === courseId
      );
      
      // Calculate completion rate (based on completed lessons)
      const completionRate = studentProgressEntries.length > 0
        ? (studentProgressEntries.filter(cp => cp.completed_at).length / studentProgressEntries.length) * 100
        : 0;
      
      // Calculate average score (use 0 if no submissions)
      const avgScore = studentSubmissions.length > 0
        ? studentSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / studentSubmissions.length
        : 0;
      
      // Determine status
      let status: 'active' | 'inactive' | 'completed' | 'at-risk' = 'inactive';
      if (completionRate >= 100) {
        status = 'completed';
      } else if (completionRate >= 70) {
        status = 'active';
      } else if (completionRate >= 30) {
        status = 'at-risk';
      }
      
      // Check if student is active (recent activity)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (studentProgressEntries.length > 0) {
        const lastActivity = new Date(Math.max(...studentProgressEntries.map(cp => new Date(cp.updated_at).getTime())));
        if (lastActivity < thirtyDaysAgo) {
          status = 'inactive';
        }
      }

      return {
        studentId,
        studentName,
        studentEmail,
        courseId,
        courseTitle: course.title,
        enrollmentDate: enrollment.created_at,
        lastActivity: studentProgressEntries.length > 0 
          ? new Date(Math.max(...studentProgressEntries.map(cp => new Date(cp.updated_at).getTime()))).toISOString()
          : enrollment.created_at,
        completionRate: Math.round(completionRate),
        averageScore: Math.round(avgScore),
        assignmentsCompleted: studentSubmissions.length,
        totalAssignments: courseAssignments.length,
        status
      };
    });
  }

  private calculateAssignmentPerformance(
    assignments: any[],
    submissions: any[],
    courseDetails: any[]
  ): AssignmentPerformanceData[] {
    return assignments.map(assignment => {
      const assignmentSubmissions = submissions.filter(s => s.assignment_id === assignment.id);
      
      // Get course title
      const course = courseDetails.find(c => c.id === assignment.course_id) || { title: 'Unknown Course' };
      
      // Calculate completion rate
      const completionRate = assignmentSubmissions.length > 0
        ? (assignmentSubmissions.filter(s => s.status === 'submitted').length / assignmentSubmissions.length) * 100
        : 0;
      
      // Calculate average score
      const avgScore = assignmentSubmissions.length > 0
        ? assignmentSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / assignmentSubmissions.length
        : 0;
      
      // Determine status
      const now = new Date();
      const dueDate = new Date(assignment.due_date);
      let status: 'upcoming' | 'active' | 'overdue' | 'completed' = 'active';
      
      if (dueDate < now) {
        status = 'overdue';
      } else if (dueDate.getTime() - now.getTime() > 7 * 24 * 60 * 60 * 1000) {
        status = 'upcoming';
      }
      
      if (completionRate >= 90) {
        status = 'completed';
      }

      return {
        assignmentId: assignment.id,
        assignmentTitle: assignment.title,
        courseTitle: course.title,
        totalSubmissions: assignmentSubmissions.length,
        averageScore: Math.round(avgScore),
        completionRate: Math.round(completionRate),
        dueDate: assignment.due_date,
        status
      };
    });
  }

  private calculateMonthlyTrends(
    enrollments: any[],
    courseProgress: any[]
  ): MonthlyTrendData[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();
    
    return months.map((month, index) => {
      const monthStart = new Date(currentYear, index, 1);
      const monthEnd = new Date(currentYear, index + 1, 0);
      
      // Count enrollments in this month
      const monthEnrollments = enrollments.filter(e => {
        const enrollmentDate = new Date(e.created_at);
        return enrollmentDate >= monthStart && enrollmentDate <= monthEnd;
      }).length;
      
      // Count completions in this month
      const monthCompletions = courseProgress.filter(cp => {
        if (!cp.completed_at) return false;
        const completionDate = new Date(cp.completed_at);
        return completionDate >= monthStart && completionDate <= monthEnd;
      }).length;
      
      // Calculate average score for this month (based on completed lessons)
      const monthProgress = courseProgress.filter(cp => {
        const lastAccessed = new Date(cp.updated_at);
        return lastAccessed >= monthStart && lastAccessed <= monthEnd;
      });
      
      const avgScore = monthProgress.length > 0
        ? (monthProgress.filter(cp => cp.completed_at).length / monthProgress.length) * 100
        : 0;
      
      // Count active students in this month
      const activeStudents = monthProgress.length;
      
      return {
        month,
        enrollments: monthEnrollments,
        completions: monthCompletions,
        averageScore: Math.round(avgScore),
        activeStudents
      };
    });
  }

  private calculateStudentStatusDistribution(
    studentProgress: StudentProgressData[]
  ): StudentStatusDistribution[] {
    const statusCounts = new Map<string, number>();
    
    studentProgress.forEach(student => {
      const count = statusCounts.get(student.status) || 0;
      statusCounts.set(student.status, count + 1);
    });
    
    const total = studentProgress.length;
    const colors = {
      'active': '#10B981',
      'completed': '#3B82F6',
      'at-risk': '#F59E0B',
      'inactive': '#EF4444'
    };
    
    return Array.from(statusCounts.entries()).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: colors[status as keyof typeof colors] || '#6B7280'
    }));
  }

  private generateKeyInsights(
    overallMetrics: TeacherOverallMetrics,
    coursePerformance: CoursePerformanceData[],
    studentProgress: StudentProgressData[]
  ): KeyInsight[] {
    const insights: KeyInsight[] = [];
    
    // Overall engagement insight
    if (overallMetrics.totalStudents > 0) {
      const engagementRate = Math.round((overallMetrics.activeStudents / overallMetrics.totalStudents) * 100);
      
      if (engagementRate >= 80) {
        insights.push({
          type: 'success',
          title: 'Excellent Student Engagement',
          description: `${engagementRate}% of students are actively engaged`,
          icon: 'TrendingUp',
          color: 'text-green-600'
        });
      } else if (engagementRate < 50) {
        insights.push({
          type: 'warning',
          title: 'Low Student Engagement',
          description: `Only ${engagementRate}% of students are active. Consider reaching out to inactive students.`,
          icon: 'AlertCircle',
          color: 'text-orange-600',
          action: 'Send reminder emails'
        });
      }
    }
    
    // Course performance insights
    coursePerformance.forEach(course => {
      if (course.completionRate < 70) {
        insights.push({
          type: 'warning',
          title: `${course.courseTitle} needs attention`,
          description: `Only ${course.completionRate}% completion rate with ${course.totalStudents} students`,
          icon: 'AlertCircle',
          color: 'text-orange-600',
          action: 'Review course content'
        });
      } else if (course.completionRate >= 90) {
        insights.push({
          type: 'success',
          title: `${course.courseTitle} performing excellently`,
          description: `${course.completionRate}% completion rate with ${course.totalStudents} students`,
          icon: 'CheckCircle',
          color: 'text-green-600'
        });
      }
    });
    
    // At-risk students insight
    const atRiskStudents = studentProgress.filter(s => s.status === 'at-risk').length;
    if (atRiskStudents > 0) {
      insights.push({
        type: 'warning',
        title: `${atRiskStudents} students at risk`,
        description: 'Students with low completion rates may need additional support',
        icon: 'AlertCircle',
        color: 'text-orange-600',
        action: 'Review at-risk students'
      });
    }
    
    // Overall performance insight (only if there are assignments)
    if (overallMetrics.totalAssignments > 0 && overallMetrics.averageScore >= 85) {
      insights.push({
        type: 'success',
        title: 'Strong Academic Performance',
        description: `Average score of ${overallMetrics.averageScore}% across all assignments`,
        icon: 'Award',
        color: 'text-green-600'
      });
    }
    
    return insights.slice(0, 5); // Limit to 5 insights
  }

  private getEmptyReportsData(): TeacherReportsData {
    return {
      overallMetrics: {
        totalStudents: 0,
        activeStudents: 0,
        averageCompletion: 0,
        averageScore: 0,
        coursesPublished: 0,
        totalAssignments: 0,
        totalEnrollments: 0,
        averageEngagement: 0
      },
      coursePerformance: [],
      studentProgress: [],
      assignmentPerformance: [],
      monthlyTrends: [],
      studentStatusDistribution: [],
      keyInsights: []
    };
  }
} 