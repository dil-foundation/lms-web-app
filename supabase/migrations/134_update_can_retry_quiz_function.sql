-- Update can_retry_quiz function to work with new attempt tracking system

CREATE OR REPLACE FUNCTION can_retry_quiz(
    p_user_id UUID,
    p_lesson_content_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_retry_settings JSONB;
    current_attempts INTEGER;
    last_attempt TIMESTAMPTZ;
    last_score NUMERIC(5,2);
    cooldown_hours NUMERIC;
    retry_threshold NUMERIC(5,2);
    max_retries INTEGER;
    can_retry BOOLEAN := false;
    retry_reason TEXT := '';
    result JSONB;
BEGIN
    -- Get retry settings from the lesson content
    SELECT clc.retry_settings INTO v_retry_settings
    FROM course_lesson_content clc
    WHERE clc.id = p_lesson_content_id;
    
    -- If no retry settings found, use defaults
    IF v_retry_settings IS NULL THEN
        v_retry_settings := '{"allowRetries": false, "maxRetries": 2, "retryCooldownHours": 1, "retryThreshold": 70}'::jsonb;
    END IF;
    
    -- Check if retries are allowed
    IF NOT COALESCE((v_retry_settings->>'allowRetries')::boolean, false) THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Retries are not enabled for this quiz'
        );
    END IF;
    
    -- Get current attempt count (using the new attempt_number field)
    SELECT COALESCE(MAX(qs.attempt_number), 0)
    INTO current_attempts
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id;
    
    -- Get retry settings
    max_retries := COALESCE((v_retry_settings->>'maxRetries')::integer, 2);
    retry_threshold := COALESCE((v_retry_settings->>'retryThreshold')::numeric, 70);
    cooldown_hours := COALESCE((v_retry_settings->>'retryCooldownHours')::numeric, 1);
    
    -- Check if max retries exceeded
    IF current_attempts >= max_retries THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Maximum number of retries exceeded',
            'currentAttempts', current_attempts,
            'maxRetries', max_retries
        );
    END IF;
    
    -- Get the latest attempt details
    SELECT qs.submitted_at, COALESCE(qs.score, qs.manual_grading_score, 0)
    INTO last_attempt, last_score
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id
    AND qs.is_latest_attempt = true;
    
    -- If no previous attempts, allow retry
    IF last_attempt IS NULL THEN
        RETURN jsonb_build_object(
            'canRetry', true,
            'currentAttempts', current_attempts,
            'maxRetries', max_retries,
            'retryThreshold', retry_threshold
        );
    END IF;
    
    -- Check if score is above retry threshold
    IF last_score >= retry_threshold THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Score is above retry threshold',
            'currentScore', last_score,
            'retryThreshold', retry_threshold
        );
    END IF;
    
    -- Check cooldown period
    IF last_attempt > (now() - (cooldown_hours || ' hours')::interval) THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Cooldown period not yet expired',
            'retryAfter', last_attempt + (cooldown_hours || ' hours')::interval,
            'currentAttempts', current_attempts,
            'maxRetries', max_retries,
            'retryThreshold', retry_threshold
        );
    END IF;
    
    -- If we get here, retry is allowed
    RETURN jsonb_build_object(
        'canRetry', true,
        'currentAttempts', current_attempts,
        'maxRetries', max_retries,
        'retryThreshold', retry_threshold
    );
END;
$$;
