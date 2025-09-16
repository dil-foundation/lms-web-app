-- Migration: Add Manual Grading Support to Standalone Quizzes
-- Description: Implements manual grading for text answer questions in standalone quizzes
-- Date: 2025-01-15

-- 1. Add manual grading fields to standalone_quiz_attempts table
ALTER TABLE public.standalone_quiz_attempts 
ADD COLUMN IF NOT EXISTS manual_grading_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_grading_completed BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS manual_grading_score NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS manual_grading_feedback TEXT,
ADD COLUMN IF NOT EXISTS manual_grading_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manual_grading_completed_by UUID REFERENCES auth.users(id);

-- Add comments for the new columns
COMMENT ON COLUMN public.standalone_quiz_attempts.manual_grading_required IS 'Indicates if this attempt requires manual grading due to text answer questions';
COMMENT ON COLUMN public.standalone_quiz_attempts.manual_grading_completed IS 'Indicates if manual grading has been completed';
COMMENT ON COLUMN public.standalone_quiz_attempts.manual_grading_score IS 'Score given by teacher for manual grading (0-100)';
COMMENT ON COLUMN public.standalone_quiz_attempts.manual_grading_feedback IS 'Feedback provided by teacher for manual grading';
COMMENT ON COLUMN public.standalone_quiz_attempts.manual_grading_completed_at IS 'Timestamp when manual grading was completed';
COMMENT ON COLUMN public.standalone_quiz_attempts.manual_grading_completed_by IS 'ID of the teacher who completed the manual grading';

-- 2. Create standalone_quiz_text_answer_grades table for individual question grading
CREATE TABLE IF NOT EXISTS public.standalone_quiz_text_answer_grades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.standalone_quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.standalone_quiz_questions(id) ON DELETE CASCADE,
  grade NUMERIC(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  graded_by UUID NOT NULL REFERENCES auth.users(id),
  graded_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- Ensure one grade per question per attempt
  UNIQUE(attempt_id, question_id)
);

-- Add comments
COMMENT ON TABLE public.standalone_quiz_text_answer_grades IS 'Stores individual grades for text answer questions in standalone quiz attempts';
COMMENT ON COLUMN public.standalone_quiz_text_answer_grades.grade IS 'Grade for this text answer question (0-100)';
COMMENT ON COLUMN public.standalone_quiz_text_answer_grades.feedback IS 'Teacher feedback for this specific question';

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_standalone_quiz_attempts_manual_grading 
ON public.standalone_quiz_attempts(manual_grading_required, manual_grading_completed) 
WHERE manual_grading_required = TRUE;

CREATE INDEX IF NOT EXISTS idx_standalone_quiz_text_answer_grades_attempt 
ON public.standalone_quiz_text_answer_grades(attempt_id);

CREATE INDEX IF NOT EXISTS idx_standalone_quiz_text_answer_grades_question 
ON public.standalone_quiz_text_answer_grades(question_id);

-- 3. Create function to check if manual grading is required for a standalone quiz
CREATE OR REPLACE FUNCTION check_standalone_quiz_manual_grading_required(quiz_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM standalone_quiz_questions 
    WHERE quiz_id = quiz_id 
    AND question_type = 'text_answer'
  );
END;
$$;

-- 4. Create function to update manual grading status when quiz is submitted
CREATE OR REPLACE FUNCTION update_standalone_quiz_grading_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the quiz has text answer questions
  IF check_standalone_quiz_manual_grading_required(NEW.quiz_id) THEN
    NEW.manual_grading_required = TRUE;
    NEW.manual_grading_completed = FALSE;
    -- For text answer questions, we can't auto-calculate score, so set it to NULL initially
    -- The score will be calculated after manual grading is completed
  ELSE
    NEW.manual_grading_required = FALSE;
    NEW.manual_grading_completed = TRUE;
    -- For non-text questions, score is calculated automatically
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Create trigger to automatically set manual grading status
DROP TRIGGER IF EXISTS trigger_update_standalone_quiz_grading_status ON public.standalone_quiz_attempts;
CREATE TRIGGER trigger_update_standalone_quiz_grading_status
  BEFORE INSERT OR UPDATE ON public.standalone_quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION update_standalone_quiz_grading_status();

