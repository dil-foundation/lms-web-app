-- Fix the type mismatch in get_latest_quiz_submissions_for_assessment function
-- The issue is that COUNT(*) returns bigint but the function expects integer

DROP FUNCTION IF EXISTS get_latest_quiz_submissions_for_assessment(UUID);

CREATE OR REPLACE FUNCTION get_latest_quiz_submissions_for_assessment(
    p_lesson_content_id UUID
)
RETURNS TABLE (
    submission_id UUID,
    user_id UUID,
    student_name TEXT,
    student_email TEXT,
    attempt_number INTEGER,
    total_attempts INTEGER,
    submitted_at TIMESTAMPTZ,
    score NUMERIC(5,2),
    manual_grading_required BOOLEAN,
    manual_grading_completed BOOLEAN,
    manual_grading_score NUMERIC(5,2),
    retry_reason TEXT,
    answers JSONB,
    results JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as submission_id,
        qs.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
        p.email as student_email,
        qs.attempt_number,
        (SELECT COUNT(*)::INTEGER FROM quiz_submissions qs2 
         WHERE qs2.user_id = qs.user_id 
         AND qs2.lesson_content_id = p_lesson_content_id) as total_attempts,
        qs.submitted_at,
        qs.score::NUMERIC(5,2),
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score::NUMERIC(5,2),
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    JOIN profiles p ON qs.user_id = p.id
    WHERE qs.lesson_content_id = p_lesson_content_id
    AND qs.is_latest_attempt = true
    ORDER BY p.email;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_latest_quiz_submissions_for_assessment(UUID) TO authenticated;

-- Test the function
SELECT * FROM get_latest_quiz_submissions_for_assessment('c8b435f8-2d49-4710-92b4-9e1c83bf49ff');
