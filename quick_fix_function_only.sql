-- Quick fix: Just update the function to fix the ambiguous column reference
-- Run this in Supabase SQL editor

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
