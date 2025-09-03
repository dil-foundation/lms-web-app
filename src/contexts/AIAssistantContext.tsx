import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AIAssistantService } from '@/services/aiAssistantService';

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

interface AIAssistantContextType {
  state: AIAssistantState;
  openAssistant: () => void;
  closeAssistant: () => void;
  sendMessage: (message: string) => Promise<void>;
  sendQuickReply: (reply: string) => Promise<void>;
  contactAdmin: () => Promise<void>;
  clearMessages: () => void;
  setCategory: (category: string) => void;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

interface AIAssistantProviderProps {
  children: ReactNode;
}

export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  
  const [state, setState] = useState<AIAssistantState>({
    isOpen: false,
    messages: [],
    isLoading: false,
    isTyping: false,
    quickReplies: [
      "How do I enroll in a course?",
      "I forgot my password",
      "How do I contact support?",
      "What are the AI learning features?",
      "How do I submit an assignment?",
      "I'm having technical issues"
    ],
    faqCategories: [
      "Getting Started",
      "Account & Login",
      "Courses & Learning",
      "AI Features",
      "Technical Support",
      "Administrative"
    ]
  });

  // Initialize with welcome message
  useEffect(() => {
    if (state.messages.length === 0) {
      const welcomeMessage: AIMessage = {
        id: 'welcome',
        content: `Hello${user ? ` ${profile?.first_name || 'there'}` : ''}! I'm your AI Digital Assistant. I'm here to help you with questions about our LMS platform and connect you with our administrative staff when needed. How can I assist you today?`,
        sender: 'assistant',
        timestamp: new Date(),
        type: 'text',
        quickReplies: state.quickReplies
      };
      setState(prev => ({ ...prev, messages: [welcomeMessage] }));
    }
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
    // Simulate AI processing time
    await simulateTyping(1500 + Math.random() * 1000);

    // Use the knowledge base service to generate responses
    return AIAssistantService.generateResponse(userMessage);
  };

  const sendMessage = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    addMessage({
      content: message,
      sender: 'user',
      type: 'text'
    });

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await generateAIResponse(message);
      
      // Add AI response
      addMessage({
        content: response.answer,
        sender: 'assistant',
        type: 'text',
        quickReplies: state.quickReplies
      });

      // Add related FAQs if available
      if (response.relatedFAQs && response.relatedFAQs.length > 0) {
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
  };

  const setCategory = (category: string) => {
    setState(prev => ({ ...prev, currentCategory: category }));
  };

  const value: AIAssistantContextType = {
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
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
};

export const useAIAssistant = (): AIAssistantContextType => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};
