-- Simple script to check existing RLS policies for messaging-related tables
-- Run each query separately and export results as JSON

-- 1. Check if RLS is enabled on relevant tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'message_status', 'user_status')
ORDER BY tablename;

-- 2. Get basic policy information
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'message_status', 'user_status')
ORDER BY tablename, policyname;

-- 3. Get policy expressions (the actual SQL conditions)
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual as using_condition,
    with_check as with_check_condition
FROM pg_policies 
WHERE tablename IN ('conversations', 'conversation_participants', 'messages', 'message_status', 'user_status')
ORDER BY tablename, policyname;

-- 4. Check table structure
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('conversations', 'conversation_participants', 'messages', 'message_status', 'user_status')
ORDER BY table_name, ordinal_position;

-- 5. Check for triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('conversations', 'conversation_participants', 'messages', 'message_status', 'user_status')
ORDER BY event_object_table, trigger_name;

-- 6. Check for custom functions that might be used in policies
SELECT 
    p.proname as function_name
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname IN (
    'is_teacher_for_course',
    'is_student_in_course',
    'is_admin',
    'is_teacher',
    'is_student'
);
