-- Debug script to check retry settings and cooldown calculation
-- Replace these UUIDs with actual values from your database

-- First, let's see what retry settings are stored for a specific content item
-- You'll need to replace 'YOUR_LESSON_CONTENT_ID' with the actual UUID
SELECT 
    id,
    retry_settings,
    retry_settings->>'allowRetries' as allow_retries,
    retry_settings->>'retryCooldownHours' as cooldown_hours_raw,
    (retry_settings->>'retryCooldownHours')::numeric as cooldown_hours_numeric,
    retry_settings->>'maxRetries' as max_retries,
    retry_settings->>'retryThreshold' as retry_threshold
FROM course_lesson_content 
WHERE id = 'YOUR_LESSON_CONTENT_ID'; -- Replace with actual UUID

-- Let's also check the quiz attempts for a specific user and content
-- Replace 'YOUR_USER_ID' and 'YOUR_LESSON_CONTENT_ID' with actual UUIDs
SELECT 
    user_id,
    lesson_content_id,
    submitted_at,
    score,
    created_at
FROM quiz_attempts 
WHERE user_id = 'YOUR_USER_ID' 
  AND lesson_content_id = 'YOUR_LESSON_CONTENT_ID'
ORDER BY submitted_at DESC;

-- Let's test the cooldown calculation manually
-- Replace the values with actual ones from your data
WITH retry_data AS (
    SELECT 
        'YOUR_LESSON_CONTENT_ID'::uuid as lesson_content_id,
        'YOUR_USER_ID'::uuid as user_id,
        '2025-01-16 23:08:54'::timestamptz as last_attempt, -- Replace with actual last attempt time
        0.0167::numeric as cooldown_hours -- 1 minute = 1/60 hours
)
SELECT 
    lesson_content_id,
    user_id,
    last_attempt,
    cooldown_hours,
    now() as current_time,
    (now() - (cooldown_hours || ' hours')::interval) as cooldown_start_time,
    last_attempt > (now() - (cooldown_hours || ' hours')::interval) as is_in_cooldown,
    last_attempt + (cooldown_hours || ' hours')::interval as retry_after_time,
    EXTRACT(EPOCH FROM (last_attempt + (cooldown_hours || ' hours')::interval - now())) / 60 as minutes_until_retry
FROM retry_data;
