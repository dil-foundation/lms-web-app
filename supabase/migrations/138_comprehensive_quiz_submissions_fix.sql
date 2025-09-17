-- Comprehensive fix for quiz submissions not showing in assessments
-- This migration ensures all functions are properly updated and working

-- 1. First, let's ensure the quiz_submissions table has the correct structure
-- Add any missing columns if they don't exist
ALTER TABLE public.quiz_submissions
ADD COLUMN IF NOT EXISTS attempt_number INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS previous_attempt_id UUID NULL,
ADD COLUMN IF NOT EXISTS retry_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS is_latest_attempt BOOLEAN NOT NULL DEFAULT true;

-- 2. Ensure the foreign key constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'quiz_submissions_previous_attempt_fkey' 
    AND table_name = 'quiz_submissions'
  ) THEN
    ALTER TABLE public.quiz_submissions 
    ADD CONSTRAINT quiz_submissions_previous_attempt_fkey 
    FOREIGN KEY (previous_attempt_id) REFERENCES quiz_submissions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Ensure the unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_quiz_submissions_latest_attempt 
ON public.quiz_submissions (user_id, lesson_content_id) 
WHERE is_latest_attempt = true;

-- 4. Update any existing records that might not have proper attempt tracking
DO $$
DECLARE
    submission_record RECORD;
    attempt_counter INTEGER;
BEGIN
    -- Update attempt numbers for existing records
    FOR submission_record IN 
        SELECT qs.user_id, qs.lesson_content_id, qs.id, qs.submitted_at
        FROM quiz_submissions qs
        WHERE qs.lesson_content_id IS NOT NULL
        ORDER BY qs.user_id, qs.lesson_content_id, qs.submitted_at
    LOOP
        SELECT COUNT(*) + 1
        INTO attempt_counter
        FROM quiz_submissions qs2
        WHERE qs2.user_id = submission_record.user_id 
        AND qs2.lesson_content_id = submission_record.lesson_content_id
        AND qs2.submitted_at < submission_record.submitted_at;
        
        UPDATE quiz_submissions 
        SET attempt_number = attempt_counter
        WHERE id = submission_record.id;
    END LOOP;
    
    -- Mark latest attempts
    UPDATE quiz_submissions 
    SET is_latest_attempt = true
    WHERE id IN (
        SELECT DISTINCT ON (qs.user_id, qs.lesson_content_id) qs.id
        FROM quiz_submissions qs
        WHERE qs.lesson_content_id IS NOT NULL
        ORDER BY qs.user_id, qs.lesson_content_id, qs.submitted_at DESC
    );
    
    -- Mark all other attempts as not latest
    UPDATE quiz_submissions 
    SET is_latest_attempt = false
    WHERE id NOT IN (
        SELECT DISTINCT ON (qs.user_id, qs.lesson_content_id) qs.id
        FROM quiz_submissions qs
        WHERE qs.lesson_content_id IS NOT NULL
        ORDER BY qs.user_id, qs.lesson_content_id, qs.submitted_at DESC
    );
END $$;

-- 5. Drop and recreate the get_latest_quiz_submissions_for_assessment function
DROP FUNCTION IF EXISTS get_latest_quiz_submissions_for_assessment(UUID);

