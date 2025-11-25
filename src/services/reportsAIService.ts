import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { getAuthToken } from '@/utils/authUtils';

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ReportsAIQuery {
  query: string;
  context?: {
    timeframe?: string;
    reportType?: string;
    filters?: Record<string, any>;
  };
}

export interface ReportsAIResponse {
  success: boolean;
  response: string;
  reportData?: any;
  error?: string;
}

export interface ReportContext {
  totalUsers: number;
  totalCourses: number;
  engagementRate: number;
  completionRate: number;
  timeRange: string;
  availableMetrics: string[];
  // Additional real data fields for production
  averageSessionDuration?: number;
  popularCourses?: string[];
  activeUsersThisMonth?: number;
  newUsersThisMonth?: number;
  userRoles?: Record<string, number>;
  
  // AI Tutor specific metrics
  aiTutorActiveUsers?: number;
  aiTutorSessions?: number;
  aiTutorTotalTime?: number;
  aiTutorAverageScore?: number;
  aiTutorCompletionRate?: number;
  aiTutorExercisesCompleted?: number;
  aiTutorExercisesAttempted?: number;
  aiTutorProgressPercentage?: number;
  aiTutorStreakDays?: number;
  aiTutorUrduUsage?: number;
  aiTutorMilestones?: number;
  aiTutorMilestoneTypes?: string[];
  aiTutorUnlocks?: number;
  aiTutorStagesUnlocked?: number;
  aiTutorCompletedStages?: number;
  aiTutorAvgStageScore?: number;
  aiTutorCompletedTopics?: number;
  aiTutorTopicUrduUsage?: number;
  aiTutorAvgTopicTime?: number;
  aiTutorWeeklyMilestones?: number;
  aiTutorConsistencyScore?: number;
  
  // LMS specific metrics
  lmsActiveUsers?: number;
  lmsCompletionRate?: number;
  lmsEnrollments?: number;
  lmsNewEnrollments?: number;
  lmsTotalQuizzes?: number;
  lmsAvgQuizScore?: number;
  lmsManualGradingRequired?: number;
  lmsTotalSections?: number;
  lmsTotalLessons?: number;
  lmsTotalContent?: number;
  lmsContentTypes?: string[];
  lmsTotalDiscussions?: number;
  lmsTotalReplies?: number;
  lmsDiscussionParticipants?: number;
  lmsAssignmentsSubmitted?: number;
  lmsAssignmentsGraded?: number;
  lmsAvgAssignmentGrade?: number;
  // Session and activity data
  activeSessions?: number;
  totalSuccessfulActions?: number;
  uniqueActiveUsersFromSessions?: number;
  uniqueActiveUsersFromLogs?: number;
  totalPracticeSessions?: number;
  lastUpdated?: string;
  
  // User list data (when requested)
  studentList?: any[];
  studentTotal?: number;
  teacherList?: any[];
  teacherTotal?: number;
  userList?: any[];
  userTotal?: number;
  activeTodayList?: any[];
  activeTodayTotal?: number;
  teacherCourses?: any[];
  teacherCoursesTotal?: number;
  courseEnrollments?: any[];
  courseEnrollmentTotal?: number;
  courseDetails?: any;
  allCoursesList?: any[];
  allCoursesTotal?: number;
  
  dataQuality?: {
    userDataComplete: boolean;
    courseDataComplete: boolean;
    engagementDataComplete: boolean;
    aiTutorDataComplete?: boolean;
    lmsDataComplete?: boolean;
    confidenceScore: number;
    note?: string;
  };
}

export class ReportsAIService {
  private static readonly SYSTEM_PROMPT = `You are a Reports AI Assistant for educational platform analytics.

RULES:
- Use ONLY data from <CONTEXT>
- Never invent numbers
- Format with markdown tables for user lists

DATA FIELDS:
- studentList/Total, teacherList/Total, adminList/Total, activeTodayList/Total
- enrolledStudentsList/Total, nonEnrolledStudentsList/Total  
- courseCategories, courseLanguages, allCoursesList/Total

TABLE FORMAT:
## 👥 [Type] on Platform
### Summary
Found **X [type]**.
| Name | Email | Date | Status |
|------|-------|------|--------|
| Data | Here | 2024 | Active |
### Recommendations
1. Actionable insight

Keep responses concise with specific metrics and recommendations.`;

