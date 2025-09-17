-- Fix all ambiguous column reference errors
-- Run this in Supabase SQL editor

-- Fix the create_quiz_submission_with_attempt_tracking function
CREATE OR REPLACE FUNCTION create_quiz_submission_with_attempt_tracking(
  p_user_id UUID,
  p_lesson_content_id UUID,
  p_lesson_id UUID,
  p_course_id UUID,
  p_answers JSONB,
  p_results JSONB,
  p_score NUMERIC,
  p_manual_grading_required BOOLEAN DEFAULT false,
  p_manual_grading_completed BOOLEAN DEFAULT false,
  p_retry_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  submission_id UUID,
  attempt_number INTEGER,
  is_latest_attempt BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_attempt_number INTEGER;
  new_submission_id UUID;
BEGIN
  -- Get the next attempt number for this user/lesson combination
  SELECT COALESCE(MAX(qs.attempt_number), 0) + 1
  INTO new_attempt_number
  FROM quiz_submissions qs
  WHERE qs.user_id = p_user_id 
  AND qs.lesson_content_id = p_lesson_content_id;
  
  -- Mark all previous attempts as not latest
  UPDATE quiz_submissions 
  SET is_latest_attempt = false
  WHERE user_id = p_user_id 
  AND lesson_content_id = p_lesson_content_id;
  
  -- Insert the new submission
  INSERT INTO quiz_submissions (
    user_id,
    lesson_content_id,
    lesson_id,
    course_id,
    answers,
    results,
    score,
    manual_grading_required,
    manual_grading_completed,
    attempt_number,
    is_latest_attempt,
    retry_reason
  ) VALUES (
    p_user_id,
    p_lesson_content_id,
    p_lesson_id,
    p_course_id,
    p_answers,
    p_results,
    p_score,
    p_manual_grading_required,
    p_manual_grading_completed,
    new_attempt_number,
    true, -- This is always the latest attempt
    p_retry_reason
  ) RETURNING id INTO new_submission_id;
  
  -- Return the submission details
  RETURN QUERY SELECT new_submission_id, new_attempt_number, true;
END;
$$;

-- Fix the can_retry_quiz function
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
