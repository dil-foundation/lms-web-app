-- Fix the retry settings to use proper decimal cooldown hours
-- Quiz ID: df1a1093-883b-4c24-a5dc-00af9e2bf7e6

-- Update the retry settings to use 1 minute (0.0167 hours) cooldown
UPDATE course_lesson_content 
SET retry_settings = jsonb_set(
    retry_settings, 
    '{retryCooldownHours}', 
    '0.0167'::jsonb
)
WHERE id = 'df1a1093-883b-4c24-a5dc-00af9e2bf7e6';

-- Verify the update
SELECT 
    id,
    title,
    retry_settings,
    retry_settings->>'retryCooldownHours' as cooldown_hours_raw,
    (retry_settings->>'retryCooldownHours')::numeric as cooldown_hours_numeric
FROM course_lesson_content 
WHERE id = 'df1a1093-883b-4c24-a5dc-00af9e2bf7e6';
