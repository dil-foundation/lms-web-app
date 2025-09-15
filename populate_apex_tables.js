import { createClient } from '@supabase/supabase-js';

// Use hardcoded values for local development
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// FAQ data
const faqData = [
  {
    question: 'How do I enroll in a course?',
    answer: 'To enroll in a course, go to your dashboard and click on "My Courses". Browse available courses and click "Enroll" on any course you\'re interested in. Some courses may require approval from instructors.',
    category: 'Getting Started',
    tags: ['enrollment', 'courses', 'dashboard'],
    priority: 'high'
  },
  {
    question: 'I forgot my password. How do I reset it?',
    answer: 'Click "Forgot Password" on the login page. Enter your email address and you\'ll receive instructions to reset your password. Check your spam folder if you don\'t see the email within 5 minutes.',
    category: 'Account & Login',
    tags: ['password', 'login', 'reset'],
    priority: 'high'
  },
  {
    question: 'What are the AI learning features?',
    answer: 'Our platform includes 7-stage progressive AI learning with real-time speech recognition, interactive practice activities, adaptive learning paths, and personalized feedback. Access AI features through the "AI Learn" section in your dashboard.',
    category: 'AI Features',
    tags: ['ai', 'learning', 'speech recognition', 'practice'],
    priority: 'high'
  },
  {
    question: 'How do I submit an assignment?',
    answer: 'Navigate to the course content page, find your assignment, and click on it. Use the submission area to upload files or type your response. Make sure to click "Submit" when finished. You can save drafts before final submission.',
    category: 'Courses & Learning',
    tags: ['assignments', 'submission', 'files'],
    priority: 'high'
  },
  {
    question: 'How do I contact support?',
    answer: 'You can contact support through the AI Assistant (click the chat icon), email support@lms.com, or use the "Contact Admin" feature in your dashboard. For urgent issues, call our 24/7 support line.',
    category: 'Technical Support',
    tags: ['support', 'contact', 'help'],
    priority: 'high'
  },
  {
    question: 'Can I access the platform on mobile devices?',
    answer: 'Yes! Our platform is fully responsive and works on all devices. You can also download our mobile app for iOS and Android for the best mobile experience.',
    category: 'Technical Support',
    tags: ['mobile', 'app', 'responsive'],
    priority: 'medium'
  },
  {
    question: 'How do I track my learning progress?',
    answer: 'Your progress is tracked automatically. View it in the "Progress" section of your dashboard, which shows course completion, assignment grades, and AI learning analytics.',
    category: 'Courses & Learning',
    tags: ['progress', 'tracking', 'analytics'],
    priority: 'medium'
  },
  {
    question: 'What if I have technical issues?',
    answer: 'For technical issues, try refreshing your browser first. If problems persist, contact our technical support team through the AI Assistant or email tech@lms.com. Include details about your browser and device.',
    category: 'Technical Support',
    tags: ['technical', 'issues', 'troubleshooting'],
    priority: 'high'
  },
  {
    question: 'How do I change my profile information?',
    answer: 'Go to your dashboard and click on your profile picture, then select "Profile Settings". You can update your personal information, change your password, and manage notification preferences.',
    category: 'Account & Login',
    tags: ['profile', 'settings', 'personal information'],
    priority: 'medium'
  },
  {
    question: 'Can I download course materials for offline use?',
    answer: 'Yes! Many course materials can be downloaded for offline access. Look for the download icon next to content items. Downloaded content syncs automatically when you\'re back online.',
    category: 'Courses & Learning',
    tags: ['download', 'offline', 'materials'],
    priority: 'medium'
  }
];

// Knowledge Base data
const knowledgeBaseData = [
  {
    title: 'Platform Navigation Guide',
    content: 'The platform is organized into three main areas: Dashboard (your central hub), Courses (learning content), and Communication (messages and discussions). Use the sidebar navigation to access different features based on your role.',
    category: 'Getting Started',
    tags: ['navigation', 'dashboard', 'sidebar']
  },
  {
    title: 'AI Learning Stages Overview',
    content: 'Our AI learning system has 7 progressive stages: Stage 0 (Beginner), Stage 1 (Building Confidence), Stage 2 (Elementary), Stage 3 (Intermediate), Stage 4 (Upper Intermediate), Stage 5 (C1 Advanced), and Stage 6 (C2 Proficiency). Each stage builds upon the previous one.',
    category: 'AI Features',
    tags: ['ai', 'stages', 'progressive learning']
  },
  {
    title: 'Assignment Submission Best Practices',
    content: 'Always review assignment requirements before submitting. Save drafts regularly, check file formats are accepted, and submit before the deadline. Contact your instructor if you encounter technical issues during submission.',
    category: 'Courses & Learning',
    tags: ['assignments', 'submission', 'best practices']
  },
  {
    title: 'Security and Privacy Features',
    content: 'Your data is protected with enterprise-grade security including multi-factor authentication, data encryption, and regular backups. You can control your privacy settings in your profile and request data deletion if needed.',
    category: 'Administrative',
    tags: ['security', 'privacy', 'data protection']
  }
];

