-- Fix the ambiguous attempt_number column reference in create_quiz_attempt function
-- This fixes the error: column reference "attempt_number" is ambiguous

CREATE OR REPLACE FUNCTION create_quiz_attempt(
    p_user_id UUID,
    p_lesson_content_id UUID,
    p_answers JSONB,
    p_results JSONB,
    p_score NUMERIC(5,2),
    p_retry_reason TEXT DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    next_attempt_number INTEGER;
    retry_settings JSONB;
    requires_approval BOOLEAN;
    attempt_id UUID;
    result JSONB;
BEGIN
    -- Get next attempt number
    SELECT COALESCE(MAX(attempt_number), 0) + 1
    INTO next_attempt_number
    FROM public.quiz_attempts
    WHERE user_id = p_user_id AND lesson_content_id = p_lesson_content_id;
    
    -- Get retry settings
    SELECT clc.retry_settings INTO retry_settings
    FROM public.course_lesson_content clc
    WHERE clc.id = p_lesson_content_id;
    
    requires_approval := COALESCE((retry_settings->>'requireTeacherApproval')::boolean, false);
    
    -- Create the attempt
    INSERT INTO public.quiz_attempts (
        user_id,
        lesson_content_id,
        attempt_number,
        answers,
        results,
        score,
        retry_reason,
        teacher_approval_required,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_lesson_content_id,
        next_attempt_number,
        p_answers,
        p_results,
        p_score,
        p_retry_reason,
        requires_approval AND next_attempt_number > 1,
        p_ip_address,
        p_user_agent
    ) RETURNING id INTO attempt_id;
    
    -- If approval required, create a retry request
    IF requires_approval AND next_attempt_number > 1 THEN
        INSERT INTO public.quiz_retry_requests (
            user_id,
            lesson_content_id,
            current_attempt_id,
            request_reason
        ) VALUES (
            p_user_id,
            p_lesson_content_id,
            attempt_id,
            COALESCE(p_retry_reason, 'Retry request')
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'attemptId', attempt_id,
        'attemptNumber', next_attempt_number,
        'requiresApproval', requires_approval AND next_attempt_number > 1
    );
END;
$$;
