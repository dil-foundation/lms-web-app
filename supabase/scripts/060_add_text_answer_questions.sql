-- Add text answer question type support
-- This allows teachers to create questions that require manual grading

-- Update the question_type check constraint to include 'text_answer'
ALTER TABLE quiz_questions 
DROP CONSTRAINT quiz_questions_question_type_check;

ALTER TABLE quiz_questions 
ADD CONSTRAINT quiz_questions_question_type_check 
CHECK (question_type IN ('single_choice', 'multiple_choice', 'text_answer'));

-- Add a comment to explain the new question type
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: single_choice (one correct answer), multiple_choice (multiple correct answers), text_answer (manual grading required)';

-- Add manual grading fields to quiz_submissions table
ALTER TABLE quiz_submissions 
ADD COLUMN manual_grading_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN manual_grading_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN manual_grading_score NUMERIC(5,2),
ADD COLUMN manual_grading_feedback TEXT,
ADD COLUMN manual_grading_completed_at TIMESTAMPTZ,
ADD COLUMN manual_grading_completed_by UUID REFERENCES profiles(id);

-- Add comments for the new columns
COMMENT ON COLUMN quiz_submissions.manual_grading_required IS 'Indicates if this submission requires manual grading due to text answer questions';
COMMENT ON COLUMN quiz_submissions.manual_grading_completed IS 'Indicates if manual grading has been completed';
COMMENT ON COLUMN quiz_submissions.manual_grading_score IS 'Score given by teacher for manual grading (0-100)';
COMMENT ON COLUMN quiz_submissions.manual_grading_feedback IS 'Feedback provided by teacher for manual grading';
COMMENT ON COLUMN quiz_submissions.manual_grading_completed_at IS 'Timestamp when manual grading was completed';
COMMENT ON COLUMN quiz_submissions.manual_grading_completed_by IS 'ID of the teacher who completed the manual grading';

-- Create an index for efficient querying of submissions requiring manual grading
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_manual_grading 
ON quiz_submissions(manual_grading_required, manual_grading_completed) 
WHERE manual_grading_required = TRUE;

-- Update the existing quiz_submissions to set manual_grading_required based on question types
UPDATE quiz_submissions 
SET manual_grading_required = EXISTS (
  SELECT 1 
  FROM quiz_questions qq 
  WHERE qq.lesson_content_id = quiz_submissions.lesson_content_id 
  AND qq.question_type = 'text_answer'
);

-- Create a function to calculate if manual grading is required for a quiz
CREATE OR REPLACE FUNCTION check_quiz_manual_grading_required(quiz_content_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM quiz_questions 
    WHERE lesson_content_id = quiz_content_id 
    AND question_type = 'text_answer'
  );
END;
$$;

-- Create a function to update manual grading status when quiz is submitted
CREATE OR REPLACE FUNCTION update_quiz_submission_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the quiz has text answer questions
  IF check_quiz_manual_grading_required(NEW.lesson_content_id) THEN
    NEW.manual_grading_required = TRUE;
    NEW.manual_grading_completed = FALSE;
    -- For text answer questions, we can't auto-calculate score, so set it to NULL
    NEW.score = NULL;
  ELSE
    NEW.manual_grading_required = FALSE;
    NEW.manual_grading_completed = TRUE;
    -- For non-text questions, score is calculated automatically
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to automatically set manual grading status
CREATE TRIGGER trigger_update_quiz_grading_status
  BEFORE INSERT OR UPDATE ON quiz_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_submission_grading_status();

-- Add a function to complete manual grading
CREATE OR REPLACE FUNCTION complete_manual_grading(
  submission_id UUID,
  teacher_id UUID,
  manual_score NUMERIC(5,2),
  manual_feedback TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_score = manual_score,
    manual_grading_feedback = manual_feedback,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id,
    score = manual_score  -- Update the main score field
  WHERE id = submission_id;
END;
$$;
