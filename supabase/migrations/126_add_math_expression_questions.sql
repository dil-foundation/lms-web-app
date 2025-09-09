-- Add math expression question type support
-- This allows teachers to create mathematical expression questions

-- Update the question_type check constraint to include 'math_expression'
ALTER TABLE quiz_questions 
DROP CONSTRAINT IF EXISTS quiz_questions_question_type_check;

ALTER TABLE quiz_questions 
ADD CONSTRAINT quiz_questions_question_type_check 
CHECK (question_type IN ('single_choice', 'multiple_choice', 'text_answer', 'math_expression'));

-- Add a comment to explain the new question type
COMMENT ON COLUMN quiz_questions.question_type IS 'Type of question: single_choice (one correct answer), multiple_choice (multiple correct answers), text_answer (manual grading required), math_expression (mathematical expression input)';

-- Add math-specific fields to quiz_questions table
ALTER TABLE quiz_questions 
ADD COLUMN math_expression TEXT, -- LaTeX expression for expected answer
ADD COLUMN math_tolerance NUMERIC(5,4) DEFAULT 0.01, -- Acceptable variance for math answers
ADD COLUMN math_hint TEXT; -- Optional hint for students

-- Add comments for the new columns
COMMENT ON COLUMN quiz_questions.math_expression IS 'LaTeX expression representing the correct mathematical answer';
COMMENT ON COLUMN quiz_questions.math_tolerance IS 'Acceptable numerical variance for math answers (0.01 = 1%)';
COMMENT ON COLUMN quiz_questions.math_hint IS 'Optional hint to help students with the math question';

-- Create table for storing math expression answers
CREATE TABLE IF NOT EXISTS quiz_math_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_submission_id UUID REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  latex_expression TEXT NOT NULL,
  simplified_form TEXT,
  is_correct BOOLEAN DEFAULT FALSE,
  similarity_score NUMERIC(5,4), -- 0-1 similarity to correct answer
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add comments
COMMENT ON TABLE quiz_math_answers IS 'Stores mathematical expression answers from students';
COMMENT ON COLUMN quiz_math_answers.latex_expression IS 'Student input in LaTeX format';
COMMENT ON COLUMN quiz_math_answers.simplified_form IS 'Simplified form of the expression for comparison';
COMMENT ON COLUMN quiz_math_answers.is_correct IS 'Whether the answer is mathematically correct';
COMMENT ON COLUMN quiz_math_answers.similarity_score IS 'Similarity score (0-1) to the correct answer';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_math_answers_submission 
ON quiz_math_answers(quiz_submission_id);

CREATE INDEX IF NOT EXISTS idx_quiz_math_answers_question 
ON quiz_math_answers(question_id);

CREATE INDEX IF NOT EXISTS idx_quiz_math_answers_user 
ON quiz_math_answers(user_id);

-- Enable RLS
ALTER TABLE quiz_math_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quiz_math_answers
CREATE POLICY "Users can view their own math answers" ON quiz_math_answers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own math answers" ON quiz_math_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Teachers can view math answers for their courses" ON quiz_math_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions qs
      JOIN course_lesson_content clc ON qs.lesson_content_id = clc.id
      JOIN course_lessons cl ON clc.lesson_id = cl.id
      JOIN course_sections cs ON cl.section_id = cs.id
      JOIN course_members cm ON cs.course_id = cm.course_id
      WHERE qs.id = quiz_math_answers.quiz_submission_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'teacher'
    )
  );

-- Create function to evaluate math expressions
CREATE OR REPLACE FUNCTION evaluate_math_expression(
  user_expression TEXT,
  correct_expression TEXT,
  tolerance NUMERIC DEFAULT 0.01
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
BEGIN
  -- This is a placeholder function - actual math evaluation will be done in the application
  -- The database stores the expressions and the app handles the mathematical evaluation
  result := jsonb_build_object(
    'user_expression', user_expression,
    'correct_expression', correct_expression,
    'tolerance', tolerance,
    'evaluation_pending', true
  );
  
  RETURN result;
END;
$$;

-- Create function to get math question details
CREATE OR REPLACE FUNCTION get_math_question_details(question_id UUID)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  math_expression TEXT,
  math_tolerance NUMERIC,
  math_hint TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qq.id,
    qq.question_text,
    qq.math_expression,
    qq.math_tolerance,
    qq.math_hint
  FROM quiz_questions qq
  WHERE qq.id = question_id
  AND qq.question_type = 'math_expression';
END;
$$;

-- Create function to save math answer
CREATE OR REPLACE FUNCTION save_math_answer(
  submission_id UUID,
  question_id UUID,
  latex_expression TEXT,
  simplified_form TEXT DEFAULT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  similarity_score NUMERIC DEFAULT 0
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
  
  RETURN answer_id;
END;
$$;