CREATE OR REPLACE FUNCTION get_latest_quiz_submissions_for_assessment(
    p_lesson_content_id UUID
)
RETURNS TABLE (
    submission_id UUID,
    user_id UUID,
    student_name TEXT,
    student_email TEXT,
    attempt_number INTEGER,
    total_attempts INTEGER,
    submitted_at TIMESTAMPTZ,
    score NUMERIC(5,2),
    manual_grading_required BOOLEAN,
    manual_grading_completed BOOLEAN,
    manual_grading_score NUMERIC(5,2),
    retry_reason TEXT,
    answers JSONB,
    results JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qs.id as submission_id,
        qs.user_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as student_name,
        p.email as student_email,
        qs.attempt_number,
        (SELECT COUNT(*) FROM quiz_submissions qs2 
         WHERE qs2.user_id = qs.user_id 
         AND qs2.lesson_content_id = p_lesson_content_id) as total_attempts,
        qs.submitted_at,
        qs.score,
        qs.manual_grading_required,
        qs.manual_grading_completed,
        qs.manual_grading_score,
        qs.retry_reason,
        qs.answers,
        qs.results
    FROM quiz_submissions qs
    JOIN profiles p ON qs.user_id = p.id
    WHERE qs.lesson_content_id = p_lesson_content_id
    AND qs.is_latest_attempt = true
    ORDER BY p.email;
END;
$$;

-- 6. Drop and recreate the get_assessment_submissions function
DROP FUNCTION IF EXISTS get_assessment_submissions(UUID);

CREATE OR REPLACE FUNCTION get_assessment_submissions(assessment_id UUID)
RETURNS TABLE (
    id UUID,
    title TEXT,
    course_title TEXT,
    course_id UUID,
    lesson_id UUID,
    content_type TEXT,
    submissions JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH assessment_details AS (
        SELECT
            clc.id,
            clc.title,
            c.title as course_title,
            clc.content_type,
            c.id as course_id,
            cl.id as lesson_id
        FROM course_lesson_content clc
        JOIN course_lessons cl ON clc.lesson_id = cl.id
        JOIN course_sections cs ON cl.section_id = cs.id
        JOIN courses c ON cs.course_id = c.id
        WHERE clc.id = assessment_id
    ),
    course_students AS (
        SELECT
            p.id as student_id,
            p.first_name || ' ' || p.last_name AS student_name,
            NULL::text as avatar_url
        FROM profiles p
        JOIN course_members cm ON p.id = cm.user_id
        WHERE cm.course_id = (SELECT ad.course_id FROM assessment_details ad) AND p.role = 'student'
    ),
    text_answer_grades_data AS (
        SELECT
            tag.quiz_submission_id,
            jsonb_agg(
                jsonb_build_object(
                    'question_id', tag.question_id,
                    'question_text', qq.question_text,
                    'question_position', qq.position,
                    'grade', tag.grade,
                    'feedback', tag.feedback,
                    'graded_by', tag.graded_by,
                    'graded_at', tag.graded_at
                )
            ) as individual_grades
        FROM text_answer_grades tag
        JOIN quiz_questions qq ON qq.id = tag.question_id
        GROUP BY tag.quiz_submission_id
    ),
    quiz_submissions_data AS (
        SELECT
            qs.user_id,
            jsonb_build_object(
                'id', qs.id,
                'status', CASE 
                    WHEN qs.manual_grading_required AND NOT qs.manual_grading_completed THEN 'submitted'
                    WHEN qs.manual_grading_completed THEN 'graded'
                    ELSE 'graded'
                END,
                'score', COALESCE(qs.score, qs.manual_grading_score),
                'feedback', qs.manual_grading_feedback,
                'submitted_at', qs.submitted_at,
                'answers', qs.answers,
                'results', qs.results,
                'manual_grading_required', qs.manual_grading_required,
                'manual_grading_completed', qs.manual_grading_completed,
                'manual_grading_score', qs.manual_grading_score,
                'manual_grading_feedback', qs.manual_grading_feedback,
                'manual_grading_completed_at', qs.manual_grading_completed_at,
                'manual_grading_completed_by', qs.manual_grading_completed_by,
                'text_answer_grades', COALESCE(tagd.individual_grades, '[]'::jsonb),
                'attempt_number', qs.attempt_number,
                'is_latest_attempt', qs.is_latest_attempt,
                'retry_reason', qs.retry_reason
            ) as submission_data
        FROM quiz_submissions qs
        LEFT JOIN text_answer_grades_data tagd ON qs.id = tagd.quiz_submission_id
        WHERE qs.lesson_content_id = assessment_id
        AND qs.is_latest_attempt = true
    ),
    assignment_submissions_data AS (
        SELECT
            asub.user_id,
            jsonb_build_object(
                'id', asub.id,
                'status', asub.status,
                'score', asub.grade,
                'feedback', asub.feedback,
                'submitted_at', asub.submitted_at,
                'content', asub.content
            ) as submission_data
        FROM assignment_submissions asub
        WHERE asub.assignment_id = assessment_id
    ),
    all_submissions AS (
        SELECT
            cs.student_id,
            cs.student_name,
            cs.avatar_url,
            COALESCE(qsd.submission_data, asd.submission_data) as submission
        FROM course_students cs
        LEFT JOIN quiz_submissions_data qsd ON cs.student_id = qsd.user_id
        LEFT JOIN assignment_submissions_data asd ON cs.student_id = asd.user_id
    )
    SELECT
        ad.id,
        ad.title,
        ad.course_title,
        ad.course_id,
        ad.lesson_id,
        ad.content_type,
        COALESCE(jsonb_agg(
            jsonb_build_object(
                'student', jsonb_build_object('id', sub.student_id, 'name', sub.student_name, 'avatar_url', sub.avatar_url),
                'submission', sub.submission
            )
        ), '[]'::jsonb) as submissions
    FROM assessment_details ad
    LEFT JOIN all_submissions sub ON true
    GROUP BY ad.id, ad.title, ad.course_title, ad.course_id, ad.lesson_id, ad.content_type;
END;
$$;

-- 7. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_latest_quiz_submissions_for_assessment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_assessment_submissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_quiz_attempt_history(UUID, UUID) TO authenticated;
