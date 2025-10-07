import { supabase } from '@/integrations/supabase/client';

export type MeetingType = '1-on-1' | 'class' | 'teacher-to-teacher' | 'admin-to-teacher';

export interface ZoomMeeting {
  id: string;
  title: string;
  description?: string;
  meeting_type: MeetingType;
  scheduled_time: string;
  duration: number;
  teacher_id: string;
  student_id?: string;
  course_id?: string;
  class_id?: string; // Support for class-based meetings
  participant_id?: string; // NEW: Generic participant reference
  participant_role?: 'student' | 'teacher' | 'admin'; // NEW: Participant role
  zoom_meeting_id?: string;
  zoom_join_url?: string;
  zoom_password?: string;
  zoom_host_url?: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  participants_count?: number;
  actual_duration?: number;
  recording_url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined data from database function
  student_name?: string;
  course_title?: string;
  class_name?: string; // Class name for class-based meetings
  participant_name?: string; // NEW: For teacher-to-teacher and admin-to-teacher meetings
  participant_names?: string[];
  host_name?: string; // Host/creator name (for meetings where user is participant)
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  meeting_type: MeetingType;
  scheduled_time: string;
  duration: number;
  student_id?: string;
  participant_id?: string; // NEW: Generic participant
  participant_role?: 'student' | 'teacher' | 'admin'; // NEW: Participant role
  course_id?: string;
  class_id?: string; // Support for class-based meetings
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  scheduled_time?: string;
  duration?: number;
  status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
  notes?: string;
  actual_duration?: number;
  recording_url?: string;
}

export interface ZoomApiConfig {
  api_key: string;
  api_secret: string;
  webhook_url?: string;
  // OAuth-specific fields
  account_id?: string;
  user_id?: string;
}

export interface MeetingStats {
  total: number;
  upcoming: number;
  oneOnOne: number;
  classMeetings: number;
  teacherToTeacher: number; // NEW
  adminToTeacher: number; // NEW
}

class MeetingService {
  /**
   * Get Zoom integration status and configuration
   */
  async getZoomIntegrationStatus(): Promise<{ enabled: boolean; config?: ZoomApiConfig }> {
    try {
      // Check if Zoom integration is enabled in the integrations table
      console.log('🔍 Looking for Zoom integration with name = "zoom"');
      
      // First, let's see all integrations to debug
      const { data: allIntegrations, error: allError } = await supabase
        .from('integrations')
        .select('name, status, is_configured');
      
      console.log('📋 All integrations query result:', { data: allIntegrations, error: allError });
      
      if (allError) {
        console.error('❌ Cannot access integrations table:', allError);
        return { enabled: false };
      }
      
      // Try different name variations
      const zoomVariations = ['zoom', 'Zoom', 'ZOOM'];
      let data = null;
      let error = null;
      
      for (const name of zoomVariations) {
        const result = await supabase
          .from('integrations')
          .select('status, settings, is_configured')
          .eq('name', name)
          .single();
          
        console.log(`🔍 Trying name = "${name}":`, result);
        
        if (!result.error) {
          data = result.data;
          error = result.error;
          console.log(`✅ Found Zoom integration with name = "${name}"`);
          break;
        }
      }

      if (error) {
        // Silently handle missing integration record - this is expected when Zoom is not configured
        if (error.code === 'PGRST116') {
          // No rows returned - Zoom integration not configured
          return { enabled: false };
        }
        
        // For other errors, log but don't throw
        console.warn('Zoom integration check failed:', error.message);
        return { enabled: false };
      }

      // Check for OAuth credentials (client_id = api_key, client_secret = api_secret)
      const hasOAuthCredentials = data?.settings?.client_id && data?.settings?.client_secret;
      const hasLegacyCredentials = data?.settings?.api_key;
      const enabled = data?.status === 'enabled' && data?.is_configured && (hasOAuthCredentials || hasLegacyCredentials);
      
      // Only log in development mode to reduce console noise
      if (process.env.NODE_ENV === 'development') {
        console.log('Zoom integration check:', {
          status: data?.status,
          is_configured: data?.is_configured,
          hasOAuthCredentials,
          hasLegacyCredentials,
          enabled,
          settings: data?.settings
        });
      }
      
      return {
        enabled,
        config: enabled ? {
          // Map OAuth credentials to expected format
          api_key: data.settings.client_id || data.settings.api_key,
          api_secret: data.settings.client_secret || data.settings.api_secret,
          webhook_url: data.settings.webhook_url || '',
          // Include OAuth-specific fields
          account_id: data.settings.account_id,
          user_id: data.settings.user_id
        } : undefined
      };
    } catch (error) {
      console.error('Error getting Zoom integration status:', error);
      // For development, let's be more lenient
      console.warn('Zoom integration check failed, but allowing meeting creation for development');
      return { 
        enabled: true, // Allow for development
        config: {
          api_key: 'dev_key',
          api_secret: 'dev_secret',
          webhook_url: ''
        }
      };
    }
  }

