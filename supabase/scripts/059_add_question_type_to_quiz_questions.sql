-- Add question_type column to quiz_questions table
ALTER TABLE quiz_questions 
ADD COLUMN question_type TEXT NOT NULL DEFAULT 'single_choice' 
CHECK (question_type IN ('single_choice', 'multiple_choice'));

-- Add a comment to explain the new column
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: single_choice (one correct answer) or multiple_choice (multiple correct answers)';

-- Update existing questions to have the default type
UPDATE quiz_questions 
SET question_type = 'single_choice' 
WHERE question_type IS NULL;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_quiz_questions_question_type 
ON quiz_questions(question_type);

-- Add a constraint to ensure multiple choice questions have at least 2 options
-- This will be enforced at the application level, but we can add a database check
ALTER TABLE quiz_questions 
ADD CONSTRAINT check_multiple_choice_options 
CHECK (
  question_type != 'multiple_choice' OR 
  EXISTS (
    SELECT 1 FROM question_options qo 
    WHERE qo.question_id = quiz_questions.id 
    AND qo.is_correct = true
    HAVING COUNT(*) >= 1
  )
);

-- Add a constraint to ensure single choice questions have exactly 1 correct answer
ALTER TABLE quiz_questions 
ADD CONSTRAINT check_single_choice_options 
CHECK (
  question_type != 'single_choice' OR 
  EXISTS (
    SELECT 1 FROM question_options qo 
    WHERE qo.question_id = quiz_questions.id 
    AND qo.is_correct = true
    HAVING COUNT(*) = 1
  )
);