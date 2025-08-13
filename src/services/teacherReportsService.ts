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
      // 1. Get teacher's courses
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id, courses(id, title, description, status)')
        .eq('user_id', this.teacherId)
        .eq('role', 'teacher');

      if (coursesError) throw coursesError;

      const publishedCourses = (teacherCourses || []).filter(tc => tc.courses?.status === 'Published');

      const courseIds = (publishedCourses || []).map(tc => tc.course_id);
      const courseDetails = (publishedCourses || []).map(tc => tc.courses).filter(Boolean);

      if (courseIds.length === 0) {
        return this.getEmptyReportsData();
      }

      // 2. Get student enrollments for these courses
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('course_members')
        .select('user_id, course_id, created_at')
        .in('course_id', courseIds)
        .eq('role', 'student');
      if (enrollmentsError) throw enrollmentsError;
      const studentIds = [...new Set((enrollments || []).map(e => e.user_id))];

      // 3. Get student profiles
      const { data: studentProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', studentIds);
      if (profilesError) throw profilesError;

      // 4. Get all course content, lessons, and sections for progress calculation
      const { data: sections, error: sectionsError } = await supabase
          .from('course_sections')
          .select('id, course_id')
          .in('course_id', courseIds);
      if (sectionsError) throw sectionsError;
      const sectionIds = sections.map(s => s.id);

      const { data: lessons, error: lessonsError } = await supabase
        .from('course_lessons')
        .select('id, section_id')
        .in('section_id', sectionIds);
      if (lessonsError) throw lessonsError;
      const lessonIds = lessons.map(l => l.id);

      const { data: allContentItems, error: contentError } = await supabase
        .from('course_lesson_content')
        .select('id, lesson_id, title, content_type, due_date')
        .in('lesson_id', lessonIds);
      if (contentError) throw contentError;
      
      const assignments = allContentItems
        .filter(item => item.content_type === 'assignment')
        .map(item => {
            const lesson = lessons.find(l => l.id === item.lesson_id);
            const section = sections.find(s => s.id === lesson?.section_id);
            return {
                id: item.id,
                title: item.title,
                course_id: section?.course_id,
                due_date: item.due_date,
            };
        });

      // 5. Get all submissions for these assignments
      const assignmentIds = assignments.map(a => a.id);
      const { data: submissions, error: submissionsError } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, user_id, submitted_at, grade, status')
        .in('assignment_id', assignmentIds);
      if (submissionsError) throw submissionsError;

      // 6. Get all progress items for these students in these courses
      const { data: courseProgress, error: progressError } = await supabase
        .from('user_content_item_progress')
        .select('user_id, course_id, lesson_content_id, status, updated_at, completed_at')
        .in('user_id', studentIds)
        .in('course_id', courseIds);
      if (progressError) throw progressError;

      // 7. Get student status distribution from database function
      const { data: studentStatusDistribution, error: statusError } = await supabase
        .rpc('get_student_status_distribution', {
          p_teacher_id: this.teacherId
        });
      if (statusError) throw statusError;

      // 8. Get course performance data from database function
      const { data: coursePerformanceData, error: coursePerformanceError } = await supabase
        .rpc('get_course_performance_data', {
          p_teacher_id: this.teacherId
        });
      if (coursePerformanceError) throw coursePerformanceError;

      // 9. Get overall metrics from database function
      const { data: overallMetricsData, error: overallMetricsError } = await supabase
        .rpc('get_teacher_overall_metrics', {
          p_teacher_id: this.teacherId
        });
      if (overallMetricsError) throw overallMetricsError;

      // Process the data
      const reportsData = this.processReportsData(
        publishedCourses || [],
        enrollments || [],
        studentProfiles || [],
        courseDetails || [],
        assignments || [],
        submissions || [],
        courseProgress || [],
        allContentItems || [],
        lessons || [],
        sections || [],
        studentStatusDistribution || [],
        coursePerformanceData || [],
        overallMetricsData || []
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
    courseProgress: any[],
    allContentItems: any[],
    lessons: any[],
    sections: any[],
    studentStatusDistribution: any[],
    coursePerformanceData: any[],
    overallMetricsData: any[]
  ): TeacherReportsData {


    // Calculate overall metrics
    const overallMetrics = this.calculateOverallMetrics(
      teacherCourses,
      enrollments,
      assignments,
      submissions,
      courseProgress,
      allContentItems,
      overallMetricsData
    );

    // Calculate course performance
    const coursePerformance = this.calculateCoursePerformance(
      teacherCourses,
      enrollments,
      courseDetails,
      assignments,
      submissions,
      courseProgress,
      allContentItems,
      lessons,
      sections,
      coursePerformanceData
    );

    // Calculate student progress
    const studentProgress = this.calculateStudentProgress(
      enrollments,
      studentProfiles,
      courseDetails,
      assignments,
      submissions,
      courseProgress,
      allContentItems,
      lessons,
      sections
    );

    // Calculate assignment performance
    const assignmentPerformance = this.calculateAssignmentPerformance(
      assignments,
      submissions,
      courseDetails
    );

    // Calculate monthly trends
    const monthlyTrends = this.calculateMonthlyTrends(enrollments, courseProgress, submissions);

    // Calculate student status distribution
    const studentStatusDistributionData = this.calculateStudentStatusDistribution(studentProgress, studentStatusDistribution);

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
      studentStatusDistribution: studentStatusDistributionData,
      keyInsights
    };
  }

  private calculateOverallMetrics(teacherCourses: any[], enrollments: any[], assignments: any[], submissions: any[], courseProgress: any[], allContentItems: any[], overallMetricsData: any[]): TeacherOverallMetrics {
    // Use the database function data directly
    if (overallMetricsData && overallMetricsData.length > 0) {
      const dbEntry = overallMetricsData[0];
      return {
        totalStudents: dbEntry.total_students,
        activeStudents: dbEntry.active_students,
        averageCompletion: dbEntry.average_completion,
        averageScore: dbEntry.average_score,
        coursesPublished: teacherCourses.length,
        totalAssignments: assignments.length,
        totalEnrollments: enrollments.length,
        averageEngagement: dbEntry.average_engagement,
      };
    }

    const studentIds = [...new Set(enrollments.map(e => e.user_id))];
    const totalStudents = studentIds.length;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeStudentIds = new Set(courseProgress.filter(p => new Date(p.updated_at) > thirtyDaysAgo).map(p => p.user_id));
    const activeStudents = activeStudentIds.size;

    // Calculate average completion rate across all students
    let averageCompletion = 0;
    if (studentIds.length > 0 && allContentItems.length > 0) {
        const studentCompletionRates = studentIds.map(studentId => {
            const studentProgressEntries = courseProgress.filter(p => p.user_id === studentId);
            const completedItems = studentProgressEntries.filter(p => p.status && p.status.toLowerCase() === 'completed').length;
            return (completedItems / allContentItems.length) * 100;
        });
        averageCompletion = Math.round(studentCompletionRates.reduce((sum, rate) => sum + rate, 0) / studentCompletionRates.length);
    }
    
    const gradedSubmissions = submissions.filter(s => s.grade !== null);
    const averageScore = gradedSubmissions.length > 0 ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length) : 0;
    
    const averageEngagement = totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0;

    return {
      totalStudents,
      activeStudents,
      averageCompletion,
      averageScore,
      coursesPublished: teacherCourses.length,
      totalAssignments: assignments.length,
      totalEnrollments: enrollments.length,
      averageEngagement,
    };
}