  /**
   * Generate a report response using OpenAI (with fallback to mock responses)
   */
  static async generateReportResponse(
    query: string,
    context?: ReportContext,
    conversationHistory?: Array<{role: 'user' | 'assistant', content: string}>
  ): Promise<ReportsAIResponse> {
    try {
      // Extract timeframe from query if present
      const timeframe = this.extractTimeframe(query);
      console.log('🕐 Extracted timeframe from query:', timeframe);
      
      // Get platform context with timeframe (always fetch fresh data when timeframe is specified)
      console.log('🔄 Getting platform context with timeframe:', timeframe);
      console.log('🤔 Context parameter provided:', !!context);
      
      let platformContext: ReportContext;
      if (timeframe && !context) {
        // If timeframe is specified and no context provided, fetch with timeframe and query
        platformContext = await this.getPlatformContext(timeframe, query);
      } else if (context) {
        // If context is provided, use it (but this shouldn't happen with timeframe queries)
        console.log('⚠️ Using provided context instead of fetching with timeframe');
        platformContext = context;
      } else {
        // No timeframe and no context, fetch default with query context
        platformContext = await this.getPlatformContext(undefined, query);
      }
      
      console.log('📊 Platform context timeRange:', platformContext.timeRange);

      // Direct metric shortcuts for deterministic answers (bypass model)
      console.log('🔍 About to call tryDirectMetricAnswer with query:', query);
      const directAnswer = await this.tryDirectMetricAnswer(query, platformContext);
      console.log('🎯 Direct answer check:', { 
        query, 
        hasDirectAnswer: !!directAnswer,
        directAnswerLength: directAnswer?.length || 0,
        directAnswerPreview: directAnswer?.substring(0, 150) || 'null'
      });
      // Direct answers disabled - always use AI for dynamic responses
      if (false) { // Disabled: directAnswer
        console.log('✅ Using direct answer:', directAnswer.substring(0, 100) + '...');
        return {
          success: true,
          response: directAnswer,
          reportData: {
            teacherCount: platformContext.userRoles?.teacher || 0,
            studentCount: platformContext.userRoles?.student || 0,
            userRoles: platformContext.userRoles
          }
        };
      }
      
      // Use fallback structured response (OpenAI API calls removed for security)
      console.log('🤖 Using structured response generation');
      const mockResponse = this.generateMockAIResponse(query, platformContext);
      
      return {
        success: true,
        response: mockResponse.content,
        reportData: mockResponse.data
      };
      
    } catch (error) {
      console.error('Error generating report response:', error);
      return {
        success: false,
        response: 'I apologize, but I encountered an error while generating your report. Please try again.',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Provide deterministic answers for simple metric queries without calling the model
   */
  private static async tryDirectMetricAnswer(query: string, context: ReportContext): Promise<string | null> {
    const q = (query || '').toLowerCase();

    const asksHowMany = q.includes('how many') || q.includes('number of') || q.includes('count of') || q.includes('count');
    const mentionsTeachers = q.includes('teacher') || q.includes('teachers') || q.includes('instructor') || q.includes('instructors') || q.includes('faculty') || q.includes('lecturer') || q.includes('lecturers');
    const mentionsStudents = q.includes('student') || q.includes('students') || q.includes('learner') || q.includes('learners');
    const mentionsAdmins = q.includes('admin') || q.includes('admins') || q.includes('administrator') || q.includes('administrators');
    const mentionsUsers = q.includes('user') || q.includes('users') || q.includes('people');
    const asksList = q.includes('list') || q.includes('show me') || q.includes('who are');
    
    // Performance and grade queries
    const mentionsPerformance = q.includes('performance') || q.includes('grade') || q.includes('grades') || q.includes('score') || q.includes('scores') || q.includes('result') || q.includes('results');
    const mentionsAverage = q.includes('average') || q.includes('mean') || q.includes('avg');
    const mentionsTop = q.includes('top') || q.includes('best') || q.includes('highest') || q.includes('leading');
    const mentionsBottom = q.includes('bottom') || q.includes('worst') || q.includes('lowest') || q.includes('struggling');
    
    // Course-specific queries
    const mentionsCourses = q.includes('course') || q.includes('courses') || q.includes('class') || q.includes('classes');
    const mentionsEnrollment = q.includes('enroll') || q.includes('enrolled') || q.includes('enrollment') || q.includes('registration');
    const mentionsCompletion = q.includes('completion') || q.includes('completed') || q.includes('finished') || q.includes('complete');
    
    // Comparison queries
    const mentionsComparison = q.includes('compare') || q.includes('comparison') || q.includes('vs') || q.includes('versus') || q.includes('against');
    const mentionsThisMonth = q.includes('this month') || q.includes('current month');
    const mentionsLastMonth = q.includes('last month') || q.includes('previous month');
    const mentionsThisWeek = q.includes('this week') || q.includes('current week');
    const mentionsLastWeek = q.includes('last week') || q.includes('previous week');
    
    // Export and download queries
    const mentionsExport = q.includes('export') || q.includes('download') || q.includes('save') || q.includes('file');
    const mentionsReport = q.includes('report') || q.includes('summary') || q.includes('overview');
    
    // Help and guidance queries
    const mentionsHelp = q.includes('help') || q.includes('how to') || q.includes('how do i') || q.includes('guide') || q.includes('tutorial');
    const mentionsWhat = q.includes('what is') || q.includes('what are') || q.includes('explain') || q.includes('definition');
    
    // Filtered search queries
    const mentionsIn = q.includes(' in ') || q.includes(' for ') || q.includes(' from ');
    const mentionsSpecific = q.includes('specific') || q.includes('particular') || q.includes('certain');
    const hasCourseName = /\b(math|biology|english|science|history|physics|chemistry|literature|art|music|programming|computer|language)\b/i.test(q);
    const mentionsAITutor = q.includes('ai tutor') || q.includes('tutor') || q.includes('learning analytics') || q.includes('daily learning') || q.includes('practice') || q.includes('exercise') || q.includes('milestone') || q.includes('progress');
    const mentionsLMS = q.includes('lms') || q.includes('enrollment') || q.includes('quiz') || q.includes('assignment');
    const explicitlyExcludesLMS = q.includes('do not include') && q.includes('lms') || q.includes('not include') && q.includes('course') || q.includes('only include ai tutor') || q.includes('only ai tutor');

    console.log('🔍 Direct answer analysis:', { 
      query: q, 
      asksHowMany, 
      mentionsTeachers, 
      mentionsStudents,
      mentionsAdmins,
      mentionsUsers,
      asksList,
      mentionsPerformance,
      mentionsAverage,
      mentionsTop,
      mentionsBottom,
      mentionsCourses,
      mentionsEnrollment,
      mentionsCompletion,
      mentionsComparison,
      mentionsExport,
      mentionsHelp,
      mentionsWhat,
      mentionsIn,
      mentionsSpecific,
      hasCourseName,
      mentionsAITutor,
      mentionsLMS,
      explicitlyExcludesLMS,
      wantsDetails: q.includes('details') || q.includes('information') || q.includes('info') || q.includes('who are'),
      mentionsLogins: q.includes('login') || q.includes('logged in') || q.includes('active') || q.includes('activity'),
      userRoles: context.userRoles 
    });

    // Handle AI Tutor focused reports (high priority)
    if (mentionsAITutor && (!mentionsLMS || explicitlyExcludesLMS)) {
      console.log('🎯 AI Tutor detection triggered!', {
        mentionsAITutor,
        mentionsLMS,
        explicitlyExcludesLMS,
        query: q,
        aiTutorActiveUsers: context.aiTutorActiveUsers,
        aiTutorSessions: context.aiTutorSessions
      });
      
      const header = '## 📚 AI Tutor Learning Analytics Report';
      
      const overview = `\n### Daily Learning Overview\n- **Active AI Tutor Users:** ${context.aiTutorActiveUsers || 0}\n- **Total Practice Sessions:** ${context.aiTutorSessions || 0}\n- **Total Practice Time:** ${context.aiTutorTotalTime || 0} minutes\n- **Average Score:** ${context.aiTutorAverageScore || 0}%`;
      
      const exerciseMetrics = `\n\n### Exercise & Progress Metrics\n- **Exercises Completed:** ${context.aiTutorExercisesCompleted || 0}\n- **Exercises Attempted:** ${context.aiTutorExercisesAttempted || 0}\n- **Completion Rate:** ${context.aiTutorCompletionRate || 0}%\n- **Overall Progress:** ${context.aiTutorProgressPercentage || 0}%`;
      
      const milestoneMetrics = `\n\n### Milestones & Achievements\n- **Milestones Reached:** ${context.aiTutorMilestones || 0}\n- **Stages Unlocked:** ${context.aiTutorStagesUnlocked || 0}\n- **Completed Stages:** ${context.aiTutorCompletedStages || 0}\n- **Average Stage Score:** ${context.aiTutorAvgStageScore || 0}%`;
      
      const engagementMetrics = `\n\n### Engagement & Consistency\n- **Current Streak:** ${context.aiTutorStreakDays || 0} days\n- **Consistency Score:** ${context.aiTutorConsistencyScore || 0}%\n- **Urdu Usage:** ${context.aiTutorUrduUsage || 0}%\n- **Weekly Milestones:** ${context.aiTutorWeeklyMilestones || 0}`;
      
      const topicMetrics = `\n\n### Topic Performance\n- **Completed Topics:** ${context.aiTutorCompletedTopics || 0}\n- **Average Topic Time:** ${context.aiTutorAvgTopicTime || 0} minutes\n- **Topic Urdu Usage:** ${context.aiTutorTopicUrduUsage || 0}%`;
      
      const insights = `\n\n### Key Insights\n- ${context.aiTutorCompletionRate > 70 ? 'Strong completion rates indicate effective learning engagement' : 'Completion rates suggest room for improvement in exercise difficulty or motivation'}\n- ${context.aiTutorStreakDays > 7 ? 'Excellent learning consistency with sustained daily practice' : 'Focus on building consistent daily learning habits'}\n- ${context.aiTutorUrduUsage > 50 ? 'High Urdu usage shows strong native language integration' : 'Consider encouraging more native language practice'}`;
      
      const recommendations = `\n\n### Recommendations\n- ${context.aiTutorCompletionRate < 60 ? 'Review exercise difficulty and provide additional support for struggling learners' : 'Maintain current exercise complexity and introduce advanced challenges'}\n- ${context.aiTutorStreakDays < 3 ? 'Implement gamification features to encourage daily practice' : 'Reward consistent learners with bonus content or achievements'}\n- ${context.aiTutorProgressPercentage < 50 ? 'Provide personalized learning paths to accelerate progress' : 'Introduce peer collaboration features for advanced learners'}`;
      
      return `${header}${overview}${exerciseMetrics}${milestoneMetrics}${engagementMetrics}${topicMetrics}${insights}${recommendations}`;
    }

    // Handle teacher count queries
    if (asksHowMany && mentionsTeachers) {
      // Robust extraction: handle variations like teacher/instructor/faculty and case differences
      const roles = context.userRoles || {};
      const roleEntries = Object.entries(roles);
      const teacherEntry = roleEntries.find(([k]) => ['teacher', 'teachers', 'instructor', 'instructors', 'faculty', 'lecturer', 'lecturers'].includes(k?.toLowerCase?.() || ''));
      const teacherCount = teacherEntry ? Number(teacherEntry[1] as any) || 0 : (roles as any)['teacher'] ?? 0;
      
      console.log('👨‍🏫 Teacher count extraction:', { 
        roles, 
        roleEntries, 
        teacherEntry, 
        teacherCount 
      });

      // Build a concise, professional response using the real number
      const header = '## Instructor Overview';
      const metrics = `\n### Current Metrics\n- **Total Instructors:** ${teacherCount}`;
      const insights = teacherCount > 0
        ? `\n\n### Key Insights\n- Your platform currently has ${teacherCount} instructor${teacherCount === 1 ? '' : 's'}.`
        : `\n\n### Key Insights\n- No instructors are recorded at the moment.`;

      return `${header}${metrics}${insights}`;
    }

    // Handle student count queries
    if (asksHowMany && mentionsStudents) {
      const roles = context.userRoles || {};
      const studentCount = (roles as any)['student'] ?? 0;
      
      const header = '## Student Overview';
      const metrics = `\n### Current Metrics\n- **Total Students:** ${studentCount}`;
      const insights = studentCount > 0
        ? `\n\n### Key Insights\n- Your platform currently has ${studentCount} registered student${studentCount === 1 ? '' : 's'}.`
        : `\n\n### Key Insights\n- No students are registered at the moment.`;

      return `${header}${metrics}${insights}`;
    }

    // Handle admin list queries
    if (asksList && mentionsAdmins) {
      try {
        console.log('🎯 Admin list request detected');
        const adminData = await this.getUserList('admin', '', 1, 10); // Get first 10 admins
        
        if (adminData.success && adminData.users.length > 0) {
          const header = '## Admin List';
          const metrics = `\n### Current Administrators (showing first 10 of ${adminData.total})\n`;
          const adminList = adminData.users.map((admin, index) => 
            `${index + 1}. **${admin.first_name || 'N/A'} ${admin.last_name || 'N/A'}** (${admin.email || 'N/A'}) - Joined: ${admin.created_at ? new Date(admin.created_at).toLocaleDateString() : 'N/A'}`
          ).join('\n');
          
          const footer = adminData.total > 10 
            ? `\n\n### Note\nShowing first 10 administrators. Total registered administrators: ${adminData.total}`
            : '';

          return `${header}${metrics}${adminList}${footer}`;
        } else {
          return `## Admin List\n\n### Current Status\n- Admin list fetch ${adminData.success ? 'succeeded but returned no data' : 'failed'}\n- This may indicate no administrators are registered or a temporary connection issue\n- Total administrators from role data: ${context.userRoles?.admin || 0}`;
        }
      } catch (error) {
        console.error('Error fetching admin list:', error);
        return `## Admin List\n\n### Error\nUnable to fetch detailed administrator information at this time. Please try again later.`;
      }
    }

    // Handle login/activity queries (including "today" and "24 hours" queries) - MOVED UP FOR PRIORITY
    const mentionsLogins = q.includes('login') || q.includes('logged in') || q.includes('active') || q.includes('activity');
    const mentionsToday = q.includes('today') || q.includes('for today');
    const mentions24Hours = q.includes('24 hour') || q.includes('24 hrs') || q.includes('past 24') || q.includes('last 24') || q.includes('24h') || q.includes('in past 24');
    const wantsDetails = q.includes('details') || q.includes('information') || q.includes('info') || q.includes('who are');
    const asksWho = q.includes('who are') || q.includes('who logged') || q.includes('which users');
    
    // Handle specific "who logged in today/24hrs" queries - HIGH PRIORITY
    if (mentionsLogins && (mentionsToday || mentions24Hours) && (asksWho || mentionsUsers)) {
      try {
        console.log('🎯 Active users request detected (moved up for priority)');
        // Extract timeframe from the original query to pass to getTodaysActiveUsers
        const queryTimeframe = this.extractTimeframe(query);
        console.log('🕐 Using timeframe for active users:', queryTimeframe);
        const todaysUsers = await this.getTodaysActiveUsers(1, 15, queryTimeframe); // Get first 15 users
        
        if (todaysUsers.success && todaysUsers.users.length > 0) {
          const timeframeLabel = mentions24Hours ? 'Past 24 Hours' : 'Today';
          const header = `## ${timeframeLabel} Active Users`;
          const metrics = `\n### Users Who Logged In ${timeframeLabel} (showing first 15 of ${todaysUsers.total})\n`;
          
          // Group by role for better organization
          const usersByRole = todaysUsers.users.reduce((acc, user) => {
            const role = user.role || 'unknown';
            if (!acc[role]) acc[role] = [];
            acc[role].push(user);
            return acc;
          }, {} as Record<string, any[]>);
          
          const userList = Object.entries(usersByRole).map(([role, users]) => {
            const roleTitle = role.charAt(0).toUpperCase() + role.slice(1) + 's';
            const userItems = (users as any[]).map((user, index) => 
              `   ${index + 1}. **${user.first_name || 'N/A'} ${user.last_name || 'N/A'}** (${user.email || 'N/A'}) - Last Activity: ${user.last_activity ? new Date(user.last_activity).toLocaleTimeString() : 'N/A'}`
            ).join('\n');
            return `\n**${roleTitle}:**\n${userItems}`;
          }).join('\n');
          
          const footer = todaysUsers.total > 15 
            ? `\n\n### Summary\n- **Total users active ${timeframeLabel.toLowerCase()}:** ${todaysUsers.total}\n- **Showing:** First 15 users\n- **Activity tracked:** Login sessions and platform interactions`
            : `\n\n### Summary\n- **Total users active ${timeframeLabel.toLowerCase()}:** ${todaysUsers.total}\n- **Activity tracked:** Login sessions and platform interactions`;

          return `${header}${metrics}${userList}${footer}`;
        } else {
          const timeframeLabel = mentions24Hours ? 'Past 24 Hours' : 'Today';
          return `## ${timeframeLabel} Active Users\n\n### Current Status\n- No users have logged in ${timeframeLabel.toLowerCase()} yet, or session tracking data is unavailable\n- This could indicate:\n  - ${mentions24Hours ? 'Low activity period' : 'It\'s early in the day'}\n  - Weekend/holiday with low activity\n  - Technical issue with session tracking\n\n### Alternative Data\n- **Current Active Sessions:** ${context.activeSessions || 0}\n- **Users with Recent Activity:** ${context.uniqueActiveUsersFromLogs || 0}`;
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
        const timeframeLabel = mentions24Hours ? 'Past 24 Hours' : 'Today';
        return `## ${timeframeLabel} Active Users\n\n### Error\nUnable to fetch ${timeframeLabel.toLowerCase()} login information at this time. Please try again later.\n\n### Available Data\n- **Current Active Sessions:** ${context.activeSessions || 0}\n- **Users with Recent Activity:** ${context.uniqueActiveUsersFromLogs || 0}`;
      }
    }

    // Handle general user list queries (all users) - LOWER PRIORITY
    if (asksList && mentionsUsers && !mentionsStudents && !mentionsTeachers && !mentionsAdmins) {
      try {
        console.log('🎯 General user list request detected');
        const userData = await this.getUserList('', '', 1, 15); // Get first 15 users of all types
        
        if (userData.success && userData.users.length > 0) {
          const header = '## All Users List';
          const metrics = `\n### Current Users (showing first 15 of ${userData.total})\n`;
          
          // Group users by role for better display
          const usersByRole = userData.users.reduce((acc, user) => {
            const role = user.role || 'unknown';
            if (!acc[role]) acc[role] = [];
            acc[role].push(user);
            return acc;
          }, {} as Record<string, any[]>);
          
          const userList = Object.entries(usersByRole).map(([role, users]) => {
            const roleTitle = role.charAt(0).toUpperCase() + role.slice(1) + 's';
            const userItems = (users as any[]).map((user, index) => 
              `   ${index + 1}. **${user.first_name || 'N/A'} ${user.last_name || 'N/A'}** (${user.email || 'N/A'}) - Joined: ${user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}`
            ).join('\n');
            return `\n**${roleTitle}:**\n${userItems}`;
          }).join('\n');
          
          const footer = userData.total > 15 
            ? `\n\n### Note\nShowing first 15 users. Total registered users: ${userData.total}\n- For specific roles, ask "show me all teachers" or "show me all students"`
            : '';

          return `${header}${metrics}${userList}${footer}`;
        } else {
          return `## All Users List\n\n### Current Status\n- User list fetch ${userData.success ? 'succeeded but returned no data' : 'failed'}\n- This may indicate no users are registered or a temporary connection issue\n- Total users from role data: ${context.totalUsers || 0}`;
        }
      } catch (error) {
        console.error('Error fetching user list:', error);
        return `## All Users List\n\n### Error\nUnable to fetch detailed user information at this time. Please try again later.`;
      }
    }

    // Handle teacher list queries
    if (asksList && mentionsTeachers) {
      try {
        console.log('🎯 Teacher list request detected');
        const teacherData = await this.getTeacherList('', 1, 10); // Get first 10 teachers
        
        if (teacherData.success && teacherData.teachers.length > 0) {
          const header = '## Teacher List';
          const metrics = `\n### Current Teachers (showing first 10 of ${teacherData.total})\n`;
          const teacherList = teacherData.teachers.map((teacher, index) => 
            `${index + 1}. **${teacher.first_name || 'N/A'} ${teacher.last_name || 'N/A'}** (${teacher.email || 'N/A'}) - Joined: ${teacher.created_at ? new Date(teacher.created_at).toLocaleDateString() : 'N/A'}`
          ).join('\n');
          
          const footer = teacherData.total > 10 
            ? `\n\n### Note\nShowing first 10 teachers. Total registered teachers: ${teacherData.total}`
            : '';

          return `${header}${metrics}${teacherList}${footer}`;
        } else {
          return `## Teacher List\n\n### Current Status\n- Teacher list fetch ${teacherData.success ? 'succeeded but returned no data' : 'failed'}\n- This may indicate no teachers are registered or a temporary connection issue\n- Total teachers from role data: ${context.userRoles?.teacher || 0}`;
        }
      } catch (error) {
        console.error('Error fetching teacher list:', error);
        return `## Teacher List\n\n### Error\nUnable to fetch detailed teacher information at this time. Please try again later.`;
      }
    }

    // Handle student list queries
    if (asksList && mentionsStudents) {
      try {
        const studentData = await this.getStudentList('', 1, 10); // Get first 10 students
        
        if (studentData.success && studentData.students.length > 0) {
          const header = '## Student List';
          const metrics = `\n### Current Students (showing first 10 of ${studentData.total})\n`;
          const studentList = studentData.students.map((student, index) => 
            `${index + 1}. **${student.first_name} ${student.last_name}** (${student.email}) - Joined: ${new Date(student.created_at).toLocaleDateString()}`
          ).join('\n');
          
          const footer = studentData.total > 10 
            ? `\n\n### Note\nShowing first 10 students. Total registered students: ${studentData.total}`
            : '';

          return `${header}${metrics}${studentList}${footer}`;
        } else {
          return `## Student List\n\n### Current Status\n- No students are currently registered in the system.\n\n### Recommendations\n1. Set up student registration process\n2. Import existing student data if available\n3. Create marketing campaigns to attract students`;
        }
      } catch (error) {
        console.error('Error fetching student list:', error);
        // Fall back to basic count
        const roles = context.userRoles || {};
        const studentCount = (roles as any)['student'] ?? 0;
        return `## Student Information\n\n### Current Metrics\n- **Total Students:** ${studentCount}\n\n### Note\nDetailed student list is temporarily unavailable. Please try again or contact support.`;
      }
    }

    
    // Handle general login/activity queries (aggregated data)
    if (mentionsLogins && (mentionsStudents || mentionsUsers)) {
      const activeSessions = context.activeSessions || 0;
      const activeUsersFromSessions = context.uniqueActiveUsersFromSessions || 0;
      const activeUsersFromLogs = context.uniqueActiveUsersFromLogs || 0;
      const totalSuccessfulActions = context.totalSuccessfulActions || 0;
      
      const header = mentionsToday ? '## Today\'s User Activity & Details' : '## User Activity Report';
      
      if (mentionsToday || wantsDetails) {
        // Enhanced response with user details when requested
        const metrics = `\n### Available Activity Data\n- **Active Sessions:** ${activeSessions}\n- **Users with Active Sessions:** ${activeUsersFromSessions}\n- **Users with Recent Activity:** ${activeUsersFromLogs}\n- **Successful Platform Actions:** ${totalSuccessfulActions}`;
        
        const userDetails = `\n\n### User Demographics & Details\n- **Total Registered Users:** ${context.totalUsers}\n- **Active Users This Month:** ${context.activeUsersThisMonth || 0}\n- **New Users This Month:** ${context.newUsersThisMonth || 0}\n- **Platform Engagement Rate:** ${context.engagementRate}%\n- **Average Session Duration:** ${context.averageSessionDuration || 0} minutes`;
        
        const roleBreakdown = `\n\n### User Role Distribution\n${Object.entries(context.userRoles || {}).map(([role, count]) => `- **${role.charAt(0).toUpperCase() + role.slice(1)}s:** ${count} users`).join('\n') || '- No role data available'}`;
        
        const explanation = `\n\n### Data Availability Note\nFor privacy and security reasons, individual user login timestamps and personal details are not accessible through reports. However, I can provide comprehensive aggregated user data and demographics shown above.`;
        
        const actionableInsights = `\n\n### Actionable Insights\n- ${activeUsersFromSessions > 0 ? `${activeUsersFromSessions} users currently have active sessions` : 'No users currently have active sessions'}\n- ${context.engagementRate > 50 ? 'Strong user engagement indicates healthy platform adoption' : 'User engagement could be improved through better onboarding'}\n- ${context.newUsersThisMonth > 0 ? `${context.newUsersThisMonth} new users joined this month` : 'No new user registrations this month - consider marketing initiatives'}`;
        
        // Try to get student list if available
        if (wantsDetails && mentionsStudents) {
          try {
            const studentData = await this.getStudentList('', 1, 5);
            if (studentData.success && studentData.students.length > 0) {
              const studentSample = `\n\n### Sample Student Details (${studentData.students.length} of ${studentData.total})\n${studentData.students.map((student, index) => 
                `${index + 1}. **${student.first_name} ${student.last_name}** - ${student.email} (Joined: ${new Date(student.created_at).toLocaleDateString()})`
              ).join('\n')}`;
              
              return `${header}${metrics}${userDetails}${roleBreakdown}${studentSample}${explanation}${actionableInsights}`;
            }
          } catch (error) {
            console.error('Error fetching student details:', error);
          }
        }
        
        return `${header}${metrics}${userDetails}${roleBreakdown}${explanation}${actionableInsights}`;
      } else {
        // For general activity queries
        const metrics = `\n### Current Activity Metrics\n- **Active Sessions:** ${activeSessions}\n- **Users with Active Sessions:** ${activeUsersFromSessions}\n- **Users with Recent Activity:** ${activeUsersFromLogs}\n- **Total Platform Actions:** ${totalSuccessfulActions}\n- **Total Users:** ${context.totalUsers}\n- **Active Users This Month:** ${context.activeUsersThisMonth || 0}`;
        
        const insights = `\n\n### Activity Insights\n- Platform engagement rate: ${context.engagementRate}%\n- Average session duration: ${context.averageSessionDuration || 0} minutes\n- User activity shows ${activeSessions > 0 ? 'active' : 'low'} current engagement`;
        
        return `${header}${metrics}${insights}`;
      }
    }

    // Handle comprehensive user details queries (high priority)
    if ((wantsDetails && (mentionsUsers || mentionsStudents)) || 
        (q.includes('get') && q.includes('user') && q.includes('detail')) ||
        (q.includes('show') && q.includes('user')) ||
        (q.includes('want') && q.includes('user') && q.includes('detail'))) {
      try {
        const header = '## User Details & Demographics';
        
        const overview = `\n### Platform Overview\n- **Total Registered Users:** ${context.totalUsers}\n- **Active Users This Month:** ${context.activeUsersThisMonth || 0}\n- **New Users This Month:** ${context.newUsersThisMonth || 0}\n- **Platform Engagement Rate:** ${context.engagementRate}%`;
        
        const roleBreakdown = `\n\n### User Role Distribution\n${Object.entries(context.userRoles || {}).map(([role, count]) => `- **${role.charAt(0).toUpperCase() + role.slice(1)}s:** ${count} users`).join('\n') || '- No role data available'}`;
        
        const activityMetrics = `\n\n### Activity Metrics\n- **Average Session Duration:** ${context.averageSessionDuration || 0} minutes\n- **Active Sessions:** ${context.activeSessions || 0}\n- **Users with Recent Activity:** ${context.uniqueActiveUsersFromLogs || 0}\n- **Total Platform Actions:** ${context.totalSuccessfulActions || 0}`;
        
        // Always try to get student sample for user details queries
        console.log('🔍 Attempting to fetch student list...');
        const studentData = await this.getStudentList('', 1, 8);
        console.log('📊 Student data result:', { 
          success: studentData.success, 
          count: studentData.students.length, 
          total: studentData.total 
        });
        
        if (studentData.success && studentData.students.length > 0) {
          const studentDetails = `\n\n### Student Details Sample (${studentData.students.length} of ${studentData.total})\n${studentData.students.map((student, index) => 
            `${index + 1}. **${student.first_name || 'N/A'} ${student.last_name || 'N/A'}**\n   - Email: ${student.email || 'N/A'}\n   - Joined: ${student.created_at ? new Date(student.created_at).toLocaleDateString() : 'N/A'}\n   - Role: ${student.role || 'student'}`
          ).join('\n\n')}`;
          
          const moreInfo = studentData.total > studentData.students.length 
            ? `\n\n### Additional Information\n- Total students: ${studentData.total}\n- Showing sample of ${studentData.students.length} students\n- For complete list, ask "show me all students"`
            : '';
          
          return `${header}${overview}${roleBreakdown}${activityMetrics}${studentDetails}${moreInfo}`;
        } else {
          // If student data fetch fails, still provide comprehensive user info
          const fallbackNote = `\n\n### Student Details Status\n- Student list fetch ${studentData.success ? 'succeeded but returned no data' : 'failed'}\n- This may indicate no students are registered or a temporary connection issue\n- Total students from role data: ${context.userRoles?.student || 0}`;
          
          return `${header}${overview}${roleBreakdown}${activityMetrics}${fallbackNote}`;
        }
        
      } catch (error) {
        console.error('Error generating user details:', error);
        return `## User Details\n\n### Current Status\n- **Total Users:** ${context.totalUsers}\n- **Active Users:** ${context.activeUsersThisMonth || 0}\n- **Engagement Rate:** ${context.engagementRate}%\n\n### Note\nDetailed user information is temporarily unavailable. Please try again.`;
      }
    }

    // Practice sessions summary (deterministic mapping to available fields)
    const mentionsPractice = q.includes('practice session') || q.includes('practice sessions') || q.includes('practice report') || q.includes('speaking practice');
    if (mentionsPractice) {
      const activeUsers = (context as any).uniqueActiveUsersFromSessions ?? context.lmsActiveUsers ?? 0;
      const totalSessions = (context as any).aiTutorSessions ?? 0;
      const totalTimeMins = (context as any).aiTutorTotalTime ?? 0;
      const exercisesCompleted = (context as any).aiTutorExercisesCompleted ?? 0;
      const avgScore = (context as any).aiTutorAverageScore ?? 0; // treat as speaking confidence proxy

      const avgSessionMins = totalSessions > 0 ? Math.round(totalTimeMins / totalSessions) : 0;

      const header = '## Practice Sessions Report';
      const metrics = `\n### Current Metrics\n- **Total Active Users:** ${activeUsers}\n- **Average Session Duration:** ${avgSessionMins} minutes${totalSessions === 0 ? ' (limited session data)' : ''}\n- **Practice Exercises Completed:** ${exercisesCompleted}\n- **Speaking Confidence Scores (avg):** ${avgScore}%`;

      // Heuristic areas of struggle
      const areas: string[] = [];
      const avgQuiz = (context as any).lmsAvgQuizScore ?? 0;
      const urduUsage = (context as any).aiTutorTopicUrduUsage ?? 0;
      if (avgScore && avgScore < 60) areas.push('speaking confidence and fluency');
      if (avgQuiz && avgQuiz < 60) areas.push('assessment performance');
      if (urduUsage && urduUsage > 40) areas.push('over-reliance on native language during practice');
      const areasLine = areas.length > 0 ? areas.join(', ') : 'insufficient data';

      const insights = `\n- **Areas of Struggle:** ${areasLine}`;
      return `${header}${metrics}\n${insights}`;
    }

    // Handle performance and grade queries
    if (mentionsPerformance && (mentionsStudents || mentionsUsers)) {
      const header = '## Performance Analytics';
      let metrics = '';
      
      if (mentionsAverage) {
        metrics += `\n### Average Performance Metrics\n- **Average Quiz Score:** ${context.lmsAvgQuizScore || 0}%\n- **Average Assignment Grade:** ${context.lmsAvgAssignmentGrade || 0}%\n- **AI Tutor Average Score:** ${context.aiTutorAverageScore || 0}%`;
      } else {
        metrics += `\n### Performance Overview\n- **Total Quizzes:** ${context.lmsTotalQuizzes || 0}\n- **Average Quiz Score:** ${context.lmsAvgQuizScore || 0}%\n- **Assignments Submitted:** ${context.lmsAssignmentsSubmitted || 0}\n- **Assignments Graded:** ${context.lmsAssignmentsGraded || 0}\n- **Average Assignment Grade:** ${context.lmsAvgAssignmentGrade || 0}%`;
      }
      
      const insights = `\n\n### Performance Insights\n- ${context.lmsAvgQuizScore > 75 ? 'Strong quiz performance indicates good comprehension' : 'Quiz scores suggest need for additional support'}\n- ${context.lmsAvgAssignmentGrade > 80 ? 'Assignment quality is excellent' : 'Consider providing more assignment guidance'}\n- ${context.aiTutorAverageScore > 70 ? 'AI Tutor practice is effective' : 'Encourage more AI Tutor practice sessions'}`;
      
      return `${header}${metrics}${insights}`;
    }

    // Handle course-specific queries
    if (mentionsCourses && (mentionsEnrollment || asksHowMany)) {
      const header = '## Course Analytics';
      const metrics = `\n### Course Metrics\n- **Total Courses:** ${context.totalCourses || 0}\n- **Total Enrollments:** ${context.lmsEnrollments || 0}\n- **New Enrollments:** ${context.lmsNewEnrollments || 0}\n- **LMS Active Users:** ${context.lmsActiveUsers || 0}`;
      
      const structure = `\n\n### Course Structure\n- **Total Sections:** ${context.lmsTotalSections || 0}\n- **Total Lessons:** ${context.lmsTotalLessons || 0}\n- **Total Content Items:** ${context.lmsTotalContent || 0}`;
      
      const insights = `\n\n### Course Insights\n- ${context.lmsEnrollments > context.totalUsers * 0.5 ? 'High enrollment rate shows strong course appeal' : 'Consider marketing strategies to increase enrollment'}\n- ${context.lmsActiveUsers > 0 ? `${context.lmsActiveUsers} users actively using LMS features` : 'Low LMS engagement - consider user onboarding improvements'}`;
      
      return `${header}${metrics}${structure}${insights}`;
    }

    // Handle completion rate queries
    if (mentionsCompletion && (mentionsCourses || mentionsStudents)) {
      const header = '## Completion Analytics';
      const metrics = `\n### Completion Rates\n- **Overall Completion Rate:** ${context.completionRate || 0}%\n- **AI Tutor Completion Rate:** ${context.aiTutorCompletionRate || 0}%\n- **LMS Completion Rate:** ${context.lmsCompletionRate || 0}%`;
      
      const details = `\n\n### Completion Details\n- **AI Tutor Exercises Completed:** ${context.aiTutorExercisesCompleted || 0}\n- **AI Tutor Exercises Attempted:** ${context.aiTutorExercisesAttempted || 0}\n- **Completed Stages:** ${context.aiTutorCompletedStages || 0}\n- **Completed Topics:** ${context.aiTutorCompletedTopics || 0}`;
      
      const recommendations = `\n\n### Recommendations\n- ${context.completionRate < 50 ? 'Focus on improving course engagement and reducing dropout rates' : 'Maintain current completion strategies'}\n- ${context.aiTutorCompletionRate < 60 ? 'Consider gamification to improve AI Tutor completion' : 'AI Tutor completion rates are healthy'}\n- Provide progress tracking and milestone celebrations to encourage completion`;
      
      return `${header}${metrics}${details}${recommendations}`;
    }

    // Handle export/download requests
    if (mentionsExport && mentionsReport) {
      return `## Export Options\n\n### Available Exports\nI can help you generate reports, but I cannot directly create downloadable files. However, you can:\n\n1. **Copy Report Data**: Copy any report I generate and paste it into your preferred application\n2. **Use Export Buttons**: Look for export buttons in the interface after I generate a report\n3. **Request Specific Format**: Ask me to format data in tables for easier copying\n\n### What I Can Generate\n- Student lists and analytics\n- Course performance reports\n- User activity summaries\n- AI Tutor progress reports\n- Custom data analysis\n\n**Try asking**: "Show me student performance in table format" for easy copying.`;
    }

    // Handle top/bottom performer queries
    if ((mentionsTop || mentionsBottom) && (mentionsStudents || mentionsPerformance)) {
      const header = mentionsTop ? '## Top Performers' : '## Students Needing Support';
      const note = `\n### Privacy Note\nFor privacy reasons, I cannot display individual student rankings. However, I can provide aggregate performance data:\n\n`;
      
      const metrics = `### Performance Metrics\n- **Average Quiz Score:** ${context.lmsAvgQuizScore || 0}%\n- **Average Assignment Grade:** ${context.lmsAvgAssignmentGrade || 0}%\n- **AI Tutor Average Score:** ${context.aiTutorAverageScore || 0}%\n- **Completion Rate:** ${context.completionRate || 0}%`;
      
      const insights = mentionsTop 
        ? `\n\n### High Performance Indicators\n- Students scoring above ${Math.max(context.lmsAvgQuizScore || 0, context.lmsAvgAssignmentGrade || 0) + 10}% show excellent understanding\n- High completion rates indicate strong engagement\n- Consider advanced challenges for top performers`
        : `\n\n### Support Recommendations\n- Students scoring below ${Math.max(context.lmsAvgQuizScore || 0, context.lmsAvgAssignmentGrade || 0) - 10}% may need additional help\n- Low completion rates suggest engagement issues\n- Provide targeted support and additional resources`;
      
      return `${header}${note}${metrics}${insights}`;
    }

    // Handle comparison queries
    if (mentionsComparison && (mentionsThisMonth || mentionsLastMonth)) {
      return `## Comparison Analysis\n\n### Current Limitations\nI don't have historical comparison data available at the moment. However, I can provide current metrics:\n\n### Current Month Metrics\n- **Active Users:** ${context.activeUsersThisMonth || 0}\n- **New Users:** ${context.newUsersThisMonth || 0}\n- **Total Platform Actions:** ${context.totalSuccessfulActions || 0}\n- **Engagement Rate:** ${context.engagementRate || 0}%\n\n### Recommendations\n- Track these metrics monthly for future comparisons\n- Set up automated reporting for trend analysis\n- Consider implementing dashboard widgets for real-time comparisons\n\n**Note**: Ask me again next month for month-over-month comparisons!`;
    }

    // Handle filtered search queries (students in specific courses, etc.)
    if ((mentionsStudents || mentionsTeachers || mentionsUsers) && (mentionsIn || hasCourseName || mentionsSpecific)) {
      const header = '## Filtered Search Results';
      
      // Extract potential course name from query
      const courseMatch = q.match(/\b(math|biology|english|science|history|physics|chemistry|literature|art|music|programming|computer|language|course)\b/i);
      const courseName = courseMatch ? courseMatch[0] : 'specific course';
      
      const limitation = `\n### Current Limitations\nI don't have access to course-specific enrollment data at the moment. However, I can provide general information:\n\n`;
      
      let generalInfo = '';
      if (mentionsStudents) {
        generalInfo = `### Available Student Data\n- **Total Students:** ${context.userRoles?.student || 0}\n- **Active Students:** ${context.activeUsersThisMonth || 0}\n- I can show you all students, but cannot filter by specific courses yet\n\n### What I Can Do Instead\n- Show complete student list: "Show me all students"\n- Display student activity: "Who logged in today?"\n- Provide performance data: "What's the average student performance?"`;
      } else if (mentionsTeachers) {
        generalInfo = `### Available Teacher Data\n- **Total Teachers:** ${context.userRoles?.teacher || 0}\n- I can show you all teachers, but cannot filter by course assignments yet\n\n### What I Can Do Instead\n- Show complete teacher list: "Show me all teachers"\n- Display teacher activity: "Which teachers are active?"\n- Provide teaching metrics: "Show me instructor analytics"`;
      } else {
        generalInfo = `### Available User Data\n- **Total Users:** ${context.totalUsers || 0}\n- **Students:** ${context.userRoles?.student || 0}\n- **Teachers:** ${context.userRoles?.teacher || 0}\n- **Admins:** ${context.userRoles?.admin || 0}\n\n### What I Can Do Instead\n- Show all users by role: "Show me all students/teachers/admins"\n- Display activity data: "Who logged in today?"\n- Provide comprehensive analytics: "Give me user details"`;
      }
      
      const futureFeature = `\n\n### Coming Soon\nCourse-specific filtering is a planned feature. In the meantime, you can:\n1. Export the complete user list\n2. Filter manually in your preferred application\n3. Contact administrators for course-specific reports`;
      
      return `${header}${limitation}${generalInfo}${futureFeature}`;
    }

    // Handle help and guidance queries
    if (mentionsHelp || mentionsWhat) {
      if (mentionsAITutor) {
        return `## AI Tutor Help\n\n### What is AI Tutor?\nAI Tutor is our intelligent learning system with 7 progressive stages (Stage 0-6) that adapts to your learning pace.\n\n### Key Features\n- **Speech Recognition**: Practice pronunciation with real-time feedback\n- **Progressive Learning**: 7 stages from beginner to advanced\n- **Personalized Content**: Adapts to your learning style\n- **Milestone Tracking**: Celebrate achievements and progress\n\n### How to Use\n1. Start with Stage 0 if you're a beginner\n2. Complete exercises and practice sessions\n3. Unlock new stages as you progress\n4. Use both English and Urdu for better learning\n\n### Getting Help\n- Ask me "Show me my AI Tutor progress"\n- Ask "What's my current learning stage?"\n- Request "AI Tutor performance report"`;
      } else if (mentionsCourses) {
        return `## Course Help\n\n### Available Course Features\n- **Course Enrollment**: Browse and enroll in available courses\n- **Content Access**: View lessons, assignments, and materials\n- **Progress Tracking**: Monitor your completion status\n- **Discussions**: Participate in course forums\n\n### Getting Course Information\n- Ask me "Show me course analytics"\n- Request "What courses are available?"\n- Ask "How many students are enrolled?"\n\n### Course Management (Instructors)\n- Create and publish courses\n- Manage enrollments\n- Grade assignments and quizzes\n- Track student progress`;
      } else {
        return `## Reports AI Help Guide\n\n### What I Can Do\n- **User Analytics**: Show student, teacher, and admin information\n- **Performance Reports**: Display grades, scores, and completion rates\n- **Activity Tracking**: Monitor logins and platform usage\n- **Course Analytics**: Enrollment, completion, and engagement data\n- **AI Tutor Reports**: Learning progress and milestone tracking\n\n### How to Ask Questions\n- Be specific: "Show me today's active students"\n- Use natural language: "How many teachers do we have?"\n- Ask for comparisons: "Compare this month vs last month"\n- Request details: "Give me user performance data"\n\n### Example Queries\n- "Who logged in today?"\n- "Show me all students"\n- "What's the average quiz score?"\n- "How many courses are published?"\n- "Give me AI Tutor analytics"`;
      }
    }

    return null;
  }

  /**
   * Extract timeframe from user query
   */
  private static extractTimeframe(query: string): string | undefined {
    const queryLower = query.toLowerCase();
    
    console.log('🔍 extractTimeframe called with query:', query);
    console.log('🔍 queryLower:', queryLower);
    
    // Check for 24 hour patterns FIRST (higher priority)
    if (queryLower.includes('24 hour') || queryLower.includes('24 hrs') || 
        queryLower.includes('past 24') || queryLower.includes('last 24') ||
        queryLower.includes('24h') || queryLower.includes('in past 24')) {
      console.log('✅ Matched 24_hours pattern');
      return '24_hours';
    }
    
    // Check for specific timeframes
    if (queryLower.includes('today') || queryLower.includes('for today')) {
      console.log('✅ Matched today pattern');
      return 'today';
    }
    if (queryLower.includes('yesterday')) {
      console.log('✅ Matched yesterday pattern');
      return 'yesterday';
    }
    if (queryLower.includes('this week') || queryLower.includes('weekly') || queryLower.includes('current week')) {
      console.log('✅ Matched this_week pattern');
      return 'this_week';
    }
    if (queryLower.includes('this month') || queryLower.includes('monthly') || queryLower.includes('current month')) {
      console.log('✅ Matched this_month pattern');
      return 'this_month';
    }
    if (queryLower.includes('last week') || queryLower.includes('previous week')) {
      console.log('✅ Matched last_week pattern');
      return 'last_week';
    }
    if (queryLower.includes('last month') || queryLower.includes('previous month')) {
      console.log('✅ Matched last_month pattern');
      return 'last_month';
    }
    if (queryLower.includes('this year') || queryLower.includes('current year') || queryLower.includes('yearly')) {
      console.log('✅ Matched this_year pattern');
      return 'this_year';
    }
    if (queryLower.includes('last year') || queryLower.includes('previous year')) {
      console.log('✅ Matched last_year pattern');
      return 'last_year';
    }
    if (queryLower.includes('quarterly') || queryLower.includes('this quarter') || queryLower.includes('current quarter')) {
      console.log('✅ Matched this_quarter pattern');
      return 'this_quarter';
    }
    if (queryLower.includes('last quarter') || queryLower.includes('previous quarter')) {
      console.log('✅ Matched last_quarter pattern');
      return 'last_quarter';
    }
    
    console.log('❌ No timeframe pattern matched');
    return undefined; // Default to all-time
  }

  /**
   * REMOVED: callOpenAI method that exposed VITE_OPENAI_API_KEY in frontend bundle
   * OpenAI API calls should only be made through secure backend Edge Functions
   * This method has been removed for security reasons.
   */

  /**
   * Fallback structured responses using real database data (used when OpenAI unavailable)
   */
  private static generateMockAIResponse(query: string, context: ReportContext): {
    content: string;
    data: any;
  } {
    const queryLower = query.toLowerCase();
    const currentDate = new Date().toLocaleDateString();
    
    // Ensure we only use real data - throw error if no real data available
    if (!context || context.totalUsers === 0) {
      return {
        content: `❌ **No Real Data Available**

I cannot generate this report because there is no real database data available. This system is configured to use only production data.

**To see reports, you need:**
- Real user registrations in the database
- Actual course data 
- User activity and session data

Please ensure your database has real data or contact your administrator.

*Production-ready system - No mock data used*`,
        data: {
          error: 'No real data available',
          totalUsers: 0,
          totalCourses: 0,
          dataSource: 'real_database_only'
        }
      };
    }
    
    const dataNote = `*Analysis based on real platform data as of ${currentDate}*`;
    
    // Platform-specific detection - check for explicit platform tags first
    const isAITutorQuery = queryLower.includes('[ai tutor platform analysis only]') || 
                          (queryLower.includes('ai tutor') && !queryLower.includes('exclude ai tutor'));
    
    const isLMSQuery = queryLower.includes('[lms platform analysis only]') || 
                      (queryLower.includes('lms') && !queryLower.includes('ai tutor')) ||
                      (queryLower.includes('course') && !queryLower.includes('ai tutor')) ||
                      (queryLower.includes('student') && !queryLower.includes('ai tutor'));
    
    // AI Tutor specific queries - using RICH real data from analytics tables
    if (isAITutorQuery && !isLMSQuery) {
      const aiSessions = context.aiTutorSessions || 0;
      const aiActiveUsers = context.aiTutorActiveUsers || 0;
      const aiTotalTime = context.aiTutorTotalTime || 0;
      const aiAvgScore = context.aiTutorAverageScore || 0;
      const aiCompletionRate = context.aiTutorCompletionRate || 0;
      const exercisesCompleted = context.aiTutorExercisesCompleted || 0;
      const exercisesAttempted = context.aiTutorExercisesAttempted || 0;
      const progressPercentage = context.aiTutorProgressPercentage || 0;
      const streakDays = context.aiTutorStreakDays || 0;
      
      const engagementPercentage = context.totalUsers > 0 ? Math.round((aiActiveUsers / context.totalUsers) * 100) : 0;
      const avgSessionTime = aiSessions > 0 ? Math.round(aiTotalTime / aiSessions) : 0;
      
      return {
        content: `🤖 **AI Tutor System Analytics (Real Data)**

📊 **AI Tutor Performance Metrics:**
- Total Learning Sessions: ${aiSessions.toLocaleString()}
- Active AI Tutor Users: ${aiActiveUsers.toLocaleString()} (${engagementPercentage}% of platform)
- Total Learning Time: ${Math.round(aiTotalTime / 60).toLocaleString()} hours
- Average Session Duration: ${avgSessionTime} minutes
- Average Learning Score: ${aiAvgScore}%

🎯 **Learning Achievement Data:**
- Exercise Completion Rate: ${aiCompletionRate}%
- Total Exercises Completed: ${exercisesCompleted.toLocaleString()}
- Total Exercises Attempted: ${exercisesAttempted.toLocaleString()}
- Average Progress Percentage: ${progressPercentage}%
- Total Learning Streak Days: ${streakDays.toLocaleString()}

📈 **Platform Integration:**
- Total Platform Users: ${context.totalUsers.toLocaleString()}
- New Users This Month: ${context.newUsersThisMonth || 0}
- Overall Platform Engagement: ${context.engagementRate}%
- User Roles: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count}`).join(', ') || 'No role data'}

💡 **AI Tutor Insights:**
- ${aiActiveUsers > 0 ? `${aiActiveUsers} users actively using AI Tutor this month` : 'No active AI Tutor users this month'}
- ${aiSessions > 0 ? `Average of ${Math.round(aiSessions / (aiActiveUsers || 1))} sessions per active user` : 'No session data available'}
- ${aiAvgScore > 0 ? `Learning performance at ${aiAvgScore}% average score` : 'No performance data available'}
- ${exercisesCompleted > 0 ? `${exercisesCompleted} exercises completed successfully` : 'No completed exercises recorded'}

**Data Quality Assessment:**
- AI Tutor Data: ${context.dataQuality?.aiTutorDataComplete ? '✅ Complete and accurate' : '⚠️ Limited or no AI Tutor data'}
- User Data: ${context.dataQuality?.userDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Confidence Score: ${context.dataQuality?.confidenceScore || 0}%
- Last Updated: ${context.lastUpdated || 'Unknown'}

**Production Insights:**
${aiActiveUsers === 0 ? '⚠️ No AI Tutor activity detected - check system functionality' : `✅ ${aiActiveUsers} active AI Tutor users`}
${aiSessions === 0 ? '⚠️ No learning sessions recorded - verify data collection' : `✅ ${aiSessions} learning sessions tracked`}
${aiAvgScore === 0 ? '⚠️ No performance scores available' : aiAvgScore >= 70 ? '✅ Strong learning performance scores' : '📈 Learning scores show room for improvement'}

${dataNote}`,
        data: {
          aiTutorSessions: aiSessions,
          aiTutorActiveUsers: aiActiveUsers,
          aiTutorTotalTime: aiTotalTime,
          aiTutorAverageScore: aiAvgScore,
          aiTutorCompletionRate: aiCompletionRate,
          exercisesCompleted: exercisesCompleted,
          exercisesAttempted: exercisesAttempted,
          progressPercentage: progressPercentage,
          streakDays: streakDays,
          dataSource: 'real_ai_tutor_analytics',
          lastUpdated: context.lastUpdated
        }
      };
    }
    
    // LMS specific queries - using separated LMS data
    if (isLMSQuery && !isAITutorQuery) {
      const lmsActiveUsers = context.lmsActiveUsers || 0;
      const lmsCompletionRate = context.lmsCompletionRate || 0;
      const courseToStudentRatio = context.totalCourses > 0 ? Math.round(context.totalUsers / context.totalCourses) : 0;
      const lmsEngagementPercentage = context.totalUsers > 0 ? Math.round((lmsActiveUsers / context.totalUsers) * 100) : 0;
      
      return {
        content: `📚 **LMS Platform Analytics (Real Data)**

📖 **LMS Performance Metrics:**
- Total Platform Users: ${context.totalUsers.toLocaleString()}
- LMS Active Users: ${lmsActiveUsers.toLocaleString()} (${lmsEngagementPercentage}% of platform)
- Published Courses: ${context.totalCourses} courses
- LMS Completion Rate: ${lmsCompletionRate}%
- Course-to-Student Ratio: ${courseToStudentRatio}:1

📈 **Course Data:**
- Available Courses: ${context.popularCourses?.join(', ') || 'No published courses available'}
- Most Popular Course: ${context.popularCourses?.[0] || 'No course data available'}
- Course Catalog Size: ${context.totalCourses} published courses

👥 **User Demographics:**
- New Users This Month: ${context.newUsersThisMonth || 0}
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count} users`).join(', ') || 'No role data available'}
- Overall Platform Engagement: ${context.engagementRate}%

💡 **LMS vs AI Tutor Comparison:**
- LMS Active Users: ${lmsActiveUsers} users
- AI Tutor Active Users: ${context.aiTutorActiveUsers || 0} users  
- LMS Completion Rate: ${lmsCompletionRate}%
- AI Tutor Completion Rate: ${context.aiTutorCompletionRate || 0}%

**Data Quality Assessment:**
- LMS Data: ${context.dataQuality?.lmsDataComplete ? '✅ Complete and accurate' : '⚠️ Limited or no LMS activity data'}
- Course Data: ${context.dataQuality?.courseDataComplete ? '✅ Complete' : '⚠️ Limited'}
- User Data: ${context.dataQuality?.userDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Confidence Score: ${context.dataQuality?.confidenceScore || 0}%

**Production Insights:**
${lmsActiveUsers === 0 ? '⚠️ No LMS activity detected this month' : `✅ ${lmsActiveUsers} users actively using LMS`}
${context.totalCourses === 0 ? '⚠️ No published courses available' : `✅ ${context.totalCourses} courses published and available`}
${lmsCompletionRate === 0 ? '⚠️ No course completions tracked' : lmsCompletionRate >= 60 ? '✅ Strong course completion rates' : '📈 Course completion rates need improvement'}

**Strategic Recommendations:**
- ${lmsActiveUsers < (context.aiTutorActiveUsers || 0) ? 'LMS engagement is lower than AI Tutor - consider integration strategies' : 'LMS showing strong engagement'}
- ${context.totalCourses < 5 ? 'Expand course catalog to provide more learning options' : 'Good course variety available'}
- ${lmsCompletionRate < 50 ? 'Review course structure and difficulty to improve completion rates' : 'Maintain current course quality standards'}

${dataNote}`,
        data: {
          lmsActiveUsers: lmsActiveUsers,
          lmsCompletionRate: lmsCompletionRate,
          totalCourses: context.totalCourses,
          totalUsers: context.totalUsers,
          engagementRate: context.engagementRate,
          popularCourses: context.popularCourses,
          userRoles: context.userRoles,
          dataSource: 'real_lms_data',
          lastUpdated: context.lastUpdated
        }
      };
    }

    // Combined platform analysis - using ONLY real data
    if (queryLower.includes('both') || queryLower.includes('combined') || queryLower.includes('compare')) {
      const aiActiveUsers = context.activeUsersThisMonth || 0;
      const lmsUsers = context.totalUsers;
      const activePercentage = context.totalUsers > 0 ? Math.round((aiActiveUsers / context.totalUsers) * 100) : 0;
      
      return {
        content: `🔄 **Combined Platform Analytics**

📊 **Cross-Platform Overview:**
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Active Users This Month: ${aiActiveUsers} (${activePercentage}%)
- New Users This Month: ${context.newUsersThisMonth || 0}
- Total Published Courses: ${context.totalCourses}

⚡ **Platform Performance:**
- Course Completion Rate: ${context.completionRate}%
- Overall Engagement Rate: ${context.engagementRate}%
- Average Session Duration: ${context.averageSessionDuration || 0} minutes
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count}`).join(', ') || 'No role data'}

📈 **Real Data Quality:**
- Data Confidence Score: ${context.dataQuality?.confidenceScore || 0}%
- User Data: ${context.dataQuality?.userDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Course Data: ${context.dataQuality?.courseDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Engagement Data: ${context.dataQuality?.engagementDataComplete ? '✅ Complete' : '⚠️ Limited'}

💡 **Strategic Insights:**
- Platform serves ${context.totalUsers} total users across AI Tutor and LMS systems
- ${context.engagementRate > 50 ? 'Strong user engagement indicates healthy platform adoption' : 'User engagement could be improved through better onboarding'}
- ${context.completionRate > 60 ? 'High completion rates show effective course design' : 'Course completion rates need improvement'}
- Available courses: ${context.popularCourses?.join(', ') || 'No course data available'}

**Data-Driven Recommendations:**
- ${context.totalUsers < 100 ? 'Focus on user acquisition and growth strategies' : 'Optimize for scale and user retention'}
- ${context.engagementRate < 30 ? 'Implement engagement improvement initiatives' : 'Maintain current engagement levels'}
- ${context.completionRate < 50 ? 'Review course content and difficulty progression' : 'Consider advanced learning paths'}
- Last data update: ${context.lastUpdated || 'Unknown'}

${dataNote}`,
        data: {
          totalUsers: context.totalUsers,
          activeUsersThisMonth: aiActiveUsers,
          newUsersThisMonth: context.newUsersThisMonth,
          totalCourses: context.totalCourses,
          completionRate: context.completionRate,
          engagementRate: context.engagementRate,
          dataSource: 'real_database',
          lastUpdated: context.lastUpdated,
          dataQuality: context.dataQuality
        }
      };
    }
    
    // Timeline/Date-based queries - using ONLY real data
    if (queryLower.includes('month') || queryLower.includes('week') || queryLower.includes('timeline') || queryLower.includes('period')) {
      const period = queryLower.includes('week') ? 'this week' : 
                   queryLower.includes('month') ? 'this month' : 
                   'the selected period';
      
      return {
        content: `📊 **Platform Performance Report for ${period.charAt(0).toUpperCase() + period.slice(1)}**

👥 **User Metrics (Real Data):**
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- New Users This Month: ${context.newUsersThisMonth || 0}
- Active Users This Month: ${context.activeUsersThisMonth || 0}
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count}`).join(', ') || 'No role data'}

📚 **Course Activity:**
- Total Published Courses: ${context.totalCourses}
- Course Completion Rate: ${context.completionRate}%
- Average Session Duration: ${context.averageSessionDuration || 0} minutes
- Available Courses: ${context.popularCourses?.join(', ') || 'No course data available'}

📈 **Engagement Insights:**
- Platform Engagement Rate: ${context.engagementRate}%
- Data Quality Score: ${context.dataQuality?.confidenceScore || 0}%
- Time Range: ${context.timeRange || 'Current Month'}
- Last Updated: ${context.lastUpdated || 'Unknown'}

**Real Data Quality Status:**
- ${context.dataQuality?.userDataComplete ? '✅ User data is complete and accurate' : '⚠️ Limited user data available'}
- ${context.dataQuality?.courseDataComplete ? '✅ Course data is complete and accurate' : '⚠️ Limited course data available'}
- ${context.dataQuality?.engagementDataComplete ? '✅ Engagement data is complete and accurate' : '⚠️ Limited engagement data available'}

**Key Insights:**
- User engagement is ${context.engagementRate > 70 ? 'strong' : context.engagementRate > 30 ? 'moderate' : 'needs improvement'} based on real platform data
- Course completion rates show ${context.completionRate > 60 ? 'healthy' : 'room for improvement'} learning outcomes
- ${context.totalUsers < 50 ? 'Platform is in growth phase - focus on user acquisition' : 'Platform has established user base - focus on retention'}

${dataNote}`,
        data: {
          totalUsers: context.totalUsers,
          newUsersThisMonth: context.newUsersThisMonth,
          activeUsersThisMonth: context.activeUsersThisMonth,
          engagementRate: context.engagementRate,
          completionRate: context.completionRate,
          dataSource: 'real_database',
          timeRange: context.timeRange,
          lastUpdated: context.lastUpdated
        }
      };
    }
    
    // User-focused queries - using ONLY real data
    if (queryLower.includes('user') || queryLower.includes('student') || queryLower.includes('registration')) {
      return {
        content: `👥 **User Analytics Report (Real Database Data)**

📊 **Current User Base:**
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Active Users This Month: ${context.activeUsersThisMonth || 0}
- New Users This Month: ${context.newUsersThisMonth || 0}
- User Engagement Rate: ${context.engagementRate}%

📈 **User Demographics:**
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count} users`).join(', ') || 'No role data available'}
- Average Session Duration: ${context.averageSessionDuration || 0} minutes
- Course Completion Rate: ${context.completionRate}%

🎯 **Real Data Quality:**
- Data Confidence Score: ${context.dataQuality?.confidenceScore || 0}%
- User Data Status: ${context.dataQuality?.userDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Last Updated: ${context.lastUpdated || 'Unknown'}
- Time Range: ${context.timeRange || 'Current Month'}

**Data-Driven Insights:**
- ${context.totalUsers > 0 ? `Platform has ${context.totalUsers} registered users` : 'No registered users in database'}
- ${context.activeUsersThisMonth > 0 ? `${context.activeUsersThisMonth} users were active this month` : 'No active users recorded this month'}
- ${context.engagementRate > 50 ? 'Strong user engagement indicates healthy platform adoption' : 'User engagement could be improved'}

**Production-Ready Recommendations:**
- ${context.totalUsers < 50 ? 'Focus on user acquisition and marketing campaigns' : 'Optimize for user retention and satisfaction'}
- ${context.engagementRate < 30 ? 'Implement user onboarding improvements' : 'Maintain current engagement levels'}
- ${context.newUsersThisMonth === 0 ? 'No new user registrations - review marketing strategies' : `${context.newUsersThisMonth} new users acquired this month`}

${dataNote}`,
        data: {
          totalUsers: context.totalUsers,
          activeUsersThisMonth: context.activeUsersThisMonth,
          newUsersThisMonth: context.newUsersThisMonth,
          engagementRate: context.engagementRate,
          userRoles: context.userRoles,
          dataSource: 'real_database',
          lastUpdated: context.lastUpdated
        }
      };
    }
    
    // Course-focused queries - using ONLY real data
    if (queryLower.includes('course') || queryLower.includes('lesson') || queryLower.includes('content') || queryLower.includes('performance')) {
      return {
        content: `📚 **Course Performance Analysis (Real Database Data)**

📖 **Course Overview:**
- Total Published Courses: ${context.totalCourses}
- Average Completion Rate: ${context.completionRate}%
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Active Users This Month: ${context.activeUsersThisMonth || 0}

🏆 **Available Courses:**
${context.popularCourses?.map((course, i) => `${i + 1}. ${course}`).join('\n') || 'No course data available in database'}

📊 **Real Engagement Metrics:**
- Average Session Duration: ${context.averageSessionDuration || 0} minutes
- Platform Engagement Rate: ${context.engagementRate}%
- New Users This Month: ${context.newUsersThisMonth || 0}
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count}`).join(', ') || 'No role data'}

💡 **Data Quality & Insights:**
- Data Confidence Score: ${context.dataQuality?.confidenceScore || 0}%
- Course Data Status: ${context.dataQuality?.courseDataComplete ? '✅ Complete and accurate' : '⚠️ Limited course data available'}
- Last Updated: ${context.lastUpdated || 'Unknown'}
- Time Range: ${context.timeRange || 'Current Month'}

**Production-Ready Analysis:**
- ${context.totalCourses > 0 ? `Platform has ${context.totalCourses} published courses` : 'No published courses in database'}
- ${context.completionRate > 65 ? 'Course completion rates are healthy' : context.completionRate > 0 ? 'Course completion rates need improvement' : 'No completion data available'}
- ${context.popularCourses?.length > 0 ? `Available courses: ${context.popularCourses.join(', ')}` : 'No course content data available'}

**Real Data Recommendations:**
- ${context.totalCourses === 0 ? 'Priority: Add course content to the platform' : 'Continue developing course content'}
- ${context.completionRate < 50 && context.completionRate > 0 ? 'Review course difficulty and user engagement strategies' : 'Monitor course performance metrics'}
- ${context.dataQuality?.courseDataComplete ? 'Course data is complete - focus on optimization' : 'Improve course data collection and tracking'}

${dataNote}`,
        data: {
          totalCourses: context.totalCourses,
          completionRate: context.completionRate,
          popularCourses: context.popularCourses,
          totalUsers: context.totalUsers,
          engagementRate: context.engagementRate,
          dataSource: 'real_database',
          dataQuality: context.dataQuality,
          lastUpdated: context.lastUpdated
        }
      };
    }
    
