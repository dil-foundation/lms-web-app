export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: 'high' | 'medium' | 'low';
  lastUpdated: Date;
}

export interface KnowledgeBaseItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  relatedItems: string[];
  lastUpdated: Date;
}

export interface ContactInfo {
  id: string;
  department: string;
  email: string;
  phone?: string;
  availability: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// FAQ Knowledge Base
export const FAQ_ITEMS: FAQItem[] = [
  {
    id: 'faq-001',
    question: 'How do I enroll in a course?',
    answer: 'To enroll in a course, go to your dashboard and click on "My Courses". Browse available courses and click "Enroll" on any course you\'re interested in. Some courses may require approval from instructors.',
    category: 'Getting Started',
    tags: ['enrollment', 'courses', 'dashboard'],
    priority: 'high',
    lastUpdated: new Date()
  },
  {
    id: 'faq-002',
    question: 'I forgot my password. How do I reset it?',
    answer: 'Click "Forgot Password" on the login page. Enter your email address and you\'ll receive instructions to reset your password. Check your spam folder if you don\'t see the email within 5 minutes.',
    category: 'Account & Login',
    tags: ['password', 'login', 'reset'],
    priority: 'high',
    lastUpdated: new Date()
  },
  {
    id: 'faq-003',
    question: 'What are the AI learning features?',
    answer: 'Our platform includes 7-stage progressive AI learning with real-time speech recognition, interactive practice activities, adaptive learning paths, and personalized feedback. Access AI features through the "AI Learn" section in your dashboard.',
    category: 'AI Features',
    tags: ['ai', 'learning', 'speech recognition', 'practice'],
    priority: 'high',
    lastUpdated: new Date()
  },
  {
    id: 'faq-004',
    question: 'How do I submit an assignment?',
    answer: 'Navigate to the course content page, find your assignment, and click on it. Use the submission area to upload files or type your response. Make sure to click "Submit" when finished. You can save drafts before final submission.',
    category: 'Courses & Learning',
    tags: ['assignments', 'submission', 'files'],
    priority: 'high',
    lastUpdated: new Date()
  },
  {
    id: 'faq-005',
    question: 'How do I contact support?',
    answer: 'You can contact support through the AI Assistant (click the chat icon), email support@lms.com, or use the "Contact Admin" feature in your dashboard. For urgent issues, call our 24/7 support line.',
    category: 'Technical Support',
    tags: ['support', 'contact', 'help'],
    priority: 'high',
    lastUpdated: new Date()
  },
  {
    id: 'faq-006',
    question: 'Can I access the platform on mobile devices?',
    answer: 'Yes! Our platform is fully responsive and works on all devices. You can also download our mobile app for iOS and Android for the best mobile experience.',
    category: 'Technical Support',
    tags: ['mobile', 'app', 'responsive'],
    priority: 'medium',
    lastUpdated: new Date()
  },
  {
    id: 'faq-007',
    question: 'How do I track my learning progress?',
    answer: 'Your progress is tracked automatically. View it in the "Progress" section of your dashboard, which shows course completion, assignment grades, and AI learning analytics.',
    category: 'Courses & Learning',
    tags: ['progress', 'tracking', 'analytics'],
    priority: 'medium',
    lastUpdated: new Date()
  },
  {
    id: 'faq-008',
    question: 'What if I have technical issues?',
    answer: 'For technical issues, try refreshing your browser first. If problems persist, contact our technical support team through the AI Assistant or email tech@lms.com. Include details about your browser and device.',
    category: 'Technical Support',
    tags: ['technical', 'issues', 'troubleshooting'],
    priority: 'high',
    lastUpdated: new Date()
  },
  {
    id: 'faq-009',
    question: 'How do I change my profile information?',
    answer: 'Go to your dashboard and click on your profile picture, then select "Profile Settings". You can update your personal information, change your password, and manage notification preferences.',
    category: 'Account & Login',
    tags: ['profile', 'settings', 'personal information'],
    priority: 'medium',
    lastUpdated: new Date()
  },
  {
    id: 'faq-010',
    question: 'Can I download course materials for offline use?',
    answer: 'Yes! Many course materials can be downloaded for offline access. Look for the download icon next to content items. Downloaded content syncs automatically when you\'re back online.',
    category: 'Courses & Learning',
    tags: ['download', 'offline', 'materials'],
    priority: 'medium',
    lastUpdated: new Date()
  }
];

// Knowledge Base Items
export const KNOWLEDGE_BASE: KnowledgeBaseItem[] = [
  {
    id: 'kb-001',
    title: 'Platform Navigation Guide',
    content: 'The platform is organized into three main areas: Dashboard (your central hub), Courses (learning content), and Communication (messages and discussions). Use the sidebar navigation to access different features based on your role.',
    category: 'Getting Started',
    tags: ['navigation', 'dashboard', 'sidebar'],
    relatedItems: ['faq-001', 'faq-007'],
    lastUpdated: new Date()
  },
  {
    id: 'kb-002',
    title: 'AI Learning Stages Overview',
    content: 'Our AI learning system has 7 progressive stages: Stage 0 (Beginner), Stage 1 (Building Confidence), Stage 2 (Elementary), Stage 3 (Intermediate), Stage 4 (Upper Intermediate), Stage 5 (C1 Advanced), and Stage 6 (C2 Proficiency). Each stage builds upon the previous one.',
    category: 'AI Features',
    tags: ['ai', 'stages', 'progressive learning'],
    relatedItems: ['faq-003'],
    lastUpdated: new Date()
  },
  {
    id: 'kb-003',
    title: 'Assignment Submission Best Practices',
    content: 'Always review assignment requirements before submitting. Save drafts regularly, check file formats are accepted, and submit before the deadline. Contact your instructor if you encounter technical issues during submission.',
    category: 'Courses & Learning',
    tags: ['assignments', 'submission', 'best practices'],
    relatedItems: ['faq-004'],
    lastUpdated: new Date()
  },
  {
    id: 'kb-004',
    title: 'Security and Privacy Features',
    content: 'Your data is protected with enterprise-grade security including multi-factor authentication, data encryption, and regular backups. You can control your privacy settings in your profile and request data deletion if needed.',
    category: 'Administrative',
    tags: ['security', 'privacy', 'data protection'],
    relatedItems: ['faq-009'],
    lastUpdated: new Date()
  }
];

// Contact Information
export const CONTACT_INFO: ContactInfo[] = [
  {
    id: 'contact-001',
    department: 'Technical Support',
    email: 'tech@lms.com',
    phone: '+1-800-TECH-HELP',
    availability: '24/7',
    description: 'For technical issues, login problems, and platform bugs',
    priority: 'high'
  },
  {
    id: 'contact-002',
    department: 'Course Support',
    email: 'courses@lms.com',
    availability: 'Monday-Friday, 9 AM - 6 PM',
    description: 'For course enrollment, content questions, and academic support',
    priority: 'high'
  },
  {
    id: 'contact-003',
    department: 'Administrative Support',
    email: 'admin@lms.com',
    availability: 'Monday-Friday, 8 AM - 5 PM',
    description: 'For account management, billing, and general inquiries',
    priority: 'medium'
  },
  {
    id: 'contact-004',
    department: 'AI Learning Support',
    email: 'ai-support@lms.com',
    availability: 'Monday-Friday, 10 AM - 8 PM',
    description: 'For AI learning features, speech recognition, and practice activities',
    priority: 'high'
  }
];

export class APEXService {
  static searchFAQ(query: string): FAQItem[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return FAQ_ITEMS.filter(item => {
      const searchableText = `${item.question} ${item.answer} ${item.tags.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    }).sort((a, b) => {
      // Prioritize high priority items
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (b.priority === 'high' && a.priority !== 'high') return 1;
      return 0;
    });
  }

  static getFAQByCategory(category: string): FAQItem[] {
    return FAQ_ITEMS.filter(item => item.category === category);
  }

  static getKnowledgeBaseItem(id: string): KnowledgeBaseItem | undefined {
    return KNOWLEDGE_BASE.find(item => item.id === id);
  }

  static searchKnowledgeBase(query: string): KnowledgeBaseItem[] {
    const searchTerms = query.toLowerCase().split(' ');
    
    return KNOWLEDGE_BASE.filter(item => {
      const searchableText = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase();
      return searchTerms.some(term => searchableText.includes(term));
    });
  }

  static getContactInfo(department?: string): ContactInfo[] {
    if (department) {
      return CONTACT_INFO.filter(contact => 
        contact.department.toLowerCase().includes(department.toLowerCase())
      );
    }
    return CONTACT_INFO;
  }

  static getQuickReplies(): string[] {
    return [
      "How do I enroll in a course?",
      "I forgot my password. How do I reset it?",
      "How do I contact support?",
      "What are the AI learning features?",
      "How do I submit an assignment?",
      "What if I have technical issues?",
      "How do I track my learning progress?",
      "Can I access the platform on mobile devices?",
      "How do I change my profile information?",
      "Can I download course materials for offline use?"
    ];
  }

  static getFAQCategories(): string[] {
    return ['Getting Started', 'Account & Login', 'Courses & Learning', 'AI Features', 'Technical Support', 'Administrative'];
  }

  static generateResponse(query: string): { answer: string; relatedFAQs?: FAQItem[]; contactInfo?: ContactInfo[] } {
    const normalizedQuery = query.toLowerCase().trim();
    
    // First, try to find exact matches for common questions
    const exactMatches = FAQ_ITEMS.filter(item => {
      const normalizedQuestion = item.question.toLowerCase().trim();
      return normalizedQuestion === normalizedQuery || 
             normalizedQuestion.includes(normalizedQuery) ||
             normalizedQuery.includes(normalizedQuestion);
    });
    
    if (exactMatches.length > 0) {
      const bestMatch = exactMatches[0];
      return {
        answer: bestMatch.answer,
        relatedFAQs: exactMatches.slice(1, 4),
        contactInfo: this.getContactInfo()
      };
    }
    
    // If no exact match, try keyword-based search
    const searchResults = this.searchFAQ(query);
    const knowledgeResults = this.searchKnowledgeBase(query);
    
    if (searchResults.length > 0) {
      const bestMatch = searchResults[0];
      return {
        answer: bestMatch.answer,
        relatedFAQs: searchResults.slice(1, 4),
        contactInfo: this.getContactInfo()
      };
    }
    
    if (knowledgeResults.length > 0) {
      const bestMatch = knowledgeResults[0];
      return {
        answer: bestMatch.content,
        contactInfo: this.getContactInfo()
      };
    }
    
    // Default response with contact information
    return {
      answer: "I understand you're looking for help. While I have extensive knowledge about our platform, I'd be happy to connect you with our administrative staff who can provide more detailed assistance. What specific area would you like help with?",
      contactInfo: this.getContactInfo()
    };
  }
}
