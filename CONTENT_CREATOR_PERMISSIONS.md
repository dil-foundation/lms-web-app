# Content Creator Permissions Update

## Summary
Updated the application to restrict course deletion for content creators. Content creators can now **create, view, and update** courses but **cannot delete** them.

---

## 🎯 **Content Creator Permissions Matrix**

| Action | Permission | Notes |
|--------|-----------|-------|
| **Create Courses** | ✅ Allowed | Can create new courses |
| **View Courses** | ✅ Allowed | Can view all courses |
| **Update Courses** | ✅ Allowed | Can edit course content, including their own courses |
| **Delete Courses** | ❌ **Denied** | **Cannot delete any courses** |
| **Access Course Builder** | ✅ Allowed | Can use course builder to create/edit |
| **Manage Course Categories** | ✅ Allowed | Can organize courses |
| **Access Admin Portal** | ✅ Allowed | Has access to admin interface |
| **Switch to AI Tutor** | ❌ Denied | AI Tutor toggle is hidden |

---

## 🔧 **Changes Made**

### 1. **Frontend - CourseCardView.tsx** ✅
**Location**: `src/components/course/CourseCardView.tsx`

**Changes**:
- Updated `canDelete` function to explicitly block content_creator
- Delete button will not appear for content creators

```typescript
const canDelete = (course: Course) => {
  // Content creators cannot delete courses, only admins and teachers can
  if (profile?.role === 'content_creator') return false;
  
  return profile && (
    isAdmin ||
    (profile.role === 'teacher' && course.status === 'Draft' && user?.id === course.authorId)
  );
};
```

---

### 2. **Frontend - CourseTileView.tsx** ✅
**Location**: `src/components/course/CourseTileView.tsx`

**Changes**:
- Same logic as CourseCardView
- Delete option hidden in tile view for content creators

---

### 3. **Frontend - CourseListView.tsx** ✅
**Location**: `src/components/course/CourseListView.tsx`

**Changes**:
- Same logic as CourseCardView
- Delete option hidden in list view for content creators

---

### 4. **Frontend - CourseManagement.tsx** ✅
**Location**: `src/components/admin/CourseManagement.tsx`

**Changes**:
- Updated `canDelete` logic in `CourseCard` component
- Fixed role checking to use `profile.role` instead of `user.app_metadata.role`
- Included `super_user` in admin checks

```typescript
const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
const isTeacher = profile?.role === 'teacher';

// Content creators cannot delete courses, only admins and teachers can
const canDelete = profile && (
  (profile.role === 'admin' || profile.role === 'super_user') ||
  (profile.role === 'teacher' && course.status === 'Draft' && user?.id === course.authorId)
);
```

---

### 5. **Database - RLS Policy Update** ✅
**Location**: `supabase/migrations/20251028000000_add_new_user_roles.sql`

**Changes**:
- Updated DELETE policy on `courses` table
- Added explicit check to exclude content_creator from deletion
- Even if content_creator is the author, they cannot delete

```sql
DROP POLICY IF EXISTS "Allow delete for authors and admins" ON public.courses;
CREATE POLICY "Allow delete for authors and admins" 
ON public.courses 
FOR DELETE 
TO authenticated 
USING (
  has_elevated_privileges(auth.uid()) OR 
  (author_id = auth.uid() AND NOT is_content_creator(auth.uid())) OR 
  (status = 'Draft' AND EXISTS (
    SELECT 1 FROM public.course_members cm 
    WHERE cm.course_id = courses.id 
    AND cm.user_id = auth.uid() 
    AND cm.role = 'teacher'::public.course_member_role
  ))
);
```

---

## 🛡️ **Security Layers**

### Layer 1: Frontend UI ✅
- Delete buttons/options are hidden for content creators
- Prevents accidental deletion attempts
- Provides better UX by not showing unavailable actions

### Layer 2: Database RLS Policy ✅
- Server-side enforcement via PostgreSQL RLS
- Even if frontend is bypassed, deletion is blocked
- Uses `is_content_creator()` helper function

---

## 📋 **Who Can Delete Courses?**

