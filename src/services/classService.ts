import { supabase } from '@/integrations/supabase/client';
import CourseClassSyncService from './courseClassSyncService';
import ClassNotificationService from './classNotificationService';

export interface Class {
  id: string;
  name: string;
  code: string;
  grade: string;
  school: string;
  board: string;
  school_id?: string;
  board_id?: string;
  description: string;
  max_students?: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface ClassWithMembers extends Class {
  teachers: { id: string; name: string; email: string; avatar_url?: string }[];
  students: { id: string; name: string; email: string; avatar_url?: string }[];
  courses?: { id: string; title: string }[];
}

export interface CreateClassData {
  name: string;
  code: string;
  grade: string;
  school_id: string;
  board_id: string;
  description?: string;
  max_students?: number;
  teacher_ids: string[];
  student_ids: string[];
}

export interface UpdateClassData extends CreateClassData {
  id: string;
}

export interface ClassStats {
  totalClasses: number;
  totalSchools: number;
  totalBoards: number;
  totalStudents: number;
}

export interface ClassPaginationParams {
  page: number;
  limit: number;
  search?: string;
  grade?: string;
  school?: string;
  board?: string;
  teacherId?: string; // Optional: filter classes by teacher
}

export interface ClassPaginationResult {
  classes: ClassWithMembers[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

class ClassService {
  // Get all classes with their members
  async getClasses(teacherId?: string): Promise<ClassWithMembers[]> {
    let data, error;
    
    if (teacherId) {
      // First, get the class IDs where the teacher is assigned
      const { data: teacherClasses, error: teacherError } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('teacher_id', teacherId);
      
      if (teacherError) {
        throw new Error(`Failed to fetch teacher's classes: ${teacherError.message}`);
      }
      
      const classIds = teacherClasses?.map(tc => tc.class_id) || [];
      
      if (classIds.length === 0) {
        return [];
      }
      
      // Then fetch full class details with ALL teachers for those classes
      const result = await supabase
        .from('classes')
        .select(`
          *,
          boards (
            id,
            name,
            code
          ),
          schools (
            id,
            name,
            code
          ),
          class_teachers (
            teacher_id,
            is_primary,
            profiles (
              id,
              first_name,
              last_name,
              email,
              avatar_url
            )
          ),
          class_students (
            student_id,
            student_number,
            seat_number,
            profiles (
              id,
              first_name,
              last_name,
              email,
              avatar_url
            )
          )
        `)
        .in('id', classIds)
        .order('created_at', { ascending: false});
      
      data = result.data;
      error = result.error;
    } else {
      // Regular query for admins (no teacher filter)
      const result = await supabase
        .from('classes')
        .select(`
          *,
          boards (
            id,
            name,
            code
          ),
          schools (
            id,
            name,
            code
          ),
          class_teachers (
            teacher_id,
            is_primary,
            profiles (
              id,
              first_name,
              last_name,
              email,
              avatar_url
            )
          ),
          class_students (
            student_id,
            student_number,
            seat_number,
            profiles (
              id,
              first_name,
              last_name,
              email,
              avatar_url
            )
          )
        `)
        .order('created_at', { ascending: false});
      
      data = result.data;
      error = result.error;
    }

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    // Fetch course counts for all classes
    const classesWithCourses = await Promise.all(
      (data || []).map(async (classData) => {
        const courses = await this.getCoursesForClass(classData.id);
        return { ...classData, courses };
      })
    );

    return classesWithCourses.map(this.transformClassData);
  }

  // Get classes with pagination, search, and filtering
  async getClassesPaginated(params: ClassPaginationParams): Promise<ClassPaginationResult> {
    const { page, limit, search, grade, school, board, teacherId } = params;
    const offset = (page - 1) * limit;

    let classIds: string[] | undefined;
    
    // If filtering by teacher, first get the class IDs
    if (teacherId) {
      const { data: teacherClasses, error: teacherError } = await supabase
        .from('class_teachers')
        .select('class_id')
        .eq('teacher_id', teacherId);
      
      if (teacherError) {
        throw new Error(`Failed to fetch teacher's classes: ${teacherError.message}`);
      }
      
      classIds = teacherClasses?.map(tc => tc.class_id) || [];
      
      if (classIds.length === 0) {
        return {
          classes: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          hasNextPage: false,
          hasPreviousPage: false
        };
      }
    }

    // Build the main query with ALL teachers for each class
    let query = supabase
      .from('classes')
      .select(`
        *,
        boards (
          id,
          name,
          code
        ),
        schools (
          id,
          name,
          code
        ),
        class_teachers (
          teacher_id,
          is_primary,
          profiles (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        ),
        class_students (
          student_id,
          student_number,
          seat_number,
          profiles (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        )
      `, { count: 'exact' });

    // Apply teacher filter by class IDs if specified
    if (classIds) {
      query = query.in('id', classIds);
    }

    // Apply search filter
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Apply grade filter
    if (grade && grade !== 'all') {
      query = query.eq('grade', grade);
    }

    // Apply school filter
    if (school && school !== 'all') {
      query = query.eq('school_id', school);
    }

    // Apply board filter
    if (board && board !== 'all') {
      query = query.eq('board_id', board);
    }

    // Apply pagination and ordering
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Fetch course counts for all classes in current page
    const classesWithCourses = await Promise.all(
      (data || []).map(async (classData) => {
        const courses = await this.getCoursesForClass(classData.id);
        return { ...classData, courses };
      })
    );

    return {
      classes: classesWithCourses.map(this.transformClassData),
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage,
      hasPreviousPage
    };
  }

  // Get a single class by ID
  async getClassById(id: string): Promise<ClassWithMembers | null> {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        boards (
          id,
          name,
          code
        ),
        schools (
          id,
          name,
          code
        ),
        class_teachers (
          teacher_id,
          is_primary,
          profiles (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        ),
        class_students (
          student_id,
          student_number,
          seat_number,
          profiles (
            id,
            first_name,
            last_name,
            email,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Class not found
      }
      throw new Error(`Failed to fetch class: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    // Fetch courses for this class
    const courses = await this.getCoursesForClass(id);
    const classWithCourses = { ...data, courses };

    return this.transformClassData(classWithCourses);
  }

  // Create a new class
  async createClass(classData: CreateClassData): Promise<ClassWithMembers> {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }


    // First, create the class
    const { data: classResult, error: classError } = await supabase
      .from('classes')
      .insert({
        name: classData.name,
        code: classData.code,
        grade: classData.grade,
        school_id: classData.school_id,
        board_id: classData.board_id,
        description: classData.description || '',
        max_students: classData.max_students || 30,
        created_by: user.id,
        updated_by: user.id
      })
      .select('id')
      .single();

    if (classError) {
      // Check for specific constraint violations
      if (classError.message.includes('classes_code_key')) {
        throw new Error('Cannot create class: A class with this code already exists. Please use a different class code.');
      }
      if (classError.message.includes('classes_max_students_check')) {
        throw new Error('Cannot create class: Maximum students must be a positive number greater than 0.');
      }
      throw new Error('Failed to create class. Please try again.');
    }

    if (!classResult) {
      throw new Error('Failed to create class: No data returned');
    }

    const classId = classResult.id;

    // Add teachers to the class
    if (classData.teacher_ids.length > 0) {
      const teacherInserts = classData.teacher_ids.map((teacherId, index) => ({
        class_id: classId,
        teacher_id: teacherId,
        is_primary: index === 0 // First teacher is primary
      }));

      const { error: teachersError } = await supabase
        .from('class_teachers')
        .insert(teacherInserts);

      if (teachersError) {
        throw new Error('Failed to assign teachers to class. Please try again.');
      }
    }

    // Add students to the class
    if (classData.student_ids.length > 0) {
      const studentInserts = classData.student_ids.map((studentId, index) => ({
        class_id: classId,
        student_id: studentId,
        student_number: index + 1
      }));

      const { error: studentsError } = await supabase
        .from('class_students')
        .insert(studentInserts);

      if (studentsError) {
        // Check for specific constraint violations
        if (studentsError.message.includes('check_current_students_limit')) {
          throw new Error('Cannot add students: The number of students exceeds the maximum allowed limit. Please reduce the number of students or increase the maximum student limit.');
        }
        throw new Error('Failed to assign students to class. Please try again.');
      }
    }

    // Send notifications for new class members
    try {
      const classInfo = await ClassNotificationService.getClassInfo(classId);
      if (classInfo && (classData.teacher_ids.length > 0 || classData.student_ids.length > 0)) {
        // Get teacher and student details for notifications
        const teacherDetails = classData.teacher_ids.length > 0 
          ? await this.getAvailableTeachers()
          : [];
        const studentDetails = classData.student_ids.length > 0 
          ? await this.getAvailableStudents()
          : [];

        await ClassNotificationService.notifyMembersAdded({
          classId: classId,
          className: classInfo.className,
          classCode: classInfo.classCode,
          schoolName: classInfo.schoolName,
          boardName: classInfo.boardName,
          grade: classInfo.grade,
          addedMembers: {
            teachers: classData.teacher_ids.map(id => {
              const teacher = teacherDetails.find(t => t.id === id);
              return {
                id: id,
                name: teacher?.name || 'Unknown Teacher',
                email: teacher?.email || ''
              };
            }),
            students: classData.student_ids.map(id => {
              const student = studentDetails.find(s => s.id === id);
              return {
                id: id,
                name: student?.name || 'Unknown Student',
                email: student?.email || ''
              };
            })
          }
        });
      }
    } catch (notificationError) {
      console.error('Error sending class creation notifications:', notificationError);
      // Don't fail the class creation if notifications fail
    }

    // Fetch the created class with all its data
    return this.getClassById(classId);
  }

  // Update an existing class
  async updateClass(classData: UpdateClassData): Promise<ClassWithMembers> {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the current class data to track member changes
    const currentClass = await this.getClassById(classData.id);
    if (!currentClass) {
      throw new Error('Class not found');
    }

    const oldTeacherIds = currentClass.teachers.map(t => t.id);
    const oldStudentIds = currentClass.students.map(s => s.id);

    // First, update the class basic info
    const { error: classError } = await supabase
      .from('classes')
      .update({
        name: classData.name,
        code: classData.code,
        grade: classData.grade,
        school_id: classData.school_id,
        board_id: classData.board_id,
        description: classData.description || '',
        max_students: classData.max_students || 30,
        updated_by: user.id
      })
      .eq('id', classData.id);

    if (classError) {
      // Check for specific constraint violations
      if (classError.message.includes('check_current_students_limit')) {
        throw new Error('Cannot update class: The number of students exceeds the maximum allowed limit. Please reduce the number of students or increase the maximum student limit.');
      }
      if (classError.message.includes('classes_max_students_check')) {
        throw new Error('Cannot update class: Maximum students must be a positive number greater than 0.');
      }
      throw new Error('Failed to update class information. Please try again.');
    }

    // Use secure RPC functions that bypass RLS with proper authorization
    // This allows teachers to manage all teachers in classes they're assigned to
    
    // Check for duplicate teacher IDs in the input
    if (classData.teacher_ids.length > 0) {
      const uniqueTeacherIds = new Set(classData.teacher_ids);
      if (uniqueTeacherIds.size !== classData.teacher_ids.length) {
        throw new Error('Duplicate teachers detected in the selection. Each teacher can only be added once.');
      }
    }

    console.log('Updating class teachers using secure RPC function');
    console.log('Teacher IDs to set:', classData.teacher_ids);
    
    // Update teachers using the secure function
    const { error: teachersError } = await supabase
      .rpc('update_class_teachers', {
        p_class_id: classData.id,
        p_teacher_ids: classData.teacher_ids
      });

    if (teachersError) {
      console.error('❌ Error updating teachers:', teachersError);
      throw new Error(`Failed to update teachers: ${teachersError.message}`);
    }
    
    console.log('✓ Successfully updated teachers');

    // Check for duplicate student IDs in the input
    if (classData.student_ids.length > 0) {
      const uniqueStudentIds = new Set(classData.student_ids);
      if (uniqueStudentIds.size !== classData.student_ids.length) {
        throw new Error('Duplicate students detected in the selection. Each student can only be added once.');
      }
    }

    console.log('Updating class students using secure RPC function');
    console.log('Student IDs to set:', classData.student_ids);
    
    // Update students using the secure function
    const { error: studentsError } = await supabase
      .rpc('update_class_students', {
        p_class_id: classData.id,
        p_student_ids: classData.student_ids
      });

    if (studentsError) {
      console.error('❌ Error updating students:', studentsError);
      
      // Check for specific constraint violations
      if (studentsError.message.includes('check_current_students_limit')) {
        throw new Error('Cannot add students: The number of students exceeds the maximum allowed limit. Please reduce the number of students or increase the maximum student limit.');
      }
      throw new Error(`Failed to update students: ${studentsError.message}`);
    }
    
    console.log('✓ Successfully updated students');

    // Send notifications for member changes
    try {
      const classInfo = await ClassNotificationService.getClassInfo(classData.id);
      if (classInfo) {
        // Get teacher and student details for notifications
        const teacherDetails = await this.getAvailableTeachers();
        const studentDetails = await this.getAvailableStudents();

        // Determine added and removed members
        const addedTeachers = classData.teacher_ids.filter(id => !oldTeacherIds.includes(id));
        const removedTeachers = oldTeacherIds.filter(id => !classData.teacher_ids.includes(id));
        const addedStudents = classData.student_ids.filter(id => !oldStudentIds.includes(id));
        const removedStudents = oldStudentIds.filter(id => !classData.student_ids.includes(id));

        // Send notifications for added members
        if (addedTeachers.length > 0 || addedStudents.length > 0) {
          await ClassNotificationService.notifyMembersAdded({
            classId: classData.id,
            className: classInfo.className,
            classCode: classInfo.classCode,
            schoolName: classInfo.schoolName,
            boardName: classInfo.boardName,
            grade: classInfo.grade,
            addedMembers: {
              teachers: addedTeachers.map(id => {
                const teacher = teacherDetails.find(t => t.id === id);
                return {
                  id: id,
                  name: teacher?.name || 'Unknown Teacher',
                  email: teacher?.email || ''
                };
              }),
              students: addedStudents.map(id => {
                const student = studentDetails.find(s => s.id === id);
                return {
                  id: id,
                  name: student?.name || 'Unknown Student',
                  email: student?.email || ''
                };
              })
            }
          });
        }

        // Send notifications for removed members
        if (removedTeachers.length > 0 || removedStudents.length > 0) {
          await ClassNotificationService.notifyMembersRemoved({
            classId: classData.id,
            className: classInfo.className,
            classCode: classInfo.classCode,
            schoolName: classInfo.schoolName,
            boardName: classInfo.boardName,
            grade: classInfo.grade,
            removedMembers: {
              teachers: removedTeachers.map(id => {
                const teacher = teacherDetails.find(t => t.id === id);
                return {
                  id: id,
                  name: teacher?.name || 'Unknown Teacher',
                  email: teacher?.email || ''
                };
              }),
              students: removedStudents.map(id => {
                const student = studentDetails.find(s => s.id === id);
                return {
                  id: id,
                  name: student?.name || 'Unknown Student',
                  email: student?.email || ''
                };
              })
            }
          });
        }
      }
    } catch (notificationError) {
      console.error('Error sending class update notifications:', notificationError);
      // Don't fail the class update if notifications fail
    }

    // Sync course members if there were changes
    try {
      const memberChanges = await CourseClassSyncService.getClassMemberChanges(
        classData.id,
        oldTeacherIds,
        classData.teacher_ids,
        oldStudentIds,
        classData.student_ids
      );

      // Only sync if there were actual changes
      const hasChanges = memberChanges.addedTeachers.length > 0 || 
                        memberChanges.removedTeachers.length > 0 ||
                        memberChanges.addedStudents.length > 0 || 
                        memberChanges.removedStudents.length > 0;

      if (hasChanges) {
        console.log('Syncing course members due to class member changes:', memberChanges);
        await CourseClassSyncService.syncCourseMembers([memberChanges]);
      }
    } catch (syncError) {
      // Log the error but don't fail the class update
      console.error('Error syncing course members:', syncError);
      // You might want to show a warning to the user here
    }

    // Fetch the updated class with all its data
    return this.getClassById(classData.id);
  }

  // Delete a class
  async deleteClass(id: string): Promise<void> {
    // Get the current class data to track member changes before deletion
    const currentClass = await this.getClassById(id);
    if (!currentClass) {
      throw new Error('Class not found');
    }

    const oldTeacherIds = currentClass.teachers.map(t => t.id);
    const oldStudentIds = currentClass.students.map(s => s.id);

    // Get class info for notifications BEFORE deletion
    let classInfo = null;
    try {
      classInfo = await ClassNotificationService.getClassInfo(id);
    } catch (error) {
      console.error('Error fetching class info for notifications:', error);
    }

    // Delete the class
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete class: ${error.message}`);
    }

    // Send notifications for class deletion
    try {
      if (classInfo) {
        // Send notifications to all class members about class deletion
        const allMemberIds = [...oldTeacherIds, ...oldStudentIds];
        
        await ClassNotificationService.notifyClassDeleted(
          id,
          classInfo.className,
          classInfo.classCode,
          classInfo.schoolName,
          classInfo.boardName,
          classInfo.grade,
          allMemberIds
        );
      }
    } catch (notificationError) {
      console.error('Error sending class deletion notifications:', notificationError);
      // Don't fail the class deletion if notifications fail
    }

    // Sync course members after class deletion
    try {
      const memberChanges = await CourseClassSyncService.getClassMemberChanges(
        id,
        oldTeacherIds,
        [], // No new teachers after deletion
        oldStudentIds,
        []  // No new students after deletion
      );

      // Only sync if there were members in the deleted class
      const hasChanges = oldTeacherIds.length > 0 || oldStudentIds.length > 0;

      if (hasChanges) {
        console.log('Syncing course members due to class deletion:', memberChanges);
        await CourseClassSyncService.syncCourseMembers([memberChanges]);
      }
    } catch (syncError) {
      // Log the error but don't fail the class deletion
      console.error('Error syncing course members after class deletion:', syncError);
    }
  }

  // Get class statistics
  async getClassStats(teacherId?: string): Promise<ClassStats> {
    try {
      if (teacherId) {
        // First, get the class IDs where the teacher is assigned
        const { data: teacherClasses, error: teacherError } = await supabase
          .from('class_teachers')
          .select('class_id')
          .eq('teacher_id', teacherId);
        
        if (teacherError) {
          console.warn('Failed to fetch teacher classes for stats:', teacherError);
          return {
            totalClasses: 0,
            totalSchools: 0,
            totalBoards: 0,
            totalStudents: 0
          };
        }
        
        const classIds = teacherClasses?.map(tc => tc.class_id) || [];
        
        if (classIds.length === 0) {
          return {
            totalClasses: 0,
            totalSchools: 0,
            totalBoards: 0,
            totalStudents: 0
          };
        }
        
        // Then fetch full class details for stats
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select(`
            id,
            school_id,
            board_id,
            class_students(student_id)
          `)
          .in('id', classIds);

        if (classesError) {
          console.warn('Failed to fetch teacher classes for stats:', classesError);
          return {
            totalClasses: 0,
            totalSchools: 0,
            totalBoards: 0,
            totalStudents: 0
          };
        }

        const classes = classesData || [];
        const uniqueSchools = new Set(classes.map(c => c.school_id).filter(Boolean));
        const uniqueBoards = new Set(classes.map(c => c.board_id).filter(Boolean));
        
        // Count unique students across all teacher's classes
        const allStudentIds = classes.flatMap(c => 
          (c.class_students || []).map((cs: any) => cs.student_id)
        );
        const uniqueStudents = new Set(allStudentIds.filter(Boolean));

        return {
          totalClasses: classes.length,
          totalSchools: uniqueSchools.size,
          totalBoards: uniqueBoards.size,
          totalStudents: uniqueStudents.size
        };
      } else {
        // For admins, use the system-wide statistics view
        const { data: statsData, error: statsError } = await supabase
          .from('class_statistics')
          .select('*')
          .single();

        if (statsError) {
          console.warn('Failed to fetch from class_statistics view:', statsError);
        }

        // Map the view data to our interface
        return {
          totalClasses: statsData?.total_classes || 0,
          totalSchools: statsData?.schools_with_classes || 0,
          totalBoards: statsData?.boards_with_classes || 0,
          totalStudents: statsData?.total_enrolled_students || 0
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to fetch class statistics: ${error.message}`);
    }
  }

  // Get available teachers (profiles with role 'teacher')
  async getAvailableTeachers(): Promise<{ id: string; name: string; email: string; avatar_url?: string }[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .eq('role', 'teacher')
      .order('first_name');

    if (error) {
      throw new Error(`Failed to fetch teachers: ${error.message}`);
    }

    return data?.map(profile => ({
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      email: profile.email,
      avatar_url: profile.avatar_url
    })) || [];
  }

  // Get available students (profiles with role 'student')
  async getAvailableStudents(): Promise<{ id: string; name: string; email: string; avatar_url?: string }[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, avatar_url')
      .eq('role', 'student')
      .order('first_name');

    if (error) {
      throw new Error(`Failed to fetch students: ${error.message}`);
    }

    return data?.map(profile => ({
      id: profile.id,
      name: `${profile.first_name} ${profile.last_name}`.trim(),
      email: profile.email,
      avatar_url: profile.avatar_url
    })) || [];
  }

  // Get available boards
  async getAvailableBoards(): Promise<{ id: string; name: string; code: string }[]> {
    const { data, error } = await supabase
      .from('boards')
      .select('id, name, code')
      .eq('status', 'active')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch boards: ${error.message}`);
    }

    return data || [];
  }

  // Get available schools
  async getAvailableSchools(): Promise<{ id: string; name: string; code: string }[]> {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, code')
      .eq('status', 'active')
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch schools: ${error.message}`);
    }

    return data || [];
  }

  // Get schools filtered by board
  async getSchoolsByBoard(boardId: string): Promise<{ id: string; name: string; code: string }[]> {
    const { data, error } = await supabase
      .from('schools')
      .select('id, name, code')
      .eq('status', 'active')
      .eq('board_id', boardId)
      .order('name');

    if (error) {
      throw new Error(`Failed to fetch schools for board: ${error.message}`);
    }

    return data || [];
  }

  // Get course count for a class
  private async getCoursesForClass(classId: string): Promise<{ id: string; title: string }[]> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .contains('class_ids', [classId]);

      if (error) {
        console.error('Error fetching courses for class:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCoursesForClass:', error);
      return [];
    }
  }

  // Transform raw database data to our interface
  private transformClassData(data: any): ClassWithMembers {
    const teachers = data.class_teachers?.map((ct: any) => ({
      id: ct.profiles.id,
      name: `${ct.profiles.first_name} ${ct.profiles.last_name}`.trim(),
      email: ct.profiles.email,
      avatar_url: ct.profiles.avatar_url
    })) || [];

    const students = data.class_students?.map((cs: any) => ({
      id: cs.profiles.id,
      name: `${cs.profiles.first_name} ${cs.profiles.last_name}`.trim(),
      email: cs.profiles.email,
      avatar_url: cs.profiles.avatar_url
    })) || [];

    // Extract courses if they exist in the data
    const courses = data.courses?.map((course: any) => ({
      id: course.id,
      title: course.title
    })) || [];

    return {
      id: data.id,
      name: data.name,
      code: data.code,
      grade: data.grade,
      school: data.schools?.name || 'Unknown School',
      board: data.boards?.name || 'Unknown Board',
      school_id: data.school_id,
      board_id: data.board_id,
      description: data.description || '',
      max_students: data.max_students || 30,
      teachers,
      students,
      courses,
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}

export default new ClassService();
