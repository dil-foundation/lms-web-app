-- Populate APEX tables with initial data
-- This script populates the apex_faqs, apex_knowledge_base, and apex_contact_info tables

-- First, clear existing data (optional - remove if you want to keep existing data)
-- DELETE FROM apex_faqs WHERE created_by IS NULL;
-- DELETE FROM apex_knowledge_base WHERE created_by IS NULL;
-- DELETE FROM apex_contact_info WHERE created_by IS NULL;

-- Insert FAQ data
INSERT INTO apex_faqs (question, answer, category, tags, priority, is_active) VALUES
('How do I enroll in a course?', 'To enroll in a course, go to your dashboard and click on "My Courses". Browse available courses and click "Enroll" on any course you''re interested in. Some courses may require approval from instructors.', 'Getting Started', ARRAY['enrollment', 'courses', 'dashboard'], 'high', true),

('I forgot my password. How do I reset it?', 'Click "Forgot Password" on the login page. Enter your email address and you''ll receive instructions to reset your password. Check your spam folder if you don''t see the email within 5 minutes.', 'Account & Login', ARRAY['password', 'login', 'reset'], 'high', true),

('What are the AI learning features?', 'Our platform includes 7-stage progressive AI learning with real-time speech recognition, interactive practice activities, adaptive learning paths, and personalized feedback. Access AI features through the "AI Learn" section in your dashboard.', 'AI Features', ARRAY['ai', 'learning', 'speech recognition', 'practice'], 'high', true),

('How do I submit an assignment?', 'Navigate to the course content page, find your assignment, and click on it. Use the submission area to upload files or type your response. Make sure to click "Submit" when finished. You can save drafts before final submission.', 'Courses & Learning', ARRAY['assignments', 'submission', 'files'], 'high', true),

('How do I contact support?', 'You can contact support through the AI Assistant (click the chat icon), email support@lms.com, or use the "Contact Admin" feature in your dashboard. For urgent issues, call our 24/7 support line.', 'Technical Support', ARRAY['support', 'contact', 'help'], 'high', true),

('Can I access the platform on mobile devices?', 'Yes! Our platform is fully responsive and works on all devices. You can also download our mobile app for iOS and Android for the best mobile experience.', 'Technical Support', ARRAY['mobile', 'app', 'responsive'], 'medium', true),

('How do I track my learning progress?', 'Your progress is tracked automatically. View it in the "Progress" section of your dashboard, which shows course completion, assignment grades, and AI learning analytics.', 'Courses & Learning', ARRAY['progress', 'tracking', 'analytics'], 'medium', true),

('What if I have technical issues?', 'For technical issues, try refreshing your browser first. If problems persist, contact our technical support team through the AI Assistant or email tech@lms.com. Include details about your browser and device.', 'Technical Support', ARRAY['technical', 'issues', 'troubleshooting'], 'high', true),

('How do I change my profile information?', 'Go to your dashboard and click on your profile picture, then select "Profile Settings". You can update your personal information, change your password, and manage notification preferences.', 'Account & Login', ARRAY['profile', 'settings', 'personal information'], 'medium', true),

('Can I download course materials for offline use?', 'Yes! Many course materials can be downloaded for offline access. Look for the download icon next to content items. Downloaded content syncs automatically when you''re back online.', 'Courses & Learning', ARRAY['download', 'offline', 'materials'], 'medium', true);

-- Insert Knowledge Base data
INSERT INTO apex_knowledge_base (title, content, category, tags, is_active) VALUES
('Platform Navigation Guide', 'The platform is organized into three main areas: Dashboard (your central hub), Courses (learning content), and Communication (messages and discussions). Use the sidebar navigation to access different features based on your role.', 'Getting Started', ARRAY['navigation', 'dashboard', 'sidebar'], true),

('AI Learning Stages Overview', 'Our AI learning system has 7 progressive stages: Stage 0 (Beginner), Stage 1 (Building Confidence), Stage 2 (Elementary), Stage 3 (Intermediate), Stage 4 (Upper Intermediate), Stage 5 (C1 Advanced), and Stage 6 (C2 Proficiency). Each stage builds upon the previous one.', 'AI Features', ARRAY['ai', 'stages', 'progressive learning'], true),

('Assignment Submission Best Practices', 'Always review assignment requirements before submitting. Save drafts regularly, check file formats are accepted, and submit before the deadline. Contact your instructor if you encounter technical issues during submission.', 'Courses & Learning', ARRAY['assignments', 'submission', 'best practices'], true),

('Security and Privacy Features', 'Your data is protected with enterprise-grade security including multi-factor authentication, data encryption, and regular backups. You can control your privacy settings in your profile and request data deletion if needed.', 'Administrative', ARRAY['security', 'privacy', 'data protection'], true);

-- Insert Contact Information
INSERT INTO apex_contact_info (department, email, phone, availability, description, priority, is_active) VALUES
('Technical Support', 'tech@lms.com', '+1-800-TECH-HELP', '24/7', 'For technical issues, login problems, and platform bugs', 'high', true),

('Course Support', 'courses@lms.com', NULL, 'Monday-Friday, 9 AM - 6 PM', 'For course enrollment, content questions, and academic support', 'high', true),

('Administrative Support', 'admin@lms.com', NULL, 'Monday-Friday, 8 AM - 5 PM', 'For account management, billing, and general inquiries', 'medium', true),

('AI Learning Support', 'ai-support@lms.com', NULL, 'Monday-Friday, 10 AM - 8 PM', 'For AI learning features, speech recognition, and practice activities', 'high', true);

-- Create a table to log chat interactions (optional)
CREATE TABLE IF NOT EXISTS apex_chat_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_message text NOT NULL,
  ai_response text NOT NULL,
  query_results jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for chat logs
CREATE INDEX IF NOT EXISTS idx_apex_chat_logs_user_id ON apex_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_apex_chat_logs_created_at ON apex_chat_logs(created_at DESC);

-- Display summary
SELECT 
  'FAQs' as table_name, 
  count(*) as record_count 
FROM apex_faqs 
WHERE is_active = true

UNION ALL

SELECT 
  'Knowledge Base' as table_name, 
  count(*) as record_count 
FROM apex_knowledge_base 
WHERE is_active = true

UNION ALL

SELECT 
  'Contact Info' as table_name, 
  count(*) as record_count 
FROM apex_contact_info 
WHERE is_active = true;
