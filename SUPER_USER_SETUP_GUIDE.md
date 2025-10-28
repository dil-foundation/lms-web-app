# Super User Setup Guide

## Overview
The **Super User** is the highest level administrator in the DIL LMS system. There can only be **ONE** super user at any given time, and this is enforced at the database level.

## Why Only One Super User?

The super user has:
- Full administrative access to all features
- Access to system-level settings and integrations
- Ability to view access logs and user sessions
- Permission to manage all resources without restrictions

Having only one super user:
- **Increases security** - Limits the attack surface
- **Ensures accountability** - Clear ownership of system-level changes
- **Follows best practices** - Similar to Unix/Linux root user or Windows Administrator

## How to Create the Initial Super User

### Step 1: Run the Migrations

```bash
# First, run the main role migration
supabase db push

# Or apply migrations individually
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20251028000000_add_new_user_roles.sql
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20251028000001_create_initial_super_user.sql
```

### Step 2: Create a User Account

**Option A: Through Supabase Dashboard**
1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User"
3. Enter email: `superadmin@yourdomain.com`
4. Set a strong password or enable email verification
5. Click "Create User"

**Option B: Through Supabase Auth API**
```javascript
const { data, error } = await supabase.auth.admin.createUser({
  email: 'superadmin@yourdomain.com',
  password: 'your-secure-password',
  email_confirm: true
})
```

### Step 3: Assign Super User Role

Once the user account exists in `auth.users`, update their profile:

```sql
-- Update the user's role to super_user
UPDATE public.profiles 
SET 
  role = 'super_user',
  first_name = 'System',
  last_name = 'Administrator'
WHERE email = 'superadmin@yourdomain.com';

-- Verify the super user was created
SELECT id, email, role, first_name, last_name, created_at
FROM public.profiles 
WHERE role = 'super_user';
```

### Step 4: Test Login

1. Navigate to `/admin-auth` portal
2. Login with super user credentials
3. Verify you see all admin features plus:
   - Access logs
   - User sessions
   - Integration management
   - Full system settings

## Changing the Super User

If you need to change who the super user is:

```sql
-- Step 1: Downgrade current super user to admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE role = 'super_user';

-- Step 2: Upgrade new user to super user
UPDATE public.profiles 
SET role = 'super_user' 
WHERE email = 'new-superadmin@yourdomain.com';

-- Step 3: Verify the change
SELECT email, role FROM public.profiles WHERE role IN ('super_user', 'admin') ORDER BY role;
```

## Database Protections

The system has multiple protections to ensure only one super user exists:

### 1. Unique Index
```sql
CREATE UNIQUE INDEX idx_single_super_user 
ON public.profiles (role) 
WHERE role = 'super_user';
```
This prevents multiple rows with `role = 'super_user'`.

### 2. Trigger Function
```sql
CREATE TRIGGER enforce_single_super_user
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.check_super_user_limit();
```
This actively checks and blocks attempts to create a second super user.

### 3. UI Restriction
- Super User role is **not available** in the user creation dropdown
- When editing an existing super user, the role shows but is marked as "System Admin"
- Admins cannot promote users to super_user through the UI

## Security Best Practices

1. **Strong Password**: Use a password manager with 20+ character passwords
2. **Enable MFA**: Super user should always have Multi-Factor Authentication enabled
3. **Limited Sharing**: Never share super user credentials
4. **Regular Rotation**: Change super user password quarterly
5. **Audit Logging**: Monitor super user actions through access logs
6. **Backup Admin**: Keep at least 2 regular admin accounts as backup
7. **Document Access**: Maintain a secure record of who has super user access

## Troubleshooting

### Error: "Only one super user is allowed"
This means a super user already exists. Check:
```sql
SELECT email, first_name, last_name, created_at 
FROM public.profiles 
WHERE role = 'super_user';
```

### Can't Login as Super User
1. Verify the account exists in `auth.users`
2. Check the role is set correctly in `profiles`
3. Ensure you're using the `/admin-auth` portal
4. Check if MFA is required and properly set up

### Need to Reset Super User
If you've lost access to the super user account:
```sql
-- Option 1: Change to a known admin account
UPDATE public.profiles 
SET role = 'admin' 
WHERE role = 'super_user';

UPDATE public.profiles 
SET role = 'super_user' 
WHERE email = 'your-backup-admin@domain.com';

-- Option 2: Reset super user password through Supabase Auth
-- Go to Supabase Dashboard → Authentication → Users → (find user) → Reset Password
```

## Frequently Asked Questions

**Q: Can I have multiple super users for redundancy?**
A: No, by design there can only be one. Instead, create multiple admin accounts for redundancy.

**Q: What happens if the super user account is deleted?**
A: You can create a new super user following the steps above. The constraint only prevents multiple super users from existing simultaneously.

**Q: Can the super user demote themselves?**
A: Yes, through the UI or database. However, you won't be able to promote back to super user through the UI.

**Q: What if I need to transfer super user to someone temporarily?**
A: Change the role in the database, then change it back when needed. Consider using admin role for temporary elevated access instead.

## Summary

- **Only ONE super user** allowed in the system
- Created via **database UPDATE**, not through UI
- Has **full system access** including logs and integrations
- Protected by **database constraints and triggers**
- Should follow **strict security practices**

For regular administrative tasks, use the **admin** role instead of super user.

