import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { APEXService, type ChatMessage as ServiceChatMessage } from '@/services/aiAssistantService';

export interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  type?: 'text' | 'quick_reply' | 'contact_admin' | 'faq';
  quickReplies?: string[];
  isTyping?: boolean;
}

export interface AIAssistantState {
  isOpen: boolean;
  messages: AIMessage[];
  isLoading: boolean;
  isTyping: boolean;
  quickReplies: string[];
  faqCategories: string[];
  currentCategory?: string;
}

interface APEXContextType {
  state: AIAssistantState;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  sendQuickReply: (reply: string) => Promise<void>;
  contactAdmin: () => Promise<void>;
  clearMessages: () => void;
  setCategory: (category: string) => void;
}

const APEXContext = createContext<APEXContextType | undefined>(undefined);

interface APEXProviderProps {
  children: ReactNode;
}

export const APEXProvider: React.FC<APEXProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  
  const [state, setState] = useState<AIAssistantState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    isTyping: false,
    quickReplies: [],
    faqCategories: []
  });

  const [conversationHistory, setConversationHistory] = useState<ServiceChatMessage[]>([]);

  // Initialize with welcome message and load quick replies/categories
  useEffect(() => {
    const initializeAssistant = async () => {
      if (state.messages.length === 0) {
        // Load quick replies and categories from database
        const [quickReplies, faqCategories] = await Promise.all([
          APEXService.getQuickReplies(),
          APEXService.getFAQCategories()
        ]);

        const welcomeMessage: AIMessage = {
          id: 'welcome',
          content: `Hello${user ? ` ${profile?.first_name || 'there'}` : ''}! I'm your AI Digital Assistant. I'm here to help you with questions about our LMS platform and connect you with our administrative staff when needed. How can I assist you today?`,
          sender: 'assistant',
          timestamp: new Date(),
          type: 'text',
          quickReplies: quickReplies.slice(0, 6) // Limit to 6 quick replies
        };

        setState(prev => ({ 
          ...prev, 
          messages: [welcomeMessage],
          quickReplies,
          faqCategories
        }));
      }
    };

    initializeAssistant();
  }, [user, profile, state.messages.length]);

  const openAssistant = () => {
    setState(prev => ({ ...prev, isOpen: true }));
  };

  const closeAssistant = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const addMessage = (message: Omit<AIMessage, 'id' | 'timestamp'>) => {
    const newMessage: AIMessage = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    setState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
    return newMessage;
  };

  const simulateTyping = (duration: number = 1000) => {
    setState(prev => ({ ...prev, isTyping: true }));
    return new Promise(resolve => {
      setTimeout(() => {
        setState(prev => ({ ...prev, isTyping: false }));
        resolve(true);
      }, duration);
    });
  };

  const generateAIResponse = async (userMessage: string): Promise<{ answer: string; relatedFAQs?: any[]; contactInfo?: any[] }> => {
    console.log('🧠 APEX Context: generateAIResponse called with:', userMessage);
    
    // Show typing indicator
    setState(prev => ({ ...prev, isTyping: true }));

    try {
      // Add user message to conversation history
      const newUserMessage: ServiceChatMessage = {
        role: 'user',
        content: userMessage
      };

      const updatedHistory = [...conversationHistory, newUserMessage];
      setConversationHistory(updatedHistory);

      console.log('📞 APEX Context: Calling APEXService.generateResponse...');
      console.log('   - Message:', userMessage);
      console.log('   - User ID:', user?.id);
      console.log('   - History length:', updatedHistory.length);

      // Call the new APEX service
      const response = await APEXService.generateResponse(
        userMessage, 
        user?.id, 
        updatedHistory
      );

      console.log('📨 APEX Context: APEXService returned:', {
        responseLength: response.response.length,
        queryResultsCount: response.queryResults?.length || 0,
        timestamp: response.timestamp
      });

      // Add assistant response to conversation history
      const assistantMessage: ServiceChatMessage = {
        role: 'assistant',
        content: response.response
      };

      setConversationHistory([...updatedHistory, assistantMessage]);

      // Extract related FAQs from query results if available
      const relatedFAQs = response.queryResults?.find(r => r.table === 'apex_faqs' || r.table === 'local_faq')?.data || [];
      const contactInfo = response.queryResults?.find(r => r.table === 'apex_contact_info' || r.table === 'local_contact')?.data || [];

      console.log('🔍 APEX Context: Extracted data:', {
        relatedFAQsCount: relatedFAQs.length,
        contactInfoCount: contactInfo.length
      });

      // Return in the expected format for backward compatibility
      return {
        answer: response.response,
        relatedFAQs: relatedFAQs.slice(0, 3), // Limit to 3 related FAQs
        contactInfo: contactInfo.slice(0, 2) // Limit to 2 contact entries
      };

    } finally {
      setState(prev => ({ ...prev, isTyping: false }));
    }
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    console.log('🎯 APEX Context: User sent message:', message);

    // Add user message
    addMessage({
      content: message,
      sender: 'user',
      type: 'text'
    });

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('🔄 APEX Context: Calling generateAIResponse...');
      const response = await generateAIResponse(message);
      
      console.log('✅ APEX Context: Received response:', response.answer);
      
      // Add AI response
      addMessage({
        content: response.answer,
        sender: 'assistant',
        type: 'text',
        quickReplies: state.quickReplies
      });

      // Add related FAQs if available
      if (response.relatedFAQs && response.relatedFAQs.length > 0) {
        console.log('📚 APEX Context: Adding related FAQs');
        setTimeout(() => {
          addMessage({
            content: "Here are some related questions that might help:",
            sender: 'assistant',
            type: 'faq',
            quickReplies: response.relatedFAQs.map(faq => faq.question)
          });
        }, 1000);
      }
    } catch (error) {
      console.error('❌ APEX Context: Error in sendMessage:', error);
      addMessage({
        content: "I apologize, but I'm experiencing some technical difficulties. Let me connect you with our support team who can help you right away.",
        sender: 'assistant',
        type: 'contact_admin'
      });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const sendQuickReply = async (reply: string) => {
    await sendMessage(reply);
  };

  const contactAdmin = async () => {
    addMessage({
      content: "I'm connecting you with our administrative staff now. They'll be able to provide personalized assistance for your specific needs. You should receive a response within 24 hours, or immediately if it's urgent.",
      sender: 'assistant',
      type: 'contact_admin'
    });

    // Here you would typically send a notification to admin staff
    // For now, we'll simulate this
    setTimeout(() => {
      addMessage({
        content: "✅ Your request has been forwarded to our administrative team. You'll receive an email confirmation shortly with next steps.",
        sender: 'assistant',
        type: 'text'
      });
    }, 2000);
  };

  const clearMessages = () => {
    setState(prev => ({ ...prev, messages: [] }));
    setConversationHistory([]);
  };

  const setCategory = (category: string) => {
    setState(prev => ({ ...prev, currentCategory: category }));
  };

  const value: APEXContextType = {
    state,
    openAssistant,
    closeAssistant,
    sendMessage,
    sendQuickReply,
    contactAdmin,
    clearMessages,
    setCategory
  };

  return (
    <APEXContext.Provider value={value}>
      {children}
    </APEXContext.Provider>
  );
};

export const useAPEX = (): APEXContextType => {
  const context = useContext(APEXContext);
  if (context === undefined) {
    throw new Error('useAPEX must be used within an APEXProvider');
  }
  return context;
};
