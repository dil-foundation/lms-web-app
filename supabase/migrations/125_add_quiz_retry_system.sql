-- Migration: Add Quiz Retry System
-- Description: Implements comprehensive quiz retry functionality with teacher controls and academic integrity measures
-- Date: 2024-01-15

-- 1. Add retry settings to course_lesson_content table
ALTER TABLE public.course_lesson_content 
ADD COLUMN IF NOT EXISTS retry_settings JSONB DEFAULT '{
  "allowRetries": false,
  "maxRetries": 2,
  "retryCooldownHours": 24,
  "retryThreshold": 70,
  "requireTeacherApproval": false,
  "generateNewQuestions": true,
  "requireStudyMaterials": false,
  "studyMaterialsRequired": []
}'::jsonb;

-- Add comment for the new column
COMMENT ON COLUMN public.course_lesson_content.retry_settings IS 'Quiz retry configuration settings for this content item';

-- 2. Create quiz_attempts table to track all attempts
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_content_id UUID NOT NULL REFERENCES public.course_lesson_content(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    answers JSONB NOT NULL DEFAULT '{}',
    results JSONB NOT NULL DEFAULT '{}',
    score NUMERIC(5,2),
    submitted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    retry_reason TEXT,
    teacher_approval_required BOOLEAN DEFAULT false,
    teacher_approved BOOLEAN DEFAULT false,
    teacher_approved_by UUID REFERENCES auth.users(id),
    teacher_approved_at TIMESTAMPTZ,
    teacher_approval_notes TEXT,
    study_materials_completed BOOLEAN DEFAULT false,
    study_materials_completed_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE public.quiz_attempts IS 'Tracks all quiz attempts including retries with academic integrity measures';
COMMENT ON COLUMN public.quiz_attempts.attempt_number IS 'Sequential attempt number (1, 2, 3, etc.)';
COMMENT ON COLUMN public.quiz_attempts.retry_reason IS 'Reason provided by student for retry request';
COMMENT ON COLUMN public.quiz_attempts.teacher_approval_required IS 'Whether this attempt requires teacher approval';
COMMENT ON COLUMN public.quiz_attempts.teacher_approved IS 'Whether teacher has approved this attempt';
COMMENT ON COLUMN public.quiz_attempts.study_materials_completed IS 'Whether required study materials were completed before retry';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_content ON public.quiz_attempts(user_id, lesson_content_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_attempt_number ON public.quiz_attempts(lesson_content_id, user_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at ON public.quiz_attempts(submitted_at);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_teacher_approval ON public.quiz_attempts(teacher_approval_required, teacher_approved);

-- 4. Create retry request tracking table
CREATE TABLE IF NOT EXISTS public.quiz_retry_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_content_id UUID NOT NULL REFERENCES public.course_lesson_content(id) ON DELETE CASCADE,
    current_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
    request_reason TEXT NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Add comments
COMMENT ON TABLE public.quiz_retry_requests IS 'Tracks retry requests that require teacher approval';
COMMENT ON COLUMN public.quiz_retry_requests.status IS 'Status of the retry request: pending, approved, rejected, expired';

-- Create indexes for retry requests
CREATE INDEX IF NOT EXISTS idx_quiz_retry_requests_user ON public.quiz_retry_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_retry_requests_content ON public.quiz_retry_requests(lesson_content_id);
CREATE INDEX IF NOT EXISTS idx_quiz_retry_requests_status ON public.quiz_retry_requests(status);
CREATE INDEX IF NOT EXISTS idx_quiz_retry_requests_expires ON public.quiz_retry_requests(expires_at);

-- 5. Create function to check if retry is allowed
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
    cooldown_hours INTEGER;
    retry_threshold NUMERIC(5,2);
    max_retries INTEGER;
    can_retry BOOLEAN := false;
    retry_reason TEXT := '';
    requires_approval BOOLEAN := false;
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
    
    -- Get retry settings
    max_retries := COALESCE((retry_settings->>'maxRetries')::integer, 2);
    cooldown_hours := COALESCE((retry_settings->>'retryCooldownHours')::integer, 24);
    retry_threshold := COALESCE((retry_settings->>'retryThreshold')::numeric, 70);
    requires_approval := COALESCE((retry_settings->>'requireTeacherApproval')::boolean, false);
    
    -- Check if max retries reached
    IF current_attempts >= max_retries THEN
        RETURN jsonb_build_object(
            'canRetry', false,
            'reason', 'Maximum retry attempts reached'
        );
    END IF;
    
    -- Check cooldown period
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
    
    -- Check if study materials are required
    IF COALESCE((retry_settings->>'requireStudyMaterials')::boolean, false) THEN
        -- Check if study materials were completed
        -- This would need to be implemented based on your study materials system
        -- For now, we'll assume they're completed
    END IF;
    
    -- All checks passed
    RETURN jsonb_build_object(
        'canRetry', true,
        'requiresApproval', requires_approval,
        'currentAttempts', current_attempts,
        'maxRetries', max_retries,
        'retryThreshold', retry_threshold
    );
END;
$$;

-- 6. Create function to create a new quiz attempt
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

-- 7. Create function to approve/reject retry requests
CREATE OR REPLACE FUNCTION review_retry_request(
    p_request_id UUID,
    p_teacher_id UUID,
    p_decision TEXT, -- 'approved' or 'rejected'
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    request_record RECORD;
    result JSONB;
BEGIN
    -- Get the request
    SELECT * INTO request_record
    FROM public.quiz_retry_requests
    WHERE id = p_request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Request not found or already processed'
        );
    END IF;
    
    -- Update the request
    UPDATE public.quiz_retry_requests
    SET 
        status = p_decision,
        reviewed_by = p_teacher_id,
        reviewed_at = now(),
        review_notes = p_notes
    WHERE id = p_request_id;
    
    -- Update the attempt if approved
    IF p_decision = 'approved' THEN
        UPDATE public.quiz_attempts
        SET 
            teacher_approved = true,
            teacher_approved_by = p_teacher_id,
            teacher_approved_at = now(),
            teacher_approval_notes = p_notes
        WHERE id = request_record.current_attempt_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'decision', p_decision,
        'attemptId', request_record.current_attempt_id
    );
END;
$$;

-- 8. Enable RLS on new tables
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_retry_requests ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS policies for quiz_attempts
CREATE POLICY "Users can view their own attempts"
ON public.quiz_attempts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own attempts"
ON public.quiz_attempts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view attempts for their courses"
ON public.quiz_attempts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.course_lesson_content clc
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE clc.id = quiz_attempts.lesson_content_id 
        AND cm.user_id = auth.uid() 
        AND cm.role = 'teacher'
    )
);

