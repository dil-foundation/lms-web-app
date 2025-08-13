-- Migration: Fix publish_draft function to preserve student progress during course updates
-- This fixes the issue where student progress is lost when admin publishes course updates
-- by maintaining content item IDs instead of creating new ones
--
-- KEY IMPROVEMENTS:
-- 1. ULTRA-CONSERVATIVE content item matching: 5 different strategies to find existing items
-- 2. Ultra-conservative cleanup: Only deletes content items with absolutely NO progress or related data
-- 3. Preserves existing content item IDs when possible to maintain student progress
-- 4. Updates position if content is moved but preserves the same content item ID
-- 5. Multiple safety checks to ensure student progress is NEVER lost
-- 6. Fixed database schema references to prevent column errors
-- 7. Added fallback strategy to reuse content items with progress when no exact match found
-- 8. FIXED: Admin unpublish/publish now properly handles curriculum changes through frontend logic
-- 9. Simplified same-course scenario - frontend handles status update, database function handles teacher drafts

CREATE OR REPLACE FUNCTION public.publish_draft(draft_id_in uuid, published_id_in uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
-- Replaces the old destructive publish_draft function with a safer, non-destructive version.
-- This version synchronizes content from a draft to a published course without deleting
-- lesson content that has associated student progress.
--
-- ULTRA-CONSERVATIVE APPROACH:
-- This function uses multiple matching strategies to find existing content items before creating new ones.
-- The goal is to NEVER lose student progress, even if it means being overly cautious about matching.
-- We'd rather have duplicate content than lose student progress.

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
  -- Add debugging for function parameters
  RAISE NOTICE 'publish_draft called with draft_id_in: %, published_id_in: %', draft_id_in, published_id_in;
  
    -- Special handling for when draft and published are the same course
  -- This happens when admin unpublishes and republishes the same course
  IF draft_id_in = published_id_in THEN
    RAISE NOTICE 'Same course scenario detected - this should not happen in normal flow';
    RAISE NOTICE 'The frontend should handle same-course scenario by just updating status';
    RAISE EXCEPTION 'Same course scenario detected - this should be handled by frontend';
  END IF;

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
        -- ULTRA-CONSERVATIVE matching: Try multiple strategies to find existing content items
        -- This ensures we NEVER lose student progress by creating new content items unnecessarily
        
        -- Strategy 1: Try by position (most reliable)
        SELECT id INTO match_content_item_id FROM public.course_lesson_content 
        WHERE lesson_id = match_lesson_id AND position = rec_content_item.position
        AND id NOT IN (SELECT unnest(active_content_item_ids));
        
        -- Strategy 2: If not found by position, try by title and content_type
        IF match_content_item_id IS NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND title = rec_content_item.title 
            AND content_type = rec_content_item.content_type
            AND id NOT IN (SELECT unnest(active_content_item_ids));
        END IF;
        
        -- Strategy 3: If still not found, try by content_path (for files/videos)
        IF match_content_item_id IS NULL AND rec_content_item.content_path IS NOT NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND content_path = rec_content_item.content_path
            AND content_type = rec_content_item.content_type
            AND id NOT IN (SELECT unnest(active_content_item_ids));
        END IF;
        
        -- Strategy 4: If still not found, try by title only (last resort)
        IF match_content_item_id IS NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND title = rec_content_item.title
            AND id NOT IN (SELECT unnest(active_content_item_ids));
        END IF;

        -- Strategy 5: If still not found, check if ANY content item in this lesson has progress
        -- If so, try to reuse the first available content item to preserve progress
        IF match_content_item_id IS NULL THEN
          SELECT id INTO match_content_item_id FROM public.course_lesson_content 
          WHERE lesson_id = match_lesson_id 
            AND id NOT IN (SELECT unnest(active_content_item_ids))
            AND (id IN (SELECT lesson_content_id FROM public.user_content_item_progress WHERE course_id = published_id_in)
                 OR id IN (SELECT lesson_content_id FROM public.quiz_submissions WHERE lesson_content_id IS NOT NULL)
                 OR id IN (SELECT lesson_content_id FROM public.quiz_questions WHERE lesson_content_id IS NOT NULL))
          LIMIT 1;
        END IF;

        IF match_content_item_id IS NOT NULL THEN
          -- Update existing content item (preserves ID and ALL progress)
          UPDATE public.course_lesson_content 
          SET title = rec_content_item.title, 
              content_type = rec_content_item.content_type, 
              content_path = rec_content_item.content_path, 
              due_date = rec_content_item.due_date,
              position = rec_content_item.position  -- Update position if it changed
          WHERE id = match_content_item_id;
        ELSE
          -- ONLY create new content item if absolutely no match found AND no progress exists
          -- This should rarely happen and only for truly new content
          INSERT INTO public.course_lesson_content (lesson_id, title, content_type, content_path, due_date, position)
          VALUES (match_lesson_id, rec_content_item.title, rec_content_item.content_type, rec_content_item.content_path, rec_content_item.due_date, rec_content_item.position)
          RETURNING id INTO match_content_item_id;
        END IF;
        active_content_item_ids := array_append(active_content_item_ids, match_content_item_id);

        -- Handle quiz content - preserve existing quiz structure if possible
        IF rec_content_item.content_type = 'quiz' THEN
          -- Check if there are existing questions for this content item
          IF EXISTS (SELECT 1 FROM public.quiz_questions WHERE lesson_content_id = match_content_item_id) THEN
            -- Update existing quiz questions instead of deleting and recreating
            -- This preserves quiz attempts and progress
            -- Note: This is a simplified approach - in a full implementation, you might want
            -- to do more sophisticated question matching based on question text or position
            NULL; -- Skip quiz recreation to preserve progress
          ELSE
            -- No existing questions, safe to create new ones
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
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  -- Cleanup: Delete items from the published course that are no longer in the draft, with ULTRA-CONSERVATIVE safety checks
  -- Note: This is a cascading-like manual delete, starting from the deepest level.
  -- We are EXTREMELY conservative to ensure we NEVER lose student progress.
  -- We'd rather have orphaned content items than lose student progress.

  -- Delete orphaned content items, but ONLY if they have absolutely NO associated progress or related data.
  -- This is ultra-conservative to ensure we never lose student progress.
  -- We only delete content items that have no progress, no quiz questions, and no quiz submissions.
  DELETE FROM public.course_lesson_content
  WHERE lesson_id IN (SELECT id FROM public.course_lessons WHERE section_id IN (SELECT id FROM public.course_sections WHERE course_id = published_id_in))
    AND id <> ALL(active_content_item_ids)
    AND id NOT IN (SELECT lesson_content_id FROM public.user_content_item_progress WHERE course_id = published_id_in)
    AND id NOT IN (SELECT lesson_content_id FROM public.quiz_questions WHERE lesson_content_id IS NOT NULL)
    AND id NOT IN (SELECT lesson_content_id FROM public.quiz_submissions WHERE lesson_content_id IS NOT NULL);

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
  -- (This will only execute if draft_id_in != published_id_in due to the early return above)
  DELETE FROM public.courses WHERE id = draft_id_in;

END;
$$;
