-- Migration: Fix publish_draft function due_date field references
-- This fixes the error "record \"rec_lesson\" has no field \"due_date\""
-- by updating the function to reflect the migration that moved due_date from course_lessons to course_lesson_content

CREATE OR REPLACE FUNCTION public.publish_draft(draft_id_in uuid, published_id_in uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Replaces the old destructive publish_draft function with a safer, non-destructive version.
-- This version synchronizes content from a draft to a published course without deleting
-- lesson content that has associated student progress.

DECLARE
  rec_section record;
  rec_lesson record;
  rec_content_item record;
  rec_question record;
  rec_option record;

  match_section_id uuid;
  match_lesson_id uuid;
  match_content_item_id uuid;
  match_question_id uuid;

  active_section_ids uuid[] := ARRAY[]::uuid[];
  active_lesson_ids uuid[] := ARRAY[]::uuid[];
  active_content_item_ids uuid[] := ARRAY[]::uuid[];
  active_question_ids uuid[] := ARRAY[]::uuid[];
  active_option_ids uuid[] := ARRAY[]::uuid[];

BEGIN
  -- Update the published course's main details from the draft
  UPDATE public.courses
  SET
      title = draft.title,
      subtitle = draft.subtitle,
      description = draft.description,
      category_id = draft.category_id,
      language_id = draft.language_id,
      level_id = draft.level_id,
      image_url = draft.image_url,
      duration = draft.duration,
      requirements = draft.requirements,
      learning_outcomes = draft.learning_outcomes,
      updated_at = now()
  FROM public.courses AS draft
  WHERE
      courses.id = published_id_in AND draft.id = draft_id_in;

  -- Synchronize curriculum by looping through the DRAFT and updating/inserting into the PUBLISHED course
  FOR rec_section IN SELECT * FROM public.course_sections WHERE course_id = draft_id_in ORDER BY position LOOP
    SELECT id INTO match_section_id FROM public.course_sections WHERE course_id = published_id_in AND position = rec_section.position;

    IF match_section_id IS NOT NULL THEN
      UPDATE public.course_sections SET title = rec_section.title, overview = rec_section.overview WHERE id = match_section_id;
    ELSE
      INSERT INTO public.course_sections (course_id, title, overview, position)
      VALUES (published_id_in, rec_section.title, rec_section.overview, rec_section.position)
      RETURNING id INTO match_section_id;
    END IF;
    active_section_ids := array_append(active_section_ids, match_section_id);

    FOR rec_lesson IN SELECT * FROM public.course_lessons WHERE section_id = rec_section.id ORDER BY position LOOP
      SELECT id INTO match_lesson_id FROM public.course_lessons WHERE section_id = match_section_id AND position = rec_lesson.position;
      
      IF match_lesson_id IS NOT NULL THEN
        UPDATE public.course_lessons SET title = rec_lesson.title, overview = rec_lesson.overview WHERE id = match_lesson_id;
      ELSE
        INSERT INTO public.course_lessons (section_id, title, overview, "position")
        VALUES (match_section_id, rec_lesson.title, rec_lesson.overview, rec_lesson.position)
        RETURNING id INTO match_lesson_id;
      END IF;
      active_lesson_ids := array_append(active_lesson_ids, match_lesson_id);

      FOR rec_content_item IN SELECT * FROM public.course_lesson_content WHERE lesson_id = rec_lesson.id ORDER BY position LOOP
        SELECT id INTO match_content_item_id FROM public.course_lesson_content WHERE lesson_id = match_lesson_id AND position = rec_content_item.position;

        IF match_content_item_id IS NOT NULL THEN
          UPDATE public.course_lesson_content SET title = rec_content_item.title, content_type = rec_content_item.content_type, content_path = rec_content_item.content_path, due_date = rec_content_item.due_date WHERE id = match_content_item_id;
        ELSE
          INSERT INTO public.course_lesson_content (lesson_id, title, content_type, content_path, due_date, position)
          VALUES (match_lesson_id, rec_content_item.title, rec_content_item.content_type, rec_content_item.content_path, rec_content_item.due_date, rec_content_item.position)
          RETURNING id INTO match_content_item_id;
        END IF;
        active_content_item_ids := array_append(active_content_item_ids, match_content_item_id);

        IF rec_content_item.content_type = 'quiz' THEN
          DELETE FROM public.question_options WHERE question_id IN (SELECT id FROM public.quiz_questions WHERE lesson_content_id = match_content_item_id);
          DELETE FROM public.quiz_questions WHERE lesson_content_id = match_content_item_id;

          FOR rec_question IN SELECT * FROM public.quiz_questions WHERE lesson_content_id = rec_content_item.id ORDER BY position LOOP
            INSERT INTO public.quiz_questions (lesson_content_id, question_text, position)
            VALUES (match_content_item_id, rec_question.question_text, rec_question.position)
            RETURNING id INTO match_question_id;

            FOR rec_option IN SELECT * FROM public.question_options WHERE question_id = rec_question.id ORDER BY position LOOP
              INSERT INTO public.question_options (question_id, option_text, is_correct, position)
              VALUES (match_question_id, rec_option.option_text, rec_option.is_correct, rec_option.position);
            END LOOP;
          END LOOP;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Cleanup: Delete items from the published course that are no longer in the draft, with safety checks for progress
  -- Note: This is a cascading-like manual delete, starting from the deepest level.

  -- Delete orphaned content items, but ONLY if they have no associated progress.
  DELETE FROM public.course_lesson_content
  WHERE lesson_id IN (SELECT id FROM public.course_lessons WHERE section_id IN (SELECT id FROM public.course_sections WHERE course_id = published_id_in))
    AND id <> ALL(active_content_item_ids)
    AND id NOT IN (SELECT lesson_content_id FROM public.user_content_item_progress WHERE course_id = published_id_in);

  -- Delete orphaned lessons (if they have no content items left)
  DELETE FROM public.course_lessons l
  WHERE l.section_id IN (SELECT id FROM public.course_sections WHERE course_id = published_id_in)
    AND l.id <> ALL(active_lesson_ids)
    AND NOT EXISTS (SELECT 1 FROM public.course_lesson_content WHERE lesson_id = l.id);

  -- Delete orphaned sections (if they have no lessons left)
  DELETE FROM public.course_sections s
  WHERE s.course_id = published_id_in
    AND s.id <> ALL(active_section_ids)
    AND NOT EXISTS (SELECT 1 FROM public.course_lessons WHERE section_id = s.id);

  -- Synchronize members
  -- Add new members from draft
  INSERT INTO public.course_members (course_id, user_id, role)
  SELECT published_id_in, user_id, role
  FROM public.course_members draft_members
  WHERE draft_members.course_id = draft_id_in
    AND NOT EXISTS (
      SELECT 1 FROM public.course_members pub_members
      WHERE pub_members.course_id = published_id_in
        AND pub_members.user_id = draft_members.user_id
    );

  -- Remove members who are no longer in the draft
  DELETE FROM public.course_members
  WHERE course_id = published_id_in
    AND user_id NOT IN (
      SELECT user_id FROM public.course_members WHERE course_id = draft_id_in
    );

  -- Finally, delete the draft course itself
  DELETE FROM public.courses WHERE id = draft_id_in;

END;
$$;
