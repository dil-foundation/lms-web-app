import { supabase } from '@/integrations/supabase/client';

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  related_faq_ids: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInfo {
  id: string;
  department: string;
  email: string;
  phone?: string;
  availability: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApexResponse {
  response: string;
  queryResults: Array<{
    table: string;
    data: any[];
    purpose: string;
    error?: string;
  }>;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class APEXService {
  /**
   * Send a message to the APEX AI Assistant and get a response
   */
  static async generateResponse(
    message: string, 
    userId?: string, 
    conversationHistory: ChatMessage[] = []
  ): Promise<ApexResponse> {
    try {
      console.log('🤖 Sending message to APEX AI Assistant:', message);
      
      const { data, error } = await supabase.functions.invoke('apex-ai-assistant', {
        body: {
          message: message.trim(),
          userId,
          conversationHistory
        }
      });

      if (error) {
        console.error('❌ APEX AI Assistant error:', error);
        // Fall back to local response generation
        return this.generateLocalResponse(message);
      }

      if (!data) {
        console.warn('⚠️ No response received from AI Assistant, using fallback');
        return this.generateLocalResponse(message);
      }

      console.log('✅ APEX AI Assistant response received:', data);
      return data as ApexResponse;

    } catch (error) {
      console.error('❌ Error calling APEX AI Assistant, using local fallback:', error);
      return this.generateLocalResponse(message);
    }
  }

  /**
   * Generate a local response when the Edge Function is not available
   */
  private static generateLocalResponse(message: string): ApexResponse {
    console.log('⚠️ Edge Function not available, returning fallback message for:', message);
    
    // When Edge Function is not available, we can't query the database
    // So we return a helpful message directing users to try again or contact support
    return {
      response: "I apologize, but I'm currently unable to access our knowledge base due to a technical issue. Please try again in a moment, or contact our support team for immediate assistance:\n\n**Technical Support**\n📧 tech@lms.com\n📞 +1-800-TECH-HELP\n🕒 Available 24/7\n\nThey'll be able to help you with any questions about our platform.",
      queryResults: [{
        table: 'system_message',
        data: [],
        purpose: 'System unavailable message'
      }],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get quick reply suggestions (can be enhanced to be dynamic based on recent FAQs)
   */
  static async getQuickReplies(): Promise<string[]> {
    try {
      // Get the most common/recent FAQ questions from the database
      const { data: faqs, error } = await supabase
        .from('apex_faqs')
        .select('question')
        .eq('is_active', true)
        .eq('priority', 'high')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) {
        console.error('Error fetching quick replies:', error);
        return this.getDefaultQuickReplies();
      }

      if (faqs && faqs.length > 0) {
        return faqs.map(faq => faq.question);
      }

      return this.getDefaultQuickReplies();
    } catch (error) {
      console.error('Error getting quick replies:', error);
      return this.getDefaultQuickReplies();
    }
  }

  /**
   * Get FAQ categories from the database
   */
  static async getFAQCategories(): Promise<string[]> {
    try {
      const { data: categories, error } = await supabase
        .from('apex_faqs')
        .select('category')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching FAQ categories:', error);
        return this.getDefaultCategories();
      }

      if (categories) {
        // Get unique categories
        const uniqueCategories = [...new Set(categories.map(item => item.category))];
        return uniqueCategories.sort();
      }

      return this.getDefaultCategories();
    } catch (error) {
      console.error('Error getting FAQ categories:', error);
      return this.getDefaultCategories();
    }
  }

  /**
   * Get contact information from the database
   */
  static async getContactInfo(department?: string): Promise<ContactInfo[]> {
    try {
      let query = supabase
        .from('apex_contact_info')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (department) {
        query = query.ilike('department', `%${department}%`);
      }

      const { data: contacts, error } = await query;

      if (error) {
        console.error('Error fetching contact info:', error);
        return [];
      }

      return contacts || [];
    } catch (error) {
      console.error('Error getting contact info:', error);
      return [];
    }
  }

  /**
   * Default quick replies fallback
   */
  private static getDefaultQuickReplies(): string[] {
    return [
      "Can the platform work on mobile devices?",
      "How do I enroll in a course?",
      "I forgot my password",
      "How do I contact support?",
      "Can I download materials for offline use?",
      "How do I submit an assignment?"
    ];
  }

  /**
   * Default categories fallback
   */
  private static getDefaultCategories(): string[] {
    return [
      'Getting Started',
      'Account & Login', 
      'Courses & Learning',
      'AI Features',
      'Technical Support',
      'Administrative'
    ];
  }
}
