-- Check the class meeting details and verify it matches student's enrolled classes

-- Step 1: Show the most recent class meetings
SELECT 
    zm.id as meeting_id,
    zm.title,
    zm.class_id,
    c.name as class_name,
    c.code as class_code,
    zm.scheduled_time,
    zm.status,
    zm.created_at
FROM zoom_meetings zm
LEFT JOIN classes c ON c.id = zm.class_id
WHERE zm.meeting_type = 'class'
ORDER BY zm.created_at DESC
LIMIT 10;

-- Step 2: Check if the class meeting's class_id matches any of the student's enrolled classes
-- The student is enrolled in these classes (from your console):
-- 5e80b720-d3d5-4895-87bc-ff4793ea99d9
-- 3b851d34-7641-4407-b53a-2a2dc36dd340
-- 9cde9c8e-68aa-49df-a85d-06a6a5a8d76e
-- 5d33ab0c-5f9b-481b-8422-d807eab8ab0e
-- 7628b020-915f-4dd8-a34c-07a67c69366c

SELECT 
    zm.id as meeting_id,
    zm.title,
    zm.class_id,
    c.name as class_name,
    CASE 
        WHEN zm.class_id IN (
            '5e80b720-d3d5-4895-87bc-ff4793ea99d9',
            '3b851d34-7641-4407-b53a-2a2dc36dd340',
            '9cde9c8e-68aa-49df-a85d-06a6a5a8d76e',
            '5d33ab0c-5f9b-481b-8422-d807eab8ab0e',
            '7628b020-915f-4dd8-a34c-07a67c69366c'
        ) THEN '✅ Student IS enrolled in this class'
        ELSE '❌ Student NOT enrolled in this class'
    END as enrollment_match
FROM zoom_meetings zm
LEFT JOIN classes c ON c.id = zm.class_id
WHERE zm.meeting_type = 'class'
ORDER BY zm.created_at DESC
LIMIT 10;

