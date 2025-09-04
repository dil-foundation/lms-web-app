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
  totalPracticeSessions?: number;
  userRoles?: Record<string, number>;
  lastUpdated?: string;
  
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
  
  // LMS specific metrics
  lmsActiveUsers?: number;
  lmsCompletionRate?: number;
  
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
  private static readonly SYSTEM_PROMPT = `You are an AI assistant specialized in generating and analyzing reports for an LMS (Learning Management System) platform. 

Your capabilities include:
- Generating comprehensive reports using ALL-TIME historical data
- Analyzing user engagement metrics and patterns across the entire platform history
- Tracking course performance and completion rates from launch
- Identifying trends in learning data over the platform's lifetime
- Providing insights on overall platform usage and growth
- Creating analyses based on complete historical data
- Suggesting data-driven recommendations for improvement

When users ask for reports, you should:
1. Parse their request to understand the metrics and type of report needed
2. Use the provided ALL-TIME data to generate accurate insights
3. Present information in a clear, structured format with relevant metrics
4. Include insights and recommendations based on the complete historical data
5. Use emojis and formatting to make reports visually appealing and easy to read
6. Always specify that the analysis covers "All-Time Data" or "Historical Data" rather than monthly periods

IMPORTANT: The data provided covers the ENTIRE platform history, not just current month. Make this clear in your responses.

Always be professional, helpful, and focus on providing actionable insights from the comprehensive historical data.`;

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
      const systemPrompt = `${this.SYSTEM_PROMPT}

CRITICAL: You have access to REAL PLATFORM DATA for the requested timeframe. Check the timeRange field to see what period this data covers.

Platform Data for Requested Timeframe:
${contextData}

Guidelines:
- The provided data represents real platform data for the requested timeframe
- The timeRange field in the data tells you exactly what period this data covers
- Use the timeRange value to properly title your report (e.g., "Today", "This Week", "All-Time Data")
- If timeRange is "Today" - present it as today's performance data
- If timeRange is "This Week" - present it as this week's performance data  
- If timeRange is "All-Time Data" - present it as comprehensive historical analysis
- Always match your language to the actual timeRange provided
- If data shows zeros, acknowledge it and suggest why this might be the case for that specific timeframe
- Provide actionable recommendations based on the real data for the specified time period
- Format your response with clear sections using markdown
- Include relevant emojis for visual appeal
- Be specific about the numbers and percentages from the real data
- Always use the exact timeRange in your report title and analysis`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
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
        return {
          totalUsers: contextData.totalUsers || 0,
          totalCourses: contextData.totalCourses || 0,
          engagementRate: contextData.engagementRate || 0,
          completionRate: Math.round(contextData.completionRate) || 0,
          timeRange: contextData.timeRange || 'All Time Data',
          averageSessionDuration: contextData.averageSessionDuration || 0,
          popularCourses: contextData.popularCourses || [],
          availableMetrics: contextData.availableMetrics || [],
          // Include all the AI Tutor and LMS specific fields
          aiTutorActiveUsers: contextData.aiTutorActiveUsers || 0,
          aiTutorSessions: contextData.aiTutorSessions || 0,
          aiTutorTotalTime: contextData.aiTutorTotalTime || 0,
          aiTutorAverageScore: contextData.aiTutorAverageScore || 0,
          aiTutorCompletionRate: contextData.aiTutorCompletionRate || 0,
          lmsActiveUsers: contextData.lmsActiveUsers || 0,
          lmsCompletionRate: contextData.lmsCompletionRate || 0
        };
      } else {
        console.warn('API call failed, using default context. Status:', response.status);
        return this.getDefaultContext();
      }
    } catch (error) {
      console.error('Error fetching platform context, using default:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Default context when API is not available - PRODUCTION READY (NO MOCK DATA)
   */
  private static getDefaultContext(): ReportContext {
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
      // Real data fields - all empty when no connection
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
        note: 'No real data available - database connection required for production reports'
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
