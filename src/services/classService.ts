import { supabase } from '@/integrations/supabase/client';
import CourseClassSyncService from './courseClassSyncService';

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
  async getClasses(): Promise<ClassWithMembers[]> {
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
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    return data?.map(this.transformClassData) || [];
  }

  // Get classes with pagination, search, and filtering
  async getClassesPaginated(params: ClassPaginationParams): Promise<ClassPaginationResult> {
    const { page, limit, search, grade, school, board } = params;
    const offset = (page - 1) * limit;

    // Build the query
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

    // Apply search filter
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
    }

    // Apply grade filter
    if (grade && grade !== 'all') {
      query = query.eq('grade', grade);
    }

    // Apply school filter (need to join with schools table)
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

    return {
      classes: data?.map(this.transformClassData) || [],
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

    return data ? this.transformClassData(data) : null;
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

    // Remove existing teachers
    const { error: removeTeachersError } = await supabase
      .from('class_teachers')
      .delete()
      .eq('class_id', classData.id);

    if (removeTeachersError) {
      throw new Error(`Failed to remove existing teachers: ${removeTeachersError.message}`);
    }

    // Add new teachers
    if (classData.teacher_ids.length > 0) {
      const teacherInserts = classData.teacher_ids.map((teacherId, index) => ({
        class_id: classData.id,
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

    // Remove existing students
    const { error: removeStudentsError } = await supabase
      .from('class_students')
      .delete()
      .eq('class_id', classData.id);

    if (removeStudentsError) {
      throw new Error('Failed to update student assignments. Please try again.');
    }

    // Add new students
    if (classData.student_ids.length > 0) {
      const studentInserts = classData.student_ids.map((studentId, index) => ({
        class_id: classData.id,
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

    // Delete the class
    const { error } = await supabase
      .from('classes')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete class: ${error.message}`);
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
  async getClassStats(): Promise<ClassStats> {
    try {
      // Get statistics from the view
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
      created_at: data.created_at,
      updated_at: data.updated_at
    };
  }
}

export default new ClassService();
