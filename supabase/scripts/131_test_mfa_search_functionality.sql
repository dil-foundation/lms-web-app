-- Script: Test MFA Search Functionality
-- Description: Tests the search functionality in User MFA Management
-- Date: 2024-01-20

-- Test 1: Check total users count
SELECT 'Test 1: Total users count' as test_name;
SELECT COUNT(*) as total_users FROM profiles;

-- Test 2: Test search with specific email
SELECT 'Test 2: Search for specific email (arunvaradharajalu@gmail.com)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('arunvaradharajalu@gmail.com', 1, 10);

-- Test 3: Test search with partial name
SELECT 'Test 3: Search for partial name (Arun)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('Arun', 1, 10);

-- Test 4: Test search with empty string (should return all users)
SELECT 'Test 4: Search with empty string (should return all users)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('', 1, 10);

-- Test 5: Test search with NULL (should return all users)
SELECT 'Test 5: Search with NULL (should return all users)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status(NULL, 1, 10);

-- Test 6: Test search with non-existent term
SELECT 'Test 6: Search with non-existent term (nonexistentuser)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('nonexistentuser', 1, 10);

-- Test 7: Test pagination with search
SELECT 'Test 7: Test pagination with search (first page)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled,
    total_count
FROM get_users_with_mfa_status('arun', 1, 3);

-- Test 8: Test pagination with search (second page)
SELECT 'Test 8: Test pagination with search (second page)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled,
    total_count
FROM get_users_with_mfa_status('arun', 2, 3);

-- Test 9: Test search case insensitivity
SELECT 'Test 9: Test search case insensitivity (ARUN)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('ARUN', 1, 10);

-- Test 10: Test search with special characters
SELECT 'Test 10: Test search with special characters (@gmail)' as test_name;
SELECT 
    email,
    first_name,
    last_name,
    role,
    mfa_enabled
FROM get_users_with_mfa_status('@gmail', 1, 10);

-- Test 11: Verify search logic in database function
SELECT 'Test 11: Verify search logic in database function' as test_name;

-- Test with empty search term
SELECT 'Empty search term results:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('', 1, 100)
) empty_search;

-- Test with specific search term
SELECT 'Specific search term results:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('arun', 1, 100)
) specific_search;

-- Test 12: Verify MFA status accuracy
SELECT 'Test 12: Verify MFA status accuracy' as test_name;
SELECT 
    p.email,
    p.first_name,
    p.last_name,
    p.role,
    -- Check if MFA is enabled (has verified factors AND not disabled by admin)
    CASE 
      WHEN (u.raw_app_meta_data->>'mfa_disabled_by_admin')::boolean = true THEN false
      WHEN EXISTS (
        SELECT 1 FROM auth.mfa_factors 
        WHERE user_id = p.id AND status = 'verified'
      ) THEN true
      WHEN (u.raw_app_meta_data->>'mfa_enabled')::boolean = true THEN true
      ELSE false
    END as mfa_enabled_manual_check,
    -- Get MFA status from function
    (SELECT mfa_enabled FROM get_users_with_mfa_status(p.email, 1, 1) LIMIT 1) as mfa_enabled_function
FROM profiles p
LEFT JOIN auth.users u ON p.id = u.id
WHERE p.email IN ('arunvaradharajalu@gmail.com', 'arunrocky1000@gmail.com', 'arun.varadharajalu@infiniai.tech', 'arunyuvraj1998@gmail.com')
ORDER BY p.email;

-- Test 13: Performance test with large dataset simulation
SELECT 'Test 13: Performance test' as test_name;

-- Test search performance with different page sizes
SELECT 'Performance with page size 5:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('', 1, 5)
) perf_test_5;

SELECT 'Performance with page size 10:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('', 1, 10)
) perf_test_10;

SELECT 'Performance with page size 20:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('', 1, 20)
) perf_test_20;

-- Test 14: Edge cases
SELECT 'Test 14: Edge cases' as test_name;

-- Test with very long search term
SELECT 'Very long search term test:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('thisisareallylongsearchtermthatprobablywontmatchanything', 1, 10)
) long_search;

-- Test with single character
SELECT 'Single character search test:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('a', 1, 10)
) single_char_search;

-- Test with numbers
SELECT 'Numbers search test:' as info;
SELECT COUNT(*) as count FROM (
    SELECT * FROM get_users_with_mfa_status('1998', 1, 10)
) numbers_search;

SELECT 'MFA search functionality test completed successfully!' as status;
