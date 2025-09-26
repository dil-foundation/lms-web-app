import { supabase } from '@/integrations/supabase/client';

export interface CourseNotificationData {
  courseId: string;
  courseName: string;
  courseTitle: string;
  courseSubtitle?: string;
  action: 'course_access_granted' | 'course_updated' | 'course_published' | 'course_unpublished' | 'course_deleted';
  addedTeachers?: Array<{ id: string; name: string; email: string }>;
  existingTeachers?: Array<{ id: string; name: string; email: string }>;
  students?: Array<{ id: string; name: string; email: string }>;
  performedBy: { id: string; name: string; email: string };
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
}

export default CourseNotificationService;
