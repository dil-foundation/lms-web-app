import { supabase } from '@/integrations/supabase/client';

export interface CourseNotificationData {
  courseId: string;
  courseName: string;
  courseTitle: string;
  courseSubtitle?: string;
  action: 'course_access_granted' | 'course_updated' | 'course_published' | 'course_unpublished' | 'course_deleted' | 'assignment_submitted' | 'quiz_submitted' | 'course_submitted_for_review' | 'course_approved' | 'course_rejected';
  addedTeachers?: Array<{ id: string; name: string; email: string }>;
  existingTeachers?: Array<{ id: string; name: string; email: string }>;
  students?: Array<{ id: string; name: string; email: string }>;
  performedBy: { id: string; name: string; email: string };
  // Assignment-specific fields
  assignmentTitle?: string;
  studentName?: string;
  // Quiz-specific fields
  quizTitle?: string;
  manualGradingRequired?: boolean;
  // Course review fields
  rejectionFeedback?: string;
}

class CourseNotificationService {
  /**
   * Send notifications when teachers get access to a course
   */
  static async notifyCourseAccessGranted(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, addedTeachers, performedBy } = notificationData;
      
      if (!addedTeachers || addedTeachers.length === 0) return;

      // Send notifications to newly added teachers
      for (const teacher of addedTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_access_granted',
              title: 'Course Access Granted',
              body: `You now have access to the course "${courseName}"`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'access_granted',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course access notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${addedTeachers.length} teachers about course access`);
    } catch (error) {
      console.error('Error sending course access notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications when a course is updated to existing teachers
   */
  static async notifyCourseUpdated(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, performedBy } = notificationData;
      
      if (!existingTeachers || existingTeachers.length === 0) return;

      // Send notifications to existing teachers
      for (const teacher of existingTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_updated',
              title: 'Course Updated',
              body: `The course "${courseName}" has been updated`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'course_updated',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course update notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${existingTeachers.length} teachers about course update`);
    } catch (error) {
      console.error('Error sending course update notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Get course information for notifications
   */
  static async getCourseInfo(courseId: string): Promise<{ courseName: string; courseTitle: string; courseSubtitle?: string } | null> {
    try {
      const { data: course, error } = await supabase
        .from('courses')
        .select('title, subtitle')
        .eq('id', courseId)
        .single();

      if (error || !course) {
        console.error('Error fetching course info:', error);
        return null;
      }

      return {
        courseName: course.title,
        courseTitle: course.title,
        courseSubtitle: course.subtitle
      };
    } catch (error) {
      console.error('Error getting course info:', error);
      return null;
    }
  }

  /**
   * Get teacher details for notifications
   */
  static async getTeacherDetails(teacherIds: string[]): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      if (teacherIds.length === 0) return [];

      const { data: teachers, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', teacherIds)
        .eq('role', 'teacher');

      if (error) {
        console.error('Error fetching teacher details:', error);
        return [];
      }

      return teachers?.map(teacher => ({
        id: teacher.id,
        name: `${teacher.first_name} ${teacher.last_name}`,
        email: teacher.email
      })) || [];
    } catch (error) {
      console.error('Error getting teacher details:', error);
      return [];
    }
  }

  /**
   * Send notifications when a course is published to students
   */
  static async notifyCoursePublished(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, students, performedBy } = notificationData;
      
      if (!students || students.length === 0) return;

      // Send notifications to all students
      for (const student of students) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_published',
              title: 'New Course Available',
              body: `A new course "${courseName}" is now available for you`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'course_published',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [student.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course published notification to student ${student.name}:`, error);
        }
      }

      console.log(`✅ Notified ${students.length} students about new course`);
    } catch (error) {
      console.error('Error sending course published notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Get student details for notifications
   */
  static async getStudentDetails(studentIds: string[]): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      if (studentIds.length === 0) return [];

      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', studentIds)
        .eq('role', 'student');

      if (error) {
        console.error('Error fetching student details:', error);
        return [];
      }

      return students?.map(student => ({
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        email: student.email
      })) || [];
    } catch (error) {
      console.error('Error getting student details:', error);
      return [];
    }
  }

  /**
   * Send notifications for course member changes
   */
  static async notifyCourseMemberChanges(
    courseId: string,
    newTeachers: Array<{ id: string; name: string; email: string }>,
    existingTeachers: Array<{ id: string; name: string; email: string }>,
    performedBy: { id: string; name: string; email: string }
  ): Promise<void> {
    try {
      // Get course information
      const courseInfo = await this.getCourseInfo(courseId);
      if (!courseInfo) {
        console.warn('Could not get course info for notifications');
        return;
      }

      // Send notifications to newly added teachers
      if (newTeachers.length > 0) {
        await this.notifyCourseAccessGranted({
          courseId,
          courseName: courseInfo.courseName,
          courseTitle: courseInfo.courseTitle,
          courseSubtitle: courseInfo.courseSubtitle,
          action: 'course_access_granted',
          addedTeachers: newTeachers,
          performedBy
        });
      }

      // Send notifications to existing teachers about course updates
      if (existingTeachers.length > 0) {
        await this.notifyCourseUpdated({
          courseId,
          courseName: courseInfo.courseName,
          courseTitle: courseInfo.courseTitle,
          courseSubtitle: courseInfo.courseSubtitle,
          action: 'course_updated',
          existingTeachers,
          performedBy
        });
      }
    } catch (error) {
      console.error('Error sending course member change notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications when a course is published to teachers
   */
  static async notifyTeachersCoursePublished(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, performedBy } = notificationData;
      
      if (!existingTeachers || existingTeachers.length === 0) return;

      // Send notifications to all teachers
      for (const teacher of existingTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_published',
              title: 'Course Published',
              body: `The course "${courseName}" has been published`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'course_published',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course published notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${existingTeachers.length} teachers about course publication`);
    } catch (error) {
      console.error('Error sending course published notifications to teachers:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications for course publication to students
   */
  static async notifyCoursePublication(
    courseId: string,
    students: Array<{ id: string; name: string; email: string }>,
    teachers: Array<{ id: string; name: string; email: string }>,
    performedBy: { id: string; name: string; email: string }
  ): Promise<void> {
    try {
      // Get course information
      const courseInfo = await this.getCourseInfo(courseId);
      if (!courseInfo) {
        console.warn('Could not get course info for notifications');
        return;
      }

      // Send notifications to students about new course
      if (students.length > 0) {
        await this.notifyCoursePublished({
          courseId,
          courseName: courseInfo.courseName,
          courseTitle: courseInfo.courseTitle,
          courseSubtitle: courseInfo.courseSubtitle,
          action: 'course_published',
          students,
          performedBy
        });
      }

      // Send notifications to teachers about course publication
      if (teachers.length > 0) {
        await this.notifyTeachersCoursePublished({
          courseId,
          courseName: courseInfo.courseName,
          courseTitle: courseInfo.courseTitle,
          courseSubtitle: courseInfo.courseSubtitle,
          action: 'course_published',
          existingTeachers: teachers,
          performedBy
        });
      }
    } catch (error) {
      console.error('Error sending course publication notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications when a course is unpublished to teachers and students
   */
  static async notifyCourseUnpublished(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, students, performedBy } = notificationData;
      
      console.log('🔔 Sending course unpublished notifications:', {
        courseId,
        courseName,
        teachersCount: existingTeachers?.length || 0,
        studentsCount: students?.length || 0
      });
      
      // Send notifications to teachers
      if (existingTeachers && existingTeachers.length > 0) {
        console.log('🔔 Sending unpublished notifications to teachers:', existingTeachers.map(t => t.name));
        for (const teacher of existingTeachers) {
          try {
            console.log(`🔔 Sending unpublished notification to teacher: ${teacher.name} (${teacher.id})`);
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'course_unpublished',
                title: 'Course Unpublished',
                body: `The course "${courseName}" has been unpublished`,
                data: {
                  courseId: courseId,
                  courseName: courseName,
                  courseTitle: courseTitle,
                  action: 'course_unpublished',
                  performedById: performedBy.id,
                  performedByName: performedBy.name,
                  performedByEmail: performedBy.email,
                  timestamp: new Date().toISOString()
                },
                targetUsers: [teacher.id]
              }
            });
          } catch (error) {
            console.error(`Error sending course unpublished notification to teacher ${teacher.name}:`, error);
          }
        }
      }

      // Send notifications to students
      if (students && students.length > 0) {
        console.log('🔔 Sending unpublished notifications to students:', students.map(s => s.name));
        for (const student of students) {
          try {
            console.log(`🔔 Sending unpublished notification to student: ${student.name} (${student.id})`);
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'course_unpublished',
                title: 'Course Unavailable',
                body: `The course "${courseName}" is no longer available`,
                data: {
                  courseId: courseId,
                  courseName: courseName,
                  courseTitle: courseTitle,
                  action: 'course_unpublished',
                  performedById: performedBy.id,
                  performedByName: performedBy.name,
                  performedByEmail: performedBy.email,
                  timestamp: new Date().toISOString()
                },
                targetUsers: [student.id]
              }
            });
          } catch (error) {
            console.error(`Error sending course unpublished notification to student ${student.name}:`, error);
          }
        }
      }

      console.log(`✅ Notified users about course unpublishing`);
    } catch (error) {
      console.error('Error sending course unpublished notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications when a course is deleted to teachers and students
   */
  static async notifyCourseDeleted(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, students, performedBy } = notificationData;
      
      // Send notifications to teachers
      if (existingTeachers && existingTeachers.length > 0) {
        for (const teacher of existingTeachers) {
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'course_deleted',
                title: 'Course Deleted',
                body: `The course "${courseName}" has been deleted`,
                data: {
                  courseId: courseId,
                  courseName: courseName,
                  courseTitle: courseTitle,
                  action: 'course_deleted',
                  performedById: performedBy.id,
                  performedByName: performedBy.name,
                  performedByEmail: performedBy.email,
                  timestamp: new Date().toISOString()
                },
                targetUsers: [teacher.id]
              }
            });
          } catch (error) {
            console.error(`Error sending course deleted notification to teacher ${teacher.name}:`, error);
          }
        }
      }

      // Send notifications to students
      if (students && students.length > 0) {
        for (const student of students) {
          try {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'course_deleted',
                title: 'Course Removed',
                body: `The course "${courseName}" has been removed`,
                data: {
                  courseId: courseId,
                  courseName: courseName,
                  courseTitle: courseTitle,
                  action: 'course_deleted',
                  performedById: performedBy.id,
                  performedByName: performedBy.name,
                  performedByEmail: performedBy.email,
                  timestamp: new Date().toISOString()
                },
                targetUsers: [student.id]
              }
            });
          } catch (error) {
            console.error(`Error sending course deleted notification to student ${student.name}:`, error);
          }
        }
      }

      console.log(`✅ Notified users about course deletion`);
    } catch (error) {
      console.error('Error sending course deleted notifications:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications when a student submits an assignment to course teachers
   */
  static async notifyAssignmentSubmission(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, assignmentTitle, studentName, performedBy } = notificationData;
      
      if (!existingTeachers || existingTeachers.length === 0) {
        console.log('No teachers to notify for assignment submission');
        return;
      }

      // Send notifications to all course teachers
      for (const teacher of existingTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'assignment_submitted',
              title: 'Assignment Submitted',
              body: `${studentName} has submitted the assignment "${assignmentTitle}" for the course "${courseName}"`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                assignmentTitle: assignmentTitle,
                studentName: studentName,
                action: 'assignment_submitted',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending assignment submission notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${existingTeachers.length} teachers about assignment submission`);
    } catch (error) {
      console.error('Error sending assignment submission notifications:', error);
      // Don't throw error to avoid breaking the main assignment submission operation
    }
  }

  /**
   * Send notifications when a student submits a quiz to course teachers
   */
  static async notifyQuizSubmission(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, quizTitle, studentName, manualGradingRequired, performedBy } = notificationData;
      
      if (!existingTeachers || existingTeachers.length === 0) {
        console.log('No teachers to notify for quiz submission');
        return;
      }

      // Create notification message based on manual grading requirement
      const baseMessage = `${studentName} has submitted the quiz "${quizTitle}" for the course "${courseName}"`;
      const message = manualGradingRequired 
        ? `${baseMessage}. Manual grading is required.`
        : baseMessage;

      // Send notifications to all course teachers
      for (const teacher of existingTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'quiz_submitted',
              title: 'Quiz Submitted',
              body: message,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                quizTitle: quizTitle,
                studentName: studentName,
                manualGradingRequired: manualGradingRequired?.toString() || 'false',
                action: 'quiz_submitted',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending quiz submission notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${existingTeachers.length} teachers about quiz submission`);
    } catch (error) {
      console.error('Error sending quiz submission notifications:', error);
      // Don't throw error to avoid breaking the main quiz submission operation
    }
  }

  /**
   * Get course teachers for a specific course
   */
  static async getCourseTeachers(courseId: string): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      const { data: courseMembers, error } = await supabase
        .from('course_members')
        .select(`
          user_id,
          profiles!inner(id, first_name, last_name, email)
        `)
        .eq('course_id', courseId)
        .eq('role', 'teacher');

      if (error) {
        console.error('Error fetching course teachers:', error);
        return [];
      }

      return courseMembers?.map((member: any) => ({
        id: member.profiles.id,
        name: `${member.profiles.first_name} ${member.profiles.last_name}`,
        email: member.profiles.email
      })) || [];
    } catch (error) {
      console.error('Error getting course teachers:', error);
      return [];
    }
  }

  /**
   * Get all admin and super user users from the database
   */
  private static async getAllAdmins(): Promise<Array<{ id: string; name: string; email: string }>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('role', ['admin', 'super_user']);

      if (error) {
        console.error('Error fetching admin and super user users:', error);
        return [];
      }

      return data?.map(admin => ({
        id: admin.id,
        name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin',
        email: admin.email || ''
      })) || [];
    } catch (error) {
      console.error('Error getting admin and super user users:', error);
      return [];
    }
  }

  /**
   * Send notifications to all admins and super users when a course is submitted for review
   */
  static async notifyAdminsCourseSubmittedForReview(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, performedBy } = notificationData;
      
      // Get all admin and super user users
      const admins = await this.getAllAdmins();
      
      if (admins.length === 0) {
        console.warn('No admin or super user users found to notify about course submission for review');
        return;
      }

      // Send notifications to all admins and super users
      for (const admin of admins) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_submitted_for_review',
              title: 'Course Submitted for Review',
              body: `The course "${courseName}" has been submitted for review by ${performedBy.name}`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'course_submitted_for_review',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [admin.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course submission notification to admin/super user ${admin.name}:`, error);
        }
      }

      console.log(`✅ Notified ${admins.length} admins and super users about course submission for review`);
    } catch (error) {
      console.error('Error sending course submission notifications to admins and super users:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications to course teachers when a course is approved
   */
  static async notifyTeachersCourseApproved(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, performedBy } = notificationData;
      
      if (!existingTeachers || existingTeachers.length === 0) {
        console.warn('No teachers found to notify about course approval');
        return;
      }

      // Send notifications to all course teachers
      for (const teacher of existingTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_approved',
              title: 'Course Approved',
              body: `Your course "${courseName}" has been approved and published by ${performedBy.name}`,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'course_approved',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course approval notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${existingTeachers.length} teachers about course approval`);
    } catch (error) {
      console.error('Error sending course approval notifications to teachers:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }

  /**
   * Send notifications to course teachers when a course is rejected
   */
  static async notifyTeachersCourseRejected(notificationData: CourseNotificationData): Promise<void> {
    try {
      const { courseId, courseName, courseTitle, existingTeachers, performedBy, rejectionFeedback } = notificationData;
      
      if (!existingTeachers || existingTeachers.length === 0) {
        console.warn('No teachers found to notify about course rejection');
        return;
      }

      // Create notification message with feedback
      const baseMessage = `Your course "${courseName}" has been rejected by ${performedBy.name}`;
      const message = rejectionFeedback 
        ? `${baseMessage}. Feedback: ${rejectionFeedback}`
        : baseMessage;

      // Send notifications to all course teachers
      for (const teacher of existingTeachers) {
        try {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: 'course_rejected',
              title: 'Course Rejected',
              body: message,
              data: {
                courseId: courseId,
                courseName: courseName,
                courseTitle: courseTitle,
                action: 'course_rejected',
                performedById: performedBy.id,
                performedByName: performedBy.name,
                performedByEmail: performedBy.email,
                rejectionFeedback: rejectionFeedback || '',
                timestamp: new Date().toISOString()
              },
              targetUsers: [teacher.id]
            }
          });
        } catch (error) {
          console.error(`Error sending course rejection notification to teacher ${teacher.name}:`, error);
        }
      }

      console.log(`✅ Notified ${existingTeachers.length} teachers about course rejection`);
    } catch (error) {
      console.error('Error sending course rejection notifications to teachers:', error);
      // Don't throw error to avoid breaking the main course operation
    }
  }
}

export default CourseNotificationService;
