-- Migration: Update Grading System to Points-Based Assessment
-- This migration updates the grading system to use points instead of percentages
-- and ensures proper calculation of overall scores based on question points

-- 1. Update the calculate_quiz_final_score function to use points-based calculation
CREATE OR REPLACE FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_earned_points NUMERIC(10,2) := 0;
  total_possible_points NUMERIC(10,2) := 0;
  auto_graded_earned_points NUMERIC(10,2) := 0;
  auto_graded_possible_points NUMERIC(10,2) := 0;
  text_answer_earned_points NUMERIC(10,2) := 0;
  text_answer_possible_points NUMERIC(10,2) := 0;
  final_score_percentage NUMERIC(10,2) := 0;
BEGIN
  -- Get auto-graded questions points (single_choice, multiple_choice, math_expression without drawing)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN qs.results->>qq.id::text = 'true' THEN qq.points
        ELSE 0 
      END
    ), 0),
    COALESCE(SUM(qq.points), 0)
  INTO auto_graded_earned_points, auto_graded_possible_points
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  WHERE qs.id = submission_id 
  AND qq.question_type IN ('single_choice', 'multiple_choice', 'math_expression')
  AND NOT (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true);
  
  -- Get text answer questions points (including math_expression with drawing)
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN tag.grade IS NOT NULL THEN (tag.grade / 100.0) * qq.points
        ELSE 0 
      END
    ), 0),
    COALESCE(SUM(qq.points), 0)
  INTO text_answer_earned_points, text_answer_possible_points
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  LEFT JOIN text_answer_grades tag ON tag.question_id = qq.id AND tag.quiz_submission_id = submission_id
  WHERE qs.id = submission_id 
  AND (qq.question_type = 'text_answer' OR (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true));
  
  -- Calculate totals
  total_earned_points := auto_graded_earned_points + text_answer_earned_points;
  total_possible_points := auto_graded_possible_points + text_answer_possible_points;
  
  -- Return percentage score
  IF total_possible_points > 0 THEN
    final_score_percentage := ROUND((total_earned_points / total_possible_points) * 100, 2);
    RETURN final_score_percentage;
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- 2. Update the save_text_answer_grades function to work with points-based grading
CREATE OR REPLACE FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  grade_record RECORD;
  question_points NUMERIC(10,2);
  earned_points NUMERIC(10,2);
  grade_percentage NUMERIC(5,2);
BEGIN
  -- Insert or update grades using UPSERT
  FOR grade_record IN 
    SELECT * FROM jsonb_array_elements(grades_data)
  LOOP
    -- Get the question points
    SELECT qq.points INTO question_points
    FROM quiz_questions qq
    JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
    WHERE qs.id = submission_id 
    AND qq.id = (grade_record.value->>'question_id')::UUID;
    
    -- Calculate earned points and grade percentage
    earned_points := (grade_record.value->>'earned_points')::NUMERIC(10,2);
    grade_percentage := CASE 
      WHEN question_points > 0 THEN ROUND((earned_points / question_points) * 100, 2)
      ELSE 0 
    END;
    
    -- Insert or update the grade record
    INSERT INTO text_answer_grades (
      quiz_submission_id,
      question_id,
      grade,
      feedback,
      graded_by
    ) VALUES (
      submission_id,
      (grade_record.value->>'question_id')::UUID,
      grade_percentage,
      grade_record.value->>'feedback',
      teacher_id
    )
    ON CONFLICT (quiz_submission_id, question_id) 
    DO UPDATE SET
      grade = EXCLUDED.grade,
      feedback = EXCLUDED.feedback,
      graded_by = EXCLUDED.graded_by,
      graded_at = NOW();
  END LOOP;
  
  -- Update the main quiz submission with overall score and completion status
  UPDATE quiz_submissions 
  SET 
    manual_grading_completed = TRUE,
    manual_grading_completed_at = NOW(),
    manual_grading_completed_by = teacher_id
  WHERE id = submission_id;
END;
$$;

-- 3. Update the complete_manual_grading_v2 function to handle points-based grading
CREATE OR REPLACE FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Save individual grades (now points-based)
  PERFORM save_text_answer_grades(submission_id, teacher_id, grades_data);
  
  -- Calculate and update final score using the updated points-based calculation
  UPDATE quiz_submissions 
  SET 
    manual_grading_score = calculate_quiz_final_score(submission_id),
    score = calculate_quiz_final_score(submission_id)
  WHERE id = submission_id;