    // Engagement-focused queries - using ONLY real data
    if (queryLower.includes('engagement') || queryLower.includes('activity') || queryLower.includes('interaction')) {
      return {
        content: `🎯 **User Engagement Analysis (Real Database Data)**

📱 **Current Engagement Metrics:**
- Overall Engagement Rate: ${context.engagementRate}%
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Active Users This Month: ${context.activeUsersThisMonth || 0}
- Average Session Duration: ${context.averageSessionDuration || 0} minutes

⏱️ **Real Activity Data:**
- New Users This Month: ${context.newUsersThisMonth || 0}
- Course Completion Rate: ${context.completionRate}%
- Total Published Courses: ${context.totalCourses}
- Time Range: ${context.timeRange || 'Current Month'}

💬 **Platform Metrics:**
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count} users`).join(', ') || 'No role data available'}
- Available Courses: ${context.popularCourses?.join(', ') || 'No course data available'}

📈 **Data Quality & Trends:**
- Data Confidence Score: ${context.dataQuality?.confidenceScore || 0}%
- Engagement Data Status: ${context.dataQuality?.engagementDataComplete ? '✅ Complete and accurate' : '⚠️ Limited engagement data'}
- Last Updated: ${context.lastUpdated || 'Unknown'}

**Real Data Insights:**
- ${context.engagementRate > 70 ? 'Strong user engagement indicates healthy platform adoption' : context.engagementRate > 30 ? 'Moderate engagement with room for improvement' : 'Low engagement - needs immediate attention'}
- ${context.activeUsersThisMonth > 0 ? `${context.activeUsersThisMonth} users were active this month` : 'No active users recorded this month'}
- ${context.totalUsers > 0 ? `Platform serves ${context.totalUsers} total registered users` : 'No users registered in the system'}

**Production-Ready Recommendations:**
- ${context.engagementRate < 30 ? 'Priority: Implement user engagement improvement strategies' : 'Continue monitoring engagement metrics'}
- ${context.activeUsersThisMonth === 0 ? 'Critical: No active users detected - review platform accessibility' : 'Monitor user activity trends'}
- ${context.dataQuality?.engagementDataComplete ? 'Engagement tracking is complete' : 'Improve engagement data collection systems'}

${dataNote}`,
        data: {
          engagementRate: context.engagementRate,
          totalUsers: context.totalUsers,
          activeUsersThisMonth: context.activeUsersThisMonth,
          sessionDuration: context.averageSessionDuration || 0,
          dataSource: 'real_database',
          dataQuality: context.dataQuality,
          lastUpdated: context.lastUpdated
        }
      };
    }
    
    // General/Default response - using ONLY real data
    return {
      content: `📊 **Production-Ready Platform Overview**

Thank you for your question: "${query}"

🎯 **Current Real Data Status:**
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Published Courses: ${context.totalCourses}
- Platform Engagement Rate: ${context.engagementRate}%
- Course Completion Rate: ${context.completionRate}%
- Active Users This Month: ${context.activeUsersThisMonth || 0}
- New Users This Month: ${context.newUsersThisMonth || 0}

📊 **Data Quality Assessment:**
- Data Confidence Score: ${context.dataQuality?.confidenceScore || 0}%
- User Data: ${context.dataQuality?.userDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Course Data: ${context.dataQuality?.courseDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Engagement Data: ${context.dataQuality?.engagementDataComplete ? '✅ Complete' : '⚠️ Limited'}
- Last Updated: ${context.lastUpdated || 'Unknown'}

🤖 **AI Tutor & 📚 LMS Integration:**
- Production system serving real users with actual data
- AI Tutor: Personalized learning with tracked interactions
- LMS: Structured courses with completion tracking
- Real-time analytics from database queries

💡 **Available Real Data Reports:**

🤖 **AI Tutor Analysis:**
- "Show me AI Tutor session data and user interactions"
- "Analyze real tutoring effectiveness metrics"
- "AI platform usage patterns from database"

📚 **LMS Performance:**
- "Analyze actual course completion and enrollment data"
- "Real student engagement and progress metrics"
- "Course performance based on database records"

🔄 **Combined Analytics:**
- "Cross-platform user activity from real data"
- "Integrated learning outcomes analysis"
- "Production platform performance insights"

**Production Notes:**
- ${context.totalUsers === 0 ? '⚠️ No users in database - system needs real data' : `✅ ${context.totalUsers} real users tracked`}
- ${context.totalCourses === 0 ? '⚠️ No courses published - add content to generate reports' : `✅ ${context.totalCourses} courses available`}
- All metrics are calculated from live database queries

${dataNote}`,
      data: {
        totalUsers: context.totalUsers,
        totalCourses: context.totalCourses,
        engagementRate: context.engagementRate,
        completionRate: context.completionRate,
        activeUsersThisMonth: context.activeUsersThisMonth,
        newUsersThisMonth: context.newUsersThisMonth,
        dataSource: 'real_database',
        dataQuality: context.dataQuality,
        lastUpdated: context.lastUpdated,
        platforms: ['AI Tutor', 'LMS']
      }
    };
  }

  /**
   * Call OpenAI API through backend (currently disabled - using mock responses)
   * TODO: Enable when backend is deployed
   */
  /*
  private static async callOpenAI(messages: OpenAIMessage[]): Promise<{
    success: boolean;
    content: string;
    error?: string;
  }> {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.AI_REPORTS_ASSISTANT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          messages,
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorData}`);
      }

