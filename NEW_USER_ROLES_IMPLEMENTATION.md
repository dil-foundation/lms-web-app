# New User Roles Implementation Summary

## Overview
Three new user roles have been added to the DIL Learning Management System:
1. **Content Creator** - Can create, view, and update course contents
2. **Super User** - Can do everything (full admin access plus additional privileges) - **LIMITED TO ONE PER SYSTEM**
3. **View Only** - Can only view course content (read-only access)

---

## ⚠️ Important Notes

1. **This migration updates existing RLS policies** - It doesn't just add new policies on top of existing ones. This prevents policy conflicts.
2. **Existing policies are dropped and recreated** with support for the new roles to ensure clean implementation.
3. **No data loss** - The migration only affects policies and functions, not actual data.
4. **Helper functions** are used consistently across all policies for maintainability.
5. **⚠️ SUPER USER LIMITATION**: The system enforces that **only ONE super user** can exist at any time. This is enforced at the database level with a unique constraint and trigger.

---

## Implementation Details

### 1. Database Changes (Migration Files)

**Primary Migration**: `supabase/migrations/20251028000000_add_new_user_roles.sql`
**Super User Setup**: `supabase/migrations/20251028000001_create_initial_super_user.sql`

#### A. Enum Updates
- Added three new values to `app_role` enum:
  - `content_creator`
  - `super_user`
  - `view_only`

#### B. Helper Functions Created
The following PostgreSQL functions were created to check user roles:

1. **`is_content_creator(user_id uuid)`** - Checks if user is a content creator
2. **`is_super_user(user_id uuid)`** - Checks if user is a super user
3. **`is_view_only(user_id uuid)`** - Checks if user is view only
4. **`has_elevated_privileges(user_id uuid)`** - Checks if user is admin or super_user
5. **`can_modify_content(user_id uuid)`** - Checks if user can modify content (admin, super_user, content_creator, or teacher)

#### C. Updated Functions
- **`is_admin_user(user_id uuid)`** - Now includes super_user role (returns true for both admin and super_user)
- **`can_modify_content(user_id uuid)`** - Returns true for admin, super_user, content_creator, and teacher roles

#### D. RLS Policies Updated and Created

**Important**: This migration **updates existing policies** to include the new roles rather than creating duplicate policies. This ensures no policy conflicts.

**Content Creator Permissions:**
- ✅ **VIEW**: All courses, sections, lessons, content, quiz questions, profiles, course members, classes, boards, schools, meetings
- ✅ **CREATE**: Courses, sections, lessons, content, quiz questions, course members (through existing teacher/author policies)
- ✅ **UPDATE**: Courses (draft only), sections, lessons, content, quiz questions, course members
- ❌ **DELETE**: Cannot delete courses, classes, or organizational structure (only admins/super users can delete)

**Super User Permissions:**
- ✅ **Full Access**: All admin privileges plus additional system-level access
- ✅ **VIEW**: All tables including access logs, user sessions, integrations, notifications
- ✅ **CREATE**: All resources including profiles, classes, boards, schools, integrations, meetings
- ✅ **UPDATE**: All resources including profiles, classes, integrations, meetings
- ✅ **DELETE**: All resources

**View Only Permissions:**
- ✅ **VIEW**: Published courses only, all sections/lessons/content (via existing authenticated user policies), quiz questions, classes, boards, schools
- ✅ **VIEW**: Own meetings (where they are participant) and own notifications
- ✅ **UPDATE**: Own notifications and own profile only
- ❌ **CREATE/UPDATE/DELETE**: Cannot create, update, or delete any course content or organizational data

### 2. Frontend Changes

#### A. Role Navigation (`src/config/roleNavigation.ts`)

**Updated Type Definition:**
```typescript
export type UserRole = 'student' | 'teacher' | 'admin' | 'content_creator' | 'super_user' | 'view_only';
```

**Navigation for Content Creator (LMS Mode):**
- Overview
- Courses
- Course Categories
- Messages
- Discussion

**Navigation for Super User (LMS Mode):**
- Overview
- IRIS AI Assistant
- Users
- Classes
- Courses
- Course Categories
- Assessments
- Orders
- Messages
- Discussion
- Meetings (if Zoom enabled)
- Performance Analytics
- Observation Reports
- Settings and Security
- APEX Admin
- Integration APIs
- Multitenancy

**Navigation for View Only (LMS Mode):**
- Overview
- Courses
- Course Categories

**Navigation for AI Mode:**
- Content Creator: Overview, Learn, Practice
- Super User: Full AI admin access (same as admin)
- View Only: Overview only

