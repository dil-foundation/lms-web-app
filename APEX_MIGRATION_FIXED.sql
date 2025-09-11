-- APEX (AI-Powered Educational eXperience) Admin Tables - CORRECTED VERSION
-- Copy and paste this entire SQL into your Supabase SQL Editor and run it

-- Create enum types for better data consistency
CREATE TYPE faq_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE contact_priority AS ENUM ('high', 'medium', 'low');

-- FAQ Management Table
CREATE TABLE IF NOT EXISTS apex_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  priority faq_priority DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for FAQs table
COMMENT ON TABLE apex_faqs IS 'Frequently Asked Questions for the AI Assistant';
COMMENT ON COLUMN apex_faqs.question IS 'The FAQ question text';
COMMENT ON COLUMN apex_faqs.answer IS 'The answer to the FAQ question';
COMMENT ON COLUMN apex_faqs.category IS 'Category for organizing FAQs';
COMMENT ON COLUMN apex_faqs.tags IS 'Array of tags for better searchability';
COMMENT ON COLUMN apex_faqs.priority IS 'Priority level (high, medium, low)';
COMMENT ON COLUMN apex_faqs.is_active IS 'Whether the FAQ is currently active/visible';

-- Knowledge Base Table
CREATE TABLE IF NOT EXISTS apex_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  related_faq_ids UUID[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for Knowledge Base table
COMMENT ON TABLE apex_knowledge_base IS 'Knowledge base articles for the AI Assistant';
COMMENT ON COLUMN apex_knowledge_base.title IS 'Title of the knowledge base article';
COMMENT ON COLUMN apex_knowledge_base.content IS 'Full content of the article';
COMMENT ON COLUMN apex_knowledge_base.category IS 'Category for organizing articles';
COMMENT ON COLUMN apex_knowledge_base.tags IS 'Array of tags for better searchability';
COMMENT ON COLUMN apex_knowledge_base.related_faq_ids IS 'Array of related FAQ IDs';
COMMENT ON COLUMN apex_knowledge_base.is_active IS 'Whether the article is currently active/visible';

-- Contact Information Table
CREATE TABLE IF NOT EXISTS apex_contact_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  availability TEXT NOT NULL,
  description TEXT NOT NULL,
  priority contact_priority DEFAULT 'medium',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments for Contact Info table
COMMENT ON TABLE apex_contact_info IS 'Contact information for different support departments';
COMMENT ON COLUMN apex_contact_info.department IS 'Name of the support department';
COMMENT ON COLUMN apex_contact_info.email IS 'Contact email address';
COMMENT ON COLUMN apex_contact_info.phone IS 'Contact phone number (optional)';
COMMENT ON COLUMN apex_contact_info.availability IS 'Available hours/days';
COMMENT ON COLUMN apex_contact_info.description IS 'Description of what this department handles';
COMMENT ON COLUMN apex_contact_info.priority IS 'Priority level for displaying contacts';
COMMENT ON COLUMN apex_contact_info.is_active IS 'Whether the contact is currently active/visible';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_apex_faqs_category ON apex_faqs(category);
CREATE INDEX IF NOT EXISTS idx_apex_faqs_priority ON apex_faqs(priority);
CREATE INDEX IF NOT EXISTS idx_apex_faqs_active ON apex_faqs(is_active);
CREATE INDEX IF NOT EXISTS idx_apex_faqs_tags ON apex_faqs USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_apex_faqs_created_at ON apex_faqs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apex_knowledge_category ON apex_knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_apex_knowledge_active ON apex_knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_apex_knowledge_tags ON apex_knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_apex_knowledge_created_at ON apex_knowledge_base(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_apex_contact_department ON apex_contact_info(department);
CREATE INDEX IF NOT EXISTS idx_apex_contact_priority ON apex_contact_info(priority);
CREATE INDEX IF NOT EXISTS idx_apex_contact_active ON apex_contact_info(is_active);

-- Enable Row Level Security
ALTER TABLE apex_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE apex_knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE apex_contact_info ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for apex_faqs
CREATE POLICY "Anyone can view active FAQs" ON apex_faqs
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can view all FAQs" ON apex_faqs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert FAQs" ON apex_faqs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update FAQs" ON apex_faqs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete FAQs" ON apex_faqs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS Policies for apex_knowledge_base
CREATE POLICY "Anyone can view active knowledge base articles" ON apex_knowledge_base
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can view all knowledge base articles" ON apex_knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert knowledge base articles" ON apex_knowledge_base
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update knowledge base articles" ON apex_knowledge_base
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete knowledge base articles" ON apex_knowledge_base
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS Policies for apex_contact_info
CREATE POLICY "Anyone can view active contact info" ON apex_contact_info
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can view all contact info" ON apex_contact_info
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert contact info" ON apex_contact_info
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update contact info" ON apex_contact_info
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete contact info" ON apex_contact_info
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger functions for updating timestamps
CREATE OR REPLACE FUNCTION update_apex_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER apex_faqs_updated_at
  BEFORE UPDATE ON apex_faqs
  FOR EACH ROW EXECUTE FUNCTION update_apex_updated_at();

CREATE TRIGGER apex_knowledge_base_updated_at
  BEFORE UPDATE ON apex_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION update_apex_updated_at();

CREATE TRIGGER apex_contact_info_updated_at
  BEFORE UPDATE ON apex_contact_info
  FOR EACH ROW EXECUTE FUNCTION update_apex_updated_at();

-- Insert default data
INSERT INTO apex_faqs (question, answer, category, tags, priority, created_by) VALUES
('How do I enroll in a course?', 'To enroll in a course, go to your dashboard and click on "My Courses". Browse available courses and click "Enroll" on any course you''re interested in. Some courses may require approval from instructors.', 'Getting Started', ARRAY['enrollment', 'courses', 'dashboard'], 'high', NULL),
('I forgot my password. How do I reset it?', 'Click "Forgot Password" on the login page. Enter your email address and you''ll receive instructions to reset your password. Check your spam folder if you don''t see the email within 5 minutes.', 'Account & Login', ARRAY['password', 'login', 'reset'], 'high', NULL),
('What are the AI learning features?', 'Our platform includes 7-stage progressive AI learning with real-time speech recognition, interactive practice activities, adaptive learning paths, and personalized feedback. Access AI features through the "AI Learn" section in your dashboard.', 'AI Features', ARRAY['ai', 'learning', 'speech recognition', 'practice'], 'high', NULL),
('How do I submit an assignment?', 'Navigate to the course content page, find your assignment, and click on it. Use the submission area to upload files or type your response. Make sure to click "Submit" when finished. You can save drafts before final submission.', 'Courses & Learning', ARRAY['assignments', 'submission', 'files'], 'high', NULL),
('How do I contact support?', 'You can contact support through the AI Assistant (click the chat icon), email support@lms.com, or use the "Contact Admin" feature in your dashboard. For urgent issues, call our 24/7 support line.', 'Technical Support', ARRAY['support', 'contact', 'help'], 'high', NULL),
('Can I access the platform on mobile devices?', 'Yes! Our platform is fully responsive and works on all devices. You can also download our mobile app for iOS and Android for the best mobile experience.', 'Technical Support', ARRAY['mobile', 'app', 'responsive'], 'medium', NULL),
('How do I track my learning progress?', 'Your progress is tracked automatically. View it in the "Progress" section of your dashboard, which shows course completion, assignment grades, and AI learning analytics.', 'Courses & Learning', ARRAY['progress', 'tracking', 'analytics'], 'medium', NULL),
('What if I have technical issues?', 'For technical issues, try refreshing your browser first. If problems persist, contact our technical support team through the AI Assistant or email tech@lms.com. Include details about your browser and device.', 'Technical Support', ARRAY['technical', 'issues', 'troubleshooting'], 'high', NULL),
('How do I change my profile information?', 'Go to your dashboard and click on your profile picture, then select "Profile Settings". You can update your personal information, change your password, and manage notification preferences.', 'Account & Login', ARRAY['profile', 'settings', 'personal information'], 'medium', NULL),
('Can I download course materials for offline use?', 'Yes! Many course materials can be downloaded for offline access. Look for the download icon next to content items. Downloaded content syncs automatically when you''re back online.', 'Courses & Learning', ARRAY['download', 'offline', 'materials'], 'medium', NULL);

INSERT INTO apex_knowledge_base (title, content, category, tags, created_by) VALUES
('Platform Navigation Guide', 'The platform is organized into three main areas: Dashboard (your central hub), Courses (learning content), and Communication (messages and discussions). Use the sidebar navigation to access different features based on your role.', 'Getting Started', ARRAY['navigation', 'dashboard', 'sidebar'], NULL),
('AI Learning Stages Overview', 'Our AI learning system has 7 progressive stages: Stage 0 (Beginner), Stage 1 (Building Confidence), Stage 2 (Elementary), Stage 3 (Intermediate), Stage 4 (Upper Intermediate), Stage 5 (C1 Advanced), and Stage 6 (C2 Proficiency). Each stage builds upon the previous one.', 'AI Features', ARRAY['ai', 'stages', 'progressive learning'], NULL),
('Assignment Submission Best Practices', 'Always review assignment requirements before submitting. Save drafts regularly, check file formats are accepted, and submit before the deadline. Contact your instructor if you encounter technical issues during submission.', 'Courses & Learning', ARRAY['assignments', 'submission', 'best practices'], NULL),
('Security and Privacy Features', 'Your data is protected with enterprise-grade security including multi-factor authentication, data encryption, and regular backups. You can control your privacy settings in your profile and request data deletion if needed.', 'Administrative', ARRAY['security', 'privacy', 'data protection'], NULL);

INSERT INTO apex_contact_info (department, email, phone, availability, description, priority, created_by) VALUES
('Technical Support', 'tech@lms.com', '+1-800-TECH-HELP', '24/7', 'For technical issues, login problems, and platform bugs', 'high', NULL),
('Course Support', 'courses@lms.com', NULL, 'Monday-Friday, 9 AM - 6 PM', 'For course enrollment, content questions, and academic support', 'high', NULL),
('Administrative Support', 'admin@lms.com', NULL, 'Monday-Friday, 8 AM - 5 PM', 'For account management, billing, and general inquiries', 'medium', NULL),
('AI Learning Support', 'ai-support@lms.com', NULL, 'Monday-Friday, 10 AM - 8 PM', 'For AI learning features, speech recognition, and practice activities', 'high', NULL);
