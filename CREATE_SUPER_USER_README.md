# Super User Creation Scripts

## 🔒 Security Notice
**These scripts are ignored by git for security reasons.**
Never commit super user credentials to version control!

---

## Available Scripts

### 1️⃣ SQL Script (Simplest)
**File:** `create-super-user.sql`

**Requirements:**
- Access to Supabase SQL Editor or psql

**Steps:**
1. First, create a user account through Supabase Dashboard:
   - Go to **Authentication → Users → Add User**
   - Enter email and password
   - Click "Create User"

2. Edit `create-super-user.sql` and update this line:
   ```sql
   \set super_user_email 'your-email@domain.com'
   ```

3. Run the script:
   - **Option A (Supabase Dashboard):** Copy and paste into SQL Editor
   - **Option B (psql):**
     ```bash
     psql -h your-db-host -U postgres -d your-db -f create-super-user.sql
     ```

---

### 2️⃣ JavaScript Script (Interactive)
**File:** `create-super-user.js`

**Requirements:**
- Node.js installed
- `@supabase/supabase-js` package

**Setup:**
```bash
# Install dependencies
npm install @supabase/supabase-js dotenv

# Make sure your .env file has:
# VITE_SUPABASE_URL=your-supabase-url
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Run:**
```bash
node create-super-user.js
```

The script will:
- ✅ Check for existing super user
- ✅ Prompt for email/password
- ✅ Create auth user if needed
- ✅ Update role to super_user
- ✅ Display success message

---

### 3️⃣ TypeScript Script (Type-Safe)
**File:** `create-super-user.ts`

**Requirements:**
- Node.js and TypeScript
- `tsx` or `ts-node`
- `@supabase/supabase-js` package

**Setup:**
```bash
# Install dependencies
npm install @supabase/supabase-js dotenv
npm install -g tsx

# OR use ts-node
npm install -g ts-node
```

**Run:**
```bash
# Using tsx (recommended)
npx tsx create-super-user.ts

# OR using ts-node
ts-node create-super-user.ts
```

---

## 📋 Quick Start Guide

### Option A: Manual (Quickest)
```sql
-- 1. Create user in Supabase Auth Dashboard
-- 2. Run this in SQL Editor:

UPDATE public.profiles 
SET role = 'super_user'
WHERE email = 'your-email@domain.com';
```

### Option B: Using SQL Script
```bash
# 1. Create user in Supabase Dashboard
# 2. Edit create-super-user.sql with your email
# 3. Run the script in SQL Editor
```

### Option C: Using Node Script (Automated)
```bash
# 1. Ensure .env has SUPABASE_SERVICE_ROLE_KEY
# 2. Run:
node create-super-user.js

# Follow the prompts:
# - Enter email
# - Enter password (if creating new user)
# - Confirm actions
```

---

## ⚙️ Environment Variables

Add to your `.env` file:

```env
# Get these from Supabase Dashboard → Settings → API
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

⚠️ **Important:** The `SUPABASE_SERVICE_ROLE_KEY` is different from `VITE_SUPABASE_ANON_KEY`!
Find it at: **Supabase Dashboard → Settings → API → service_role (secret)**

---

## 🔄 Changing Super User

To transfer super user to another account:

```sql
-- Downgrade current super user
UPDATE public.profiles 
SET role = 'admin' 
WHERE role = 'super_user';

-- Upgrade new user
UPDATE public.profiles 
SET role = 'super_user' 
WHERE email = 'new-admin@domain.com';
```

Or use the interactive script and choose "yes" when asked to replace.

---

## 🧪 Testing

After creating the super user:

1. **Login Test:**
   - Go to `/admin-auth`
   - Login with super user credentials
   - Verify you see all admin features

2. **Verify in Database:**
   ```sql
   SELECT id, email, first_name, last_name, role, created_at
   FROM public.profiles
   WHERE role = 'super_user';
   ```

3. **Test Constraint:**
   Try creating a second super user (should fail):
   ```sql
   -- This should raise an error
   UPDATE public.profiles 
   SET role = 'super_user' 
   WHERE email = 'another-user@domain.com';
   
   -- Error: Only one super user is allowed in the system.
   ```

---

## 🐛 Troubleshooting

### "User not found in profiles table"
**Cause:** The user exists in `auth.users` but not in `public.profiles`

**Solution:** Wait a few seconds for the profile trigger to run, or manually insert:
```sql
INSERT INTO public.profiles (id, email, role, first_name, last_name)
SELECT id, email, 'super_user', 'System', 'Administrator'
FROM auth.users
WHERE email = 'your-email@domain.com';
```

### "Only one super user is allowed"
**Cause:** A super user already exists

**Solution:** Check who it is:
```sql
SELECT * FROM public.profiles WHERE role = 'super_user';
```

Then either:
- Use that account, or
- Downgrade it to admin first (see "Changing Super User" above)

### "Permission denied" or "RLS policy violation"
**Cause:** Not using service role key

**Solution:** 
- For SQL: Make sure you're logged in as postgres/service user
- For Node scripts: Verify `SUPABASE_SERVICE_ROLE_KEY` in .env

### Script hangs at "Waiting for profile creation"
**Cause:** Profile trigger may not be set up

**Solution:** Check if profile was created:
```sql
SELECT * FROM public.profiles WHERE email = 'your-email@domain.com';
```

If not, the auth.users trigger may be missing. Check migration files.

---

## 📚 Additional Resources

- [Main Implementation Docs](./NEW_USER_ROLES_IMPLEMENTATION.md)
- [Super User Setup Guide](./SUPER_USER_SETUP_GUIDE.md)
- [Database Migration](./supabase/migrations/20251028000001_create_initial_super_user.sql)

---

## 🔐 Security Reminders

✅ **DO:**
- Keep these scripts in `.gitignore`
- Use strong passwords (20+ characters)
- Enable MFA for super user
- Document who has super user access
- Rotate passwords quarterly

❌ **DON'T:**
- Commit these scripts to git
- Share super user credentials
- Create multiple super users
- Use weak passwords
- Give super user access to regular tasks

---

**Created:** 2025-10-28  
**System:** DIL Learning Management System

