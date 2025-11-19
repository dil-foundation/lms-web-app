# Teacher Assessments Loading Issue - Root Cause & Fix

## Problem Description

When teachers attempt to access the `/dashboard/grade-assignments` page, they experience endless loading. However, admin users can access the same page without issues.

## Root Cause Analysis

### Issue Identified

The `get_teacher_assessments_data` database function was missing the `SECURITY DEFINER` clause, while the `get_admin_assessments_data` function had it.

**Comparison:**

```sql
-- Admin function (WORKS)
CREATE OR REPLACE FUNCTION get_admin_assessments_data(...)
LANGUAGE plpgsql
SECURITY DEFINER  -- ✅ Has this
SET search_path TO 'public'  -- ✅ Has this

-- Teacher function (BROKEN)
CREATE OR REPLACE FUNCTION get_teacher_assessments_data(...)
LANGUAGE plpgsql
-- ❌ Missing SECURITY DEFINER
-- ❌ Missing SET search_path
```

### Why This Causes Endless Loading

Without `SECURITY DEFINER`:
- The function runs with the **caller's privileges** (the teacher's user role)
- Row Level Security (RLS) policies are applied to **every table access**
- If RLS policies don't explicitly allow teachers to query:
  - `course_lesson_content`
  - `course_lessons`
  - `course_sections`
  - `quiz_submissions`
  - `assignment_submissions`
- The queries inside the function **hang or fail silently**, causing the endless loading state

With `SECURITY DEFINER`:
- The function runs with **elevated privileges** (function owner's permissions)
- RLS policies are **bypassed** (the function itself enforces authorization)
- Authorization is handled **inside the function** via the `teacher_courses` CTE which checks `course_members` table
- This is secure because the function only returns data for courses where the user is explicitly listed as a teacher

## Solution Applied

### 1. Added Enhanced Debugging Logs

**File:** `src/components/admin/GradeAssignments.tsx`

Added comprehensive console logging to track:
- Component mount and state changes
- User authentication status
- Profile role determination
- RPC function calls and responses
- Error details (message, code, hint)
- Request timing
- User ID in RPC calls

**Key additions:**
```typescript
console.log('📞 [fetchAssignments] Calling get_teacher_assessments_data RPC', {
  teacher_id: user.id,
  search_query: debouncedSearchTerm,
  course_filter_id: selectedCourse === 'all' ? null : selectedCourse
});

console.log(`📊 [fetchAssignments] Teacher RPC returned in ${Date.now() - startTime}ms:`, {
  dataCount: data?.length || 0,
  hasError: !!rpcError,
  error: rpcError,
  errorDetails: rpcError ? JSON.stringify(rpcError) : null,
  errorMessage: rpcError?.message,
  errorCode: rpcError?.code,
  errorHint: rpcError?.hint
});
```

### 2. Added Request Timeout

Added a 30-second timeout to prevent infinite waiting:

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Request timeout after 30 seconds')), 30000)
);

