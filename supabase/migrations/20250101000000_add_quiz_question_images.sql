-- Migration: Add image support to quiz questions
-- Description: Adds image_url column to both quiz_questions and standalone_quiz_questions tables
-- Date: 2025-01-01

-- Add image_url column to quiz_questions table
ALTER TABLE "public"."quiz_questions" 
ADD COLUMN IF NOT EXISTS "image_url" "text";

-- Add comment for the new column
COMMENT ON COLUMN "public"."quiz_questions"."image_url" IS 'Optional image URL for the quiz question';

-- Add image_url column to standalone_quiz_questions table
ALTER TABLE "public"."standalone_quiz_questions" 
ADD COLUMN IF NOT EXISTS "image_url" "text";

-- Add comment for the new column
COMMENT ON COLUMN "public"."standalone_quiz_questions"."image_url" IS 'Optional image URL for the standalone quiz question';

-- Create index for better performance on image_url queries (optional)
CREATE INDEX IF NOT EXISTS "idx_quiz_questions_image_url" ON "public"."quiz_questions" ("image_url") WHERE "image_url" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_standalone_quiz_questions_image_url" ON "public"."standalone_quiz_questions" ("image_url") WHERE "image_url" IS NOT NULL;
