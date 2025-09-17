-- Remove teacher approval logic from quiz retry system
-- Since we removed the advanced settings, retries should not require approval

-- Update the can_retry_quiz function to remove approval logic
CREATE OR REPLACE FUNCTION can_retry_quiz(
    p_user_id UUID,
    p_lesson_content_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    retry_settings JSONB;
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
    -- Get retry settings for this content item
    SELECT clc.retry_settings INTO retry_settings
    FROM public.course_lesson_content clc
    WHERE clc.id = p_lesson_content_id;
    
    -- Check if retries are enabled
    IF NOT COALESCE((retry_settings->>'allowRetries')::boolean, false) THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Retries not enabled for this quiz'
        );
    END IF;
    
    -- Get current attempt count
    SELECT COUNT(*), MAX(submitted_at), MAX(score)
    INTO current_attempts, last_attempt, last_score
    FROM public.quiz_attempts
    WHERE user_id = p_user_id AND lesson_content_id = p_lesson_content_id;
    
    -- Get retry settings - Fixed: use NUMERIC instead of INTEGER for cooldown_hours
    max_retries := COALESCE((retry_settings->>'maxRetries')::integer, 2);
    cooldown_hours := COALESCE((retry_settings->>'retryCooldownHours')::numeric, 24);
    retry_threshold := COALESCE((retry_settings->>'retryThreshold')::numeric, 70);
    
    -- Check if max retries reached
    IF current_attempts >= max_retries THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Maximum retry attempts reached'
        );
    END IF;
    
    -- Check cooldown period - Fixed: use proper interval calculation for decimal hours
    IF last_attempt IS NOT NULL AND 
       last_attempt > (now() - (cooldown_hours || ' hours')::interval) THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Cooldown period not yet expired',
            'retryAfter', last_attempt + (cooldown_hours || ' hours')::interval
        );
    END IF;
    
    -- Check score threshold
    IF last_score IS NOT NULL AND last_score >= retry_threshold THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Score above retry threshold'
        );
    END IF;
    
    -- If we get here, retry is allowed (no approval required)
    RETURN jsonb_build_object(
        'canRetry', true,
        'currentAttempts', current_attempts,
        'maxRetries', max_retries,
        'retryThreshold', retry_threshold,
        'requiresApproval', false  -- Always false now
    );
END;
$$;

-- Add comment explaining the change
COMMENT ON FUNCTION can_retry_quiz(UUID, UUID) IS 'Updated to remove teacher approval logic - retries are now automatic when conditions are met';
