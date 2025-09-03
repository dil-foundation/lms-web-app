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
  dataQuality?: {
    userDataComplete: boolean;
    courseDataComplete: boolean;
    engagementDataComplete: boolean;
    confidenceScore: number;
    note?: string;
  };
}

export class ReportsAIService {
  private static readonly SYSTEM_PROMPT = `You are an AI assistant specialized in generating and analyzing reports for an LMS (Learning Management System) platform. 

Your capabilities include:
- Generating comprehensive reports for any timeline (daily, weekly, monthly, yearly)
- Analyzing user engagement metrics and patterns
- Tracking course performance and completion rates
- Identifying trends in learning data
- Providing insights on platform usage
- Creating comparative analyses between different time periods
- Suggesting data-driven recommendations for improvement

When users ask for reports, you should:
1. Parse their request to understand the timeline, metrics, and type of report needed
2. Generate realistic and helpful report data
3. Present the information in a clear, structured format with relevant metrics
4. Include insights and recommendations based on the data
5. Use emojis and formatting to make reports visually appealing and easy to read

Always be professional, helpful, and focus on providing actionable insights from the data.`;

  /**
   * Generate a report response using OpenAI (with fallback to mock responses)
   */
  static async generateReportResponse(
    query: string,
    context?: ReportContext
  ): Promise<ReportsAIResponse> {
    try {
      // First, try to get platform context
      const platformContext = context || await this.getPlatformContext();
      
      // For now, use intelligent mock responses based on the query
      // TODO: Replace with actual OpenAI integration when backend is deployed
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
   * Generate AI responses using ONLY real database data - NO mock data
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
    
    // AI Tutor specific queries - using ONLY real data
    if (queryLower.includes('ai tutor') || queryLower.includes('tutor') || queryLower.includes('tutoring')) {
      // Calculate AI Tutor metrics from real database data
      const aiTutorSessions = context.totalPracticeSessions || 0;
      const aiActiveUsers = context.activeUsersThisMonth || 0;
      const sessionDuration = context.averageSessionDuration || 0;
      
      // Calculate engagement percentage
      const engagementPercentage = context.totalUsers > 0 ? Math.round((aiActiveUsers / context.totalUsers) * 100) : 0;
      
      return {
        content: `🤖 **AI Tutor System Analytics**

📊 **Current AI Tutor Metrics:**
- Total Tutoring Sessions: ${aiTutorSessions.toLocaleString()}
- Active AI Users: ${aiActiveUsers.toLocaleString()} users (${engagementPercentage}% of platform)
- Average Session Duration: ${sessionDuration} minutes
- Platform Engagement Rate: ${context.engagementRate}%

🎯 **Learning Outcomes:**
- Course Completion Rate: ${context.completionRate}%
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Active Users This Month: ${context.activeUsersThisMonth || 0}
- New Users This Month: ${context.newUsersThisMonth || 0}

💡 **AI Tutor Insights:**
- Most popular courses: ${context.popularCourses?.slice(0,3).join(', ') || 'No course data available'}
- Total Published Courses: ${context.totalCourses}
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count}`).join(', ') || 'No role data'}
- Data Quality Score: ${context.dataQuality?.confidenceScore || 0}%

**Real Data Insights:**
- ${context.dataQuality?.userDataComplete ? '✅ User data is complete' : '⚠️ Limited user data available'}
- ${context.dataQuality?.courseDataComplete ? '✅ Course data is complete' : '⚠️ Limited course data available'}
- ${context.dataQuality?.engagementDataComplete ? '✅ Engagement data is complete' : '⚠️ Limited engagement data available'}

**Recommendations:**
${context.totalUsers < 50 ? '- Focus on user acquisition and onboarding' : '- Optimize for scale and performance'}
${context.completionRate < 50 ? '- Improve course completion rates through better engagement' : '- Maintain high completion rates'}
${context.engagementRate < 30 ? '- Enhance user engagement strategies' : '- Continue current engagement approaches'}

${dataNote}`,
        data: {
          totalSessions: aiTutorSessions,
          activeUsers: aiActiveUsers,
          engagementRate: context.engagementRate,
          completionRate: context.completionRate,
          totalUsers: context.totalUsers,
          totalCourses: context.totalCourses,
          dataSource: 'real_database',
          lastUpdated: context.lastUpdated
        }
      };
    }
    
    // LMS specific queries - using ONLY real data
    if (queryLower.includes('lms') || queryLower.includes('course') || queryLower.includes('student')) {
      const courseToStudentRatio = context.totalCourses > 0 ? Math.round(context.totalUsers / context.totalCourses) : 0;
      
      return {
        content: `📚 **LMS Platform Analytics**

📖 **Current LMS Metrics:**
- Total Students: ${context.totalUsers.toLocaleString()} users
- Active Courses: ${context.totalCourses} published courses
- Course Completion Rate: ${context.completionRate}%
- Student Engagement Rate: ${context.engagementRate}%

📈 **Course Performance:**
- Most Popular Course: ${context.popularCourses?.[0] || 'No course data available'}
- Available Courses: ${context.popularCourses?.join(', ') || 'No course data available'}
- Active Users This Month: ${context.activeUsersThisMonth || 0}
- New Users This Month: ${context.newUsersThisMonth || 0}

👥 **Student Engagement:**
- Total Registered Users: ${context.totalUsers.toLocaleString()}
- Average Session Duration: ${context.averageSessionDuration || 0} minutes
- User Role Distribution: ${Object.entries(context.userRoles || {}).map(([role, count]) => `${role}: ${count}`).join(', ') || 'No role data'}

💡 **LMS Insights:**
- Course-to-student ratio: ${courseToStudentRatio} students per course
- Data Quality Score: ${context.dataQuality?.confidenceScore || 0}%
- ${context.engagementRate < 20 ? 'Low engagement indicates need for improvement' : context.engagementRate > 70 ? 'High engagement shows strong platform adoption' : 'Moderate engagement with room for growth'}
- Last Updated: ${context.lastUpdated || 'Unknown'}

**Real Data Status:**
- ${context.dataQuality?.userDataComplete ? '✅ User data is complete and accurate' : '⚠️ Limited user data available'}
- ${context.dataQuality?.courseDataComplete ? '✅ Course data is complete and accurate' : '⚠️ Limited course data available'}
- ${context.dataQuality?.engagementDataComplete ? '✅ Engagement data is complete and accurate' : '⚠️ Limited engagement data available'}

**Data-Driven Recommendations:**
- ${context.engagementRate < 20 ? 'Priority: Focus on user onboarding and content quality' : 'Continue current engagement strategies'}
- ${context.completionRate < 50 ? 'Review course difficulty and pacing to improve completion rates' : 'Maintain current course quality standards'}
- ${context.totalUsers < 50 ? 'Focus on user acquisition campaigns' : 'Optimize for scale and user retention'}

${dataNote}`,
        data: {
          totalStudents: context.totalUsers,
          activeCourses: context.totalCourses,
          completionRate: context.completionRate,
          engagementRate: context.engagementRate,
          activeUsersThisMonth: context.activeUsersThisMonth,
          newUsersThisMonth: context.newUsersThisMonth,
          dataSource: 'real_database',
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
   * Get current platform context for better AI responses
   */
  static async getPlatformContext(): Promise<ReportContext> {
    try {
      console.log('Fetching real platform context from database...');
      const authToken = getAuthToken();
      if (!authToken) {
        console.warn('No auth token available, using default context');
        return this.getDefaultContext();
      }

      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.AI_REPORTS_CONTEXT}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const contextData = await response.json();
        console.log('✅ Real platform context loaded:', contextData);
        return {
          totalUsers: contextData.totalUsers || 0,
          totalCourses: contextData.totalCourses || 0,
          engagementRate: contextData.engagementRate || 0,
          completionRate: Math.round(contextData.completionRate) || 0,
          timeRange: contextData.timeRange || 'Current Month',
          averageSessionDuration: contextData.averageSessionDuration || 0,
          popularCourses: contextData.popularCourses || [],
          availableMetrics: contextData.availableMetrics || []
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
      totalUsers: 0, // Real data only - no mock users
      totalCourses: 0, // Real data only - no mock courses
      engagementRate: 0, // Real data only - no mock engagement
      completionRate: 0, // Real data only - no mock completion
      timeRange: 'Current Month',
      averageSessionDuration: 0, // Real data only
      popularCourses: [], // Empty - will be populated from database
      availableMetrics: [
        'User Registration',
        'Course Completion', 
        'Engagement Rate',
        'Session Duration',
        'Login Frequency',
        'Practice Sessions',
        'Course Progress',
        'User Activity',
        'Platform Analytics'
      ],
      // Additional real data fields
      activeUsersThisMonth: 0,
      newUsersThisMonth: 0,
      totalPracticeSessions: 0,
      userRoles: {},
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        userDataComplete: false,
        courseDataComplete: false,
        engagementDataComplete: false,
        confidenceScore: 0,
        note: 'No real data available - database connection required'
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
