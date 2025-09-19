-- Debug script to check retry cooldown calculation
-- Run these queries in your Supabase SQL editor to debug the issue

-- 1. First, let's see what retry settings are actually stored
-- Replace 'YOUR_LESSON_CONTENT_ID' with the actual UUID from your quiz
SELECT 
    id,
    title,
    retry_settings,
    retry_settings->>'allowRetries' as allow_retries,
    retry_settings->>'retryCooldownHours' as cooldown_hours_raw,
    (retry_settings->>'retryCooldownHours')::numeric as cooldown_hours_numeric,
    retry_settings->>'maxRetries' as max_retries,
    retry_settings->>'retryThreshold' as retry_threshold
FROM course_lesson_content 
WHERE retry_settings IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check quiz attempts for debugging
-- Replace 'YOUR_USER_ID' and 'YOUR_LESSON_CONTENT_ID' with actual UUIDs
SELECT 
    user_id,
    lesson_content_id,
    submitted_at,
    score,
    created_at,
    now() as current_time,
    submitted_at + interval '1 minute' as retry_after_1min,
    submitted_at + interval '1 hour' as retry_after_1hour
FROM quiz_attempts 
WHERE user_id = 'YOUR_USER_ID' 
  AND lesson_content_id = 'YOUR_LESSON_CONTENT_ID'
ORDER BY submitted_at DESC
LIMIT 3;

-- 3. Test the cooldown calculation with actual values
-- Replace the values with your actual data
WITH test_data AS (
    SELECT 
        'YOUR_LESSON_CONTENT_ID'::uuid as lesson_content_id,
        'YOUR_USER_ID'::uuid as user_id,
        '2025-01-16 23:08:54'::timestamptz as last_attempt, -- Use your actual last attempt time
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
    EXTRACT(EPOCH FROM (last_attempt + (cooldown_hours || ' hours')::interval - now())) / 60 as minutes_until_retry,
    EXTRACT(EPOCH FROM (last_attempt + (cooldown_hours || ' hours')::interval - now())) / 3600 as hours_until_retry
FROM test_data;

-- 4. Test the actual function
-- Replace with your actual UUIDs
SELECT can_retry_quiz(
    'YOUR_USER_ID'::uuid,
    'YOUR_LESSON_CONTENT_ID'::uuid
);
