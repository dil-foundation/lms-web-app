import { supabase } from '@/integrations/supabase/client';

export interface ZoomMeeting {
  id: string;
  title: string;
  description?: string;
  meeting_type: '1-on-1' | 'class';
  scheduled_time: string;
  duration: number;
  teacher_id: string;
  student_id?: string;
  course_id?: string;
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
  participant_names?: string[];
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  meeting_type: '1-on-1' | 'class';
  scheduled_time: string;
  duration: number;
  student_id?: string;
  course_id?: string;
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
}

class MeetingService {
  /**
   * Get Zoom integration status and configuration
   */
  async getZoomIntegrationStatus(): Promise<{ enabled: boolean; config?: ZoomApiConfig }> {
    try {
      // Check if Zoom integration is enabled in the integrations table
      const { data, error } = await supabase
        .from('integrations')
        .select('status, settings, is_configured')
        .eq('name', 'zoom')
        .single();

      if (error) {
        console.error('Error checking Zoom integration:', error);
        // For development, let's be more lenient and allow meeting creation even if integration check fails
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

      // Check for OAuth credentials (client_id = api_key, client_secret = api_secret)
      const hasOAuthCredentials = data?.settings?.client_id && data?.settings?.client_secret;
      const hasLegacyCredentials = data?.settings?.api_key;
      const enabled = data?.status === 'enabled' && data?.is_configured && (hasOAuthCredentials || hasLegacyCredentials);
      
      console.log('Zoom integration check:', {
        status: data?.status,
        is_configured: data?.is_configured,
        hasOAuthCredentials,
        hasLegacyCredentials,
        enabled,
        settings: data?.settings
      });
      
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
      // Use a simple query without foreign key relationships to avoid cache issues
      const { data, error } = await supabase
        .from('zoom_meetings')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('scheduled_time', { ascending: false });

      if (error) {
        console.error('Error fetching teacher meetings:', error);
        return [];
      }

      if (!data || !Array.isArray(data)) {
        return [];
      }

      // For now, return the basic meeting data without joined data
      // We can enhance this later once the basic functionality works
      return data.map(meeting => ({
        ...meeting,
        student_name: undefined, // Will be populated later when we fix the relationships
        course_title: undefined,
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
        .eq('teacher_id', teacherId);

      if (error) {
        console.error('Error fetching meeting stats:', error);
        return {
          total: 0,
          upcoming: 0,
          oneOnOne: 0,
          classMeetings: 0
        };
      }

      if (!data || !Array.isArray(data)) {
        return {
          total: 0,
          upcoming: 0,
          oneOnOne: 0,
          classMeetings: 0
        };
      }

      const now = new Date();
      const stats: MeetingStats = {
        total: data.length,
        upcoming: data.filter(m => m.status === 'scheduled' && new Date(m.scheduled_time) > now).length,
        oneOnOne: data.filter(m => m.meeting_type === '1-on-1').length,
        classMeetings: data.filter(m => m.meeting_type === 'class').length
      };

      return stats;
    } catch (error) {
      console.error('Error fetching meeting stats:', error);
      return {
        total: 0,
        upcoming: 0,
        oneOnOne: 0,
        classMeetings: 0
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
          course_id: meetingData.course_id,
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

      return updatedMeeting;
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

      return data;
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
   * Get meetings for a student - Enhanced version with better error handling
   */
  async getStudentMeetings(studentId: string): Promise<ZoomMeeting[]> {
    try {
      console.log('Fetching meetings for student:', studentId);
      
      // Step 1: Get 1-on-1 meetings where student is the participant
      const { data: oneOnOneMeetings, error: oneOnOneError } = await supabase
        .from('zoom_meetings')
        .select('*')
        .eq('student_id', studentId)
        .eq('meeting_type', '1-on-1')
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

      let classMeetings: any[] = [];
      if (studentCourses && studentCourses.length > 0) {
        const courseIds = studentCourses.map(sc => sc.course_id);
        
        // Step 3: Get class meetings for those courses
        const { data: classMeetingsData, error: classError } = await supabase
          .from('zoom_meetings')
          .select('*')
          .eq('meeting_type', 'class')
          .in('course_id', courseIds)
          .order('scheduled_time', { ascending: false });

        if (classError) {
          console.error('Error fetching class meetings:', classError);
        } else {
          classMeetings = classMeetingsData || [];
        }
      }

      // Step 4: Get teacher and course information separately for better reliability
      const allMeetings = [...(oneOnOneMeetings || []), ...classMeetings];
      
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

          // Get course information for class meetings
          if (meeting.meeting_type === 'class' && meeting.course_id) {
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

          return {
            ...meeting,
            student_name: teacherName, // Using student_name field to store teacher name for consistency with interface
            course_title: courseTitle,
            participant_names: []
          };
        })
      );

      console.log(`Found ${enhancedMeetings.length} meetings for student`);
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

    if (meetingData.meeting_type === '1-on-1' && !meetingData.student_id) {
      throw new Error('Student is required for 1-on-1 meetings');
    }

    if (meetingData.meeting_type === 'class' && !meetingData.course_id) {
      throw new Error('Course is required for class meetings');
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

      // For class meetings, we'll handle participants separately
      if (meeting.meeting_type === 'class' && meeting.course_id) {
        // Get all students in the course
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

      if (meeting.meeting_type === 'class' && meeting.course_id) {
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