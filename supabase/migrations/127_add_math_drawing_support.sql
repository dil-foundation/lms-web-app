-- Add math drawing support to quiz questions
-- This allows teachers to enable drawing canvas for math expression questions

-- Add column to enable drawing for math expression questions
ALTER TABLE quiz_questions 
ADD COLUMN math_allow_drawing BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN quiz_questions.math_allow_drawing IS 'Whether drawing canvas is enabled for this math expression question';

-- Add column to store drawing data in quiz submissions
ALTER TABLE quiz_submissions 
ADD COLUMN drawing_data JSONB;

-- Add comment
COMMENT ON COLUMN quiz_submissions.drawing_data IS 'JSON data containing student drawings for math questions';

-- Create index for drawing data queries
CREATE INDEX IF NOT EXISTS idx_quiz_submissions_drawing_data 
ON quiz_submissions USING GIN (drawing_data);

-- Update the existing math answer saving function to handle drawing data
CREATE OR REPLACE FUNCTION save_math_answer(
  submission_id UUID,
  question_id UUID,
  latex_expression TEXT,
  simplified_form TEXT DEFAULT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  similarity_score NUMERIC DEFAULT 0,
  drawing_data TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  answer_id UUID;
  user_id UUID;
BEGIN
  -- Get user_id from submission
  SELECT qs.user_id INTO user_id
  FROM quiz_submissions qs
  WHERE qs.id = submission_id;
  
  -- Insert math answer
  INSERT INTO quiz_math_answers (
    quiz_submission_id,
    question_id,
    user_id,
    latex_expression,
    simplified_form,
    is_correct,
    similarity_score
  ) VALUES (
    submission_id,
    question_id,
    user_id,
    latex_expression,
    simplified_form,
    is_correct,
    similarity_score
  ) RETURNING id INTO answer_id;
  
  -- If drawing data is provided, store it in the submission
  IF drawing_data IS NOT NULL THEN
    UPDATE quiz_submissions 
    SET drawing_data = COALESCE(drawing_data::jsonb, '{}'::jsonb) || 
                      jsonb_build_object(question_id::text, drawing_data::jsonb)
    WHERE id = submission_id;
  END IF;
  
  RETURN answer_id;
END;
$$;
