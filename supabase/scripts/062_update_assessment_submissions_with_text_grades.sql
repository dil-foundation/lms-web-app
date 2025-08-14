-- Update get_assessment_submissions function to include individual text answer grades
-- This ensures that the new text_answer_grades table data is properly returned

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
                'text_answer_grades', COALESCE(tagd.individual_grades, '[]'::jsonb)
            ) as submission_data
        FROM quiz_submissions qs
        LEFT JOIN text_answer_grades_data tagd ON qs.id = tagd.quiz_submission_id
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