private calculateCoursePerformance(teacherCourses: any[], enrollments: any[], courseDetails: any[], assignments: any[], submissions: any[], courseProgress: any[], allContentItems: any[], lessons: any[], sections: any[], coursePerformanceData: any[]): CoursePerformanceData[] {
    // Use the database function data directly
    if (coursePerformanceData && coursePerformanceData.length > 0) {
      return coursePerformanceData.map(dbEntry => ({
        courseId: dbEntry.course_id,
        courseTitle: dbEntry.course_title,
        courseDescription: dbEntry.course_description,
        totalStudents: dbEntry.total_students,
        activeStudents: dbEntry.active_students,
        completionRate: dbEntry.completion_rate,
        averageScore: dbEntry.average_score,
        totalAssignments: dbEntry.total_assignments,
        completedAssignments: dbEntry.completed_assignments,
        lastActivity: dbEntry.last_activity
      }));
    }
    
    // Fallback to client-side calculation if database function fails
    return courseDetails.map(course => {
        const courseId = course.id;
        const courseEnrollments = enrollments.filter(e => e.course_id === courseId);
        const courseStudentIds = courseEnrollments.map(e => e.user_id);
        const courseAssignments = assignments.filter(a => a.course_id === courseId);
        const courseSubmissions = submissions.filter(s => courseAssignments.some(a => a.id === s.assignment_id));
        
        const courseContent = allContentItems.filter(item => {
            const lesson = lessons.find(l => l.id === item.lesson_id);
            return lesson && sections.find(s => s.id === lesson.section_id)?.course_id === courseId;
        });

        const totalCourseItems = courseContent.length;
        
        // Calculate completion rate as average across all students
        let completionRate = 0;
        if (courseStudentIds.length > 0 && totalCourseItems > 0) {
            const studentCompletionRates = courseStudentIds.map(studentId => {
                const studentProgressEntries = courseProgress.filter(p => p.user_id === studentId && p.course_id === courseId);
                const completedItems = studentProgressEntries.filter(p => p.status && p.status.toLowerCase() === 'completed').length;
                return (completedItems / totalCourseItems) * 100;
            });
            completionRate = Math.round(studentCompletionRates.reduce((sum, rate) => sum + rate, 0) / studentCompletionRates.length);
        }

        const gradedSubmissions = courseSubmissions.filter(s => s.grade !== null);
        const averageScore = gradedSubmissions.length > 0 ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length) : 0;
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeStudents = new Set(courseProgress.filter(p => p.course_id === courseId && new Date(p.updated_at) > thirtyDaysAgo).map(p => p.user_id)).size;
        
        const lastActivity = courseProgress.length > 0 ? new Date(Math.max(...courseProgress.filter(p=>p.course_id === courseId).map(p => new Date(p.updated_at).getTime()))).toISOString() : new Date().toISOString();

        return {
            courseId,
            courseTitle: course.title,
            courseDescription: course.description,
            totalStudents: courseStudentIds.length,
            activeStudents,
            completionRate,
            averageScore,
            totalAssignments: courseAssignments.length,
            completedAssignments: courseSubmissions.length,
            lastActivity,
        };
    });
  }