CREATE POLICY "Admins can view all attempts"
ON public.quiz_attempts FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 10. Create RLS policies for quiz_retry_requests
CREATE POLICY "Users can view their own retry requests"
ON public.quiz_retry_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own retry requests"
ON public.quiz_retry_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Teachers can view retry requests for their courses"
ON public.quiz_retry_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.course_lesson_content clc
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE clc.id = quiz_retry_requests.lesson_content_id 
        AND cm.user_id = auth.uid() 
        AND cm.role = 'teacher'
    )
);

CREATE POLICY "Teachers can update retry requests for their courses"
ON public.quiz_retry_requests FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.course_lesson_content clc
        JOIN public.course_lessons cl ON clc.lesson_id = cl.id
        JOIN public.course_sections cs ON cl.section_id = cs.id
        JOIN public.course_members cm ON cs.course_id = cm.course_id
        WHERE clc.id = quiz_retry_requests.lesson_content_id 
        AND cm.user_id = auth.uid() 
        AND cm.role = 'teacher'
    )
);

CREATE POLICY "Admins can view all retry requests"
ON public.quiz_retry_requests FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 11. Grant execute permissions
GRANT EXECUTE ON FUNCTION can_retry_quiz(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_quiz_attempt(UUID, UUID, JSONB, JSONB, NUMERIC, TEXT, INET, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION review_retry_request(UUID, UUID, TEXT, TEXT) TO authenticated;

-- 12. Add comments
COMMENT ON FUNCTION can_retry_quiz(UUID, UUID) IS 'Checks if a user can retry a quiz based on retry settings and attempt history';
COMMENT ON FUNCTION create_quiz_attempt(UUID, UUID, JSONB, JSONB, NUMERIC, TEXT, INET, TEXT) IS 'Creates a new quiz attempt with retry tracking';
COMMENT ON FUNCTION review_retry_request(UUID, UUID, TEXT, TEXT) IS 'Allows teachers to approve or reject retry requests';

-- Status message
DO $$ BEGIN
  RAISE NOTICE 'Migration 125: Quiz retry system created successfully';
END $$;
