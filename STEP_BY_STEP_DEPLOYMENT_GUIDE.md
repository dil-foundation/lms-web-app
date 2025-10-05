# Step-by-Step Deployment Guide

This guide explains how to deploy the Zoom Meetings fix using individual step scripts.

## 📂 Available Scripts

### Individual Step Scripts
1. `step1_fix_foreign_keys.sql` - Fixes foreign key constraints
2. `step2_drop_existing_policies.sql` - Removes all existing RLS policies
3. `step3_enable_rls.sql` - Enables Row Level Security
4. `step4_create_policies.sql` - Creates new, clean RLS policies
5. `step5_grant_permissions.sql` - Grants necessary permissions
6. `step6_configure_zoom_integration.sql` - Sets up zoom integration record
7. `step7_verification.sql` - Verifies all steps completed successfully

### All-in-One Script
- `run_all_steps.sql` - Runs all steps in a single transaction
- `consolidated_zoom_meetings_fix.sql` - Same as above (original consolidated version)

## 🎯 Two Deployment Approaches

### Approach 1: Run All Steps at Once (Recommended for Staging)

**Best for:** Staging environments, initial deployment, quick testing

```bash
# Via Supabase SQL Editor
# Copy and paste the entire run_all_steps.sql file

# Or via psql
psql -h your-host -U postgres -d your-database -f run_all_steps.sql
```

**Advantages:**
- ✅ Single transaction - all or nothing
- ✅ Automatic rollback if any step fails
- ✅ Faster execution
- ✅ Less room for error

**Disadvantages:**
- ❌ Can't pause between steps
- ❌ Can't verify incrementally
- ❌ Harder to debug if something fails

---

### Approach 2: Run Steps Individually (Recommended for Production)

**Best for:** Production environments, cautious deployment, debugging

```bash
# Run each step separately
psql -h your-host -U postgres -d your-database -f step1_fix_foreign_keys.sql
# Verify...
psql -h your-host -U postgres -d your-database -f step2_drop_existing_policies.sql
# Verify...
# ... continue with remaining steps
```

**Advantages:**
- ✅ Pause and verify after each step
- ✅ Easier to debug issues
- ✅ More control over deployment
- ✅ Can skip steps if already done

**Disadvantages:**
- ❌ Takes longer
- ❌ More manual work
- ❌ Need to ensure all steps complete

## 📋 Step-by-Step Deployment Process

### Pre-Deployment Checklist

- [ ] **Create a complete database backup**
- [ ] **Test all scripts in staging environment first**
- [ ] **Schedule maintenance window (if needed)**
- [ ] **Notify stakeholders about deployment**
- [ ] **Have rollback plan ready**
- [ ] **Verify all required tables exist:**
  - zoom_meetings
  - meeting_participants
  - meeting_notifications
  - integrations
  - class_students
  - classes
  - courses
  - profiles

### Step 1: Fix Foreign Keys

**Purpose:** Establish proper relationships between tables

```sql
-- Run step1_fix_foreign_keys.sql
```

**What it does:**
- Drops existing foreign key constraints
- Adds correct foreign keys with proper CASCADE/SET NULL behavior

**Verification:**
```sql
-- Check foreign keys were created
SELECT 
    tc.constraint_name,
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
```

**Expected result:** 5 foreign keys

**If it fails:**
- Check if referenced tables (profiles, courses, classes) exist
- Verify existing data doesn't violate foreign key constraints
- Check for orphaned records

---

### Step 2: Drop Existing Policies

**Purpose:** Remove conflicting and duplicate policies

```sql
-- Run step2_drop_existing_policies.sql
```

**What it does:**
- Drops all existing RLS policies on zoom_meetings
- Drops all existing RLS policies on meeting_participants
- Drops all existing RLS policies on meeting_notifications
- Drops all existing RLS policies on integrations

**Verification:**
```sql
-- Check policies were dropped
SELECT schemaname, tablename, policyname
FROM pg_policies 
WHERE tablename IN ('zoom_meetings', 'meeting_participants', 
                    'meeting_notifications', 'integrations');
```

**Expected result:** Empty result set (or only system policies)

**If it fails:**
- Some policies may not exist - this is fine
- Script uses `IF EXISTS` so it's safe