// Contact Info data
const contactInfoData = [
  {
    department: 'Technical Support',
    email: 'tech@lms.com',
    phone: '+1-800-TECH-HELP',
    availability: '24/7',
    description: 'For technical issues, login problems, and platform bugs',
    priority: 'high'
  },
  {
    department: 'Course Support',
    email: 'courses@lms.com',
    phone: null,
    availability: 'Monday-Friday, 9 AM - 6 PM',
    description: 'For course enrollment, content questions, and academic support',
    priority: 'high'
  },
  {
    department: 'Administrative Support',
    email: 'admin@lms.com',
    phone: null,
    availability: 'Monday-Friday, 8 AM - 5 PM',
    description: 'For account management, billing, and general inquiries',
    priority: 'medium'
  },
  {
    department: 'AI Learning Support',
    email: 'ai-support@lms.com',
    phone: null,
    availability: 'Monday-Friday, 10 AM - 8 PM',
    description: 'For AI learning features, speech recognition, and practice activities',
    priority: 'high'
  }
];

async function populateApexTables() {
  try {
    console.log('🚀 Starting APEX tables population...');
    
    // Insert FAQs
    console.log('📝 Inserting FAQ data...');
    const { data: faqInsert, error: faqError } = await supabase
      .from('apex_faqs')
      .insert(faqData.map(faq => ({ ...faq, is_active: true })));
    
    if (faqError) {
      console.error('❌ Error inserting FAQs:', faqError);
    } else {
      console.log(`✅ Successfully inserted ${faqData.length} FAQs`);
    }
    
    // Insert Knowledge Base
    console.log('📚 Inserting Knowledge Base data...');
    const { data: kbInsert, error: kbError } = await supabase
      .from('apex_knowledge_base')
      .insert(knowledgeBaseData.map(kb => ({ ...kb, is_active: true })));
    
    if (kbError) {
      console.error('❌ Error inserting Knowledge Base:', kbError);
    } else {
      console.log(`✅ Successfully inserted ${knowledgeBaseData.length} Knowledge Base articles`);
    }
    
    // Insert Contact Info
    console.log('📞 Inserting Contact Info data...');
    const { data: contactInsert, error: contactError } = await supabase
      .from('apex_contact_info')
      .insert(contactInfoData.map(contact => ({ ...contact, is_active: true })));
    
    if (contactError) {
      console.error('❌ Error inserting Contact Info:', contactError);
    } else {
      console.log(`✅ Successfully inserted ${contactInfoData.length} Contact Info entries`);
    }
    
    // Verify data
    console.log('\n🔍 Verifying data insertion...');
    
    const { count: faqCount } = await supabase
      .from('apex_faqs')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: kbCount } = await supabase
      .from('apex_knowledge_base')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    const { count: contactCount } = await supabase
      .from('apex_contact_info')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    console.log('\n📊 Final Data Summary:');
    console.log(`   📝 FAQs: ${faqCount} records`);
    console.log(`   📚 Knowledge Base: ${kbCount} records`);
    console.log(`   📞 Contact Info: ${contactCount} records`);
    
    console.log('\n✅ APEX tables population completed successfully!');
    console.log('\n🤖 Your AI Assistant is now ready to use the database-driven approach.');
    console.log('   Next steps:');
    console.log('   1. Deploy the apex-ai-assistant Edge Function');
    console.log('   2. Set up your OpenAI API key in Supabase');
    console.log('   3. Test the new AI Assistant functionality');
    
  } catch (error) {
    console.error('❌ Failed to populate APEX tables:', error);
    process.exit(1);
  }
}

// Run the population
populateApexTables();
