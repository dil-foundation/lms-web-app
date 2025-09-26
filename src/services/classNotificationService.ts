import { supabase } from '@/integrations/supabase/client';

export interface ClassMembershipNotificationData {
  classId: string;
  className: string;
  classCode: string;
  schoolName: string;
  boardName: string;
  grade: string;
  addedMembers?: {
    teachers: Array<{ id: string; name: string; email: string }>;
    students: Array<{ id: string; name: string; email: string }>;
  };
  removedMembers?: {
    teachers: Array<{ id: string; name: string; email: string }>;
    students: Array<{ id: string; name: string; email: string }>;
  };
}

class ClassNotificationService {
  /**
   * Send notifications when members are added to a class
   */
  static async notifyMembersAdded(notificationData: ClassMembershipNotificationData): Promise<void> {
    try {
      const { addedMembers } = notificationData;
      
      if (!addedMembers) return;

      // Notify added teachers
      if (addedMembers.teachers.length > 0) {
        await this.sendTeacherAddedNotifications(addedMembers.teachers, notificationData);
      }

      // Notify added students
      if (addedMembers.students.length > 0) {
        await this.sendStudentAddedNotifications(addedMembers.students, notificationData);
      }

      // Notify existing class members about new additions
      await this.notifyExistingMembersAboutNewAdditions(notificationData);

    } catch (error) {
      console.error('Error sending member added notifications:', error);
      // Don't throw error to avoid breaking the main class operation
    }
  }

  /**
   * Send notifications when members are removed from a class
   */
  static async notifyMembersRemoved(notificationData: ClassMembershipNotificationData): Promise<void> {
    try {
      const { removedMembers, className, classCode, classId } = notificationData;
      
      if (!removedMembers) return;

      // Notify removed teachers
      if (removedMembers.teachers.length > 0) {
        await this.sendTeacherRemovedNotifications(removedMembers.teachers, notificationData);
      }

      // Notify removed students
      if (removedMembers.students.length > 0) {
        await this.sendStudentRemovedNotifications(removedMembers.students, notificationData);
      }

      // Notify remaining class members about removals
      await this.notifyRemainingMembersAboutRemovals(notificationData);

    } catch (error) {
      console.error('Error sending member removed notifications:', error);
      // Don't throw error to avoid breaking the main class operation
    }
  }