**Display Names:**
- Content Creator → "Content Creator"
- Super User → "Super User"
- View Only → "View Only"

#### B. Dashboard (`src/pages/Dashboard.tsx`)

**Dashboard Rendering:**
- Content Creator → Shows Teacher Dashboard
- Super User → Shows Admin Dashboard
- View Only → Shows Student Dashboard (read-only)

**Maintenance Mode:**
- Admin and Super User can bypass maintenance mode
- All other roles (student, teacher, content_creator, view_only) see maintenance page

#### C. Authentication Portal Access

**Student Portal** (`src/pages/StudentAuth.tsx`):
- Allows: `student` and `view_only`

**Teacher Portal** (`src/pages/TeacherAuth.tsx`):
- Allows: `teacher` and `content_creator`

**Admin Portal** (`src/pages/AdminAuth.tsx`):
- Allows: `admin` and `super_user`

---

## Role Hierarchy and Permissions Summary

| Feature | Student | Teacher | Admin | Content Creator | Super User | View Only |
|---------|---------|---------|-------|-----------------|------------|-----------|
| View Courses | ✅ Enrolled | ✅ Own | ✅ All | ✅ All | ✅ All | ✅ Published |
| Create Courses | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Update Courses | ❌ | ✅ Own | ✅ All | ✅ All | ✅ All | ❌ |
| Delete Courses | ❌ | ✅ Own | ✅ All | ❌ | ✅ All | ❌ |
| Manage Users | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Manage Classes | ❌ | ✅ Own | ✅ All | ❌ | ✅ All | ✅ View |
| View Analytics | ✅ Own | ✅ Students | ✅ All | ❌ | ✅ All | ❌ |
| Manage Integrations | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Access IRIS | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| System Settings | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |
| Bypass Maintenance | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ |

---

## How to Use the New Roles

### Creating Users with New Roles

1. **Via Admin Portal (Content Creator & View Only):**
   - Navigate to User Management
   - Create a new user
   - Select one of the available roles:
     - Content Creator
     - View Only
   
   **Note**: Super User cannot be created through the UI for security reasons.

2. **Creating the Super User (Database Only):**
   
   The super user must be created manually for security:
   
   ```sql
   -- Step 1: Create the user account through Supabase Auth first
   -- Then update their role:
   
   UPDATE public.profiles 
   SET role = 'super_user' 
   WHERE email = 'superadmin@yourdomain.com';
   ```
   
   **Important**: The system will prevent you from creating a second super user. If you try, you'll get an error:
   ```
   ERROR: Only one super user is allowed in the system. A super user already exists.
   ```

3. **Via Database (Advanced):**
   ```sql
   -- Insert a new content creator or view only user
   INSERT INTO auth.users (email, encrypted_password, ...)
   VALUES (...);
   
   INSERT INTO public.profiles (id, email, role, first_name, last_name)
   VALUES (
     '<user_id>',
     'contentcreator@example.com',
     'content_creator',  -- or 'view_only'
     'John',
     'Doe'
   );
   
   -- DO NOT create super_user this way - use UPDATE on existing user
   ```

### Portal Access

**Content Creators:**
- Login URL: `/teacher-auth`
- Access: Teacher portal with course creation/editing capabilities

**Super Users:**
- Login URL: `/admin-auth`
- Access: Full admin portal with all privileges

**View Only Users:**
- Login URL: `/student-auth`
- Access: Student portal with read-only access

---

## Testing the Implementation

### 1. Apply the Migration
```bash
# Using Supabase CLI
supabase db push

# Or manually execute the migration file in your database
```

### 2. Create Test Users

**Important**: Create users through Supabase Auth first, then update their roles.

```sql
-- After creating users through Supabase Auth, update their roles:

-- Test Content Creator
UPDATE public.profiles 
SET role = 'content_creator', first_name = 'Test', last_name = 'Creator'
WHERE email = 'contentcreator@test.com';

-- Test Super User (ONLY ONE ALLOWED)
-- First check if a super user already exists:
SELECT * FROM public.profiles WHERE role = 'super_user';

-- If none exists, create one:
UPDATE public.profiles 
SET role = 'super_user', first_name = 'System', last_name = 'Administrator'
WHERE email = 'superadmin@test.com';

-- Test View Only
UPDATE public.profiles 
SET role = 'view_only', first_name = 'Test', last_name = 'Viewer'
WHERE email = 'viewonly@test.com';
```

### 3. Test Scenarios

