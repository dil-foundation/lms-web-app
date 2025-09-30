-- Get the specific class meeting details
SELECT 
    id,
    title,
    meeting_type,
    class_id,
    course_id,
    student_id,
    scheduled_time,
    status,
    created_at
FROM zoom_meetings
WHERE id = 'e8334fb8-45d2-4cb2-a92e-bc32724c4c50';

-- Check if this class_id matches any of the student's enrolled classes
-- Student is enrolled in these 5 classes:
-- 5e80b720-d3d5-4895-87bc-ff4793ea99d9
-- 3b851d34-7641-4407-b53a-2a2dc36dd340
-- 9cde9c8e-68aa-49df-a85d-06a6a5a8d76e
-- 5d33ab0c-5f9b-481b-8422-d807eab8ab0e
-- 7628b020-915f-4dd8-a34c-07a67c69366c

SELECT 
    zm.class_id,
    CASE 
        WHEN zm.class_id = '5e80b720-d3d5-4895-87bc-ff4793ea99d9' THEN '✅ MATCH: Class 0'
        WHEN zm.class_id = '3b851d34-7641-4407-b53a-2a2dc36dd340' THEN '✅ MATCH: Class 1'
        WHEN zm.class_id = '9cde9c8e-68aa-49df-a85d-06a6a5a8d76e' THEN '✅ MATCH: Class 2'
        WHEN zm.class_id = '5d33ab0c-5f9b-481b-8422-d807eab8ab0e' THEN '✅ MATCH: Class 3'
        WHEN zm.class_id = '7628b020-915f-4dd8-a34c-07a67c69366c' THEN '✅ MATCH: Class 4'
        WHEN zm.class_id IS NULL THEN '❌ class_id is NULL'
        ELSE '❌ NO MATCH - class_id does not match student enrolled classes'
    END as match_status
FROM zoom_meetings zm
WHERE zm.id = 'e8334fb8-45d2-4cb2-a92e-bc32724c4c50';

-- Show the actual meeting with class name
SELECT 
    zm.id,
    zm.title,
    zm.meeting_type,
    zm.class_id,
    c.name as class_name,
    c.code as class_code,
    zm.scheduled_time
FROM zoom_meetings zm
LEFT JOIN classes c ON c.id = zm.class_id
WHERE zm.id = 'e8334fb8-45d2-4cb2-a92e-bc32724c4c50';