-- 6. Create function to complete manual grading for standalone quizzes
CREATE OR REPLACE FUNCTION complete_standalone_quiz_manual_grading(
  attempt_id UUID,
  teacher_id UUID,
  grades_data JSONB DEFAULT '[]'::jsonb,
  overall_feedback TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  grade_item JSONB;
  total_score NUMERIC := 0;
  total_questions INTEGER := 0;
  text_answer_questions INTEGER := 0;
  auto_graded_score NUMERIC := 0;
  final_score NUMERIC;
BEGIN
  -- Get the attempt details
  SELECT 
    sqa.quiz_id,
    sqa.results,
    COUNT(sqq.id) as total_questions_count,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_count
  INTO 
    total_questions,
    text_answer_questions
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
  WHERE sqa.id = attempt_id
  GROUP BY sqa.quiz_id, sqa.results;

  -- Calculate score from auto-graded questions (non-text answers)
  IF total_questions > text_answer_questions THEN
    SELECT COALESCE(SUM(
      CASE 
        WHEN (sqa.results->>sqq.id::text)::jsonb->>'is_correct' = 'true' 
        THEN sqq.points 
        ELSE 0 
      END
    ), 0)
    INTO auto_graded_score
    FROM standalone_quiz_attempts sqa
    JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
    WHERE sqa.id = attempt_id 
    AND sqq.question_type != 'text_answer';
  END IF;

  -- Process individual text answer grades
  FOR grade_item IN SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    -- Insert or update the grade for this question
    INSERT INTO standalone_quiz_text_answer_grades (
      attempt_id,
      question_id,
      grade,
      feedback,
      graded_by
    ) VALUES (
      attempt_id,
      (grade_item->>'question_id')::UUID,
      (grade_item->>'grade')::NUMERIC,
      grade_item->>'feedback',
      teacher_id
    )
    ON CONFLICT (attempt_id, question_id) 
    DO UPDATE SET
      grade = EXCLUDED.grade,
      feedback = EXCLUDED.feedback,
      graded_by = EXCLUDED.graded_by,
      graded_at = now(),
      updated_at = now();

    -- Add to total score
    total_score := total_score + (grade_item->>'grade')::NUMERIC;
  END LOOP;

  -- Calculate final score percentage
  IF total_questions > 0 THEN
    final_score := ((auto_graded_score + total_score) / total_questions) * 100;
  ELSE
    final_score := 0;
  END IF;

  -- Update the attempt with manual grading completion
  UPDATE standalone_quiz_attempts 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_score = final_score,
    manual_grading_feedback = overall_feedback,
    manual_grading_completed_at = now(),
    manual_grading_completed_by = teacher_id,
    score = final_score,  -- Update the main score field
    updated_at = now()
  WHERE id = attempt_id;
END;
$$;

-- 7. Create function to get attempts requiring manual grading
CREATE OR REPLACE FUNCTION get_standalone_quiz_attempts_requiring_grading(teacher_id UUID DEFAULT NULL)
RETURNS TABLE (
  attempt_id UUID,
  quiz_id UUID,
  quiz_title TEXT,
  student_id UUID,
  student_name TEXT,
  student_email TEXT,
  attempt_number INTEGER,
  submitted_at TIMESTAMPTZ,
  total_questions INTEGER,
  text_answer_questions INTEGER,
  auto_graded_score NUMERIC,
  pending_grades INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqa.id as attempt_id,
    sqa.quiz_id,
    sq.title as quiz_title,
    sqa.user_id as student_id,
    p.first_name || ' ' || p.last_name as student_name,
    p.email as student_email,
    sqa.attempt_number,
    sqa.submitted_at,
    COUNT(sqq.id) as total_questions,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) as text_answer_questions,
    COALESCE(SUM(
      CASE 
        WHEN sqq.question_type != 'text_answer' 
        AND (sqa.results->>sqq.id::text)::jsonb->>'is_correct' = 'true'
        THEN sqq.points 
        ELSE 0 
      END
    ), 0) as auto_graded_score,
    COUNT(CASE WHEN sqq.question_type = 'text_answer' THEN 1 END) - 
    COUNT(sqtag.id) as pending_grades
  FROM standalone_quiz_attempts sqa
  JOIN standalone_quizzes sq ON sq.id = sqa.quiz_id
  JOIN profiles p ON p.id = sqa.user_id
  JOIN standalone_quiz_questions sqq ON sqq.quiz_id = sqa.quiz_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.attempt_id = sqa.id AND sqtag.question_id = sqq.id
  WHERE sqa.manual_grading_required = TRUE 
  AND sqa.manual_grading_completed = FALSE
  AND (teacher_id IS NULL OR sq.author_id = teacher_id)
  GROUP BY sqa.id, sqa.quiz_id, sq.title, sqa.user_id, p.first_name, p.last_name, p.email, sqa.attempt_number, sqa.submitted_at
  ORDER BY sqa.submitted_at ASC;
END;
$$;

-- 8. Create function to get text answer details for grading
CREATE OR REPLACE FUNCTION get_standalone_quiz_text_answers_for_grading(attempt_id UUID)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  question_position INTEGER,
  question_points NUMERIC,
  student_answer TEXT,
  current_grade NUMERIC,
  current_feedback TEXT,
  graded_by TEXT,
  graded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sqq.id as question_id,
    sqq.question_text,
    sqq.position as question_position,
    sqq.points as question_points,
    (sqa.answers->>sqq.id::text)::jsonb->>'textAnswer' as student_answer,
    sqtag.grade as current_grade,
    sqtag.feedback as current_feedback,
    p.first_name || ' ' || p.last_name as graded_by,
    sqtag.graded_at
  FROM standalone_quiz_questions sqq
  JOIN standalone_quiz_attempts sqa ON sqa.id = attempt_id
  LEFT JOIN standalone_quiz_text_answer_grades sqtag ON sqtag.question_id = sqq.id AND sqtag.attempt_id = attempt_id
  LEFT JOIN profiles p ON p.id = sqtag.graded_by
  WHERE sqq.quiz_id = sqa.quiz_id 
  AND sqq.question_type = 'text_answer'
  ORDER BY sqq.position;
END;
$$;

-- 9. Update existing attempts to set manual grading status
UPDATE standalone_quiz_attempts 
SET manual_grading_required = check_standalone_quiz_manual_grading_required(quiz_id),
    manual_grading_completed = CASE 
      WHEN check_standalone_quiz_manual_grading_required(quiz_id) THEN FALSE 
      ELSE TRUE 
    END
WHERE manual_grading_required IS NULL;
