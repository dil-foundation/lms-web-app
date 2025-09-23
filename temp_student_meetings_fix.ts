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
