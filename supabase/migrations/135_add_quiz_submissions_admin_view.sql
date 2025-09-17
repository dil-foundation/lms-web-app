-- Add function to get quiz submissions for admin/teacher assessment views

CREATE OR REPLACE FUNCTION get_quiz_submissions_for_assessment(
    p_lesson_content_id UUID
)
RETURNS TABLE (
    submission_id UUID,
    user_id UUID,
    student_name TEXT,
    student_email TEXT,
    attempt_number INTEGER,
    submitted_at TIMESTAMPTZ,
    score NUMERIC(5,2),
    manual_grading_required BOOLEAN,
    manual_grading_completed BOOLEAN,
    manual_grading_score NUMERIC(5,2),
    is_latest_attempt BOOLEAN,
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
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
        qs.is_latest_attempt,
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    JOIN profiles p ON qs.user_id = p.id
    WHERE qs.lesson_content_id = p_lesson_content_id
    ORDER BY p.email, qs.attempt_number DESC;
END;
$$;

-- Add function to get latest quiz submissions only (for main assessment view)
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
        (SELECT COUNT(*) FROM quiz_submissions qs2 
         WHERE qs2.user_id = qs.user_id 
         AND qs2.lesson_content_id = p_lesson_content_id) as total_attempts,
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
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

-- Add function to get quiz attempt history for a specific user
CREATE OR REPLACE FUNCTION get_user_quiz_attempt_history(
    p_user_id UUID,
    p_lesson_content_id UUID
)
RETURNS TABLE (
    attempt_number INTEGER,
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
        qs.attempt_number,
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id
    ORDER BY qs.attempt_number;
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_quiz_submissions_for_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_quiz_submissions_for_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quiz_attempt_history(UUID, UUID) TO authenticated;