  /**
   * Send notifications to teachers who were added to the class
   */
  private static async sendTeacherAddedNotifications(
    teachers: Array<{ id: string; name: string; email: string }>,
    notificationData: ClassMembershipNotificationData
  ): Promise<void> {
    const { className, classCode, schoolName, boardName, grade, classId } = notificationData;

    for (const teacher of teachers) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_member_added',
            title: 'Added to Class',
            body: `You have been added to class "${className}" (${classCode}) at ${schoolName}`,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              schoolName: schoolName,
              boardName: boardName,
              grade: grade,
              memberType: 'teacher',
              action: 'added'
            },
            targetUsers: [teacher.id]
          }
        });
      } catch (error) {
        console.error(`Error sending notification to teacher ${teacher.name}:`, error);
      }
    }
  }

  /**
   * Send notifications to students who were added to the class
   */
  private static async sendStudentAddedNotifications(
    students: Array<{ id: string; name: string; email: string }>,
    notificationData: ClassMembershipNotificationData
  ): Promise<void> {
    const { className, classCode, schoolName, boardName, grade, classId } = notificationData;

    for (const student of students) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_member_added',
            title: 'Enrolled in Class',
            body: `You have been enrolled in class "${className}" (${classCode}) at ${schoolName}`,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              schoolName: schoolName,
              boardName: boardName,
              grade: grade,
              memberType: 'student',
              action: 'added'
            },
            targetUsers: [student.id]
          }
        });
      } catch (error) {
        console.error(`Error sending notification to student ${student.name}:`, error);
      }
    }
  }

  /**
   * Send notifications to teachers who were removed from the class
   */
  private static async sendTeacherRemovedNotifications(
    teachers: Array<{ id: string; name: string; email: string }>,
    notificationData: ClassMembershipNotificationData
  ): Promise<void> {
    const { className, classCode, schoolName, classId } = notificationData;

    for (const teacher of teachers) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_member_removed',
            title: 'Removed from Class',
            body: `You have been removed from class "${className}" (${classCode}) at ${schoolName}`,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              schoolName: schoolName,
              memberType: 'teacher',
              action: 'removed'
            },
            targetUsers: [teacher.id]
          }
        });
      } catch (error) {
        console.error(`Error sending notification to teacher ${teacher.name}:`, error);
      }
    }
  }

  /**
   * Send notifications to students who were removed from the class
   */
  private static async sendStudentRemovedNotifications(
    students: Array<{ id: string; name: string; email: string }>,
    notificationData: ClassMembershipNotificationData
  ): Promise<void> {
    const { className, classCode, schoolName, classId } = notificationData;

    for (const student of students) {
      try {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_member_removed',
            title: 'Removed from Class',
            body: `You have been removed from class "${className}" (${classCode}) at ${schoolName}`,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              schoolName: schoolName,
              memberType: 'student',
              action: 'removed'
            },
            targetUsers: [student.id]
          }
        });
      } catch (error) {
        console.error(`Error sending notification to student ${student.name}:`, error);
      }
    }
  }

  /**
   * Notify existing class members about new additions
   */
  private static async notifyExistingMembersAboutNewAdditions(
    notificationData: ClassMembershipNotificationData
  ): Promise<void> {
    const { classId, className, classCode, addedMembers } = notificationData;
    
    if (!addedMembers) return;

    try {
      // Get existing class members (excluding the newly added ones)
      const { data: existingMembers, error } = await supabase
        .from('classes')
        .select(`
          class_teachers (teacher_id),
          class_students (student_id)
        `)
        .eq('id', classId)
        .single();

      if (error) {
        console.error('Error fetching existing class members:', error);
        return;
      }

      const existingTeacherIds = existingMembers?.class_teachers?.map((ct: any) => ct.teacher_id) || [];
      const existingStudentIds = existingMembers?.class_students?.map((cs: any) => cs.student_id) || [];

      // Remove newly added members from existing members list
      const addedTeacherIds = addedMembers.teachers.map(t => t.id);
      const addedStudentIds = addedMembers.students.map(s => s.id);
      
      const existingTeachersToNotify = existingTeacherIds.filter(id => !addedTeacherIds.includes(id));
      const existingStudentsToNotify = existingStudentIds.filter(id => !addedStudentIds.includes(id));

      // Prepare notification message
      const newMembersText = [];
      if (addedMembers.teachers.length > 0) {
        newMembersText.push(`${addedMembers.teachers.length} teacher${addedMembers.teachers.length > 1 ? 's' : ''}`);
      }
      if (addedMembers.students.length > 0) {
        newMembersText.push(`${addedMembers.students.length} student${addedMembers.students.length > 1 ? 's' : ''}`);
      }

      const notificationMessage = `New members added to class "${className}" (${classCode}): ${newMembersText.join(' and ')}`;

      // Notify existing teachers
      if (existingTeachersToNotify.length > 0) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_members_updated',
            title: 'Class Members Updated',
            body: notificationMessage,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              action: 'members_added',
              newTeachersCount: addedMembers.teachers.length,
              newStudentsCount: addedMembers.students.length
            },
            targetUsers: existingTeachersToNotify
          }
        });
      }

      // Notify existing students
      if (existingStudentsToNotify.length > 0) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_members_updated',
            title: 'Class Members Updated',
            body: notificationMessage,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              action: 'members_added',
              newTeachersCount: addedMembers.teachers.length,
              newStudentsCount: addedMembers.students.length
            },
            targetUsers: existingStudentsToNotify
          }
        });
      }

    } catch (error) {
      console.error('Error notifying existing members about new additions:', error);
    }
  }

  /**
   * Notify remaining class members about removals
   */
  private static async notifyRemainingMembersAboutRemovals(
    notificationData: ClassMembershipNotificationData
  ): Promise<void> {
    const { classId, className, classCode, removedMembers } = notificationData;
    
    if (!removedMembers) return;

    try {
      // Get remaining class members (excluding the removed ones)
      const { data: remainingMembers, error } = await supabase
        .from('classes')
        .select(`
          class_teachers (teacher_id),
          class_students (student_id)
        `)
        .eq('id', classId)
        .single();

      if (error) {
        console.error('Error fetching remaining class members:', error);
        return;
      }

      const remainingTeacherIds = remainingMembers?.class_teachers?.map((ct: any) => ct.teacher_id) || [];
      const remainingStudentIds = remainingMembers?.class_students?.map((cs: any) => cs.student_id) || [];

      // Prepare notification message
      const removedMembersText = [];
      if (removedMembers.teachers.length > 0) {
        removedMembersText.push(`${removedMembers.teachers.length} teacher${removedMembers.teachers.length > 1 ? 's' : ''}`);
      }
      if (removedMembers.students.length > 0) {
        removedMembersText.push(`${removedMembers.students.length} student${removedMembers.students.length > 1 ? 's' : ''}`);
      }

      const notificationMessage = `Members removed from class "${className}" (${classCode}): ${removedMembersText.join(' and ')}`;

      // Notify remaining teachers
      if (remainingTeacherIds.length > 0) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_members_updated',
            title: 'Class Members Updated',
            body: notificationMessage,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              action: 'members_removed',
              removedTeachersCount: removedMembers.teachers.length,
              removedStudentsCount: removedMembers.students.length
            },
            targetUsers: remainingTeacherIds
          }
        });
      }

      // Notify remaining students
      if (remainingStudentIds.length > 0) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'class_members_updated',
            title: 'Class Members Updated',
            body: notificationMessage,
            data: {
              classId: classId,
              className: className,
              classCode: classCode,
              action: 'members_removed',
              removedTeachersCount: removedMembers.teachers.length,
              removedStudentsCount: removedMembers.students.length
            },
            targetUsers: remainingStudentIds
          }
        });
      }

    } catch (error) {
      console.error('Error notifying remaining members about removals:', error);
    }
  }

  /**
   * Send notifications when a class is deleted
   */
  static async notifyClassDeleted(
    classId: string,
    className: string,
    classCode: string,
    schoolName: string,
    boardName: string,
    grade: string,
    memberIds: string[]
  ): Promise<void> {
    try {
      if (memberIds.length === 0) {
        console.log('No members to notify about class deletion');
        return;
      }

      console.log(`🗑️ Sending class deletion notifications to ${memberIds.length} members for class: ${className}`);

      const response = await supabase.functions.invoke('send-notification', {
        body: {
          type: 'class_deleted',
          title: 'Class Deleted',
          body: `Class "${className}" (${classCode}) has been deleted`,
          data: {
            classId: classId,
            className: className,
            classCode: classCode,
            schoolName: schoolName,
            boardName: boardName,
            grade: grade,
            action: 'class_deleted'
          },
          targetUsers: memberIds
        }
      });

      if (response.error) {
        console.error('Error in class deletion notification response:', response.error);
      } else {
        console.log(`✅ Successfully sent class deletion notifications to ${memberIds.length} members`);
      }
    } catch (error) {
      console.error('Error sending class deletion notifications:', error);
      // Don't throw error to avoid breaking the main class operation
    }
  }


  /**
   * Get class information for notifications
   */
  static async getClassInfo(classId: string): Promise<{
    className: string;
    classCode: string;
    schoolName: string;
    boardName: string;
    grade: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          name,
          code,
          grade,
          schools (name),
          boards (name)
        `)
        .eq('id', classId)
        .single();

      if (error) {
        console.error('Error fetching class info:', error);
        return null;
      }

      return {
        className: data.name,
        classCode: data.code,
        schoolName: (data.schools as any)?.name || 'Unknown School',
        boardName: (data.boards as any)?.name || 'Unknown Board',
        grade: data.grade
      };
    } catch (error) {
      console.error('Error getting class info:', error);
      return null;
    }
  }
}

export default ClassNotificationService;
