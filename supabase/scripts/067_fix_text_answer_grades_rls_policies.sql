-- Fix RLS policies for text_answer_grades table
-- Allow teachers with course access to update grades, not just the original grader

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view text answer grades" ON text_answer_grades;
DROP POLICY IF EXISTS "Teachers can insert text answer grades" ON text_answer_grades;
DROP POLICY IF EXISTS "Teachers can update text answer grades" ON text_answer_grades;
DROP POLICY IF EXISTS "Students can view their own text answer grades" ON text_answer_grades;

-- Create updated policies that check course access

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

-- Teachers can insert grades for submissions they have access to
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

-- Teachers can update grades for submissions they have access to (not just the original grader)
CREATE POLICY "Teachers can update text answer grades" ON text_answer_grades
  FOR UPDATE USING (
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

-- Students can view their own grades
CREATE POLICY "Students can view their own text answer grades" ON text_answer_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM quiz_submissions qs
      WHERE qs.id = text_answer_grades.quiz_submission_id
      AND qs.user_id = auth.uid()
    )
  );

-- Admins can view all text answer grades
CREATE POLICY "Admins can view all text answer grades" ON text_answer_grades
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Admins can insert text answer grades
CREATE POLICY "Admins can insert text answer grades" ON text_answer_grades
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
    AND graded_by = auth.uid()
  );

-- Admins can update all text answer grades
CREATE POLICY "Admins can update all text answer grades" ON text_answer_grades
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
