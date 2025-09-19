-- Test if the function was properly updated
-- This will show you the current function definition

SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'can_retry_quiz';

-- Alternative way to check the function
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'can_retry_quiz' 
  AND routine_schema = 'public';
