# How to View the Principal Dashboard on Local Server

## Quick Steps

### Option 1: Update Existing User to Principal Role (Easiest)

1. **Open your Supabase Dashboard** or database client
2. **Find a test user** in the `profiles` table
3. **Update their role** to `principal`:

```sql
-- Update an existing user to principal role
UPDATE public.profiles 
SET role = 'principal', 
    first_name = 'Test',
    last_name = 'Principal'
WHERE email = 'your-test-email@example.com';
```

4. **Log in** with that user's credentials
5. **Navigate to** `http://localhost:5173/dashboard` (or your dev server URL)

---

### Option 2: Create a New Principal User

#### Step 1: Add Principal Role to Database Enum

First, ensure the `principal` role exists in your database:

```sql
-- Run this in your Supabase SQL Editor or database client
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'principal';
```

#### Step 2: Create User via Supabase Auth

1. Go to your Supabase Dashboard → Authentication → Users
2. Click "Add User" or "Create User"
3. Enter:
   - Email: `principal@test.com`
   - Password: (set a password)
   - Auto Confirm User: ✅ (checked)

#### Step 3: Update User Role

After creating the user, update their role:

```sql
-- Update the newly created user's role
UPDATE public.profiles 
SET role = 'principal',
    first_name = 'Test',
    last_name = 'Principal'
WHERE email = 'principal@test.com';
```

#### Step 4: Log In

1. Go to your app's login page
2. Use the teacher/admin login portal (since principal is an admin-level role)
3. Log in with: `principal@test.com` and your password
4. You'll be redirected to the Principal Dashboard

---

## Verification Steps

### 1. Check Role is Set Correctly

```sql
-- Verify the user has principal role
SELECT id, email, role, first_name, last_name 
FROM public.profiles 
WHERE role = 'principal';
```

### 2. Check Navigation

The Principal Dashboard should appear when:
- User role is `principal`
- User navigates to `/dashboard`
- The dashboard shows:
  - School Information Card
  - Key Metrics (Students, Teachers, Classes, Performance)
  - Observation Reports Summary
  - Tabs: Overview, Teachers, Classes, Performance

---

## Troubleshooting

### Issue: Dashboard shows "Role Placeholder" or wrong dashboard

**Solution:**
1. Check the user's role in database:
   ```sql
   SELECT role FROM profiles WHERE email = 'your-email@example.com';
   ```
2. Ensure it's exactly `'principal'` (lowercase, no spaces)
3. Clear browser cache and refresh
4. Check browser console for errors

### Issue: "Access Denied" or can't log in

**Solution:**
1. Ensure user exists in `auth.users` table
2. Ensure profile exists in `profiles` table
3. Check that role enum includes `principal`:
   ```sql
   SELECT unnest(enum_range(NULL::app_role));
   ```

### Issue: Dashboard loads but shows no data

**This is expected!** The dashboard currently uses **mock data**. To see real data:
1. Follow the `BACKEND_INTEGRATION_GUIDE_PRINCIPAL_DASHBOARD.md`
2. Set up the database tables (principal_schools, observation_reports)
3. Create the service functions
4. Replace mock data with API calls

---

## Quick Test Script

Run this in your Supabase SQL Editor to quickly set up a test principal:

```sql
-- Step 1: Add principal role if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'principal' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
    ) THEN
        ALTER TYPE public.app_role ADD VALUE 'principal';
    END IF;
END $$;

-- Step 2: Update an existing user (replace email with your test user)
UPDATE public.profiles 
SET role = 'principal',
    first_name = 'Test',
    last_name = 'Principal'
WHERE email = 'your-existing-user@example.com'
RETURNING id, email, role, first_name, last_name;
```

---

## What You'll See

When logged in as a principal, you'll see:

1. **Dashboard Header** - "Principal Dashboard" with welcome message
2. **School Info Card** - Mock school information (Greenwood Elementary School)
3. **Key Metrics** - 4 metric cards showing:
   - Total Students: 450
   - Total Teachers: 28
   - Total Classes: 18
   - Avg Performance: 85%
4. **Observation Summary Card** - Shows mock observation reports
5. **Tabs**:
   - **Overview**: Charts and visualizations
   - **Teachers**: Grid of 3 mock teachers
   - **Classes**: Table of 4 mock classes
   - **Performance**: Performance metrics

---

## Next Steps

Once you can view the dashboard:

1. **Test the UI/UX** - Navigate through all tabs and features
2. **Provide feedback** - Note any design or functionality improvements
3. **Backend Integration** - Follow the integration guide to connect real data
4. **Test with Real Data** - After backend setup, test with actual school/teacher/class data

---

## Notes

- The dashboard currently uses **mock data** - all numbers and information are placeholder
- The **Observation Reports** feature is fully functional in the UI but needs backend integration
- All widgets are **reusable** and can be used for other role dashboards (School Officer, Program Manager, etc.)

---

**Need Help?** Check:
- `BACKEND_INTEGRATION_GUIDE_PRINCIPAL_DASHBOARD.md` - For backend setup
- `PRINCIPAL_DASHBOARD_IMPLEMENTATION_SUMMARY.md` - For feature overview
- Browser console - For any JavaScript errors

