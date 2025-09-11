import { supabase } from '@/integrations/supabase/client';

// Enhanced interfaces for database operations
export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  is_active: boolean;
  created_by?: string;
  updated_by?: string;
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
  created_by?: string;
  updated_by?: string;
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
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateFAQRequest {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface UpdateFAQRequest extends Partial<CreateFAQRequest> {
  is_active?: boolean;
}

export interface CreateKnowledgeBaseRequest {
  title: string;
  content: string;
  category: string;
  tags: string[];
  related_faq_ids?: string[];
}

export interface UpdateKnowledgeBaseRequest extends Partial<CreateKnowledgeBaseRequest> {
  is_active?: boolean;
}

export interface CreateContactInfoRequest {
  department: string;
  email: string;
  phone?: string;
  availability: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export interface UpdateContactInfoRequest extends Partial<CreateContactInfoRequest> {
  is_active?: boolean;
}

// Validation utilities
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validateFAQ = (faq: CreateFAQRequest): void => {
  if (!faq.question?.trim()) {
    throw new ValidationError('Question is required');
  }
  if (faq.question.length > 500) {
    throw new ValidationError('Question must be less than 500 characters');
  }
  if (!faq.answer?.trim()) {
    throw new ValidationError('Answer is required');
  }
  if (faq.answer.length > 2000) {
    throw new ValidationError('Answer must be less than 2000 characters');
  }
  if (!faq.category?.trim()) {
    throw new ValidationError('Category is required');
  }
  if (!['high', 'medium', 'low'].includes(faq.priority)) {
    throw new ValidationError('Priority must be high, medium, or low');
  }
};

const validateKnowledgeBase = (kb: CreateKnowledgeBaseRequest): void => {
  if (!kb.title?.trim()) {
    throw new ValidationError('Title is required');
  }
  if (kb.title.length > 200) {
    throw new ValidationError('Title must be less than 200 characters');
  }
  if (!kb.content?.trim()) {
    throw new ValidationError('Content is required');
  }
  if (kb.content.length > 5000) {
    throw new ValidationError('Content must be less than 5000 characters');
  }
  if (!kb.category?.trim()) {
    throw new ValidationError('Category is required');
  }
};

const validateContactInfo = (contact: CreateContactInfoRequest): void => {
  if (!contact.department?.trim()) {
    throw new ValidationError('Department is required');
  }
  if (contact.department.length > 100) {
    throw new ValidationError('Department name must be less than 100 characters');
  }
  if (!contact.email?.trim()) {
    throw new ValidationError('Email is required');
  }
  if (!validateEmail(contact.email)) {
    throw new ValidationError('Please enter a valid email address');
  }
  if (contact.phone && contact.phone.length > 20) {
    throw new ValidationError('Phone number must be less than 20 characters');
  }
  if (!contact.availability?.trim()) {
    throw new ValidationError('Availability is required');
  }
  if (contact.availability.length > 100) {
    throw new ValidationError('Availability must be less than 100 characters');
  }
  if (!contact.description?.trim()) {
    throw new ValidationError('Description is required');
  }
  if (contact.description.length > 500) {
    throw new ValidationError('Description must be less than 500 characters');
  }
  if (!['high', 'medium', 'low'].includes(contact.priority)) {
    throw new ValidationError('Priority must be high, medium, or low');
  }
};

export class APEXAdminService {
  // FAQ Operations
  static async getFAQs(includeInactive = false): Promise<FAQItem[]> {
    let query = supabase
      .from('apex_faqs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching FAQs:', error);
      throw new Error(`Failed to fetch FAQs: ${error.message}`);
    }

    return data || [];
  }

  static async getFAQById(id: string): Promise<FAQItem | null> {
    const { data, error } = await supabase
      .from('apex_faqs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching FAQ:', error);
      throw new Error(`Failed to fetch FAQ: ${error.message}`);
    }

    return data;
  }

  static async createFAQ(faq: CreateFAQRequest): Promise<FAQItem> {
    try {
      validateFAQ(faq);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('Invalid FAQ data');
    }

    const { data, error } = await supabase
      .from('apex_faqs')
      .insert({
        ...faq,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating FAQ:', error);
      throw new Error(`Failed to create FAQ: ${error.message}`);
    }

    return data;
  }

  static async updateFAQ(id: string, updates: UpdateFAQRequest): Promise<FAQItem> {
    if (!id?.trim()) {
      throw new ValidationError('FAQ ID is required');
    }

    // Validate only the fields that are being updated
    if (updates.question !== undefined || updates.answer !== undefined || 
        updates.category !== undefined || updates.priority !== undefined) {
      try {
        // Create a temporary object for validation with current values if not provided
        const tempFAQ: CreateFAQRequest = {
          question: updates.question || '',
          answer: updates.answer || '',
          category: updates.category || 'Getting Started',
          tags: updates.tags || [],
          priority: updates.priority || 'medium'
        };
        
        // Only validate if we have the required fields
        if (updates.question || updates.answer || updates.category || updates.priority) {
          validateFAQ(tempFAQ);
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          throw error;
        }
        throw new Error('Invalid FAQ update data');
      }
    }

    const { data, error } = await supabase
      .from('apex_faqs')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating FAQ:', error);
      throw new Error(`Failed to update FAQ: ${error.message}`);
    }

    return data;
  }

  static async deleteFAQ(id: string): Promise<void> {
    const { error } = await supabase
      .from('apex_faqs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting FAQ:', error);
      throw new Error(`Failed to delete FAQ: ${error.message}`);
    }
  }

  static async searchFAQs(query: string, category?: string): Promise<FAQItem[]> {
    let dbQuery = supabase
      .from('apex_faqs')
      .select('*')
      .eq('is_active', true);

    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category);
    }

    // Use PostgreSQL full-text search
    if (query.trim()) {
      dbQuery = dbQuery.or(`question.ilike.%${query}%,answer.ilike.%${query}%`);
    }

    const { data, error } = await dbQuery.order('priority', { ascending: false });

    if (error) {
      console.error('Error searching FAQs:', error);
      throw new Error(`Failed to search FAQs: ${error.message}`);
    }

    return data || [];
  }

  // Knowledge Base Operations
  static async getKnowledgeBase(includeInactive = false): Promise<KnowledgeBaseItem[]> {
    let query = supabase
      .from('apex_knowledge_base')
      .select('*')
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching knowledge base:', error);
      throw new Error(`Failed to fetch knowledge base: ${error.message}`);
    }

    return data || [];
  }

  static async getKnowledgeBaseById(id: string): Promise<KnowledgeBaseItem | null> {
    const { data, error } = await supabase
      .from('apex_knowledge_base')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching knowledge base item:', error);
      throw new Error(`Failed to fetch knowledge base item: ${error.message}`);
    }

    return data;
  }

  static async createKnowledgeBase(kb: CreateKnowledgeBaseRequest): Promise<KnowledgeBaseItem> {
    try {
      validateKnowledgeBase(kb);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('Invalid knowledge base data');
    }

    const { data, error } = await supabase
      .from('apex_knowledge_base')
      .insert({
        ...kb,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating knowledge base item:', error);
      throw new Error(`Failed to create knowledge base item: ${error.message}`);
    }

    return data;
  }

  static async updateKnowledgeBase(id: string, updates: UpdateKnowledgeBaseRequest): Promise<KnowledgeBaseItem> {
    const { data, error } = await supabase
      .from('apex_knowledge_base')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating knowledge base item:', error);
      throw new Error(`Failed to update knowledge base item: ${error.message}`);
    }

    return data;
  }

  static async deleteKnowledgeBase(id: string): Promise<void> {
    const { error } = await supabase
      .from('apex_knowledge_base')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting knowledge base item:', error);
      throw new Error(`Failed to delete knowledge base item: ${error.message}`);
    }
  }

  // Contact Info Operations
  static async getContactInfo(includeInactive = false): Promise<ContactInfo[]> {
    let query = supabase
      .from('apex_contact_info')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching contact info:', error);
      throw new Error(`Failed to fetch contact info: ${error.message}`);
    }

    return data || [];
  }

  static async getContactInfoById(id: string): Promise<ContactInfo | null> {
    const { data, error } = await supabase
      .from('apex_contact_info')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching contact info:', error);
      throw new Error(`Failed to fetch contact info: ${error.message}`);
    }

    return data;
  }

  static async createContactInfo(contact: CreateContactInfoRequest): Promise<ContactInfo> {
    try {
      validateContactInfo(contact);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new Error('Invalid contact info data');
    }

    const { data, error } = await supabase
      .from('apex_contact_info')
      .insert({
        ...contact,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating contact info:', error);
      throw new Error(`Failed to create contact info: ${error.message}`);
    }

    return data;
  }

  static async updateContactInfo(id: string, updates: UpdateContactInfoRequest): Promise<ContactInfo> {
    const { data, error } = await supabase
      .from('apex_contact_info')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
        updated_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact info:', error);
      throw new Error(`Failed to update contact info: ${error.message}`);
    }

    return data;
  }

  static async deleteContactInfo(id: string): Promise<void> {
    const { error } = await supabase
      .from('apex_contact_info')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting contact info:', error);
      throw new Error(`Failed to delete contact info: ${error.message}`);
    }
  }

  // Utility Methods
  static async getFAQCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('apex_faqs')
      .select('category')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching FAQ categories:', error);
      return [];
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories.sort();
  }

  static async getKnowledgeBaseCategories(): Promise<string[]> {
    const { data, error } = await supabase
      .from('apex_knowledge_base')
      .select('category')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching knowledge base categories:', error);
      return [];
    }

    const categories = [...new Set(data?.map(item => item.category) || [])];
    return categories.sort();
  }

  static async getAnalytics() {
    try {
      const [faqs, knowledgeBase, contacts] = await Promise.all([
        this.getFAQs(),
        this.getKnowledgeBase(),
        this.getContactInfo()
      ]);

      const faqCategories = await this.getFAQCategories();
      const kbCategories = await this.getKnowledgeBaseCategories();

      return {
        totalFAQs: faqs.length,
        totalKnowledgeBase: knowledgeBase.length,
        totalContacts: contacts.length,
        faqCategories: faqCategories.length,
        kbCategories: kbCategories.length,
        highPriorityFAQs: faqs.filter(faq => faq.priority === 'high').length,
        highPriorityContacts: contacts.filter(contact => contact.priority === 'high').length
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw new Error('Failed to fetch analytics');
    }
  }

  // AI Assistant Integration Methods
  static async generateResponse(query: string): Promise<{
    answer: string;
    relatedFAQs?: FAQItem[];
    contactInfo?: ContactInfo[];
  }> {
    try {
      // Search FAQs for relevant answers
      const searchResults = await this.searchFAQs(query);
      const contacts = await this.getContactInfo();

      if (searchResults.length > 0) {
        const bestMatch = searchResults[0];
        return {
          answer: bestMatch.answer,
          relatedFAQs: searchResults.slice(1, 4),
          contactInfo: contacts.slice(0, 2) // Show top 2 contacts
        };
      }

      // If no FAQ matches, search knowledge base
      const { data: kbResults, error } = await supabase
        .from('apex_knowledge_base')
        .select('*')
        .eq('is_active', true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
        .limit(3);

      if (!error && kbResults && kbResults.length > 0) {
        const bestMatch = kbResults[0];
        return {
          answer: bestMatch.content,
          contactInfo: contacts.slice(0, 2)
        };
      }

      // Default response
      return {
        answer: "I understand you're looking for help. While I have extensive knowledge about our platform, I'd be happy to connect you with our administrative staff who can provide more detailed assistance. What specific area would you like help with?",
        contactInfo: contacts.slice(0, 3)
      };
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate AI response');
    }
  }
}
