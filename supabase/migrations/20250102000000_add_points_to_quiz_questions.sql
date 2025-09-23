-- Migration: Add points field to quiz_questions table
-- Description: Adds points column to quiz_questions table to match standalone_quiz_questions table
-- Date: 2025-01-02

-- Add points column to quiz_questions table
ALTER TABLE "public"."quiz_questions" 
ADD COLUMN IF NOT EXISTS "points" numeric(5,2) DEFAULT 1;

-- Add comment for the new column
COMMENT ON COLUMN "public"."quiz_questions"."points" IS 'Points awarded for correct answer to this question';

-- Create index for better performance on points queries (optional)
CREATE INDEX IF NOT EXISTS "idx_quiz_questions_points" ON "public"."quiz_questions" ("points") WHERE "points" IS NOT NULL;
