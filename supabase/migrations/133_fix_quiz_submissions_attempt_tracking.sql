-- Fix quiz_submissions table to support multiple attempts and proper attempt tracking

-- First, drop the problematic unique constraint that prevents multiple attempts
ALTER TABLE public.quiz_submissions 
DROP CONSTRAINT IF EXISTS quiz_submissions_user_lesson_content_unique;

-- Add attempt tracking fields
ALTER TABLE public.quiz_submissions 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_attempt_id UUID NULL,
ADD COLUMN IF NOT EXISTS retry_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS is_latest_attempt BOOLEAN NOT NULL DEFAULT true;

-- Add foreign key for previous attempt reference (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quiz_submissions_previous_attempt_fkey' 
    AND table_name = 'quiz_submissions'
  ) THEN
    ALTER TABLE public.quiz_submissions 
    ADD CONSTRAINT quiz_submissions_previous_attempt_fkey 
    FOREIGN KEY (previous_attempt_id) REFERENCES quiz_submissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create a new unique constraint that allows multiple attempts but ensures only one latest attempt per user/lesson
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_submissions_latest_attempt 
ON public.quiz_submissions (user_id, lesson_content_id) 
WHERE is_latest_attempt = true;

-- Create index for attempt tracking
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_attempts 
ON public.quiz_submissions (user_id, lesson_content_id, attempt_number);

-- Create index for latest attempts (for admin/teacher views)
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_latest 
ON public.quiz_submissions (lesson_content_id, is_latest_attempt) 
WHERE is_latest_attempt = true;

-- Function to create a new quiz submission with proper attempt tracking
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

-- Function to update an existing quiz submission (for retries)
CREATE OR REPLACE FUNCTION update_quiz_submission_with_attempt_tracking(
  p_submission_id UUID,
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
  submission_record RECORD;
BEGIN
  -- Get the current submission details
  SELECT * INTO submission_record
  FROM quiz_submissions qs
  WHERE qs.id = p_submission_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id;
  END IF;
  
  -- Update the submission
  UPDATE quiz_submissions 
  SET 
    answers = p_answers,
    results = p_results,
    score = p_score,
    manual_grading_required = p_manual_grading_required,
    manual_grading_completed = p_manual_grading_completed,
    retry_reason = p_retry_reason
  WHERE id = p_submission_id;
  
  -- Return the updated submission details
  RETURN QUERY SELECT 
    submission_record.id,
    submission_record.attempt_number,
    submission_record.is_latest_attempt;
END;
$$;

-- Update existing records to have proper attempt numbers
-- This handles existing data that might not have attempt numbers
DO $$
DECLARE
  submission_record RECORD;
  attempt_counter INTEGER;
BEGIN
  -- For each user/lesson combination, update attempt numbers
  FOR submission_record IN 
    SELECT qs.user_id, qs.lesson_content_id, qs.id, qs.submitted_at
    FROM quiz_submissions qs
    WHERE qs.lesson_content_id IS NOT NULL
    ORDER BY qs.user_id, qs.lesson_content_id, qs.submitted_at
  LOOP
    -- Get the attempt number for this user/lesson combination
    SELECT COUNT(*) + 1
    INTO attempt_counter
    FROM quiz_submissions qs2
    WHERE qs2.user_id = submission_record.user_id 
    AND qs2.lesson_content_id = submission_record.lesson_content_id
    AND qs2.submitted_at < submission_record.submitted_at;
    
    -- Update the attempt number
    UPDATE quiz_submissions 
    SET attempt_number = attempt_counter
    WHERE id = submission_record.id;
  END LOOP;
  
  -- Mark the latest attempt for each user/lesson combination
  UPDATE quiz_submissions 
  SET is_latest_attempt = true
  WHERE id IN (
    SELECT DISTINCT ON (qs.user_id, qs.lesson_content_id) qs.id
    FROM quiz_submissions qs
    WHERE qs.lesson_content_id IS NOT NULL
    ORDER BY qs.user_id, qs.lesson_content_id, qs.submitted_at DESC
  );
END $$;

-- Add comment explaining the new structure
COMMENT ON COLUMN quiz_submissions.attempt_number IS 'Sequential attempt number for this user/lesson combination (1, 2, 3, etc.)';
COMMENT ON COLUMN quiz_submissions.previous_attempt_id IS 'Reference to the previous attempt (for retry tracking)';
COMMENT ON COLUMN quiz_submissions.retry_reason IS 'Reason for retry (e.g., "Automatic retry - no approval required")';
COMMENT ON COLUMN quiz_submissions.is_latest_attempt IS 'True if this is the most recent attempt for this user/lesson combination';