private calculateStudentProgress(enrollments: any[], studentProfiles: any[], courseDetails: any[], assignments: any[], submissions: any[], courseProgress: any[], allContentItems: any[], lessons: any[], sections: any[]): StudentProgressData[] {
    return enrollments.map(enrollment => {
        const studentId = enrollment.user_id;
        const courseId = enrollment.course_id;
        const studentProfile = studentProfiles.find(p => p.id === studentId) || {};
        const course = courseDetails.find(c => c.id === courseId) || {};
        
        const courseAssignments = assignments.filter(a => a.course_id === courseId);
        const studentSubmissions = submissions.filter(s => s.user_id === studentId && courseAssignments.some(a => a.id === s.assignment_id));

        const courseContent = allContentItems.filter(item => {
            const lesson = lessons.find(l => l.id === item.lesson_id);
            return lesson && sections.find(s => s.id === lesson.section_id)?.course_id === courseId;
        });
        const totalCourseItems = courseContent.length;
        
        const studentProgressEntries = courseProgress.filter(p => p.user_id === studentId && p.course_id === courseId);
        const completedItems = studentProgressEntries.filter(p => p.status && p.status.toLowerCase() === 'completed').length;
        const completionRate = totalCourseItems > 0 ? Math.round((completedItems / totalCourseItems) * 100) : 0;
        
        const gradedSubmissions = studentSubmissions.filter(s => s.grade !== null);
        const averageScore = gradedSubmissions.length > 0 ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length) : 0;
        
        const lastActivity = studentProgressEntries.length > 0 ? new Date(Math.max(...studentProgressEntries.map(p => new Date(p.updated_at).getTime()))).toISOString() : enrollment.created_at;

        let status: 'active' | 'inactive' | 'completed' | 'at-risk' = 'inactive';
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Check if student has been active in the last 30 days
        const isRecentlyActive = new Date(lastActivity) > thirtyDaysAgo;
        
        if (completionRate >= 100) {
            status = 'completed';
        } else if (isRecentlyActive) {
            // If student is active, categorize based on completion rate
            if (completionRate >= 70) {
                status = 'active';
            } else if (completionRate > 0) {
                // Students with some progress but less than 70% are still active, not at-risk
                status = 'active';
            } else {
                // Students with no progress but recent activity are at-risk
                status = 'at-risk';
            }
        } else {
            // Inactive students (no activity in 30 days)
            if (completionRate > 0) {
                status = 'at-risk'; // Had progress but became inactive
            } else {
                status = 'inactive'; // Never started
            }
        }

        return {
            studentId,
            studentName: `${studentProfile.first_name || ''} ${studentProfile.last_name || ''}`.trim(),
            studentEmail: studentProfile.email,
            courseId,
            courseTitle: course.title,
            enrollmentDate: enrollment.created_at,
            lastActivity,
            completionRate,
            averageScore,
            assignmentsCompleted: studentSubmissions.length,
            totalAssignments: courseAssignments.length,
            status,
        };
    });
}
  // ... (rest of the file is the same)
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
        ? (assignmentSubmissions.filter(s => s.status === 'graded' || s.status === 'submitted').length / assignmentSubmissions.length) * 100
        : 0;
      
      // Calculate average score
      const avgScore = assignmentSubmissions.length > 0
        ? assignmentSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0) / assignmentSubmissions.length
        : 0;
      
      // Determine status
      const now = new Date();
      const dueDate = new Date(assignment.due_date);
      let status: 'upcoming' | 'active' | 'overdue' | 'completed' = 'active';
      
      if (dueDate < now && completionRate < 100) {
        status = 'overdue';
      } else if (dueDate.getTime() - now.getTime() > 7 * 24 * 60 * 60 * 1000) {
        status = 'upcoming';
      }
      
      if (completionRate >= 100) {
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
    courseProgress: any[],
    submissions: any[]
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
      
      const monthSubmissions = submissions.filter(s => {
          const submittedAt = new Date(s.submitted_at);
          return submittedAt >= monthStart && submittedAt <= monthEnd;
      });

      const gradedMonthSubmissions = monthSubmissions.filter(s => s.grade !== null);
      const avgScore = gradedMonthSubmissions.length > 0 ? Math.round(gradedMonthSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedMonthSubmissions.length) : 0;
      
      // Count active students in this month
      const activeStudents = new Set(courseProgress.filter(p=> new Date(p.updated_at) >= monthStart && new Date(p.updated_at) <= monthEnd).map(p => p.user_id)).size;
      
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
    studentProgress: StudentProgressData[],
    studentStatusDistribution: any[]
  ): StudentStatusDistribution[] {
    // Use the database function data directly
    if (studentStatusDistribution && studentStatusDistribution.length > 0) {
      return studentStatusDistribution.map(dbEntry => ({
        status: dbEntry.status,
        count: dbEntry.count,
        percentage: dbEntry.percentage,
        color: dbEntry.color
      }));
    }
    
    // Fallback to client-side calculation if database function fails
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