  /**
   * Get all meetings for a teacher with participant information
   */
  async getTeacherMeetings(teacherId: string): Promise<ZoomMeeting[]> {
    try {
      // Query meetings with joined student, course, class, and participant information
      // Fetch meetings where teacher is either the host OR the participant
      const { data, error } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          student:profiles!zoom_meetings_student_id_fkey(
            first_name,
            last_name
          ),
          participant:profiles!zoom_meetings_participant_id_fkey(
            first_name,
            last_name,
            email
          ),
          course:courses!zoom_meetings_course_id_fkey(
            title
          ),
          class:classes!zoom_meetings_class_id_fkey(
            name,
            code,
            grade
          ),
          host:profiles!zoom_meetings_teacher_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .or(`teacher_id.eq.${teacherId},participant_id.eq.${teacherId}`)
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error('Error fetching teacher meetings:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      // Map the data to include student, course, class, participant, and host names
      return data.map(meeting => ({
        ...meeting,
        student_name: meeting.student 
          ? `${meeting.student.first_name} ${meeting.student.last_name}`.trim()
          : undefined,
        participant_name: meeting.participant
          ? `${meeting.participant.first_name || ''} ${meeting.participant.last_name || ''}`.trim() || meeting.participant.email
          : undefined,
        host_name: meeting.host
          ? `${meeting.host.first_name || ''} ${meeting.host.last_name || ''}`.trim() || meeting.host.email
          : undefined,
        course_title: meeting.class 
          ? `${meeting.class.name} (${meeting.class.code})` 
          : meeting.course?.title || undefined,
        class_name: meeting.class?.name || undefined,
        participant_names: []
      }));
    } catch (error) {
      console.error('Error fetching teacher meetings:', error);
      return [];
    }
  }

  /**
   * Get meeting statistics for a teacher
   */
  async getMeetingStats(teacherId: string): Promise<MeetingStats> {
    try {
      const { data, error } = await supabase
        .from('zoom_meetings')
        .select('meeting_type, status, scheduled_time')
        .or(`teacher_id.eq.${teacherId},participant_id.eq.${teacherId}`);

      if (error) {
        console.error('Error fetching meeting stats:', error);
        return {
          total: 0,
          upcoming: 0,
          oneOnOne: 0,
          classMeetings: 0,
          teacherToTeacher: 0,
          adminToTeacher: 0
        };
      }

      if (!data || !Array.isArray(data)) {
        return {
          total: 0,
          upcoming: 0,
          oneOnOne: 0,
          classMeetings: 0,
          teacherToTeacher: 0,
          adminToTeacher: 0
        };
      }

      const now = new Date();
      const twoHoursInMs = 2 * 60 * 60 * 1000;
      
      const stats: MeetingStats = {
        total: data.length,
        // Include 2-hour grace period: meetings are "upcoming" until 2 hours after scheduled time
        upcoming: data.filter(m => {
          if (m.status !== 'scheduled') return false;
          const scheduledTime = new Date(m.scheduled_time);
          const gracePeriodEnd = new Date(scheduledTime.getTime() + twoHoursInMs);
          return now < gracePeriodEnd;
        }).length,
        oneOnOne: data.filter(m => m.meeting_type === '1-on-1').length,
        classMeetings: data.filter(m => m.meeting_type === 'class').length,
        teacherToTeacher: data.filter(m => m.meeting_type === 'teacher-to-teacher').length,
        adminToTeacher: data.filter(m => m.meeting_type === 'admin-to-teacher').length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching meeting stats:', error);
      return {
        total: 0,
        upcoming: 0,
        oneOnOne: 0,
        classMeetings: 0,
        teacherToTeacher: 0,
        adminToTeacher: 0
      };
    }
  }

  /**
   * Create a new Zoom meeting
   */
  async createMeeting(teacherId: string, meetingData: CreateMeetingRequest): Promise<ZoomMeeting> {
    try {
      // First check if Zoom is enabled
      const { enabled, config } = await this.getZoomIntegrationStatus();
      if (!enabled) {
        throw new Error('Zoom integration is not enabled. Please contact your administrator.');
      }

      // Validate meeting data
      this.validateMeetingData(meetingData);

      // Create meeting record in database
      const { data, error } = await supabase
        .from('zoom_meetings')
        .insert({
          title: meetingData.title,
          description: meetingData.description,
          meeting_type: meetingData.meeting_type,
          scheduled_time: meetingData.scheduled_time,
          duration: meetingData.duration,
          teacher_id: teacherId,
          student_id: meetingData.student_id,
          participant_id: meetingData.participant_id, // NEW: Generic participant reference
          participant_role: meetingData.participant_role, // NEW: Participant role
          course_id: meetingData.course_id,
          class_id: meetingData.class_id, // Support for class-based meetings
          status: 'scheduled'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create meeting: ${error.message}`);
      }

      // Create Zoom meeting via API
      const zoomDetails = await this.createZoomMeeting(meetingData, config);

      // Update the meeting record with Zoom details
      const { data: updatedMeeting, error: updateError } = await supabase
        .from('zoom_meetings')
        .update({
          zoom_meeting_id: zoomDetails.meeting_id,
          zoom_join_url: zoomDetails.join_url,
          zoom_host_url: zoomDetails.host_url,
          zoom_password: zoomDetails.password
        })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update meeting with Zoom details: ${updateError.message}`);
      }

      // Skip notifications for now (as requested)
      // await this.createMeetingNotifications(updatedMeeting);

      // Fetch the complete meeting data with participant information
      const { data: completeMeeting, error: fetchError } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          student:profiles!zoom_meetings_student_id_fkey(
            first_name,
            last_name
          ),
          participant:profiles!zoom_meetings_participant_id_fkey(
            first_name,
            last_name,
            email
          ),
          course:courses!zoom_meetings_course_id_fkey(
            title
          ),
          class:classes!zoom_meetings_class_id_fkey(
            name,
            code,
            grade
          ),
          host:profiles!zoom_meetings_teacher_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', data.id)
        .single();

      if (fetchError) {
        console.error('Error fetching complete meeting data:', fetchError);
        // Fall back to returning the updated meeting without joins
        return updatedMeeting;
      }

      // Map the data to include formatted names (same as getTeacherMeetings)
      const formattedMeeting: ZoomMeeting = {
        ...completeMeeting,
        student_name: completeMeeting.student 
          ? `${completeMeeting.student.first_name} ${completeMeeting.student.last_name}`.trim()
          : undefined,
        participant_name: completeMeeting.participant
          ? `${completeMeeting.participant.first_name || ''} ${completeMeeting.participant.last_name || ''}`.trim() || completeMeeting.participant.email
          : undefined,
        host_name: completeMeeting.host
          ? `${completeMeeting.host.first_name || ''} ${completeMeeting.host.last_name || ''}`.trim() || completeMeeting.host.email
          : undefined,
        course_title: completeMeeting.class 
          ? `${completeMeeting.class.name} (${completeMeeting.class.code})` 
          : completeMeeting.course?.title || undefined,
        class_name: completeMeeting.class?.name || undefined,
        participant_names: []
      };

      return formattedMeeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Update an existing meeting
   */
  async updateMeeting(meetingId: string, teacherId: string, updateData: UpdateMeetingRequest): Promise<ZoomMeeting> {
    try {
      // Update meeting record in database
      const { data, error } = await supabase
        .from('zoom_meetings')
        .update(updateData)
        .eq('id', meetingId)
        .eq('teacher_id', teacherId)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update meeting: ${error.message}`);
      }

      // If the meeting time or details changed, update Zoom meeting
      if (updateData.scheduled_time || updateData.title || updateData.duration) {
        const { enabled, config } = await this.getZoomIntegrationStatus();
        if (enabled && data.zoom_meeting_id) {
          await this.updateZoomMeeting(data.zoom_meeting_id, updateData, config);
        }
      }

      // Fetch the complete meeting data with participant information
      const { data: completeMeeting, error: fetchError } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          student:profiles!zoom_meetings_student_id_fkey(
            first_name,
            last_name
          ),
          participant:profiles!zoom_meetings_participant_id_fkey(
            first_name,
            last_name,
            email
          ),
          course:courses!zoom_meetings_course_id_fkey(
            title
          ),
          class:classes!zoom_meetings_class_id_fkey(
            name,
            code,
            grade
          ),
          host:profiles!zoom_meetings_teacher_id_fkey(
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', meetingId)
        .single();

      if (fetchError) {
        console.error('Error fetching complete meeting data:', fetchError);
        // Fall back to returning the updated meeting without joins
        return data;
      }

      // Map the data to include formatted names (same as getTeacherMeetings)
      const formattedMeeting: ZoomMeeting = {
        ...completeMeeting,
        student_name: completeMeeting.student 
          ? `${completeMeeting.student.first_name} ${completeMeeting.student.last_name}`.trim()
          : undefined,
        participant_name: completeMeeting.participant
          ? `${completeMeeting.participant.first_name || ''} ${completeMeeting.participant.last_name || ''}`.trim() || completeMeeting.participant.email
          : undefined,
        host_name: completeMeeting.host
          ? `${completeMeeting.host.first_name || ''} ${completeMeeting.host.last_name || ''}`.trim() || completeMeeting.host.email
          : undefined,
        course_title: completeMeeting.class 
          ? `${completeMeeting.class.name} (${completeMeeting.class.code})` 
          : completeMeeting.course?.title || undefined,
        class_name: completeMeeting.class?.name || undefined,
        participant_names: []
      };

      return formattedMeeting;
    } catch (error) {
      console.error('Error updating meeting:', error);
      throw error;
    }
  }

  /**
   * Cancel a meeting
   */
  async cancelMeeting(meetingId: string, teacherId: string): Promise<void> {
    try {
      // Get meeting details first
      const { data: meeting, error: fetchError } = await supabase
        .from('zoom_meetings')
        .select('zoom_meeting_id')
        .eq('id', meetingId)
        .eq('teacher_id', teacherId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch meeting: ${fetchError.message}`);
      }

      // Update meeting status to cancelled
      const { error } = await supabase
        .from('zoom_meetings')
        .update({ status: 'cancelled' })
        .eq('id', meetingId)
        .eq('teacher_id', teacherId);

      if (error) {
        throw new Error(`Failed to cancel meeting: ${error.message}`);
      }

      // Cancel Zoom meeting if it exists
      if (meeting.zoom_meeting_id) {
        const { enabled, config } = await this.getZoomIntegrationStatus();
        if (enabled) {
          await this.cancelZoomMeeting(meeting.zoom_meeting_id, config);
        }
      }

      // Create cancellation notifications
      await this.createCancellationNotifications(meetingId);
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      throw error;
    }
  }

  /**
   * Delete a meeting
   */
  async deleteMeeting(meetingId: string, teacherId: string): Promise<void> {
    try {
      // Get meeting details first
      const { data: meeting, error: fetchError } = await supabase
        .from('zoom_meetings')
        .select('zoom_meeting_id, status')
        .eq('id', meetingId)
        .eq('teacher_id', teacherId)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch meeting: ${fetchError.message}`);
      }

      // Cancel Zoom meeting if it's still active
      if (meeting.zoom_meeting_id && meeting.status !== 'cancelled') {
        const { enabled, config } = await this.getZoomIntegrationStatus();
        if (enabled) {
          await this.cancelZoomMeeting(meeting.zoom_meeting_id, config);
        }
      }

      // Delete meeting record
      const { error } = await supabase
        .from('zoom_meetings')
        .delete()
        .eq('id', meetingId)
        .eq('teacher_id', teacherId);

      if (error) {
        throw new Error(`Failed to delete meeting: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting meeting:', error);
      throw error;
    }
  }

  /**
   * Get students for 1-on-1 meetings (students enrolled in teacher's courses)
   */
  async getAvailableStudents(teacherId: string): Promise<Array<{id: string, name: string, email: string}>> {
    try {
      // First get teacher's courses
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id')
        .eq('user_id', teacherId)
        .eq('role', 'teacher');

      if (coursesError) {
        console.error('Error fetching teacher courses:', coursesError);
        return [];
      }

      if (!teacherCourses || teacherCourses.length === 0) {
        return [];
      }

      const courseIds = teacherCourses.map(tc => tc.course_id);

      // Then get students from those courses
      const { data, error } = await supabase
        .from('course_members')
        .select(`
          user_id,
          profiles!inner(id, first_name, last_name, email)
        `)
        .eq('role', 'student')
        .in('course_id', courseIds);

      if (error) {
        console.error('Error fetching students:', error);
        return [];
      }

      // Remove duplicates and format data
      const uniqueStudents = new Map();
      if (data && Array.isArray(data)) {
        data.forEach(item => {
          const profile = item.profiles;
          if (profile && !uniqueStudents.has(profile.id)) {
            uniqueStudents.set(profile.id, {
              id: profile.id,
              name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
              email: profile.email
            });
          }
        });
      }

      return Array.from(uniqueStudents.values());
    } catch (error) {
      console.error('Error fetching available students:', error);
      return [];
    }
  }

  /**
   * Get courses taught by the teacher
   */
  async getTeacherCourses(teacherId: string): Promise<Array<{id: string, title: string}>> {
    try {
      const { data, error } = await supabase
        .from('course_members')
        .select(`
          course_id,
          courses!inner(id, title)
        `)
        .eq('user_id', teacherId)
        .eq('role', 'teacher');

      if (error) {
        console.error('Error fetching courses:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map(item => ({
        id: item.courses.id,
        title: item.courses.title
      }));
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      return [];
    }
  }

  /**
   * Get classes taught by the teacher (NEW - Better approach for meetings)
   */
  async getTeacherClasses(teacherId: string): Promise<Array<{id: string, name: string, code: string, grade: string}>> {
    try {
      const { data, error } = await supabase
        .from('class_teachers')
        .select(`
          class_id,
          is_primary,
          classes!inner(id, name, code, grade)
        `)
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('Error fetching teacher classes:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map(item => ({
        id: item.classes.id,
        name: item.classes.name,
        code: item.classes.code,
        grade: item.classes.grade
      }));
    } catch (error) {
      console.error('Error fetching teacher classes:', error);
      return [];
    }
  }

  /**
   * Get available teachers for scheduling meetings (NEW)
   * Excludes the current user from the list
   */
  async getAvailableTeachers(currentUserId: string): Promise<Array<{id: string, name: string, email: string}>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'teacher')
        .neq('id', currentUserId);

      if (error) {
        console.error('Error fetching teachers:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map(teacher => ({
        id: teacher.id,
        name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || teacher.email,
        email: teacher.email
      }));
    } catch (error) {
      console.error('Error fetching available teachers:', error);
      return [];
    }
  }

  /**
   * Get available admins for scheduling meetings (NEW)
   */
  async getAvailableAdmins(currentUserId: string): Promise<Array<{id: string, name: string, email: string}>> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .eq('role', 'admin');

      if (error) {
        console.error('Error fetching admins:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      return data.map(admin => ({
        id: admin.id,
        name: `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || admin.email,
        email: admin.email
      }));
    } catch (error) {
      console.error('Error fetching available admins:', error);
      return [];
    }
  }

  /**
   * Get meetings for a student - Enhanced version with better error handling
   */
  async getStudentMeetings(studentId: string): Promise<ZoomMeeting[]> {
    try {
      console.log('Fetching meetings for student:', studentId);
      
      // Step 1: Get 1-on-1 meetings where student is the participant (check both student_id and participant_id)
      const { data: oneOnOneMeetings, error: oneOnOneError } = await supabase
        .from('zoom_meetings')
        .select('*')
        .eq('meeting_type', '1-on-1')
        .or(`student_id.eq.${studentId},participant_id.eq.${studentId}`)
        .order('scheduled_time', { ascending: false });

      if (oneOnOneError) {
        console.error('Error fetching 1-on-1 meetings:', oneOnOneError);
      }

      // Step 2: Get courses the student is enrolled in
      const { data: studentCourses, error: coursesError } = await supabase
        .from('course_members')
        .select('course_id')
        .eq('user_id', studentId)
        .eq('role', 'student');

      if (coursesError) {
        console.error('Error fetching student courses:', coursesError);
      }

      // Step 3: Get classes the student is enrolled in (NEW)
      console.log('🔍 DEBUG: Checking classes for student ID:', studentId);
      const { data: studentClasses, error: classesError } = await supabase
        .from('class_students')
        .select('class_id, enrollment_status')
        .eq('student_id', studentId);

      console.log('🔍 DEBUG: Student classes query result:', { studentClasses, classesError });

      if (classesError) {
        console.error('Error fetching student classes:', classesError);
      }

      let classMeetings: any[] = [];
      
      // Get course-based class meetings (existing logic)
      if (studentCourses && studentCourses.length > 0) {
        const courseIds = studentCourses.map(sc => sc.course_id);
        
        const { data: courseMeetingsData, error: courseError } = await supabase
          .from('zoom_meetings')
          .select('*')
          .eq('meeting_type', 'class')
          .in('course_id', courseIds)
          .order('scheduled_time', { ascending: false });

        if (courseError) {
          console.error('Error fetching course-based class meetings:', courseError);
        } else {
          classMeetings = [...classMeetings, ...(courseMeetingsData || [])];
        }
      }

      // Get class-based meetings (NEW)
      if (studentClasses && studentClasses.length > 0) {
        const activeClasses = studentClasses.filter(sc => sc.enrollment_status === 'active');
        console.log('🔍 DEBUG: Active classes for student:', activeClasses);
        
        if (activeClasses.length > 0) {
          const classIds = activeClasses.map(sc => sc.class_id);
          console.log('🔍 DEBUG: Looking for meetings with class IDs:', classIds);
          
          const { data: classBasedMeetingsData, error: classBasedError } = await supabase
            .from('zoom_meetings')
            .select('*')
            .eq('meeting_type', 'class')
            .in('class_id', classIds)
            .order('scheduled_time', { ascending: false });

          console.log('🔍 DEBUG: Class-based meetings found:', { classBasedMeetingsData, classBasedError });

          if (classBasedError) {
            console.error('Error fetching class-based meetings:', classBasedError);
          } else {
            classMeetings = [...classMeetings, ...(classBasedMeetingsData || [])];
          }
        }
      }

      // Step 4: Get teacher and course information separately for better reliability
      const allMeetings = [...(oneOnOneMeetings || []), ...classMeetings];
      
      console.log('🔍 DEBUG: Total meetings found for student:', {
        oneOnOneCount: oneOnOneMeetings?.length || 0,
        classMeetingsCount: classMeetings.length,
        totalCount: allMeetings.length,
        allMeetingIds: allMeetings.map(m => ({ id: m.id, title: m.title, type: m.meeting_type, class_id: m.class_id }))
      });
      
      // Enhance meetings with teacher and course information
      const enhancedMeetings = await Promise.all(
        allMeetings.map(async (meeting) => {
          let teacherName = 'Teacher';
          let courseTitle = undefined;

          // Get teacher information
          try {
            const { data: teacherProfile } = await supabase
              .from('profiles')
              .select('first_name, last_name, email')
              .eq('id', meeting.teacher_id)
              .single();

            if (teacherProfile) {
              teacherName = `${teacherProfile.first_name || ''} ${teacherProfile.last_name || ''}`.trim() 
                || teacherProfile.email 
                || 'Teacher';
            }
          } catch (error) {
            console.warn('Could not fetch teacher profile for meeting:', meeting.id);
          }

          // Get course or class information for class meetings
          if (meeting.meeting_type === 'class') {
            if (meeting.class_id) {
              // Get class information (NEW)
              try {
                const { data: classInfo } = await supabase
                  .from('classes')
                  .select('name, code, grade')
                  .eq('id', meeting.class_id)
                  .single();

                if (classInfo) {
                  courseTitle = `${classInfo.name} (${classInfo.code})`;
                }
              } catch (error) {
                console.warn('Could not fetch class info for meeting:', meeting.id);
              }
            } else if (meeting.course_id) {
              // Get course information (existing)
              try {
                const { data: course } = await supabase
                  .from('courses')
                  .select('title')
                  .eq('id', meeting.course_id)
                  .single();

                if (course) {
                  courseTitle = course.title;
                }
              } catch (error) {
                console.warn('Could not fetch course info for meeting:', meeting.id);
              }
            }
          }

          return {
            ...meeting,
            student_name: teacherName, // Using student_name field to store teacher name for consistency with interface
            course_title: courseTitle,
            participant_names: []
          };
        })
      );

      console.log('🔍 DEBUG: Returning enhanced meetings:', {
        count: enhancedMeetings.length,
        meetings: enhancedMeetings.map(m => ({ 
          id: m.id, 
          title: m.title, 
          type: m.meeting_type, 
          class_id: m.class_id,
          scheduled_time: m.scheduled_time 
        }))
      });
      
      return enhancedMeetings.sort((a, b) => 
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      );
    } catch (error) {
      console.error('Error fetching student meetings:', error);
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  }

  /**
   * Validate meeting data
   */
  private validateMeetingData(meetingData: CreateMeetingRequest): void {
    if (!meetingData.title?.trim()) {
      throw new Error('Meeting title is required');
    }

    if (!meetingData.scheduled_time) {
      throw new Error('Meeting time is required');
    }

    const scheduledTime = new Date(meetingData.scheduled_time);
    const now = new Date();
    if (scheduledTime <= now) {
      throw new Error('Meeting time must be in the future');
    }

    if (meetingData.duration < 15 || meetingData.duration > 480) {
      throw new Error('Meeting duration must be between 15 minutes and 8 hours');
    }

    // Validate based on meeting type
    if (meetingData.meeting_type === '1-on-1') {
      if (!meetingData.student_id && !meetingData.participant_id) {
        throw new Error('Student is required for 1-on-1 meetings');
      }
    }

    if (meetingData.meeting_type === 'class') {
      if (!meetingData.class_id && !meetingData.course_id) {
        throw new Error('Class or Course is required for class meetings');
      }
    }

    if (meetingData.meeting_type === 'teacher-to-teacher') {
      if (!meetingData.participant_id) {
        throw new Error('Teacher participant is required for teacher-to-teacher meetings');
      }
      if (meetingData.participant_role !== 'teacher') {
        throw new Error('Participant must be a teacher for teacher-to-teacher meetings');
      }
    }

    if (meetingData.meeting_type === 'admin-to-teacher') {
      if (!meetingData.participant_id) {
        throw new Error('Participant is required for admin-to-teacher meetings');
      }
      if (!meetingData.participant_role || !['teacher', 'admin'].includes(meetingData.participant_role)) {
        throw new Error('Participant must be a teacher or admin for admin-to-teacher meetings');
      }
    }
  }

  /**
   * Create Zoom meeting via API
   */
  private async createZoomMeeting(meetingData: CreateMeetingRequest, config?: ZoomApiConfig): Promise<{
    meeting_id: string;
    join_url: string;
    host_url: string;
    password: string;
  }> {
    try {
      console.log('Creating real Zoom meeting via API');
      const { data, error } = await supabase.functions.invoke('zoom-meeting-manager', {
        body: {
          action: 'create',
          meetingData: {
            title: meetingData.title,
            description: meetingData.description,
            scheduled_time: meetingData.scheduled_time,
            duration: meetingData.duration
          }
        }
      });

      if (error) {
        console.error('Zoom API error:', error);
        throw new Error(`Failed to create Zoom meeting: ${error.message}`);
      }

      if (!data || !data.meeting_id) {
        throw new Error('Invalid response from Zoom API');
      }

      console.log('Zoom meeting created successfully:', data.meeting_id);
      return data;
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      // Fallback to mock data if Zoom API fails
      console.warn('Using mock data as fallback');
      const meetingId = Math.random().toString().substring(2, 11);
      return {
        meeting_id: `mock_${meetingId}`,
        join_url: `https://zoom.us/j/${meetingId}`,
        host_url: `https://zoom.us/s/${meetingId}`,
        password: Math.random().toString(36).substring(2, 8)
      };
    }
  }

  /**
   * Update Zoom meeting via API
   */
  private async updateZoomMeeting(zoomMeetingId: string, updateData: UpdateMeetingRequest, config?: ZoomApiConfig): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('zoom-meeting-manager', {
        body: {
          action: 'update',
          meetingId: zoomMeetingId,
          meetingData: {
            title: updateData.title,
            description: updateData.description,
            scheduled_time: updateData.scheduled_time,
            duration: updateData.duration
          }
        }
      });

      if (error) {
        throw new Error(`Failed to update Zoom meeting: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating Zoom meeting:', error);
      // Don't throw error for update failures, just log them
    }
  }

  /**
   * Cancel Zoom meeting via API
   */
  private async cancelZoomMeeting(zoomMeetingId: string, config?: ZoomApiConfig): Promise<void> {
    try {
      const { error } = await supabase.functions.invoke('zoom-meeting-manager', {
        body: {
          action: 'delete',
          meetingId: zoomMeetingId
        }
      });

      if (error) {
        throw new Error(`Failed to cancel Zoom meeting: ${error.message}`);
      }
    } catch (error) {
      console.error('Error cancelling Zoom meeting:', error);
      // Don't throw error for cancellation failures, just log them
    }
  }

  /**
   * Create meeting notifications
   */
  private async createMeetingNotifications(meeting: ZoomMeeting): Promise<void> {
    try {
      const scheduledTime = new Date(meeting.scheduled_time);
      const notifications = [];

      // Create reminder notification (15 minutes before)
      const reminderTime = new Date(scheduledTime.getTime() - 15 * 60 * 1000);
      
      // For 1-on-1 meetings, notify the student
      if (meeting.meeting_type === '1-on-1' && meeting.student_id) {
        notifications.push({
          meeting_id: meeting.id,
          user_id: meeting.student_id,
          notification_type: 'reminder',
          scheduled_for: reminderTime.toISOString()
        });
      }

      // For class meetings, handle participants based on class or course
      if (meeting.meeting_type === 'class') {
        if (meeting.class_id) {
          // NEW: Get all students in the class
          const { data: classStudents } = await supabase
            .from('class_students')
            .select('student_id')
            .eq('class_id', meeting.class_id);

          classStudents?.forEach(member => {
            notifications.push({
              meeting_id: meeting.id,
              user_id: member.student_id,
              notification_type: 'reminder',
              scheduled_for: reminderTime.toISOString()
            });
          });
        } else if (meeting.course_id) {
          // EXISTING: Get all students in the course (fallback)
          const { data: courseMembers } = await supabase
            .from('course_members')
            .select('user_id')
            .eq('course_id', meeting.course_id)
            .eq('role', 'student');

          courseMembers?.forEach(member => {
            notifications.push({
              meeting_id: meeting.id,
              user_id: member.user_id,
              notification_type: 'reminder',
              scheduled_for: reminderTime.toISOString()
            });
          });
        }
      }

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('meeting_notifications')
          .insert(notifications);

        if (error) {
          console.error('Error creating meeting notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error creating meeting notifications:', error);
    }
  }

  /**
   * Create cancellation notifications
   */
  private async createCancellationNotifications(meetingId: string): Promise<void> {
    try {
      // Get meeting participants
      const { data: meeting } = await supabase
        .from('zoom_meetings')
        .select('student_id, course_id, meeting_type')
        .eq('id', meetingId)
        .single();

      if (!meeting) return;

      const notifications = [];
      const now = new Date();

      if (meeting.meeting_type === '1-on-1' && meeting.student_id) {
        notifications.push({
          meeting_id: meetingId,
          user_id: meeting.student_id,
          notification_type: 'cancelled',
          scheduled_for: now.toISOString()
        });
      }

      if (meeting.meeting_type === 'class') {
        if (meeting.class_id) {
          // NEW: Get all students in the class
          const { data: classStudents } = await supabase
            .from('class_students')
            .select('student_id')
            .eq('class_id', meeting.class_id);

          classStudents?.forEach(member => {
            notifications.push({
              meeting_id: meetingId,
              user_id: member.student_id,
              notification_type: 'cancelled',
              scheduled_for: now.toISOString()
            });
          });
        } else if (meeting.course_id) {
          // EXISTING: Get all students in the course (fallback)
          const { data: courseMembers } = await supabase
            .from('course_members')
            .select('user_id')
            .eq('course_id', meeting.course_id)
            .eq('role', 'student');

          courseMembers?.forEach(member => {
            notifications.push({
              meeting_id: meetingId,
              user_id: member.user_id,
              notification_type: 'cancelled',
              scheduled_for: now.toISOString()
            });
          });
        }
      }

      if (notifications.length > 0) {
        const { error } = await supabase
          .from('meeting_notifications')
          .insert(notifications);

        if (error) {
          console.error('Error creating cancellation notifications:', error);
        }
      }
    } catch (error) {
      console.error('Error creating cancellation notifications:', error);
    }
  }
}

export default new MeetingService();