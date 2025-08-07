-- RLS Policy Refactor Script (v2)
-- This script updates and creates all necessary RLS policies for the new 3-tier course structure.
-- It should be run AFTER the main schema change script (004_refactor_course_structure.sql).

-- 1. CLEANUP: Drop policies from tables that are being significantly altered.
-- Note: Policies for user_course_progress were already dropped when the table was dropped.
DROP POLICY IF EXISTS "Allow admins and teachers to update submissions" ON public.quiz_submissions;
DROP POLICY IF EXISTS "Allow users to see submissions based on role" ON public.quiz_submissions;


-- 2. CREATE POLICIES for NEW tables

-- Policies for: course_lesson_content
-- Mimics the logic from the old course_lessons policies.
CREATE POLICY "Authenticated users can view content items"
ON public.course_lesson_content FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage content items for accessible lessons"
ON public.course_lesson_content FOR ALL
TO public
USING ( (EXISTS (SELECT 1 FROM public.course_lessons WHERE id = course_lesson_content.lesson_id)) );


-- Policies for: quiz_questions
-- Mimics the logic from the old quiz_questions policies.
CREATE POLICY "Authenticated users can view quiz questions"
ON public.quiz_questions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage questions for accessible content items"
ON public.quiz_questions FOR ALL
TO public
USING ( (EXISTS (SELECT 1 FROM public.course_lesson_content WHERE id = quiz_questions.lesson_content_id)) );


-- Policies for: question_options
-- Mimics the logic from the old question_options policies.
CREATE POLICY "Authenticated users can view question options"
ON public.question_options FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can manage options for accessible questions"
ON public.question_options FOR ALL
TO public
USING ( (EXISTS (SELECT 1 FROM public.quiz_questions WHERE id = question_options.question_id)) );


-- Policies for: user_content_item_progress
-- This is the direct translation of the policies from the old user_course_progress table.
CREATE POLICY "Allow users to insert their own progress"
ON public.user_content_item_progress FOR INSERT
TO public
WITH CHECK ( (auth.uid() = user_id) );

CREATE POLICY "Allow users to see their own progress"
ON public.user_content_item_progress FOR SELECT
TO public
USING ( (auth.uid() = user_id) );

CREATE POLICY "Allow users to update their own progress"
ON public.user_content_item_progress FOR UPDATE
TO public
USING ( (auth.uid() = user_id) );


-- 3. RE-CREATE POLICIES for quiz_submissions with updated logic.

-- The subquery to get the course_id has been updated to use the new structure.
-- OLD LOGIC: quiz_submissions.lesson_id -> course_lessons -> course_sections -> course_id
-- NEW LOGIC: quiz_submissions.lesson_content_id -> course_lesson_content -> course_lessons -> course_sections -> course_id

CREATE POLICY "Allow admins and teachers to update submissions"
ON public.quiz_submissions FOR UPDATE
TO public
USING (
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role
    )
  ) OR 
  is_teacher_for_course(
    (SELECT s.course_id
     FROM public.course_lesson_content AS lc
     JOIN public.course_lessons AS l ON lc.lesson_id = l.id
     JOIN public.course_sections AS s ON l.section_id = s.id
     WHERE lc.id = quiz_submissions.lesson_content_id)
  )
)
WITH CHECK (
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role
    )
  ) OR 
  is_teacher_for_course(
    (SELECT s.course_id
     FROM public.course_lesson_content AS lc
     JOIN public.course_lessons AS l ON lc.lesson_id = l.id
     JOIN public.course_sections AS s ON l.section_id = s.id
     WHERE lc.id = quiz_submissions.lesson_content_id)
  )
);


CREATE POLICY "Allow users to see submissions based on role"
ON public.quiz_submissions FOR SELECT
TO public
USING (
  (user_id = auth.uid()) OR
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'::app_role
    )
  ) OR 
  is_teacher_for_course(
    (SELECT s.course_id
     FROM public.course_lesson_content AS lc
     JOIN public.course_lessons AS l ON lc.lesson_id = l.id
     JOIN public.course_sections AS s ON l.section_id = s.id
     WHERE lc.id = quiz_submissions.lesson_content_id)
  )
);

-- Note: The policies "Allow admins to delete submissions" and "Allow students to insert their own submissions"
-- did not depend on the lesson structure, so they do not need to be changed or re-created.
