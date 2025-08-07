-- This script adds a unique constraint to the user_content_item_progress table.
-- This is necessary for the ON CONFLICT clause to work correctly when upserting progress.
ALTER TABLE public.user_content_item_progress
ADD CONSTRAINT user_content_item_progress_user_id_lesson_content_id_key UNIQUE (user_id, lesson_content_id);