**Content Creator Tests:**
- ✅ Can create new courses
- ✅ Can edit course content
- ✅ Can view all courses
- ✅ Can add course members
- ❌ Cannot delete courses
- ❌ Cannot manage users
- ❌ Cannot access system settings

**Super User Tests:**
- ✅ Can access all admin features
- ✅ Can manage users
- ✅ Can view system logs
- ✅ Can manage integrations
- ✅ Can delete courses
- ✅ Can bypass maintenance mode

**View Only Tests:**
- ✅ Can view published courses
- ✅ Can view course content
- ❌ Cannot create or edit courses
- ❌ Cannot submit assignments
- ❌ Cannot manage anything

---

## Security Considerations

1. **RLS Policies**: All database access is protected by Row Level Security (RLS) policies that check user roles
2. **Policy Updates**: Existing policies were updated (not duplicated) to prevent conflicts and maintain security
3. **Frontend Guards**: Frontend routes use role-based guards to prevent unauthorized access
4. **Portal Separation**: Each role type can only access their designated portal
5. **Helper Functions**: Database helper functions (SECURITY DEFINER) ensure consistent role checking across policies
6. **No Privilege Escalation**: View only users cannot escalate their privileges; only admins and super users can modify user roles
7. **Content Creator Limitations**: Content creators can modify content but cannot delete courses, classes, or users - only elevated privilege roles can do that

---

## Troubleshooting

### Issue: Migration Fails with "policy already exists"
**Solution**: This shouldn't happen as the migration uses `DROP POLICY IF EXISTS` before recreating. If it does fail, manually drop the conflicting policies and re-run.

### Issue: Migration Fails with "function already exists"
**Solution**: The migration uses `CREATE OR REPLACE FUNCTION`, so this shouldn't happen. If it does, check for syntax errors in the migration file.

### Issue: Users Can't Login to Portal
**Solution**: Verify the user's role in the `profiles` table matches the portal they're trying to access:
- Student Portal: `student`, `view_only`
- Teacher Portal: `teacher`, `content_creator`
- Admin Portal: `admin`, `super_user`

### Issue: Permission Denied Errors
**Solution**: 
1. Check RLS policies are enabled on the table
2. Verify the helper functions were created successfully: `SELECT * FROM pg_proc WHERE proname LIKE 'is_%' OR proname LIKE 'has_%' OR proname LIKE 'can_%';`
3. Check the user's role: `SELECT id, email, role FROM profiles WHERE id = auth.uid();`

### Issue: Content Creator Can't Create Courses
**Solution**: Content creators use the same policy as teachers for course creation. Ensure they're logged into the teacher portal and the `can_modify_content()` function is working correctly.

### Issue: Can't Create Second Super User
**Solution**: This is by design! The system only allows ONE super user. If you need to change the super user:
```sql
-- First, downgrade the current super user to admin
UPDATE public.profiles SET role = 'admin' WHERE role = 'super_user';

-- Then, upgrade the new user to super user
UPDATE public.profiles SET role = 'super_user' WHERE email = 'new-superadmin@domain.com';
```

### Issue: Super User Not Showing in User List
**Solution**: Super users will appear in the user list but cannot be created/edited to super_user role through the UI. If editing an existing super user, the role will show as "Super User (System Admin)" and can be changed to other roles, but cannot be changed back to super_user through the UI.

### Issue: View Only User Can See Draft Courses
**Solution**: Check the "Allow view based on role and membership" policy on courses table - it should restrict view_only users to published courses only.

### Issue: Frontend Shows Wrong Navigation
**Solution**: Clear browser cache and localStorage, then refresh the page. Check that `src/config/roleNavigation.ts` was updated correctly.

---

## Future Enhancements

1. **Role-Based Dashboard Customization**: Create custom dashboards for each role type
2. **Permission Fine-Tuning**: Add granular permissions for specific features
3. **Audit Logs**: Track actions by super users and content creators
4. **Role Templates**: Create pre-defined permission templates
5. **Bulk Role Assignment**: Add ability to assign roles to multiple users at once

---

## Contact & Support

For issues or questions about the new roles implementation, please contact the development team or refer to the main project documentation.

---

**Implementation Date**: October 28, 2025
**Migration File**: `20251028000000_add_new_user_roles.sql`
**Affected Files**: 
- `supabase/migrations/20251028000000_add_new_user_roles.sql`
- `src/config/roleNavigation.ts`
- `src/pages/Dashboard.tsx`
- `src/pages/TeacherAuth.tsx`
- `src/pages/AdminAuth.tsx`
- `src/pages/StudentAuth.tsx`

