-- Create a table to store individual text answer question grades and feedback
-- This replaces the complex parsing of manual_grading_feedback field

CREATE TABLE text_answer_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_submission_id UUID NOT NULL REFERENCES quiz_submissions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  grade NUMERIC(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
  feedback TEXT,
  graded_by UUID NOT NULL REFERENCES profiles(id),
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one grade per question per submission
  UNIQUE(quiz_submission_id, question_id)
);

-- Add comments
COMMENT ON TABLE text_answer_grades IS 'Stores individual grades and feedback for text answer questions';
COMMENT ON COLUMN text_answer_grades.quiz_submission_id IS 'Reference to the quiz submission';
COMMENT ON COLUMN text_answer_grades.question_id IS 'Reference to the specific question';
COMMENT ON COLUMN text_answer_grades.grade IS 'Grade given for this question (0-100)';
COMMENT ON COLUMN text_answer_grades.feedback IS 'Feedback provided for this question';
COMMENT ON COLUMN text_answer_grades.graded_by IS 'ID of the teacher who graded this question';
COMMENT ON COLUMN text_answer_grades.graded_at IS 'Timestamp when this question was graded';

-- Create indexes for efficient querying
CREATE INDEX idx_text_answer_grades_submission ON text_answer_grades(quiz_submission_id);
CREATE INDEX idx_text_answer_grades_question ON text_answer_grades(question_id);
CREATE INDEX idx_text_answer_grades_teacher ON text_answer_grades(graded_by);

-- Create a function to get all grades for a quiz submission
CREATE OR REPLACE FUNCTION get_text_answer_grades(submission_id UUID)
RETURNS TABLE (
  question_id UUID,
  question_text TEXT,
  question_position INTEGER,
  grade NUMERIC(5,2),
  feedback TEXT,
  graded_by UUID,
  graded_at TIMESTAMPTZ
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qq.id as question_id,
    qq.question_text,
    qq.position as question_position,
    tag.grade,
    tag.feedback,
    tag.graded_by,
    tag.graded_at
  FROM quiz_questions qq
  LEFT JOIN text_answer_grades tag ON qq.id = tag.question_id AND tag.quiz_submission_id = submission_id
  WHERE qq.lesson_content_id = (
    SELECT lesson_content_id FROM quiz_submissions WHERE id = submission_id
  )
  AND qq.question_type = 'text_answer'
  ORDER BY qq.position;
END;
$$;

-- Create a function to save or update text answer grades
CREATE OR REPLACE FUNCTION save_text_answer_grades(
  submission_id UUID,
  teacher_id UUID,
  grades_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  grade_record RECORD;
BEGIN
  -- First, delete existing grades for this submission
  DELETE FROM text_answer_grades WHERE quiz_submission_id = submission_id;
  
  -- Insert new grades
  FOR grade_record IN 
    SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    INSERT INTO text_answer_grades (
      quiz_submission_id,
      question_id,
      grade,
      feedback,
      graded_by
    ) VALUES (
      submission_id,
      (grade_record.value->>'question_id')::UUID,
      (grade_record.value->>'grade')::NUMERIC(5,2),
      grade_record.value->>'feedback',
      teacher_id
    );
  END LOOP;
  
  -- Update the main quiz submission with overall score and completion status
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id
  WHERE id = submission_id;
END;
$$;

-- Create a function to calculate the overall score for a quiz submission
CREATE OR REPLACE FUNCTION calculate_quiz_final_score(submission_id UUID)
RETURNS NUMERIC(5,2)
LANGUAGE plpgsql
AS $$
DECLARE
  total_score NUMERIC(10,2) := 0;
  total_questions INTEGER := 0;
  auto_graded_score NUMERIC(10,2) := 0;
  auto_graded_count INTEGER := 0;
  text_answer_score NUMERIC(10,2) := 0;
  text_answer_count INTEGER := 0;
BEGIN
  -- Get auto-graded questions score
  SELECT 
    COALESCE(SUM(CASE WHEN qs.results->>qq.id::text = 'true' THEN 100 ELSE 0 END), 0),
    COUNT(*)
  INTO auto_graded_score, auto_graded_count
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  WHERE qs.id = submission_id 
  AND qq.question_type IN ('single_choice', 'multiple_choice');
  
  -- Get text answer questions score
  SELECT 
    COALESCE(SUM(tag.grade), 0),
    COUNT(*)
  INTO text_answer_score, text_answer_count
  FROM text_answer_grades tag
  WHERE tag.quiz_submission_id = submission_id;
  
  -- Calculate total
  total_score := auto_graded_score + text_answer_score;
  total_questions := auto_graded_count + text_answer_count;
  
  -- Return average score
  IF total_questions > 0 THEN
    RETURN ROUND(total_score / total_questions, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- Create a function to complete manual grading with the new structure
CREATE OR REPLACE FUNCTION complete_manual_grading_v2(
  submission_id UUID,
  teacher_id UUID,
  grades_data JSONB
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Save individual grades
  PERFORM save_text_answer_grades(submission_id, teacher_id, grades_data);
  
  -- Calculate and update final score
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_score = calculate_quiz_final_score(submission_id),
    score = calculate_quiz_final_score(submission_id),
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id
  WHERE id = submission_id;
END;
$$;

-- Add RLS policies for the new table
ALTER TABLE text_answer_grades ENABLE ROW LEVEL SECURITY;

-- Teachers can view grades for submissions they have access to
CREATE POLICY "Teachers can view text answer grades" ON text_answer_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions qs
      JOIN course_lesson_content clc ON clc.id = qs.lesson_content_id
      JOIN course_lessons cl ON cl.id = clc.lesson_id
      JOIN course_sections cs ON cs.id = cl.section_id
      JOIN course_members cm ON cm.course_id = cs.course_id
      WHERE qs.id = text_answer_grades.quiz_submission_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'teacher'
    )
  );

-- Teachers can insert/update grades for submissions they have access to
CREATE POLICY "Teachers can insert text answer grades" ON text_answer_grades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM quiz_submissions qs
      JOIN course_lesson_content clc ON clc.id = qs.lesson_content_id
      JOIN course_lessons cl ON cl.id = clc.lesson_id
      JOIN course_sections cs ON cs.id = cl.section_id
      JOIN course_members cm ON cm.course_id = cs.course_id
      WHERE qs.id = text_answer_grades.quiz_submission_id
      AND cm.user_id = auth.uid()
      AND cm.role = 'teacher'
    )
    AND graded_by = auth.uid()
  );

-- Teachers can update grades they created
CREATE POLICY "Teachers can update text answer grades" ON text_answer_grades
  FOR UPDATE USING (
    graded_by = auth.uid()
  );

-- Students can view their own grades
CREATE POLICY "Students can view their own text answer grades" ON text_answer_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions qs
      WHERE qs.id = text_answer_grades.quiz_submission_id
      AND qs.user_id = auth.uid()
    )
  );
