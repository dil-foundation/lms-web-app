-- Migration: Fix get_user_quiz_attempt_history function return types
-- This migration fixes the type mismatch between the function return type and actual column types

-- Drop the existing function first (PostgreSQL doesn't allow changing return types)
DROP FUNCTION IF EXISTS "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid");

-- Recreate the function with correct return types and include submission_id
CREATE OR REPLACE FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") 
RETURNS TABLE(
  "submission_id" "uuid",  -- Add submission_id field
  "attempt_number" integer, 
  "submitted_at" timestamp with time zone, 
  "score" double precision,  -- Changed from numeric to double precision to match table
  "manual_grading_required" boolean, 
  "manual_grading_completed" boolean, 
  "manual_grading_score" numeric(5,2),  -- Changed from numeric to numeric(5,2) to match table
  "retry_reason" "text", 
  "answers" "jsonb", 
  "results" "jsonb"
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as submission_id,  -- Include the actual submission ID
        qs.attempt_number,
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    WHERE qs.user_id = p_user_id
    AND qs.lesson_content_id = p_lesson_content_id
    ORDER BY qs.attempt_number;
END;
$$;

-- Grant permissions
ALTER FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") OWNER TO "postgres";

-- Grant access to roles
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_quiz_attempt_history"("p_user_id" "uuid", "p_lesson_content_id" "uuid") TO "service_role";
