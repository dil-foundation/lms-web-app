-- SQL Script to Check Profiles Table Data
-- Run this in your Supabase SQL Editor to diagnose the reports issue

-- 1. Check if profiles table exists and has data
SELECT 
    'Total Users' as metric,
    COUNT(*) as count
FROM public.profiles;

-- 2. Check recent user registrations (last 30 days)
SELECT 
    'New Users (Last 30 Days)' as metric,
    COUNT(*) as count
FROM public.profiles
WHERE created_at >= NOW() - INTERVAL '30 days';

-- 3. Check user roles distribution
SELECT 
    'User Roles Distribution' as metric,
    role,
    COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY count DESC;

-- 4. Check sample user data (first 5 users)
SELECT 
    id,
    email,
    role,
    first_name,
    last_name,
    created_at
FROM public.profiles
ORDER BY created_at DESC
LIMIT 5;

-- 5. Check if there are users created this month
SELECT 
    'Users This Month' as metric,
    COUNT(*) as count
FROM public.profiles
WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW());

-- 6. Check date range of user registrations
SELECT 
    'Date Range' as metric,
    MIN(created_at) as earliest_user,
    MAX(created_at) as latest_user,
    COUNT(*) as total_users
FROM public.profiles;

-- 7. Check AI Tutor analytics data
SELECT 
    'AI Tutor Analytics Records' as metric,
    COUNT(*) as count
FROM public.ai_tutor_daily_learning_analytics;

-- 8. Check AI Tutor analytics for this month
SELECT 
    'AI Tutor Analytics This Month' as metric,
    COUNT(*) as count
FROM public.ai_tutor_daily_learning_analytics
WHERE analytics_date >= DATE_TRUNC('month', NOW());

-- 9. Check courses data
SELECT 
    'Total Courses' as metric,
    COUNT(*) as count
FROM public.courses;

-- 10. Check published courses
SELECT 
    'Published Courses' as metric,
    COUNT(*) as count
FROM public.courses
WHERE status = 'Published';

-- 11. Check user content progress
SELECT 
    'User Progress Records' as metric,
    COUNT(*) as count
FROM public.user_content_item_progress;

-- 12. Check if RLS (Row Level Security) is enabled on profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'profiles';

-- 13. Check current user permissions (what the edge function sees)
SELECT 
    'Current User' as info,
    current_user as user_name,
    session_user as session_user;

-- 14. Summary query - all key metrics
SELECT 
    'SUMMARY' as section,
    (SELECT COUNT(*) FROM public.profiles) as total_users,
    (SELECT COUNT(*) FROM public.profiles WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30_days,
    (SELECT COUNT(*) FROM public.courses WHERE status = 'Published') as published_courses,
    (SELECT COUNT(*) FROM public.ai_tutor_daily_learning_analytics) as ai_tutor_records,
    (SELECT COUNT(*) FROM public.user_content_item_progress) as progress_records;
