-- Check if student is enrolled in classes and what class meetings exist

-- Step 1: Check student's class enrollments
SELECT 
    cs.id,
    cs.student_id,
    cs.class_id,
    cs.enrollment_status,
    c.name as class_name,
    c.code as class_code,
    p.email as student_email
FROM class_students cs
JOIN classes c ON c.id = cs.class_id
JOIN profiles p ON p.id = cs.student_id
WHERE cs.student_id = '<STUDENT_ID>'  -- Replace with actual student ID
ORDER BY cs.created_at DESC;

-- Step 2: Check what class meetings exist
SELECT 
    zm.id,
    zm.title,
    zm.meeting_type,
    zm.class_id,
    c.name as class_name,
    c.code as class_code,
    zm.scheduled_time,
    zm.status
FROM zoom_meetings zm
LEFT JOIN classes c ON c.id = zm.class_id
WHERE zm.meeting_type = 'class'
  AND zm.class_id IS NOT NULL
ORDER BY zm.created_at DESC;

-- Step 3: Check if specific class meeting should be visible to student
-- Replace <CLASS_MEETING_ID> with the meeting ID you created
SELECT 
    zm.id as meeting_id,
    zm.title as meeting_title,
    zm.class_id,
    c.name as class_name,
    cs.student_id,
    p.email as student_email,
    cs.enrollment_status,
    CASE 
        WHEN cs.student_id IS NOT NULL AND cs.enrollment_status = 'active' 
        THEN 'Student SHOULD see this meeting'
        WHEN cs.student_id IS NOT NULL AND cs.enrollment_status != 'active'
        THEN 'Student enrolled but status is: ' || cs.enrollment_status
        ELSE 'Student NOT enrolled in this class'
    END as visibility_status
FROM zoom_meetings zm
LEFT JOIN classes c ON c.id = zm.class_id
LEFT JOIN class_students cs ON cs.class_id = zm.class_id AND cs.student_id = '<STUDENT_ID>'  -- Replace with student ID
LEFT JOIN profiles p ON p.id = cs.student_id
WHERE zm.id = '<CLASS_MEETING_ID>'  -- Replace with meeting ID
ORDER BY zm.created_at DESC;