      const data = await response.json();
      
      return {
        success: true,
        content: data.response || data.message || 'No response received'
      };
      
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      return {
        success: false,
        content: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  */

  /**
   * Extract structured data from AI response
   */
  private static extractReportData(response: string): any {
    // This is a simple parser - in production, you might want more sophisticated parsing
    const metrics = {};
    
    // Look for common metrics patterns
    const patterns = [
      { name: 'totalUsers', regex: /Total Users[:\s]*([0-9,]+)/i },
      { name: 'newUsers', regex: /New Users[:\s]*([0-9,]+)/i },
      { name: 'engagementRate', regex: /Engagement Rate[:\s]*([0-9]+)%/i },
      { name: 'completionRate', regex: /Completion Rate[:\s]*([0-9]+)%/i },
      { name: 'activeUsers', regex: /Active Users[:\s]*([0-9,]+)/i },
      { name: 'coursesCompleted', regex: /Courses Completed[:\s]*([0-9,]+)/i }
    ];

    patterns.forEach(pattern => {
      const match = response.match(pattern.regex);
      if (match) {
        const value = match[1].replace(/,/g, '');
        (metrics as any)[pattern.name] = pattern.name.includes('Rate') ? 
          parseInt(value) : parseInt(value);
      }
    });

    return Object.keys(metrics).length > 0 ? metrics : null;
  }

  /**
   * Get active users for a specific timeframe (default: today)
   */
  static async getTodaysActiveUsers(page: number = 1, pageSize: number = 25, timeframe?: string): Promise<{
    users: any[];
    total: number;
    success: boolean;
  }> {
    try {
      console.log('🔍 getTodaysActiveUsers called with:', { page, pageSize, timeframe });
      
      const authToken = getAuthToken();
      if (!authToken) {
        console.log('❌ No auth token available');
        return { users: [], total: 0, success: false };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfaiauooxwvekdimfeuu.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/reports-context`);
      url.searchParams.append('list', 'active_today');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());
      if (timeframe) {
        url.searchParams.append('timeframe', timeframe);
      }
      
      console.log('🌐 Fetching from URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Response data:', { 
          hasActiveUsers: !!data.activeTodayList, 
          userCount: data.activeTodayList?.length || 0, 
          total: data.activeTodayTotal || 0 
        });
        
        return {
          users: data.activeTodayList || [],
          total: data.activeTodayTotal || 0,
          success: true
        };
      } else {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
      }
      
      return { users: [], total: 0, success: false };
    } catch (error) {
      console.error('❌ Error fetching today\'s active users:', error);
      return { users: [], total: 0, success: false };
    }
  }

  /**
   * Get detailed user list for any role or all users
   */
  static async getUserList(role?: string, search?: string, page: number = 1, pageSize: number = 25): Promise<{
    users: any[];
    total: number;
    success: boolean;
  }> {
    try {
      console.log('🔍 getUserList called with:', { role, search, page, pageSize });
      
      const authToken = getAuthToken();
      if (!authToken) {
        console.log('❌ No auth token available');
        return { users: [], total: 0, success: false };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfaiauooxwvekdimfeuu.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/reports-context`);
      url.searchParams.append('list', 'users');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());
      if (role) {
        url.searchParams.append('role', role);
      }
      if (search) {
        url.searchParams.append('search', search);
      }
      
      console.log('🌐 Fetching from URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Response data:', { 
          hasUserList: !!data.userList, 
          userCount: data.userList?.length || 0, 
          total: data.userTotal || 0 
        });
        
        return {
          users: data.userList || [],
          total: data.userTotal || 0,
          success: true
        };
      } else {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
      }
      
      return { users: [], total: 0, success: false };
    } catch (error) {
      console.error('❌ Error fetching user list:', error);
      return { users: [], total: 0, success: false };
    }
  }

  /**
   * Get detailed teacher list for specific queries
   */
  static async getTeacherList(search?: string, page: number = 1, pageSize: number = 25): Promise<{
    teachers: any[];
    total: number;
    success: boolean;
  }> {
    try {
      console.log('🔍 getTeacherList called with:', { search, page, pageSize });
      
      const authToken = getAuthToken();
      if (!authToken) {
        console.log('❌ No auth token available');
        return { teachers: [], total: 0, success: false };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfaiauooxwvekdimfeuu.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/reports-context`);
      url.searchParams.append('list', 'teachers');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());
      if (search) {
        url.searchParams.append('search', search);
      }
      
      console.log('🌐 Fetching from URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Response data:', { 
          hasTeacherList: !!data.teacherList, 
          teacherCount: data.teacherList?.length || 0, 
          total: data.teacherTotal || 0 
        });
        
        return {
          teachers: data.teacherList || [],
          total: data.teacherTotal || 0,
          success: true
        };
      } else {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
      }
      
      return { teachers: [], total: 0, success: false };
    } catch (error) {
      console.error('❌ Error fetching teacher list:', error);
      return { teachers: [], total: 0, success: false };
    }
  }

  /**
   * Get detailed student list for specific queries
   */
  static async getStudentList(search?: string, page: number = 1, pageSize: number = 25): Promise<{
    students: any[];
    total: number;
    success: boolean;
  }> {
    try {
      console.log('🔍 getStudentList called with:', { search, page, pageSize });
      
      const authToken = getAuthToken();
      if (!authToken) {
        console.log('❌ No auth token available');
        return { students: [], total: 0, success: false };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfaiauooxwvekdimfeuu.supabase.co';
      const url = new URL(`${supabaseUrl}/functions/v1/reports-context`);
      url.searchParams.append('list', 'students');
      url.searchParams.append('page', page.toString());
      url.searchParams.append('pageSize', pageSize.toString());
      if (search) {
        url.searchParams.append('search', search);
      }
      
      console.log('🌐 Fetching from URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Response data:', { 
          hasStudentList: !!data.studentList, 
          studentCount: data.studentList?.length || 0, 
          total: data.studentTotal || 0 
        });
        
        return {
          students: data.studentList || [],
          total: data.studentTotal || 0,
          success: true
        };
      } else {
        const errorText = await response.text();
        console.log('❌ Response error:', errorText);
      }
      
      return { students: [], total: 0, success: false };
    } catch (error) {
      console.error('❌ Error fetching student list:', error);
      return { students: [], total: 0, success: false };
    }
  }

  /**
   * Get platform context for AI responses with optional timeframe
   */
  static async getPlatformContext(timeframe: string | undefined = undefined, query?: string): Promise<ReportContext> {
    try {
      console.log('🚀 AI-Powered Context Fetching - ChatGPT Approach');
      console.log('🎯 Timeframe:', timeframe);
      console.log('📝 Query:', query);
      
      const authToken = getAuthToken();
      if (!authToken) {
        console.warn('No auth token available, using default context');
        return this.getDefaultContext();
      }

      // Call Supabase Edge Function directly
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yfaiauooxwvekdimfeuu.supabase.co';
      console.log('🔗 Using Supabase URL:', supabaseUrl);
      
      if (!supabaseUrl) {
        console.error('VITE_SUPABASE_URL not configured');
        return this.getDefaultContext();
      }
      
      const url = new URL(`${supabaseUrl}/functions/v1/reports-context`);
      
      // Add timeframe if provided
      if (timeframe) {
        url.searchParams.append('timeframe', timeframe);
        console.log('✅ Added timeframe to URL');
      }
      
      // 🚀 NEW AI-POWERED APPROACH: Send raw query instead of parsing it
      if (query) {
        url.searchParams.append('rawQuery', query);
        console.log('🧠 Added raw query for AI processing:', query);
      } else {
        console.log('📊 No query provided - will fetch comprehensive data');
      }
      
      // 🎯 CLEAN AI-POWERED APPROACH: No more pattern matching!
      console.log('🌐 Final URL:', url.toString());
      
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contextData = await response.json();
        console.log('✅ Real platform context loaded:', contextData);
        console.log('🎯 TimeRange from backend:', contextData.timeRange);
        console.log('👥 Teacher data in response:', { 
          hasTeacherList: !!contextData.teacherList, 
          teacherCount: contextData.teacherList?.length || 0,
          teacherTotal: contextData.teacherTotal || 0 
        });
        
        // Check if we got real data or empty data
        const hasRealData = contextData.totalUsers > 0 || contextData.totalCourses > 0;
        console.log('📊 Has real data:', hasRealData);
        
        return {
          totalUsers: contextData.totalUsers || 0,
          totalCourses: contextData.totalCourses || 0,
          engagementRate: contextData.engagementRate || 0,
          completionRate: Math.round(contextData.completionRate) || 0,
          timeRange: contextData.timeRange || 'All Time Data',
          averageSessionDuration: contextData.averageSessionDuration || 0,
          popularCourses: contextData.popularCourses || [],
          availableMetrics: contextData.availableMetrics || [],
          // CRITICAL: Include user roles data
          userRoles: contextData.userRoles || {},
          newUsersThisMonth: contextData.newUsersThisMonth || 0,
          activeUsersThisMonth: contextData.activeUsersThisMonth || 0,
          // Include user list data when available
          studentList: contextData.studentList || undefined,
          studentTotal: contextData.studentTotal || undefined,
          teacherList: contextData.teacherList || undefined,
          teacherTotal: contextData.teacherTotal || undefined,
          userList: contextData.userList || undefined,
          userTotal: contextData.userTotal || undefined,
          activeTodayList: contextData.activeTodayList || undefined,
          activeTodayTotal: contextData.activeTodayTotal || undefined,
          teacherCourses: contextData.teacherCourses || undefined,
          teacherCoursesTotal: contextData.teacherCoursesTotal || undefined,
          courseEnrollments: contextData.courseEnrollments || undefined,
          courseEnrollmentTotal: contextData.courseEnrollmentTotal || undefined,
          courseDetails: contextData.courseDetails || undefined,
          allCoursesList: contextData.allCoursesList || undefined,
          allCoursesTotal: contextData.allCoursesTotal || undefined,
          
          // Include all the AI Tutor and LMS specific fields
          aiTutorActiveUsers: contextData.aiTutorActiveUsers || 0,
          aiTutorSessions: contextData.aiTutorSessions || 0,
          aiTutorTotalTime: contextData.aiTutorTotalTime || 0,
          aiTutorAverageScore: contextData.aiTutorAverageScore || 0,
          aiTutorCompletionRate: contextData.aiTutorCompletionRate || 0,
          aiTutorExercisesCompleted: contextData.aiTutorExercisesCompleted || 0,
          aiTutorExercisesAttempted: contextData.aiTutorExercisesAttempted || 0,
          aiTutorProgressPercentage: contextData.aiTutorProgressPercentage || 0,
          aiTutorStreakDays: contextData.aiTutorStreakDays || 0,
          aiTutorUrduUsage: contextData.aiTutorUrduUsage || 0,
          aiTutorMilestones: contextData.aiTutorMilestones || 0,
          aiTutorMilestoneTypes: contextData.aiTutorMilestoneTypes || [],
          aiTutorUnlocks: contextData.aiTutorUnlocks || 0,
          aiTutorStagesUnlocked: contextData.aiTutorStagesUnlocked || 0,
          aiTutorCompletedStages: contextData.aiTutorCompletedStages || 0,
          aiTutorAvgStageScore: contextData.aiTutorAvgStageScore || 0,
          aiTutorCompletedTopics: contextData.aiTutorCompletedTopics || 0,
          aiTutorTopicUrduUsage: contextData.aiTutorTopicUrduUsage || 0,
          aiTutorAvgTopicTime: contextData.aiTutorAvgTopicTime || 0,
          aiTutorWeeklyMilestones: contextData.aiTutorWeeklyMilestones || 0,
          aiTutorConsistencyScore: contextData.aiTutorConsistencyScore || 0,
          lmsActiveUsers: contextData.lmsActiveUsers || 0,
          lmsCompletionRate: contextData.lmsCompletionRate || 0,
          lmsEnrollments: contextData.lmsEnrollments || 0,
          lmsNewEnrollments: contextData.lmsNewEnrollments || 0,
          lmsTotalQuizzes: contextData.lmsTotalQuizzes || 0,
          lmsAvgQuizScore: contextData.lmsAvgQuizScore || 0,
          lmsManualGradingRequired: contextData.lmsManualGradingRequired || 0,
          lmsTotalSections: contextData.lmsTotalSections || 0,
          lmsTotalLessons: contextData.lmsTotalLessons || 0,
          lmsTotalContent: contextData.lmsTotalContent || 0,
          lmsContentTypes: contextData.lmsContentTypes || [],
          // LMS Discussion data
          lmsTotalDiscussions: contextData.lmsTotalDiscussions || 0,
          lmsTotalReplies: contextData.lmsTotalReplies || 0,
          lmsDiscussionParticipants: contextData.lmsDiscussionParticipants || 0,
          // LMS Assignment data
          lmsAssignmentsSubmitted: contextData.lmsAssignmentsSubmitted || 0,
          lmsAssignmentsGraded: contextData.lmsAssignmentsGraded || 0,
          lmsAvgAssignmentGrade: contextData.lmsAvgAssignmentGrade || 0,
          // Session and activity data
          activeSessions: contextData.activeSessions || 0,
          totalSuccessfulActions: contextData.totalSuccessfulActions || 0,
          uniqueActiveUsersFromSessions: contextData.uniqueActiveUsersFromSessions || 0,
          uniqueActiveUsersFromLogs: contextData.uniqueActiveUsersFromLogs || 0,
          totalPracticeSessions: contextData.totalPracticeSessions || 0,
          lastUpdated: contextData.lastUpdated,
          // Add data quality information
          dataQuality: {
            userDataComplete: hasRealData,
            courseDataComplete: (contextData.totalCourses || 0) > 0,
            engagementDataComplete: (contextData.engagementRate || 0) > 0,
            aiTutorDataComplete: (contextData.aiTutorActiveUsers || 0) > 0,
            lmsDataComplete: (contextData.lmsActiveUsers || 0) > 0,
            confidenceScore: hasRealData ? 0.9 : 0.1,
            note: hasRealData ? 'Real data successfully loaded from database' : 'Data connection available but no records found - database may be empty'
          }
        };
      } else {
        const errorText = await response.text();
        console.warn('❌ API call failed, using default context. Status:', response.status);
        console.warn('❌ Error response:', errorText);
        console.warn('❌ Request URL:', url.toString());
        console.warn('❌ Auth token present:', !!authToken);
        return this.getDefaultContext();
      }
    } catch (error) {
      console.error('Error fetching platform context:', error);
      console.error('This indicates a connection issue with the reports-context Edge Function');
      return this.getDefaultContext();
    }
  }

  /**
   * Default context when API is not available - DEBUGGING MODE
   * This will help us see what's happening with the real connection
   */
  private static getDefaultContext(): ReportContext {
    console.log('🔍 Using default context - this means the Edge Function call failed');
    return {
      totalUsers: 0,
      totalCourses: 0,
      engagementRate: 0,
      completionRate: 0,
      timeRange: 'Current Month',
      averageSessionDuration: 0,
      popularCourses: [],
      availableMetrics: [
        'AI Tutor Sessions',
        'AI Tutor Progress', 
        'Exercise Completion',
        'Learning Streaks',
        'User Engagement',
        'Course Progress',
        'Session Duration',
        'Learning Scores',
        'Platform Analytics',
        'User Growth'
      ],
      // Empty data to debug connection
      activeUsersThisMonth: 0,
      newUsersThisMonth: 0,
      totalPracticeSessions: 0,
      userRoles: {},
      
      // AI Tutor fields
      aiTutorActiveUsers: 0,
      aiTutorSessions: 0,
      aiTutorTotalTime: 0,
      aiTutorAverageScore: 0,
      aiTutorCompletionRate: 0,
      aiTutorExercisesCompleted: 0,
      aiTutorExercisesAttempted: 0,
      aiTutorProgressPercentage: 0,
      aiTutorStreakDays: 0,
      
      // LMS fields
      lmsActiveUsers: 0,
      lmsCompletionRate: 0,
      
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        userDataComplete: false,
        courseDataComplete: false,
        engagementDataComplete: false,
        aiTutorDataComplete: false,
        lmsDataComplete: false,
        confidenceScore: 0,
        note: 'Edge Function call failed - check browser console for detailed error logs'
      }
    };
  }

  /**
   * Validate query and suggest improvements
   */
  static validateQuery(query: string): {
    isValid: boolean;
    suggestions?: string[];
    improvedQuery?: string;
  } {
    const queryLower = query.toLowerCase();
    
    // Check if query is too short or vague
    if (query.length < 5) {
      return {
        isValid: false,
        suggestions: [
          'Please provide more specific details about what you\'d like to analyze',
          'Try asking about specific metrics like "user engagement last month"',
          'Specify a time period for more accurate results'
        ]
      };
    }

    // Check for common report keywords
    const reportKeywords = [
      'users', 'students', 'teachers', 'courses', 'lessons',
      'engagement', 'completion', 'performance', 'analytics',
      'report', 'data', 'statistics', 'metrics', 'trends'
    ];
    
    const hasReportKeyword = reportKeywords.some(keyword => 
      queryLower.includes(keyword)
    );

    if (!hasReportKeyword) {
      return {
        isValid: true, // Still valid, but could be improved
        suggestions: [
          'For better results, mention specific metrics like user count, engagement rate, or course performance',
          'Include time periods like "last month", "this week", or specific dates',
          'Specify what type of data you\'re most interested in'
        ]
      };
    }

    return { isValid: true };
  }
}

export default ReportsAIService;
