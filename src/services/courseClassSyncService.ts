import { supabase } from '@/integrations/supabase/client';

export interface CourseClassSyncData {
  courseId: string;
  courseTitle: string;
  classIds: string[];
  teachers: { id: string; name: string; email: string; avatar_url?: string }[];
  students: { id: string; name: string; email: string; avatar_url?: string }[];
}

export interface ClassMemberChange {
  classId: string;
  addedTeachers: string[];
  removedTeachers: string[];
  addedStudents: string[];
  removedStudents: string[];
}

class CourseClassSyncService {
  /**
   * Find all courses that use the specified class IDs
   */
  async getCoursesUsingClasses(classIds: string[]): Promise<CourseClassSyncData[]> {
    if (classIds.length === 0) return [];

    try {
      const { data, error } = await supabase
        .from('courses')
        .select(`
          id,
          title,
          class_ids,
          teachers,
          students
        `)
        .not('class_ids', 'is', null);

      if (error) {
        console.error('Error fetching courses using classes:', error);
        throw new Error(`Failed to fetch courses: ${error.message}`);
      }

      // Filter courses that contain any of the specified class IDs
      const relevantCourses = data?.filter(course => {
        if (!course.class_ids || !Array.isArray(course.class_ids)) return false;
        return classIds.some(classId => course.class_ids.includes(classId));
      }) || [];

      return relevantCourses.map(course => ({
        courseId: course.id,
        courseTitle: course.title,
        classIds: course.class_ids || [],
        teachers: course.teachers || [],
        students: course.students || []
      }));
    } catch (error) {
      console.error('Error in getCoursesUsingClasses:', error);
      throw error;
    }
  }

  /**
   * Get all classes that a user (teacher/student) belongs to
   */
  async getUserClasses(userId: string, userType: 'teacher' | 'student'): Promise<string[]> {
    try {
      const tableName = userType === 'teacher' ? 'class_teachers' : 'class_students';
      const userIdColumn = userType === 'teacher' ? 'teacher_id' : 'student_id';

      const { data, error } = await supabase
        .from(tableName)
        .select('class_id')
        .eq(userIdColumn, userId);

      if (error) {
        console.error(`Error fetching ${userType} classes:`, error);
        throw new Error(`Failed to fetch ${userType} classes: ${error.message}`);
      }

      return data?.map(item => item.class_id) || [];
    } catch (error) {
      console.error(`Error in getUserClasses for ${userType}:`, error);
      throw error;
    }
  }

  /**
   * Check if a user should be removed from course members
   * Returns true if user should be removed (not in any enrolled class)
   */
  async shouldRemoveUserFromCourse(
    userId: string, 
    userType: 'teacher' | 'student', 
    courseClassIds: string[]
  ): Promise<boolean> {
    try {
      const userClasses = await this.getUserClasses(userId, userType);
      
      // Check if user is in any of the course's enrolled classes
      const isInCourseClasses = courseClassIds.some(classId => 
        userClasses.includes(classId)
      );

      return !isInCourseClasses;
    } catch (error) {
      console.error('Error checking if user should be removed:', error);
      // In case of error, don't remove the user to be safe
      return false;
    }
  }

  /**
   * Sync course members when class members change
   */
  async syncCourseMembers(classMemberChanges: ClassMemberChange[]): Promise<void> {
    try {
      const affectedClassIds = classMemberChanges.map(change => change.classId);
      
      // Get all courses that use these classes
      const coursesToUpdate = await this.getCoursesUsingClasses(affectedClassIds);
      
      if (coursesToUpdate.length === 0) {
        console.log('No courses found that use the affected classes');
        return;
      }

      console.log(`Found ${coursesToUpdate.length} courses to update`);

      // Process each course
      for (const course of coursesToUpdate) {
        await this.updateCourseMembers(course, classMemberChanges);
      }

      console.log('Course member synchronization completed successfully');
    } catch (error) {
      console.error('Error syncing course members:', error);
      throw error;
    }
  }