---

### Step 3: Enable RLS

**Purpose:** Ensure Row Level Security is active

```sql
-- Run step3_enable_rls.sql
```

**What it does:**
- Enables RLS on zoom_meetings
- Enables RLS on meeting_participants
- Enables RLS on meeting_notifications
- Enables RLS on integrations

**Verification:**
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('zoom_meetings', 'meeting_participants', 
                    'meeting_notifications', 'integrations');
```

**Expected result:** All tables should show `rowsecurity = true`

**If it fails:**
- Check if you have sufficient privileges
- Ensure tables exist

---

### Step 4: Create New Policies

**Purpose:** Create clean, non-recursive RLS policies

```sql
-- Run step4_create_policies.sql
```

**What it does:**
- Creates 4 policies for zoom_meetings (SELECT, INSERT, UPDATE, DELETE)
- Creates 5 policies for meeting_participants
- Creates 2 policies for meeting_notifications
- Creates 2 policies for integrations

**Verification:**
```sql
-- Count policies
SELECT 
    tablename, 
    COUNT(*) as policy_count,
    array_agg(policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('zoom_meetings', 'meeting_participants', 
                  'meeting_notifications', 'integrations')
GROUP BY tablename
ORDER BY tablename;
```

**Expected result:**
- zoom_meetings: 4 policies
- meeting_participants: 5 policies
- meeting_notifications: 2 policies
- integrations: 2 policies

**If it fails:**
- Check previous steps completed successfully
- Verify RLS is enabled
- Check for syntax errors in policy definitions

---

### Step 5: Grant Permissions

**Purpose:** Grant appropriate table permissions to roles

```sql
-- Run step5_grant_permissions.sql
```

**What it does:**
- Grants SELECT, INSERT, UPDATE, DELETE to authenticated users
- Grants ALL to service_role

**Verification:**
```sql
-- Check permissions
SELECT 
    grantee,
    table_name,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_name IN ('zoom_meetings', 'meeting_participants', 
                     'meeting_notifications', 'integrations')
AND grantee IN ('authenticated', 'service_role')
GROUP BY grantee, table_name
ORDER BY table_name, grantee;
```

**Expected result:** Proper permissions for authenticated and service_role

**If it fails:**
- Verify you're running as a role with GRANT privileges
- Check if roles exist

---

### Step 6: Configure Zoom Integration

**Purpose:** Create/update the zoom integration record

```sql
-- Run step6_configure_zoom_integration.sql
```

**What it does:**
- Creates/updates zoom integration record
- Sets status to 'disabled' (you'll enable after configuring credentials)

**Verification:**
```sql
-- Check zoom integration
SELECT id, name, type, status, is_configured, created_at, updated_at
FROM integrations
WHERE name = 'zoom';
```

**Expected result:** One row with zoom integration

**Post-step action required:**
Update with your production credentials:
```sql
UPDATE public.integrations 
SET 
    settings = jsonb_build_object(
        'api_key', 'your-production-api-key',
        'api_secret', 'your-production-api-secret',
        'user_id', 'your-production-user-id'
    ),
    status = 'enabled',
    is_configured = true,
    updated_at = timezone('utc'::text, now())
WHERE name = 'zoom';
```

**If it fails:**
- Check if integrations table exists
- Verify table structure matches expected schema

---

### Step 7: Verification

**Purpose:** Confirm all steps completed successfully

```sql
-- Run step7_verification.sql
```

**What it does:**
- Counts foreign keys
- Counts policies for each table
- Checks zoom integration exists
- Displays comprehensive report

**Expected output:**
```
========================================
VERIFICATION RESULTS:
========================================

Foreign Keys:
  zoom_meetings foreign keys: 5 (expected: 5)

RLS Policies:
  zoom_meetings policies: 4 (expected: 4)
  meeting_participants policies: 5 (expected: 5)
  meeting_notifications policies: 2 (expected: 2)
  integrations policies: 2 (expected: 2)

Integration:
  Zoom integration exists: true

========================================
STATUS: ✓ SUCCESS
All configurations applied correctly!
========================================
```

**If verification fails:**
- Review output to see which step didn't complete
- Go back and re-run the failed step
- Check Supabase logs for errors

---

## 🧪 Post-Deployment Testing

After all steps complete successfully:

### 1. Test Teacher Creating a Meeting
```javascript
// As a teacher, create a 1-on-1 meeting
const { data, error } = await supabase
  .from('zoom_meetings')
  .insert({
    teacher_id: 'teacher-uuid',
    student_id: 'student-uuid',
    meeting_type: 'one-on-one',
    // ... other fields
  });
```

### 2. Test Teacher Viewing Their Meetings
```javascript
// Teacher should see only their meetings
const { data, error } = await supabase
  .from('zoom_meetings')
  .select('*');
```

### 3. Test Student Viewing Enrolled Class Meetings
```javascript
// Student should see meetings for classes they're enrolled in
const { data, error } = await supabase
  .from('zoom_meetings')
  .select('*')
  .eq('meeting_type', 'class');
```

### 4. Test Student Cannot See Other Students' 1-on-1 Meetings
```javascript
// Should return empty or only student's own meetings
const { data, error } = await supabase
  .from('zoom_meetings')
  .select('*')
  .eq('meeting_type', 'one-on-one');
```

## 🔄 Rollback Procedure

If you need to rollback:

### Complete Rollback (Recommended)
```bash
# Restore from backup
pg_restore -h your-host -U postgres -d your-database your-backup-file.dump
```

### Partial Rollback (If needed)
If only certain steps need to be undone, you can:

1. **Rollback Step 4 (Policies):** Run step2 again to drop policies
2. **Rollback Step 5 (Permissions):** Manually revoke permissions
3. **Rollback Step 1 (Foreign Keys):** Drop the constraints

```sql
-- Example: Remove foreign keys
ALTER TABLE zoom_meetings DROP CONSTRAINT IF EXISTS zoom_meetings_teacher_id_fkey;
-- ... etc
```

## 📊 Monitoring After Deployment

### Check for Errors
```sql
-- Check Postgres logs for any policy violations
SELECT * FROM pg_stat_statements 
WHERE query LIKE '%zoom_meetings%' 
ORDER BY calls DESC 
LIMIT 20;
```

### Monitor Performance
```sql
-- Check if policies are causing performance issues
EXPLAIN ANALYZE
SELECT * FROM zoom_meetings 
WHERE teacher_id = 'some-uuid';
```

### Verify User Access
- Test with actual user accounts
- Verify different roles have appropriate access
- Check class enrollment-based access works

## 🆘 Common Issues and Solutions

### Issue 1: Foreign Key Constraint Violations
**Error:** `foreign key constraint fails`

**Solution:**
```sql
-- Find orphaned records
SELECT * FROM zoom_meetings 
WHERE teacher_id NOT IN (SELECT id FROM profiles);

-- Fix or delete orphaned records
DELETE FROM zoom_meetings 
WHERE teacher_id NOT IN (SELECT id FROM profiles);
```

### Issue 2: Policy Prevents Expected Access
**Error:** `new row violates row-level security policy`

**Solution:**
- Verify user is authenticated
- Check auth.uid() returns expected value
- Review policy conditions in step4 script

### Issue 3: Integration Not Working
**Error:** `zoom integration not found`

**Solution:**
```sql
-- Verify integration exists and is enabled
SELECT * FROM integrations WHERE name = 'zoom';

-- Update status if needed
UPDATE integrations 
SET status = 'enabled', is_configured = true 
WHERE name = 'zoom';
```

## 📞 Support

If you encounter issues:
1. Check the verification output from step 7
2. Review the specific step that failed
3. Check Supabase dashboard logs
4. Verify your table structure matches expectations
5. Test queries manually in SQL editor

## ✅ Deployment Completion Checklist

- [ ] All 7 steps executed successfully
- [ ] Verification script shows SUCCESS
- [ ] Zoom credentials configured
- [ ] Integration status set to 'enabled'
- [ ] Teacher can create meetings
- [ ] Student can view enrolled class meetings
- [ ] Student cannot see unauthorized meetings
- [ ] Performance is acceptable
- [ ] No errors in logs
- [ ] Stakeholders notified of completion

---

**Need the consolidated version?** Use `run_all_steps.sql` or `consolidated_zoom_meetings_fix.sql` instead.

