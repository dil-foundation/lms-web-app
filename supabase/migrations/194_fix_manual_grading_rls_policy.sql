-- Fix RLS policy to allow teachers to update quiz attempts for manual grading
-- This migration adds a policy that allows teachers and admins to update quiz attempts
-- when they are completing manual grading

-- Add policy for teachers and admins to update quiz attempts for manual grading
CREATE POLICY "Teachers and Admins can update quiz attempts for manual grading" ON public.standalone_quiz_attempts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role IN ('teacher', 'admin')
    )
  );

-- Also add a policy for quiz authors to update attempts on their own quizzes
CREATE POLICY "Quiz authors can update attempts on their quizzes" ON public.standalone_quiz_attempts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.standalone_quizzes 
      WHERE id = quiz_id AND author_id = auth.uid()
    )
  );

-- Add comment explaining the policies
COMMENT ON POLICY "Teachers and Admins can update quiz attempts for manual grading" ON public.standalone_quiz_attempts 
IS 'Allows teachers and admins to update quiz attempts when completing manual grading';

COMMENT ON POLICY "Quiz authors can update attempts on their quizzes" ON public.standalone_quiz_attempts 
IS 'Allows quiz authors to update attempts on quizzes they created';