END;
$$;

-- 4. Create a new function to get quiz points summary for UI display
CREATE OR REPLACE FUNCTION "public"."get_quiz_points_summary"("submission_id" "uuid") 
RETURNS TABLE(
  "total_possible_points" NUMERIC(10,2),
  "total_earned_points" NUMERIC(10,2),
  "auto_graded_earned_points" NUMERIC(10,2),
  "auto_graded_possible_points" NUMERIC(10,2),
  "manual_graded_earned_points" NUMERIC(10,2),
  "manual_graded_possible_points" NUMERIC(10,2),
  "final_score_percentage" NUMERIC(10,2)
)
LANGUAGE "plpgsql"
AS $$
DECLARE
  auto_graded_earned_points NUMERIC(10,2) := 0;
  auto_graded_possible_points NUMERIC(10,2) := 0;
  manual_graded_earned_points NUMERIC(10,2) := 0;
  manual_graded_possible_points NUMERIC(10,2) := 0;
  total_earned_points NUMERIC(10,2) := 0;
  total_possible_points NUMERIC(10,2) := 0;
  final_score_percentage NUMERIC(10,2) := 0;
BEGIN
  -- Get auto-graded questions points
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN qs.results->>qq.id::text = 'true' THEN qq.points
        ELSE 0 
      END
    ), 0),
    COALESCE(SUM(qq.points), 0)
  INTO auto_graded_earned_points, auto_graded_possible_points
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  WHERE qs.id = submission_id 
  AND qq.question_type IN ('single_choice', 'multiple_choice', 'math_expression')
  AND NOT (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true);
  
  -- Get manual-graded questions points
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN tag.grade IS NOT NULL THEN (tag.grade / 100.0) * qq.points
        ELSE 0 
      END
    ), 0),
    COALESCE(SUM(qq.points), 0)
  INTO manual_graded_earned_points, manual_graded_possible_points
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  LEFT JOIN text_answer_grades tag ON tag.question_id = qq.id AND tag.quiz_submission_id = submission_id
  WHERE qs.id = submission_id 
  AND (qq.question_type = 'text_answer' OR (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true));
  
  -- Calculate totals
  total_earned_points := auto_graded_earned_points + manual_graded_earned_points;
  total_possible_points := auto_graded_possible_points + manual_graded_possible_points;
  
  -- Calculate final score percentage
  IF total_possible_points > 0 THEN
    final_score_percentage := ROUND((total_earned_points / total_possible_points) * 100, 2);
  ELSE
    final_score_percentage := 0;
  END IF;
  
  -- Return the summary
  RETURN QUERY SELECT 
    total_possible_points,
    total_earned_points,
    auto_graded_earned_points,
    auto_graded_possible_points,
    manual_graded_earned_points,
    manual_graded_possible_points,
    final_score_percentage;
END;
$$;

-- 5. Create a function to get individual question points for UI display
CREATE OR REPLACE FUNCTION "public"."get_quiz_question_points"("submission_id" "uuid") 
RETURNS TABLE(
  "question_id" UUID,
  "question_text" TEXT,
  "question_type" TEXT,
  "question_position" INTEGER,
  "question_points" NUMERIC(10,2),
  "earned_points" NUMERIC(10,2),
  "grade_percentage" NUMERIC(5,2),
  "is_auto_graded" BOOLEAN,
  "is_manual_graded" BOOLEAN,
  "feedback" TEXT
)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qq.id as question_id,
    qq.question_text,
    qq.question_type,
    qq.position as question_position,
    qq.points as question_points,
    CASE 
      -- Auto-graded questions
      WHEN qq.question_type IN ('single_choice', 'multiple_choice') OR 
           (qq.question_type = 'math_expression' AND qq.math_allow_drawing = false) THEN
        CASE 
          WHEN qs.results->>qq.id::text = 'true' THEN qq.points
          ELSE 0 
        END
      -- Manual-graded questions
      WHEN qq.question_type = 'text_answer' OR 
           (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true) THEN
        CASE 
          WHEN tag.grade IS NOT NULL THEN (tag.grade / 100.0) * qq.points
          ELSE 0 
        END
      ELSE 0
    END as earned_points,
    CASE 
      -- Auto-graded questions
      WHEN qq.question_type IN ('single_choice', 'multiple_choice') OR 
           (qq.question_type = 'math_expression' AND qq.math_allow_drawing = false) THEN
        CASE 
          WHEN qs.results->>qq.id::text = 'true' THEN 100.0
          ELSE 0 
        END
      -- Manual-graded questions
      WHEN qq.question_type = 'text_answer' OR 
           (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true) THEN
        COALESCE(tag.grade, 0)
      ELSE 0
    END as grade_percentage,
    -- Auto-graded flag
    (qq.question_type IN ('single_choice', 'multiple_choice') OR 
     (qq.question_type = 'math_expression' AND qq.math_allow_drawing = false)) as is_auto_graded,
    -- Manual-graded flag
    (qq.question_type = 'text_answer' OR 
     (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true)) as is_manual_graded,
    tag.feedback
  FROM quiz_questions qq
  JOIN quiz_submissions qs ON qs.lesson_content_id = qq.lesson_content_id
  LEFT JOIN text_answer_grades tag ON tag.question_id = qq.id AND tag.quiz_submission_id = submission_id
  WHERE qs.id = submission_id
  ORDER BY qq.position;
