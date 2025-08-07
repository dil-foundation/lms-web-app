-- This script updates the get_assessment_submissions function to include course_id and lesson_id
-- so that an assignment can be marked as complete for a student upon grading.

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
    quiz_submissions_data AS (
        SELECT
            qs.user_id,
            jsonb_build_object(
                'id', qs.id,
                'status', 'graded',
                'score', qs.score,
                'submitted_at', qs.submitted_at,
                'answers', qs.answers,
                'results', qs.results
            ) as submission_data
        FROM quiz_submissions qs
        WHERE qs.lesson_content_id = assessment_id
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
