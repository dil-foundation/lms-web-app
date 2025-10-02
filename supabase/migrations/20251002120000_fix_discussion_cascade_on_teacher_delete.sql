-- Fix discussion deletion behavior when teacher is deleted
-- Change from CASCADE to SET NULL to preserve discussions
-- This ensures discussions remain accessible even after the creator is deleted

-- Drop the existing constraint
ALTER TABLE "public"."discussions"
  DROP CONSTRAINT IF EXISTS "discussions_creator_id_fkey";

-- Add the new constraint with SET NULL instead of CASCADE
ALTER TABLE "public"."discussions"
  ADD CONSTRAINT "discussions_creator_id_fkey" 
  FOREIGN KEY ("creator_id") 
  REFERENCES "public"."profiles"("id") 
  ON DELETE SET NULL;

-- Add a helpful comment
COMMENT ON CONSTRAINT "discussions_creator_id_fkey" ON "public"."discussions" 
IS 'When a user (teacher) is deleted, preserve the discussion but set creator_id to NULL. The discussion content and replies remain accessible.';