END;
$$;

-- 6. Create a new function to get text answer grades with points information
CREATE OR REPLACE FUNCTION "public"."get_text_answer_grades_with_points"("submission_id" "uuid") 
RETURNS TABLE(
  "question_id" "uuid", 
  "question_text" "text", 
  "question_position" integer, 
  "question_points" NUMERIC(10,2),
  "earned_points" NUMERIC(10,2),
  "grade" numeric, 
  "feedback" "text", 
  "graded_by" "uuid", 
  "graded_at" timestamp with time zone
)
LANGUAGE "plpgsql"
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    qq.id as question_id,
    qq.question_text,
    qq.position as question_position,
    qq.points as question_points,
    CASE 
      WHEN tag.grade IS NOT NULL THEN (tag.grade / 100.0) * qq.points
      ELSE 0 
    END as earned_points,
    tag.grade,
    tag.feedback,
    tag.graded_by,
    tag.graded_at
  FROM quiz_questions qq
  LEFT JOIN text_answer_grades tag ON qq.id = tag.question_id AND tag.quiz_submission_id = submission_id
  WHERE qq.lesson_content_id = (
    SELECT lesson_content_id FROM quiz_submissions WHERE id = submission_id
  )
  AND (qq.question_type = 'text_answer' OR (qq.question_type = 'math_expression' AND qq.math_allow_drawing = true))
  ORDER BY qq.position;
END;
$$;

-- Grant permissions for the new functions
ALTER FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") OWNER TO "postgres";
ALTER FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") OWNER TO "postgres";
ALTER FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") OWNER TO "postgres";
ALTER FUNCTION "public"."get_quiz_points_summary"("submission_id" "uuid") OWNER TO "postgres";
ALTER FUNCTION "public"."get_quiz_question_points"("submission_id" "uuid") OWNER TO "postgres";
ALTER FUNCTION "public"."get_text_answer_grades_with_points"("submission_id" "uuid") OWNER TO "postgres";

-- Grant permissions to roles
GRANT ALL ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "service_role";

GRANT ALL ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_quiz_points_summary"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_points_summary"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_points_summary"("submission_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_quiz_question_points"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_quiz_question_points"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_quiz_question_points"("submission_id" "uuid") TO "service_role";

GRANT ALL ON FUNCTION "public"."get_text_answer_grades_with_points"("submission_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_text_answer_grades_with_points"("submission_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_text_answer_grades_with_points"("submission_id" "uuid") TO "service_role";

-- Add comments for documentation
COMMENT ON FUNCTION "public"."calculate_quiz_final_score"("submission_id" "uuid") IS 'Calculates the final quiz score as a percentage based on points earned vs total possible points';
COMMENT ON FUNCTION "public"."save_text_answer_grades"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") IS 'Saves individual grades for text answer questions using points-based grading';
COMMENT ON FUNCTION "public"."complete_manual_grading_v2"("submission_id" "uuid", "teacher_id" "uuid", "grades_data" "jsonb") IS 'Completes manual grading for a quiz submission using points-based assessment';
COMMENT ON FUNCTION "public"."get_quiz_points_summary"("submission_id" "uuid") IS 'Returns a summary of points earned vs possible points for a quiz submission';
COMMENT ON FUNCTION "public"."get_quiz_question_points"("submission_id" "uuid") IS 'Returns detailed points information for each question in a quiz submission';
COMMENT ON FUNCTION "public"."get_text_answer_grades_with_points"("submission_id" "uuid") IS 'Returns text answer grades with points information for a quiz submission';
