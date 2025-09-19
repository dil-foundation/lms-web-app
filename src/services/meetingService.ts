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
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
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

export interface ZoomApiConfig {
  api_key: string;
  api_secret: string;
  webhook_url?: string;
}

class MeetingService {
  /**
   * Get Zoom integration status
   */
  async getZoomIntegrationStatus(): Promise<boolean> {
    try {
      // Check if Zoom integration is enabled in the integrations table
      const { data, error } = await supabase
        .from('integrations')
        .select('status, settings')
        .eq('name', 'zoom')
        .single();

      if (error) {
        console.error('Error checking Zoom integration:', error);
        return false;
      }

      return data?.status === 'enabled' && data?.settings?.api_key;
    } catch (error) {
      console.error('Error checking Zoom integration status:', error);
      return false;
    }
  }

  /**
   * Create a new Zoom meeting
   */
  async createMeeting(teacherId: string, meetingData: CreateMeetingRequest): Promise<ZoomMeeting> {
    try {
      // First check if Zoom is enabled
      const isZoomEnabled = await this.getZoomIntegrationStatus();
      if (!isZoomEnabled) {
        throw new Error('Zoom integration is not enabled. Please contact your administrator.');
      }

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

      // In a real implementation, this would call Zoom API to create the actual meeting
      // For now, we'll generate mock Zoom meeting data
      const zoomMeetingId = Math.random().toString().substring(2, 11);
      const zoomJoinUrl = `https://zoom.us/j/${zoomMeetingId}`;

      // Update the meeting record with Zoom details
      const { data: updatedMeeting, error: updateError } = await supabase
        .from('zoom_meetings')
        .update({
          zoom_meeting_id: zoomMeetingId,
          zoom_join_url: zoomJoinUrl,
          zoom_password: Math.random().toString(36).substring(2, 8)
        })
        .eq('id', data.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update meeting with Zoom details: ${updateError.message}`);
      }

      return updatedMeeting;
    } catch (error) {
      console.error('Error creating meeting:', error);
      throw error;
    }
  }

  /**
   * Get meetings for a teacher
   */
  async getTeacherMeetings(teacherId: string): Promise<ZoomMeeting[]> {
    try {
      const { data, error } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          student:profiles!zoom_meetings_student_id_fkey(first_name, last_name),
          course:courses!zoom_meetings_course_id_fkey(title)
        `)
        .eq('teacher_id', teacherId)
        .order('scheduled_time', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch teacher meetings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching teacher meetings:', error);
      throw error;
    }
  }

  /**
   * Get meetings for a student
   */
  async getStudentMeetings(studentId: string): Promise<ZoomMeeting[]> {
    try {
      // Get 1-on-1 meetings where student is the participant
      const { data: oneOnOneMeetings, error: oneOnOneError } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          teacher:profiles!zoom_meetings_teacher_id_fkey(first_name, last_name)
        `)
        .eq('student_id', studentId)
        .eq('meeting_type', '1-on-1');

      if (oneOnOneError) {
        throw new Error(`Failed to fetch 1-on-1 meetings: ${oneOnOneError.message}`);
      }

      // Get class meetings for courses the student is enrolled in
      const { data: classMeetings, error: classError } = await supabase
        .from('zoom_meetings')
        .select(`
          *,
          teacher:profiles!zoom_meetings_teacher_id_fkey(first_name, last_name),
          course:courses!zoom_meetings_course_id_fkey(title)
        `)
        .eq('meeting_type', 'class')
        .in('course_id', 
          supabase
            .from('enrollments')
            .select('course_id')
            .eq('student_id', studentId)
        );

      if (classError) {
        throw new Error(`Failed to fetch class meetings: ${classError.message}`);
      }

      // Combine and sort meetings
      const allMeetings = [...(oneOnOneMeetings || []), ...(classMeetings || [])];
      return allMeetings.sort((a, b) => 
        new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
      );
    } catch (error) {
      console.error('Error fetching student meetings:', error);
      throw error;
    }
  }

  /**
   * Update meeting status
   */
  async updateMeetingStatus(meetingId: string, status: ZoomMeeting['status']): Promise<void> {
    try {
      const { error } = await supabase
        .from('zoom_meetings')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', meetingId);

      if (error) {
        throw new Error(`Failed to update meeting status: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating meeting status:', error);
      throw error;
    }
  }

  /**
   * Cancel a meeting
   */
  async cancelMeeting(meetingId: string): Promise<void> {
    try {
      await this.updateMeetingStatus(meetingId, 'cancelled');
      
      // In a real implementation, this would also cancel the Zoom meeting via API
      console.log(`Meeting ${meetingId} cancelled`);
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      throw error;
    }
  }

  /**
   * Get students for a teacher (for 1-on-1 meeting creation)
   */
  async getTeacherStudents(teacherId: string): Promise<Array<{id: string, first_name: string, last_name: string, email: string}>> {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          student:profiles!enrollments_student_id_fkey(id, first_name, last_name, email)
        `)
        .in('course_id', 
          supabase
            .from('courses')
            .select('id')
            .eq('teacher_id', teacherId)
        );

      if (error) {
        throw new Error(`Failed to fetch teacher students: ${error.message}`);
      }

      // Extract unique students
      const students = data?.map(enrollment => enrollment.student).filter(Boolean) || [];
      const uniqueStudents = students.reduce((acc, student) => {
        if (!acc.find(s => s.id === student.id)) {
          acc.push(student);
        }
        return acc;
      }, [] as typeof students);

      return uniqueStudents;
    } catch (error) {
      console.error('Error fetching teacher students:', error);
      throw error;
    }
  }

  /**
   * Get courses for a teacher (for class meeting creation)
   */
  async getTeacherCourses(teacherId: string): Promise<Array<{id: string, title: string}>> {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', teacherId)
        .eq('status', 'Published');

      if (error) {
        throw new Error(`Failed to fetch teacher courses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching teacher courses:', error);
      throw error;
    }
  }
}

export default new MeetingService();