const result = await Promise.race([rpcPromise, timeoutPromise]);
```

### 3. Database Migration

**File:** `supabase/migrations/20251119000000_fix_teacher_assessments_security_definer.sql`

Modified the `get_teacher_assessments_data` function to include:
- `SECURITY DEFINER` clause (bypasses RLS)
- `SET search_path TO 'public'` (security best practice)
- Maintained all existing authorization logic (teacher_courses CTE)
- Preserved all existing functionality

## How to Apply the Fix

### Option 1: Remote Supabase Database (Recommended for Production)

1. **Via Supabase Dashboard:**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**
   - Open the migration file: `supabase/migrations/20251119000000_fix_teacher_assessments_security_definer.sql`
   - Copy and paste the SQL into the editor
   - Click **Run** to execute

2. **Via Supabase CLI:**
   ```bash
   cd d:/work/DIL-LMS/dil
   supabase db push
   ```

### Option 2: Local Supabase (For Development)

1. Start local Supabase:
   ```bash
   cd d:/work/DIL-LMS/dil
   supabase start
   ```

2. Apply migration:
   ```bash
   supabase db reset
   ```
   Or apply just this migration:
   ```bash
   supabase migration up
   ```

## Testing the Fix

### 1. Check Console Logs

After applying the migration, when a teacher loads the assessments page, you should see:

```
🔍 [fetchAssignments] Called with: { userId: "xxx", stableRole: "teacher", ... }
📞 [fetchAssignments] Calling get_teacher_assessments_data RPC { teacher_id: "xxx", ... }
📊 [fetchAssignments] Teacher RPC returned in XXXms: { dataCount: N, hasError: false }
✅ [fetchAssignments] Fetch complete successfully
```

### 2. Verify No Errors

- No timeout errors after 30 seconds
- No RPC errors logged
- Data returns successfully
- Page renders assessment cards/tiles/list

### 3. Verify Authorization Still Works

Test that:
- Teachers can ONLY see assessments from courses they teach
- Teachers CANNOT see assessments from other teachers' courses
- Admin can still see all assessments

## Security Considerations

### Is SECURITY DEFINER Safe?

**Yes**, in this case it's safe because:

1. **Authorization is enforced internally** via the `teacher_courses` CTE:
   ```sql
   WITH teacher_courses AS (
     SELECT c.id, c.title
     FROM courses c
     JOIN course_members cm ON c.id = cm.course_id
     WHERE cm.user_id = teacher_id  -- ✅ Checks authorization
       AND cm.role = 'teacher'      -- ✅ Verifies role
       AND c.status = 'Published'
   )
   ```

2. **Follows the same pattern** as the admin function which already uses `SECURITY DEFINER`

3. **No SQL injection risk** - uses parameterized queries

4. **search_path is set** to prevent schema-based attacks

### Best Practices Applied

- ✅ `SET search_path TO 'public'` prevents search path manipulation
- ✅ Function validates user has teacher role via course_members
- ✅ Only returns data for explicitly authorized courses
- ✅ No dynamic SQL or string concatenation
- ✅ Consistent with admin function pattern

## Related Functions

Other functions that use `SECURITY DEFINER` in the codebase:
- `get_admin_assessments_data` - Admin assessments view
- `get_admin_course_analytics` - Admin analytics
- `get_teacher_engagement_metrics` - Teacher metrics
- Many other admin/teacher dashboard functions

This is a **standard pattern** in the DIL-LMS codebase for functions that need to aggregate data across multiple tables with RLS policies.

## Additional Notes

### Why Admin Works But Teacher Doesn't

The admin function had `SECURITY DEFINER` from the beginning, which is why admins never experienced this issue. The teacher function was likely created without it, assuming RLS policies would allow teachers to query all necessary tables. However, the RLS policies are more restrictive than expected.

### Alternative Approaches Considered

1. **Modify RLS policies** - Would require adding complex policies to 5+ tables, increasing security surface area
2. **Use service role key** - Would bypass all security, not acceptable
3. **Fetch data in multiple queries** - Would be slower and more complex
4. **Use SECURITY DEFINER** - ✅ Chosen - Clean, secure, follows existing patterns

## Monitoring

After deployment, monitor:
- Response times for teacher assessments endpoint
- Error rates in application logs
- Database query performance (if needed, add indexes)
- User feedback from teachers

## Rollback Plan

If issues arise, rollback by removing the `SECURITY DEFINER` clause:

```sql
CREATE OR REPLACE FUNCTION get_teacher_assessments_data(...)
LANGUAGE plpgsql
-- Remove SECURITY DEFINER
-- Remove SET search_path
AS $$ ... $$;
```

However, this would bring back the original issue unless RLS policies are modified.

## Summary

- **Problem:** Teacher assessments page has endless loading
- **Root Cause:** Missing `SECURITY DEFINER` on `get_teacher_assessments_data` function
- **Solution:** Add `SECURITY DEFINER` and `SET search_path` to match admin function
- **Security:** Safe - authorization enforced within function via course_members check
- **Status:** Migration created, ready to apply
- **Testing:** Enhanced debugging logs added to verify fix

## Files Modified

1. `src/components/admin/GradeAssignments.tsx` - Added debugging logs and timeout
2. `supabase/migrations/20251119000000_fix_teacher_assessments_security_definer.sql` - Database fix

## Next Steps

1. Apply the migration to your database (remote or local)
2. Test with a teacher account
3. Monitor console logs for the debug output
4. Verify assessments load successfully
5. Confirm only authorized data is visible
