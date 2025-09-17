-- Simple debug queries to check retry settings

-- 1. Check all content items with retry settings
SELECT 
    id,
    title,
    retry_settings
FROM course_lesson_content 
WHERE retry_settings IS NOT NULL
LIMIT 10;

-- 2. Check if the function was updated correctly
SELECT 
    proname as function_name,
    prosrc as function_source
FROM pg_proc 
WHERE proname = 'can_retry_quiz';

-- 3. Test the function with sample data
-- You'll need to replace the UUIDs with actual values
SELECT can_retry_quiz(
    'YOUR_USER_ID'::uuid,  -- Replace with actual user ID
    'YOUR_LESSON_CONTENT_ID'::uuid  -- Replace with actual lesson content ID
);
