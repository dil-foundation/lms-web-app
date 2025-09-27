import { supabase } from '@/integrations/supabase/client';

export interface GradingNotificationData {
  studentId: string;
  studentName: string;
  studentEmail: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentType: 'assignment' | 'quiz';
  courseId: string;
  courseName: string;
  courseTitle: string;
  courseSubtitle: string;
  score: number;
  feedback?: string;
  gradedBy: {
    id: string;
    name: string;
    email: string;
  };
  isUpdate?: boolean; // Flag to indicate if this is a grade update
  previousScore?: number; // Previous score for comparison
}

export class GradingNotificationService {
  /**
   * Send notification to student when their assignment/quiz is graded
   */
  static async notifyStudentGrading(notificationData: GradingNotificationData): Promise<void> {
    try {
      const { 
        studentId, 
        studentName, 
        assignmentTitle, 
        assignmentType, 
        courseName, 
        courseTitle, 
        score, 
        feedback,
        gradedBy,
        isUpdate = false,
        previousScore
      } = notificationData;

      // Create notification message based on whether it's an update or initial grading
      const assignmentTypeText = assignmentType === 'quiz' ? 'quiz' : 'assignment';
      
      let baseMessage: string;
      let title: string;
      let notificationType: string;
      
      if (isUpdate) {
        title = `${assignmentTypeText.charAt(0).toUpperCase() + assignmentTypeText.slice(1)} Grade Updated`;
        notificationType = 'assignment_grade_updated';
        
        if (previousScore !== undefined) {
          const scoreChange = score > previousScore ? 'increased' : score < previousScore ? 'decreased' : 'unchanged';
          baseMessage = `Your ${assignmentTypeText} "${assignmentTitle}" grade for the course "${courseName}" has been updated. Your score is now ${score}% (was ${previousScore}%).`;
        } else {
          baseMessage = `Your ${assignmentTypeText} "${assignmentTitle}" grade for the course "${courseName}" has been updated. You now have a score of ${score}%.`;
        }
      } else {
        title = `${assignmentTypeText.charAt(0).toUpperCase() + assignmentTypeText.slice(1)} Graded`;
        notificationType = 'assignment_graded';
        baseMessage = `Your ${assignmentTypeText} "${assignmentTitle}" for the course "${courseName}" has been graded. You scored ${score}%.`;
      }
      
      const message = feedback 
        ? `${baseMessage} Feedback: ${feedback}`
        : baseMessage;

      // Send notification to student
      await supabase.functions.invoke('send-notification', {
        body: {
          type: notificationType,
          title: title,
          body: message,
          data: {
            assignmentId: notificationData.assignmentId,
            assignmentTitle: assignmentTitle,
            assignmentType: assignmentType,
            courseId: notificationData.courseId,
            courseName: courseName,
            courseTitle: courseTitle,
            courseSubtitle: notificationData.courseSubtitle,
            score: score.toString(),
            previousScore: previousScore?.toString() || '',
            feedback: feedback || '',
            action: notificationType,
            gradedById: gradedBy.id,
            gradedByName: gradedBy.name,
            gradedByEmail: gradedBy.email,
            isUpdate: isUpdate.toString(),
            timestamp: new Date().toISOString()
          },
          targetUsers: [studentId]
        }
      });

      const actionText = isUpdate ? 'updated' : 'graded';
      console.log(`✅ Notified student ${studentName} about ${actionText} ${assignmentTypeText}`);
    } catch (error) {
      console.error('Error sending grading notification:', error);
      // Don't throw error to avoid breaking the main grading operation
    }
  }

  /**
   * Get course information for notifications
   */
  static async getCourseInfo(courseId: string): Promise<{
    courseName: string;
    courseTitle: string;
    courseSubtitle: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('title, subtitle')
        .eq('id', courseId)
        .single();

      if (error || !data) {
        console.error('Error fetching course info:', error);
        return null;
      }

      return {
        courseName: data.title,
        courseTitle: data.title,
        courseSubtitle: data.subtitle || ''
      };
    } catch (error) {
      console.error('Error fetching course info:', error);
      return null;
    }
  }

  /**
   * Get student information for notifications
   */
  static async getStudentInfo(studentId: string): Promise<{
    name: string;
    email: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', studentId)
        .single();

      if (error || !data) {
        console.error('Error fetching student info:', error);
        return null;
      }

      return {
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'Unknown Student',
        email: data.email || 'unknown@email.com'
      };
    } catch (error) {
      console.error('Error fetching student info:', error);
      return null;
    }
  }
}
