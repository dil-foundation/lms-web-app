const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRetrySettings() {
  try {
    console.log('Checking retry settings in database...');
    
    const { data, error } = await supabase
      .from('course_lesson_content')
      .select('id, title, content_type, retry_settings, created_at')
      .eq('id', '9beb83bd-40f0-4eda-9422-dd6c35d09af3')
      .single();
    
    if (error) {
      console.error('Error:', error);
      return;
    }
    
    console.log('Retry settings data:', JSON.stringify(data, null, 2));
    
    // Also check all quiz content items with retry settings
    const { data: allQuizzes, error: allError } = await supabase
      .from('course_lesson_content')
      .select('id, title, content_type, retry_settings')
      .eq('content_type', 'quiz')
      .not('retry_settings', 'is', null);
    
    if (allError) {
      console.error('Error fetching all quizzes:', allError);
      return;
    }
    
    console.log('All quiz content items with retry settings:', JSON.stringify(allQuizzes, null, 2));
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkRetrySettings();
