import { supabase } from '@/integrations/supabase/client';
import { getAuthToken } from '@/utils/authUtils';

export interface IRISMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface IRISContext {
  userId: string;
  role: string;
  permissions: string[];
  tenantId?: string;
}

export interface IRISResponse {
  success: boolean;
  message: IRISMessage;
  toolsUsed?: string[];
  tokensUsed?: number;
  error?: string;
}

export interface UserProfile {
  id: string;
  role: string;
  first_name?: string;
  last_name?: string;
}

/**
 * IRIS Service - Frontend service for AI-powered database interactions
 */
export class IRISService {
  private static readonly SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  private static readonly FUNCTION_URL = `${this.SUPABASE_URL}/functions/v1/iris-chat-simple`;

  /**
   * Send a message to IRIS and get AI-powered response
   */
  static async sendMessage(
    messages: IRISMessage[],
    userContext: IRISContext
  ): Promise<IRISResponse> {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('Authentication required - please log in again');
      }

      console.log('🚀 Sending IRIS request:', {
        messageCount: messages.length,
        userId: userContext.userId,
        role: userContext.role
      });

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          context: userContext
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`IRIS API error (${response.status}): ${errorText}`);
      }

      const data: IRISResponse = await response.json();
      
      console.log('✅ IRIS response received:', {
        success: data.success,
        toolsUsed: data.toolsUsed?.length || 0,
        tokensUsed: data.tokensUsed || 0
      });

      return data;

    } catch (error) {
      console.error('❌ IRIS Service Error:', error);
      
      // Handle timeout specifically (though timeout is now removed)
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: {
            role: 'assistant',
            content: `⏱️ **Request Cancelled**

The request was cancelled or interrupted.

**What you can try:**
- Try your query again
- Check your internet connection
- Contact support if this continues`
          },
          error: 'Request cancelled'
        };
      }
      
      // Return user-friendly error response
      return {
        success: false,
        message: {
          role: 'assistant',
          content: this.getErrorMessage(error)
        },
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get user context for IRIS requests
   */
  static async getUserContext(): Promise<IRISContext | null> {
    try {
      // Get current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.warn('No authenticated user found');
        return null;
      }

      // Get user profile with role (permissions may not exist in all setups)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          id,
          role,
          first_name,
          last_name
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        // Return basic context if profile fetch fails
        return {
          userId: user.id,
          role: 'student', // default role
          permissions: []
        };
      }

      if (!profile) {
        console.warn('User profile not found');
        return null;
      }

      const context: IRISContext = {
        userId: user.id,
        role: profile.role || 'student',
        permissions: [], // Default to empty array since permissions column doesn't exist
        tenantId: undefined // Remove tenant_id reference for now
      };

      console.log('👤 User context loaded:', {
        userId: context.userId.substring(0, 8) + '...',
        role: context.role,
        permissionCount: context.permissions.length
      });

      return context;

    } catch (error) {
      console.error('Error getting user context:', error);
      return null;
    }
  }

  /**
   * Format message content for display
   */
  static formatMessage(message: IRISMessage): string {
    if (message.role === 'assistant') {
      return this.enhanceAIResponse(message.content);
    }
    return message.content;
  }

  /**
   * Enhance AI responses with better formatting
   */
  private static enhanceAIResponse(content: string): string {
    return content
      // Convert markdown tables to HTML-like structure for better display
      .replace(/\n\|(.+)\|\n/g, '\n<table-row>$1</table-row>\n')
      // Preserve line breaks
      .replace(/\n/g, '<br>')
      // Convert back table rows
      .replace(/<table-row>/g, '|')
      .replace(/<\/table-row>/g, '|');
  }

  /**
   * Generate suggested follow-up questions based on the last response
   */
  static generateSuggestions(lastResponse: string, userRole: string): string[] {
    const suggestions: string[] = [];
    const lowerResponse = lastResponse.toLowerCase();
    
    // Role-based suggestions
    if (userRole === 'admin') {
      if (lowerResponse.includes('student')) {
        suggestions.push('Show me student engagement metrics');
        suggestions.push('Which students need attention?');
        suggestions.push('What are the enrollment trends?');
      }
      
      if (lowerResponse.includes('course')) {
        suggestions.push('Which courses have the highest completion rates?');
        suggestions.push('Show me course performance analytics');
        suggestions.push('What courses need improvement?');
      }
      
      if (lowerResponse.includes('teacher')) {
        suggestions.push('How are teachers performing?');
        suggestions.push('Show me teacher activity levels');
        suggestions.push('Which teachers are most effective?');
      }

      // General admin suggestions
      if (suggestions.length === 0) {
        suggestions.push('Show me today\'s platform activity');
        suggestions.push('Generate a weekly summary report');
        suggestions.push('What are the key performance indicators?');
      }
    } else if (userRole === 'teacher') {
      suggestions.push('Show me my students\' progress');
      suggestions.push('Which assignments need grading?');
      suggestions.push('How are my courses performing?');
    } else {
      // Student suggestions
      suggestions.push('Show me my course progress');
      suggestions.push('What assignments are due?');
      suggestions.push('How am I performing compared to others?');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Get user-friendly error message
   */
  private static getErrorMessage(error: unknown): string {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('Authentication required')) {
      return `🔒 **Authentication Required**

Please log in again to continue using IRIS.

**What to do:**
1. Refresh the page
2. Log in with your credentials
3. Try your request again`;
    }
    
    if (errorMessage.includes('MCP') || errorMessage.includes('tools')) {
      return `🔧 **Database Connection Issue**

I'm having trouble connecting to the database tools right now.

**What you can try:**
- Ask general questions that don't require database queries
- Try again in a few moments
- Contact support if the issue persists`;
    }
    
    if (errorMessage.includes('OpenAI') || errorMessage.includes('API')) {
      return `🤖 **AI Service Temporarily Unavailable**

The AI service is experiencing issues right now.

**What you can try:**
- Wait a moment and try again
- Rephrase your question
- Contact support if the problem continues`;
    }
    
    if (errorMessage.includes('permission') || errorMessage.includes('access')) {
      return `🚫 **Access Restricted**

You don't have permission to access this data.

**Possible reasons:**
- Your role doesn't allow this type of query
- The data is restricted to certain users
- You need additional permissions

Contact your administrator for access.`;
    }

    // Generic error message
    return `⚠️ **Something Went Wrong**

I encountered an unexpected error while processing your request.

**Error:** ${errorMessage}

**What you can try:**
- Rephrase your question
- Try a simpler query
- Refresh the page and try again
- Contact support if the issue persists`;
  }

  /**
   * Validate user message before sending
   */
  static validateMessage(content: string): { valid: boolean; error?: string } {
    if (!content || !content.trim()) {
      return { valid: false, error: 'Message cannot be empty' };
    }

    if (content.length > 2000) {
      return { valid: false, error: 'Message is too long (max 2000 characters)' };
    }

    // Check for potentially harmful content
    const dangerousPatterns = [
      /drop\s+table/i,
      /delete\s+from/i,
      /truncate/i,
      /alter\s+table/i,
      /create\s+table/i
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(content)) {
        return { 
          valid: false, 
          error: 'Message contains potentially harmful database commands' 
        };
      }
    }

    return { valid: true };
  }

  /**
   * Check if IRIS service is available
   */
  static async checkServiceHealth(): Promise<boolean> {
    try {
      const authToken = getAuthToken();
      if (!authToken) {
        console.warn('No auth token available for health check');
        return false;
      }

      // Simple health check with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(this.FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          context: { userId: 'health-check', role: 'admin', permissions: [] }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log('✅ IRIS service health check passed');
        return true;
      } else {
        console.warn(`⚠️ IRIS service health check failed: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.warn('⚠️ IRIS service health check error:', error);
      return false;
    }
  }
}
