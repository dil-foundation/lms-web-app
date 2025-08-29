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
   * Generate a report response using OpenAI
   */
  static async generateReportResponse(
    query: string,
    context?: ReportContext
  ): Promise<ReportsAIResponse> {
    try {
      const messages: OpenAIMessage[] = [
        {
          role: 'system',
          content: this.SYSTEM_PROMPT
        }
      ];

      // Add context if provided
      if (context) {
        messages.push({
          role: 'system',
          content: `Current platform context:
- Total Users: ${context.totalUsers.toLocaleString()}
- Total Courses: ${context.totalCourses}
- Current Engagement Rate: ${context.engagementRate}%
- Course Completion Rate: ${context.completionRate}%
- Analysis Time Range: ${context.timeRange}
- Available Metrics: ${context.availableMetrics.join(', ')}

Use this context to provide more accurate and relevant responses.`
        });
      }

      messages.push({
        role: 'user',
        content: query
      });

      // Call the backend API endpoint for OpenAI
      const response = await this.callOpenAI(messages);

      if (response.success) {
        return {
          success: true,
          response: response.content,
          reportData: this.extractReportData(response.content)
        };
      } else {
        return {
          success: false,
          response: 'I apologize, but I encountered an error while generating your report. Please try again.',
          error: response.error
        };
      }
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
   * Call OpenAI API through backend
   */
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
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required');
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
        return contextData;
      } else {
        // Return default context if API fails
        return this.getDefaultContext();
      }
    } catch (error) {
      console.error('Error fetching platform context:', error);
      return this.getDefaultContext();
    }
  }

  /**
   * Default context when API is not available
   */
  private static getDefaultContext(): ReportContext {
    return {
      totalUsers: 1250,
      totalCourses: 15,
      engagementRate: 78,
      completionRate: 65,
      timeRange: 'Current Month',
      availableMetrics: [
        'User Registration',
        'Course Completion',
        'Engagement Rate',
        'Session Duration',
        'Login Frequency',
        'Assessment Scores',
        'Discussion Participation'
      ]
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
