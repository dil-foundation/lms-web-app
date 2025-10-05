# Consolidated Zoom Meetings Fix - Production Deployment Guide

## Overview

This document explains the `consolidated_zoom_meetings_fix.sql` script that consolidates all zoom meetings fixes into a single production-ready SQL script.

## What This Script Does

The consolidated script addresses multiple issues found across various fix scripts:

### 1. **Foreign Key Constraints** (from `fix_foreign_keys.sql`)
- Fixes foreign key relationships for `zoom_meetings` table
- Properly references `profiles` table for user IDs
- Adds constraints for `teacher_id`, `student_id`, `participant_id`, `course_id`, and `class_id`
- Uses appropriate CASCADE and SET NULL behaviors

### 2. **RLS Policies Cleanup** (from `fix_recursive_policies.sql`, `fix_meetings_policies.sql`, etc.)
- Removes ALL existing conflicting and duplicate policies
- Eliminates infinite recursion issues
- Creates clean, minimal, non-recursive policies

### 3. **Class Enrollment Support** (from `fix_class_meeting_rls_policy.sql`)
- Enables students to view class meetings for classes they're enrolled in
- Checks `class_students` table for active enrollment
- Supports different meeting types (1-on-1, class, teacher-to-teacher)

### 4. **Integration Configuration** (from `fix_meeting_creation_issues.sql`)
- Sets up proper policies for `integrations` table
- Ensures zoom integration record exists
- Prepares for OAuth credentials configuration

### 5. **Meeting Participants & Notifications**
- Clean policies for `meeting_participants` table
- Clean policies for `meeting_notifications` table
- Proper service role access

## Script Structure

The script is organized into 7 steps wrapped in a transaction:

```sql
BEGIN;
  -- Step 1: Fix foreign key constraints
  -- Step 2: Drop all existing policies
  -- Step 3: Enable RLS on all tables
  -- Step 4: Create clean, non-recursive policies
  -- Step 5: Grant necessary permissions
  -- Step 6: Configure zoom integration placeholder
  -- Step 7: Verification
COMMIT;
```

## Policies Created

### Zoom Meetings (4 policies)
1. **SELECT**: "Users can view meetings they are part of"
   - Teachers see their own meetings
   - Students see 1-on-1 meetings where they're participants
   - Students see class meetings for enrolled classes
   - Generic participants see meetings they're added to

2. **INSERT**: "Teachers can create meetings"
   - Only allows users to create meetings as the teacher

3. **UPDATE**: "Teachers can update their meetings"
   - Only allows teachers to update their own meetings

4. **DELETE**: "Teachers can delete their meetings"
   - Only allows teachers to delete their own meetings

### Meeting Participants (5 policies)
1. SELECT: Users can view their own participant records
2. INSERT: Authenticated users can add participants
3. UPDATE: Users can update their own participation
4. DELETE: Users can remove their own participation
5. Service role: Full access for system operations

### Meeting Notifications (2 policies)
1. SELECT: Users can view their own notifications
2. Service role: Full access for system operations

### Integrations (2 policies)
1. SELECT: All authenticated users can view
2. Service role: Full access for system operations

## Pre-Deployment Checklist

Before running this script in production:

- [ ] **Backup your database** - Always have a recent backup before schema changes
- [ ] **Test in staging** - Run the script in a staging environment first
- [ ] **Review current policies** - Check existing policies to understand current state
- [ ] **Check table structure** - Ensure all referenced tables exist:
  - `zoom_meetings`
  - `meeting_participants`
  - `meeting_notifications`
  - `integrations`
  - `class_students`
  - `classes`
  - `courses`
  - `profiles`
- [ ] **Verify user roles** - Ensure `authenticated` and `service_role` exist
- [ ] **Plan downtime** - Consider maintenance window if needed

## Deployment Steps

### 1. Create a Backup
```sql
-- In Supabase: Dashboard > Database > Backups
-- Or use pg_dump for manual backup
```

### 2. Run the Script
```bash
# Option A: Via Supabase Dashboard
# Go to SQL Editor and paste the entire script

# Option B: Via psql
psql -h your-host -U postgres -d your-database -f consolidated_zoom_meetings_fix.sql
```

### 3. Review Verification Output
The script will output verification results showing:
- Whether zoom integration exists
- Number of policies created for each table
- Success/warning message

### 4. Configure Zoom Credentials
After running the script, update the zoom integration with production credentials:

```sql
UPDATE public.integrations 
SET 
    settings = jsonb_set(
        jsonb_set(
            jsonb_set(
                settings,
                '{api_key}',
                '"your-production-api-key"'
            ),
            '{api_secret}',
            '"your-production-api-secret"'
        ),
        '{user_id}',
        '"your-production-user-id"'
    ),
    status = 'enabled',
    is_configured = true,
    updated_at = timezone('utc'::text, now())
WHERE name = 'zoom';
```

### 5. Test Functionality
- Create a meeting as a teacher
- View meetings as different user roles
- Join a class meeting as an enrolled student
- Verify students can't see meetings for classes they're not enrolled in

## Post-Deployment Verification

Run these queries to verify the deployment:

```sql
-- Check policies
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies 
WHERE tablename IN ('zoom_meetings', 'meeting_participants', 'meeting_notifications', 'integrations')
ORDER BY tablename, cmd;

-- Check foreign keys
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'zoom_meetings';

-- Check zoom integration
SELECT name, type, status, is_configured, created_at, updated_at
FROM integrations
WHERE name = 'zoom';
```

## Rollback Plan

If issues occur, you can rollback by:

1. **Restore from backup** (recommended)
   ```bash
   # Restore your pre-deployment backup
   ```

2. **Manual rollback** (if needed)
   - The script is wrapped in a transaction, so if it fails, changes won't be committed
   - If it succeeded but you need to rollback, you'll need to restore from backup

## Common Issues and Solutions

### Issue: "relation does not exist"
**Solution**: Ensure all required tables exist before running the script. Check the table structure section above.

### Issue: "permission denied"
**Solution**: Run the script as a superuser or user with sufficient privileges.

### Issue: "cannot drop policy because it does not exist"
**Solution**: This is normal. The script uses `DROP POLICY IF EXISTS` to handle this gracefully.

### Issue: "Students can't see class meetings"
**Solution**: 
- Verify `class_students` table has correct data
- Check that `enrollment_status` = 'active'
- Verify `class_id` matches between `zoom_meetings` and `class_students`

## Key Differences from Previous Scripts

This consolidated script differs from the individual fix scripts:

1. **No duplicate policies** - Unlike `zoom_meetings_policies.sql` which had many duplicates
2. **Non-recursive** - Avoids the infinite recursion issues in earlier versions
3. **Class enrollment support** - Includes the student class meeting access from `fix_class_meeting_rls_policy.sql`
4. **Complete** - Includes foreign keys, permissions, and verification in one script
5. **Transaction-wrapped** - All changes rollback if any step fails
6. **Production-ready** - Includes verification and clear next steps

## Files Consolidated

This script consolidates the following files:
- `fix_class_meeting_rls_policy.sql`
- `fix_foreign_keys.sql`
- `fix_meeting_creation_issues.sql`
- `fix_meeting_creation_safe.sql`
- `fix_meetings_policies.sql`
- `fix_recursive_policies.sql`
- `zoom_meetings_policies.sql` (cleaned up duplicates)

## Support

If you encounter issues:
1. Check the verification output from the script
2. Review the common issues section above
3. Verify your table structure matches expectations
4. Check Supabase logs for detailed error messages

## License and Warranty

This script is provided as-is. Always test thoroughly in a non-production environment before deploying to production.

