-- Verify retry settings are actually saved in the database
SELECT 
    id,
    title,
    content_type,
    retry_settings,
    created_at
FROM course_lesson_content 
WHERE id = '9beb83bd-40f0-4eda-9422-dd6c35d09af3';

-- Check all quiz content items with retry settings
SELECT 
    id,
    title,
    content_type,
    retry_settings
FROM course_lesson_content 
WHERE content_type = 'quiz' 
AND retry_settings IS NOT NULL
ORDER BY created_at DESC;