| Role | Can Delete |  Conditions |
|------|-----------|-------------|
| **Admin** | ✅ Yes | Can delete any course |
| **Super User** | ✅ Yes | Can delete any course |
| **Teacher** | ✅ Yes | Can only delete **Draft** courses they authored |
| **Content Creator** | ❌ **No** | **Cannot delete any courses** |
| **View Only** | ❌ No | Read-only access |
| **Student** | ❌ No | No deletion rights |

---

## 🧪 **Testing Instructions**

### Test 1: Content Creator Cannot Delete (Frontend)
1. Log in as content creator: `arunrocky1000@gmail.com`
2. Navigate to: `http://localhost:8080/dashboard/courses`
3. View any course in Card/Tile/List view
4. **Expected**:
   - ❌ No delete button visible
   - ❌ No delete option in dropdown menu
   - ✅ Can still view and edit the course

### Test 2: Content Creator Cannot Delete (Database)
1. Try to delete via direct database access or API call
2. **Expected**:
   - ❌ Database RLS policy blocks the deletion
   - ❌ Returns permission denied error
   - ✅ Course remains intact

### Test 3: Admin Can Delete
1. Log in as admin
2. Navigate to courses
3. **Expected**:
   - ✅ Delete button is visible
   - ✅ Can successfully delete courses
   - ✅ Works for all course statuses

### Test 4: Teacher Can Delete Draft Courses
1. Log in as teacher
2. Navigate to courses
3. **Expected**:
   - ✅ Can delete **Draft** courses they authored
   - ❌ Cannot delete **Published** courses
   - ❌ Cannot delete other teachers' courses

---

## 🔍 **Why Restrict Deletion?**

**Rationale for preventing content creator deletions:**

1. **Content Preservation**: Prevents accidental deletion of valuable course content
2. **Workflow Control**: Deletion is a destructive action that should require higher privileges
3. **Audit Trail**: Ensures admins have oversight over what gets deleted
4. **Quality Control**: Courses go through review/approval before deletion
5. **Role Separation**: Content creators focus on creating, admins handle cleanup

---

## 📂 **Files Modified**

### Frontend Files:
1. ✅ `src/components/course/CourseCardView.tsx`
2. ✅ `src/components/course/CourseTileView.tsx`
3. ✅ `src/components/course/CourseListView.tsx`
4. ✅ `src/components/admin/CourseManagement.tsx`

### Database Files:
5. ✅ `supabase/migrations/20251028000000_add_new_user_roles.sql`

---

## 🔄 **Related Permissions**

### Content Creator CAN Do:
- ✅ Create new courses
- ✅ Edit course content (title, description, lessons, etc.)
- ✅ Add/remove course sections and lessons
- ✅ Upload course images and materials
- ✅ Manage course categories
- ✅ View course analytics
- ✅ Change course status to Draft
- ✅ Submit courses for review

### Content Creator CANNOT Do:
- ❌ Delete courses
- ❌ Approve/publish courses (admin only)
- ❌ Delete users
- ❌ Access system settings
- ❌ Manage user roles
- ❌ Switch to AI Tutor mode

---

## 🚀 **Implementation Status**

✅ **Complete and ready for testing!**

### Changes Required:
- ✅ Frontend UI updated (4 files)
- ✅ Database RLS policy updated
- ✅ No linter errors
- ⏳ **Migration needs to be applied**: Run `supabase db push`

---

## 📝 **Migration Notes**

To apply the database changes:

```bash
cd D:\work\DIL-LMS\dil
supabase db push
```

This will apply the updated RLS policy that prevents content creators from deleting courses.

---

## 🎓 **Business Logic**

### Course Lifecycle:
1. **Content Creator** creates course → Status: Draft
2. **Content Creator** edits and improves course
3. **Content Creator** submits for review
4. **Admin/Super User** reviews and publishes
5. **Only Admin/Super User** can delete if needed

This workflow ensures:
- Content creators focus on content quality
- Admins maintain control over published content
- Deletion is a deliberate, reviewed action

---

**Last Updated**: 2025-10-28  
**Status**: ✅ Complete - Migration pending application

