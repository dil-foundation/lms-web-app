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
  private static readonly SYSTEM_PROMPT = `You are IRIS (Intelligent Response & Insight System), an advanced AI assistant specialized in generating contextually relevant reports for an LMS (Learning Management System) platform.

CRITICAL INTELLIGENCE REQUIREMENTS:
1. **ANALYZE THE USER'S SPECIFIC REQUEST** - Understand exactly what they're asking for
2. **FOCUS ONLY ON RELEVANT METRICS** - Don't include unrelated data in your response
3. **MATCH THE SCOPE OF THE REQUEST** - If they ask about students, focus on student data; if courses, focus on course data
4. **BE CONTEXTUALLY INTELLIGENT** - Tailor your response to the specific question asked

Your capabilities include:
- Student Analytics: Enrollment, engagement, progress, performance, learning outcomes
- Course Analytics: Performance, completion rates, popularity, effectiveness
- Instructor Analytics: Teaching effectiveness, student feedback, course management
- Platform Analytics: Usage patterns, system performance, growth metrics
- Learning Analytics: Skill development, assessment results, learning paths
- Engagement Analytics: Activity levels, participation, retention rates

RESPONSE INTELLIGENCE RULES:
1. **Parse the request carefully** - Identify the specific focus (students, courses, instructors, etc.)
2. **Filter relevant data** - Only use metrics that directly relate to the user's question
3. **Provide focused insights** - Don't add unrelated information just to fill space
4. **Use appropriate sections** - Structure your response around what was actually asked
5. **Give actionable recommendations** - Suggest specific actions based on the focused analysis

EXAMPLES OF INTELLIGENT RESPONSES:
- If asked about "student reports" → Focus on student metrics, performance, engagement
- If asked about "course analytics" → Focus on course performance, completion, popularity
- If asked about "instructor performance" → Focus on teaching metrics, student feedback
- If asked about "platform usage" → Focus on system metrics, user activity, growth

PROFESSIONAL FORMATTING GUIDELINES:
- Use clean, structured markdown with clear hierarchy
- Minimize emoji usage - only use sparingly for key sections (📊 for data, 💡 for insights)
- Use proper heading structure: ## for main sections, ### for subsections
- Present data in clean, scannable format with consistent spacing
- Use bullet points and numbered lists for clarity
- Always provide specific numbers from the actual data provided
- End with actionable recommendations in a dedicated section
- Avoid excessive bold text - use it only for key metrics and important points
- Maintain consistent formatting throughout the response

TABLE FORMATTING RULES:
- When users request "tabular view", "table format", or "in a table", use proper HTML table formatting
- Use HTML table tags: <table>, <thead>, <tr>, <th>, <td>, <tbody>
- Apply CSS classes for styling: "w-full border border-gray-300 rounded-lg overflow-hidden"
- Style table headers with: "bg-primary/10 px-4 py-2 text-left font-semibold"
- Style table cells with: "px-4 py-2"
- Make tables responsive and visually appealing
- Include proper column headers that match the data being presented
- ALWAYS add proper spacing and formatting after tables using markdown headers and line breaks

EXAMPLE PROFESSIONAL RESPONSE FORMAT:

## 📊 Student Performance Overview

### Current Metrics
- **Total Active Students:** 24
- **Engagement Rate:** 75%
- **Average Completion Rate:** 50%

### Key Findings
The data indicates strong engagement levels with room for improvement in completion rates.

### Recommendations
1. Implement targeted support for students with low completion rates
2. Analyze barriers preventing course completion
3. Consider additional engagement strategies

EXAMPLE TABLE FORMAT:
<table class="w-full border border-gray-300 rounded-lg overflow-hidden">
<thead>
<tr>
<th class="bg-primary/10 px-4 py-2 text-left font-semibold">Metric</th>
<th class="bg-primary/10 px-4 py-2 text-left font-semibold">Value</th>
</tr>
</thead>
<tbody>
<tr>
<td class="px-4 py-2">Total Students</td>
<td class="px-4 py-2">24</td>
</tr>
</tbody>
</table>

## 💡 Key Insights

Clean, professional text formatting with proper spacing and structure.

IMPORTANT: Be intelligent about what data to include. Don't overwhelm users with irrelevant metrics. Focus on what they actually asked for.

DATA ACCESS STATUS:
- You have access to comprehensive platform data including user counts, course metrics, AI Tutor analytics, and LMS data
- The data provided represents real platform metrics and should be used to generate meaningful reports
- When users ask for "today" data but only aggregate data is available, use the aggregate data and explain the timeframe
- Never claim data is "unavailable" if you have aggregate metrics that can answer the question

INTELLIGENT DATA INTERPRETATION:
1. If asked for "today" data but only aggregate data is available, use the aggregate data and mention the actual timeframe
2. Use the provided userRoles data to answer questions about teachers, students, and admins
3. Use AI Tutor metrics (sessions, time, scores, exercises) to provide meaningful analytics
4. Focus on what data IS available rather than what might be missing
5. Provide actionable insights based on the real data provided
6. NEVER mention internal database table names in responses - use user-friendly terms instead`;

  /**
   * Generate a report response using OpenAI (with fallback to mock responses)
   */
  static async generateReportResponse(
    query: string,
    context?: ReportContext
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
        // If timeframe is specified and no context provided, fetch with timeframe
        platformContext = await this.getPlatformContext(timeframe);
      } else if (context) {
        // If context is provided, use it (but this shouldn't happen with timeframe queries)
        console.log('⚠️ Using provided context instead of fetching with timeframe');
        platformContext = context;
      } else {
        // No timeframe and no context, fetch default
        platformContext = await this.getPlatformContext();
      }
      
      console.log('📊 Platform context timeRange:', platformContext.timeRange);

      // Direct metric shortcuts for deterministic answers (bypass model)
      const directAnswer = this.tryDirectMetricAnswer(query, platformContext);
      console.log('🎯 Direct answer check:', { query, hasDirectAnswer: !!directAnswer });
      if (directAnswer) {
        console.log('✅ Using direct answer:', directAnswer.substring(0, 100) + '...');
        return {
          success: true,
          response: directAnswer,
          reportData: {
            teacherCount: platformContext.userRoles?.teacher || 0,
            userRoles: platformContext.userRoles
          }
        };
      }
      
      // Use OpenAI API for dynamic responses
      const openAIResponse = await this.callOpenAI(query, platformContext);
      
      return {
        success: true,
        response: openAIResponse.content,
        reportData: openAIResponse.data
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
  private static tryDirectMetricAnswer(query: string, context: ReportContext): string | null {
    const q = (query || '').toLowerCase();

    const asksHowMany = q.includes('how many') || q.includes('number of') || q.includes('count of') || q.includes('count');
    const mentionsTeachers = q.includes('teacher') || q.includes('teachers') || q.includes('instructor') || q.includes('instructors') || q.includes('faculty') || q.includes('lecturer') || q.includes('lecturers');

    console.log('🔍 Direct answer analysis:', { 
      query: q, 
      asksHowMany, 
      mentionsTeachers, 
      userRoles: context.userRoles 
    });

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

    return null;
  }

  /**
   * Extract timeframe from user query
   */
  private static extractTimeframe(query: string): string | undefined {
    const queryLower = query.toLowerCase();
    
    // Check for specific timeframes
    if (queryLower.includes('today') || queryLower.includes('for today')) {
      return 'today';
    }
    if (queryLower.includes('yesterday')) {
      return 'yesterday';
    }
    if (queryLower.includes('this week') || queryLower.includes('weekly')) {
      return 'this_week';
    }
    if (queryLower.includes('this month') || queryLower.includes('monthly')) {
      return 'this_month';
    }
    if (queryLower.includes('last week')) {
      return 'last_week';
    }
    if (queryLower.includes('last month')) {
      return 'last_month';
    }
    
    return undefined; // Default to all-time
  }

  /**
   * Call OpenAI API for dynamic report generation
   */
  private static async callOpenAI(query: string, context: ReportContext): Promise<{
    content: string;
    data: any;
  }> {
    const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    console.log('🔍 OpenAI API Key check:', openaiApiKey ? 'API key found' : 'API key missing');
    
    if (!openaiApiKey) {
      console.warn('❌ OpenAI API key not configured, falling back to structured response');
      return this.generateMockAIResponse(query, context);
    }

    console.log('🚀 Making OpenAI API call for query:', query);

    try {
      const contextData = JSON.stringify(context, null, 2);
      // Analyze the query to determine focus area and format
      const queryLower = query.toLowerCase();
      let focusArea = 'general';
      let focusGuidance = '';
      
      // Check if user wants table format
      const wantsTable = queryLower.includes('table') || queryLower.includes('tabular') || 
                        queryLower.includes('in a table') || queryLower.includes('table format') ||
                        queryLower.includes('table view');
      
      const tableGuidance = wantsTable ? `
CRITICAL: User specifically requested TABLE FORMAT. You MUST use proper HTML table formatting as specified in the TABLE FORMATTING RULES above. Do not use markdown tables or plain text formatting.` : '';
      
      if (queryLower.includes('student') || queryLower.includes('learner') || queryLower.includes('user')) {
        focusArea = 'students';
        focusGuidance = `
FOCUS: This is a STUDENT-FOCUSED request. Structure your response around:
- Student enrollment and demographics (totalUsers, newUsersThisMonth)
- Student engagement (engagementRate, activeUsersThisMonth)
- Student performance (completionRate, averageSessionDuration)
- Learning outcomes and progress
- Student retention and activity patterns
AVOID: Don't include detailed course information unless directly relevant to student performance.`;
      } else if (queryLower.includes('course') || queryLower.includes('curriculum') || queryLower.includes('lesson')) {
        focusArea = 'courses';
        focusGuidance = `
FOCUS: This is a COURSE-FOCUSED request. Structure your response around:
- Course catalog and availability (totalCourses, popularCourses)
- Course performance and completion rates
- Course engagement and effectiveness
- Popular and trending courses
- Course-specific metrics and analytics
AVOID: Don't include detailed student demographics unless directly relevant to course performance.`;
      } else if (queryLower.includes('instructor') || queryLower.includes('teacher') || queryLower.includes('faculty')) {
        focusArea = 'instructors';
        focusGuidance = `
FOCUS: This is an INSTRUCTOR/TEACHER-FOCUSED request. Structure your response around:
- Teacher/Instructor count: ${context.userRoles?.teacher || 0} teachers are currently in the system
- Instructor activity and engagement
- Teaching effectiveness metrics
- Student feedback and ratings
- Course management performance
- Instructor-specific analytics
CRITICAL: You have access to teacher count data - there are ${context.userRoles?.teacher || 0} teachers.
AVOID: Don't include general platform metrics unless directly relevant to instructor performance.`;
      } else if (queryLower.includes('platform') || queryLower.includes('system') || queryLower.includes('usage')) {
        focusArea = 'platform';
        focusGuidance = `
FOCUS: This is a PLATFORM-FOCUSED request. Structure your response around:
- Overall platform usage and growth
- System performance metrics
- User activity patterns
- Platform adoption and engagement
- Technical and operational insights
AVOID: Don't dive deep into specific course or student details unless showing overall trends.`;
      }

      const systemPrompt = `${this.SYSTEM_PROMPT}

CRITICAL CONTEXT ANALYSIS:
Query Focus Area: ${focusArea.toUpperCase()}
${focusGuidance}
${tableGuidance}

REAL PLATFORM DATA for ${context.timeRange}:
${contextData}

CRITICAL: USER ROLES DATA AVAILABLE:
${Object.entries(context.userRoles || {}).length > 0 ? 
  `- Teachers/Instructors: ${context.userRoles?.teacher || 0}
- Students: ${context.userRoles?.student || 0} 
- Admins: ${context.userRoles?.admin || 0}
- Total Users: ${context.totalUsers}

IMPORTANT: When users ask about "teachers", "instructors", or "faculty", use the "teacher" role count above.` : 
  'No user role data available'}

INTELLIGENT RESPONSE GUIDELINES:
- The provided data represents real platform data for: ${context.timeRange}
- ALWAYS use the available data to provide meaningful insights - never claim data is unavailable
- If asked for "today" data, use available aggregate data and mention the actual timeframe covered
- ONLY include metrics and sections that are relevant to the user's specific request
- Structure your response around the identified focus area: ${focusArea}
- Be specific about numbers and percentages from the real data
- Provide targeted recommendations based on the focused analysis
- Use clean, professional markdown formatting with minimal emoji usage
- Keep the response concise and directly relevant to what was asked

PLATFORM-SPECIFIC FOCUS:
- If the request mentions "AI Tutor" specifically, focus ONLY on AI Tutor metrics (aiTutor* fields)
- If the request mentions "LMS" specifically, focus ONLY on LMS metrics (lms* fields)
- Use the exact terminology from the user's request in your report title and content
- Match the report type to what was specifically requested (e.g., "exercise progress" should focus on exercises, not general sessions)

AVAILABLE LMS DISCUSSION DATA:
- Total Discussions: Use lmsTotalDiscussions field
- Total Replies: Use lmsTotalReplies field  
- Discussion Participants: Use lmsDiscussionParticipants field
- When asked about discussions, forums, or participation, use these basic metrics

AVAILABLE LMS CONTENT MANAGEMENT DATA:
- Total Detailed Courses: Use lmsTotalDetailedCourses field
- Published Courses: Use lmsPublishedCourses field
- Draft Courses: Use lmsDraftCourses field
- Courses with Images: Use lmsCoursesWithImages field
- Courses with Subtitles: Use lmsCoursesWithSubtitles field
- Courses Created This Month: Use lmsCoursesCreatedThisMonth field
- Courses Updated This Month: Use lmsCoursesUpdatedThisMonth field
- Average Sections per Course: Use lmsAvgSectionsPerCourse field
- Average Lessons per Course: Use lmsAvgLessonsPerCourse field
- Average Content Items per Course: Use lmsAvgContentItemsPerCourse field
- Content Completion Rate: Use lmsContentCompletionRate field (% of content completed)
- Top Accessed Courses: Use lmsTopAccessedCourses field (array of most accessed courses)
- Content Type Distribution: Use lmsContentTypeDistribution field (breakdown by content type)
- Total Categories: Use lmsTotalCategories field
- Average Courses per Category: Use lmsAvgCoursesPerCategory field
- Top Languages: Use lmsTopLanguages field (most common course languages)
- When asked about content management, course structure, content analytics, or course organization, use these comprehensive content metrics

AVAILABLE LMS ASSIGNMENT DATA:
- Assignments Submitted: Use lmsAssignmentsSubmitted field
- Assignments Graded: Use lmsAssignmentsGraded field
- Average Assignment Grade: Use lmsAvgAssignmentGrade field
- When asked about assignments, grading, or submissions, use these specific metrics

AVAILABLE LMS QUIZ DATA:
- Total Quizzes: Use lmsTotalQuizzes field
- Average Quiz Score: Use lmsAvgQuizScore field
- Manual Grading Required: Use lmsManualGradingRequired field

AVAILABLE LMS ENROLLMENT DATA:
- Total Enrollments: Use lmsEnrollments field
- New Enrollments: Use lmsNewEnrollments field
- Course Structure: Use lmsTotalSections, lmsTotalLessons, lmsTotalContent fields

AVAILABLE AI TUTOR DETAILED DATA:
- Milestones: Use aiTutorMilestones, aiTutorMilestoneTypes fields
- Unlocks: Use aiTutorUnlocks, aiTutorStagesUnlocked fields
- Progress: Use aiTutorProgressPercentage, aiTutorCompletedStages, aiTutorCompletedTopics fields
- Language Usage: Use aiTutorUrduUsage, aiTutorTopicUrduUsage fields
- Consistency: Use aiTutorConsistencyScore, aiTutorStreakDays fields

AVAILABLE SESSION DATA:
- Active Sessions: Use activeSessions field
- Platform Actions: Use totalSuccessfulActions field
- Unique Users: Use uniqueActiveUsersFromSessions, uniqueActiveUsersFromLogs fields

PROFESSIONAL TEXT FORMATTING REQUIREMENTS:
- Use clean markdown with proper heading hierarchy (## for main sections, ### for subsections)
- Minimize bold text usage - only for key metrics and critical points
- Use bullet points for lists, numbered lists for sequential steps
- Maintain consistent spacing between sections
- Avoid excessive asterisks (*) and formatting symbols
- Keep sentences clear and concise
- Use professional language without unnecessary emphasis
- Structure content logically: Overview → Data → Analysis → Recommendations
- Never put long text in single paragraphs without breaks
- Ensure proper spacing after tables and between sections

REMEMBER: Quality over quantity - provide focused, relevant insights rather than comprehensive but unfocused data dumps.`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.choices[0]?.message?.content || 'Unable to generate response';

      console.log('✅ OpenAI response received:', aiResponse.substring(0, 100) + '...');

      // Extract any metrics from the response for reportData
      const reportData = {
        source: 'openai_dynamic',
        query: query,
        platformData: context,
        generatedAt: new Date().toISOString()
      };

      return {
        content: aiResponse,
        data: reportData
      };

    } catch (error) {
      console.error('OpenAI API call failed:', error);
      console.log('Falling back to structured response with real data');
      return this.generateMockAIResponse(query, context);
    }
  }

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
   * Get platform context for AI responses with optional timeframe
   */
  static async getPlatformContext(timeframe: string | undefined = undefined): Promise<ReportContext> {
    try {
      console.log('🎯 getPlatformContext received timeframe:', timeframe);
      console.log('Fetching real platform context from database...');
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
      console.log('🔗 Constructing URL with timeframe:', timeframe);
      if (timeframe) {
        url.searchParams.append('timeframe', timeframe);
        console.log('✅ Added timeframe to URL');
      } else {
        console.log('❌ No timeframe to add to URL');
      }
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
