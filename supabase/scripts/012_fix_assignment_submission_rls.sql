-- This script corrects the RLS policies for teachers on the assignment_submissions table
-- and adds missing policies for admins.

-- 1. Drop the incorrect policies for teachers.
-- The old policies were joining on course_lessons.id which is no longer correct.
DROP POLICY IF EXISTS "Teachers can view submissions for their courses" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Teachers can update submissions for their courses" ON public.assignment_submissions;

-- 2. Recreate the policy for teachers to VIEW submissions with the correct logic.
CREATE POLICY "Teachers can view submissions for their courses"
ON public.assignment_submissions FOR SELECT
TO authenticated
USING (
  is_teacher_for_course(
    (SELECT cs.course_id
     FROM public.course_lesson_content AS clc
     JOIN public.course_lessons AS cl ON clc.lesson_id = cl.id
     JOIN public.course_sections AS cs ON cl.section_id = cs.id
     WHERE clc.id = assignment_submissions.assignment_id)
  )
);

-- 3. Recreate the policy for teachers to UPDATE submissions with the correct logic.
CREATE POLICY "Teachers can update submissions for their courses"
ON public.assignment_submissions FOR UPDATE
TO authenticated
USING (
  is_teacher_for_course(
    (SELECT cs.course_id
     FROM public.course_lesson_content AS clc
     JOIN public.course_lessons AS cl ON clc.lesson_id = cl.id
     JOIN public.course_sections AS cs ON cl.section_id = cs.id
     WHERE clc.id = assignment_submissions.assignment_id)
  )
);

-- 4. Add policies for Admins to view and update all submissions.
CREATE POLICY "Admins can view all submissions"
ON public.assignment_submissions FOR SELECT
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role))
);

CREATE POLICY "Admins can update all submissions"
ON public.assignment_submissions FOR UPDATE
TO authenticated
USING (
  (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role))
);