  /**
   * Update members for a specific course based on class member changes
   */
  private async updateCourseMembers(
    course: CourseClassSyncData, 
    classMemberChanges: ClassMemberChange[]
  ): Promise<void> {
    try {
      const relevantChanges = classMemberChanges.filter(change => 
        course.classIds.includes(change.classId)
      );

      if (relevantChanges.length === 0) return;

      let updatedTeachers = [...course.teachers];
      let updatedStudents = [...course.students];

      // Process teacher changes
      for (const change of relevantChanges) {
        // Add new teachers
        for (const teacherId of change.addedTeachers) {
          const teacherExists = updatedTeachers.some(t => t.id === teacherId);
          if (!teacherExists) {
            // Get teacher details from profiles
            const teacherDetails = await this.getUserDetails(teacherId);
            if (teacherDetails) {
              updatedTeachers.push(teacherDetails);
            }
          }
        }

        // Remove teachers (only if they're not in other enrolled classes)
        for (const teacherId of change.removedTeachers) {
          const shouldRemove = await this.shouldRemoveUserFromCourse(
            teacherId, 
            'teacher', 
            course.classIds
          );
          
          if (shouldRemove) {
            updatedTeachers = updatedTeachers.filter(t => t.id !== teacherId);
          }
        }
      }

      // Process student changes
      for (const change of relevantChanges) {
        // Add new students
        for (const studentId of change.addedStudents) {
          const studentExists = updatedStudents.some(s => s.id === studentId);
          if (!studentExists) {
            // Get student details from profiles
            const studentDetails = await this.getUserDetails(studentId);
            if (studentDetails) {
              updatedStudents.push(studentDetails);
            }
          }
        }

        // Remove students (only if they're not in other enrolled classes)
        for (const studentId of change.removedStudents) {
          const shouldRemove = await this.shouldRemoveUserFromCourse(
            studentId, 
            'student', 
            course.classIds
          );
          
          if (shouldRemove) {
            updatedStudents = updatedStudents.filter(s => s.id !== studentId);
          }
        }
      }

      // Update the course in the database
      await this.updateCourseInDatabase(course.courseId, updatedTeachers, updatedStudents);
      
      console.log(`Updated course "${course.courseTitle}" with ${updatedTeachers.length} teachers and ${updatedStudents.length} students`);
    } catch (error) {
      console.error(`Error updating course ${course.courseId}:`, error);
      throw error;
    }
  }

  /**
   * Get user details from profiles table
   */
  private async getUserDetails(userId: string): Promise<{ id: string; name: string; email: string; avatar_url?: string } | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user details:', error);
        return null;
      }

      return {
        id: data.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: data.email,
        avatar_url: data.avatar_url
      };
    } catch (error) {
      console.error('Error in getUserDetails:', error);
      return null;
    }
  }

  /**
   * Update course in database with new member lists
   */
  private async updateCourseInDatabase(
    courseId: string, 
    teachers: { id: string; name: string; email: string; avatar_url?: string }[],
    students: { id: string; name: string; email: string; avatar_url?: string }[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          teachers,
          students,
          updated_at: new Date().toISOString()
        })
        .eq('id', courseId);

      if (error) {
        console.error('Error updating course in database:', error);
        throw new Error(`Failed to update course: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in updateCourseInDatabase:', error);
      throw error;
    }
  }

  /**
   * Get detailed information about class member changes
   */
  async getClassMemberChanges(
    classId: string,
    oldTeachers: string[],
    newTeachers: string[],
    oldStudents: string[],
    newStudents: string[]
  ): Promise<ClassMemberChange> {
    const addedTeachers = newTeachers.filter(id => !oldTeachers.includes(id));
    const removedTeachers = oldTeachers.filter(id => !newTeachers.includes(id));
    const addedStudents = newStudents.filter(id => !oldStudents.includes(id));
    const removedStudents = oldStudents.filter(id => !newStudents.includes(id));

    return {
      classId,
      addedTeachers,
      removedTeachers,
      addedStudents,
      removedStudents
    };
  }
}

export default new CourseClassSyncService();
