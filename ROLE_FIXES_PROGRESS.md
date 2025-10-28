# Super User & New Roles - Comprehensive Fix Progress

## ✅ **Completed Fixes (7/14)**

### **1. ✅ CourseContent.tsx**
**Issues Fixed:**
- Changed `canReorderContent` check to include `super_user` and `content_creator`
- Updated payment access check to include all elevated roles  
- Fixed assignment preview mode check
- Fixed quiz preview mode check
- Updated "Back to Course Builder" button logic
- Fixed content reordering warning message

**Changes:**
```typescript
// Before:
profile?.role === 'admin' || profile?.role === 'teacher'

// After:
profile?.role === 'admin' || profile?.role === 'super_user' || profile?.role === 'teacher' || profile?.role === 'content_creator'
```

---

### **2. ✅ CourseBuilder.tsx**
**Issues Fixed:**
- Updated mock teacher filter to include `content_creator`
- Updated actual database query to fetch teachers and content creators
- Fixed course member filtering for teachers
- Updated teacher ID filtering in save/delete operations

**Changes:**
```typescript
// Before:
.filter(p => p.role === 'teacher')

// After:
.filter(p => p.role === 'teacher' || p.role === 'content_creator')
```

---

### **3. ✅ CourseTileView.tsx**
**Issues Fixed:**
- Updated `isAdmin` to include `super_user`
- Updated `isTeacher` to include `content_creator`
- Fixed `canDelete` to use `profile.role` instead of `user.app_metadata.role` ❗

**Changes:**
```typescript
// Before:
const isAdmin = profile?.role === 'admin';
const isTeacher = profile?.role === 'teacher';
const canDelete = () => user.app_metadata.role === 'admin' // ❌ Wrong source!

// After:
const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
const isTeacher = profile?.role === 'teacher' || profile?.role === 'content_creator';
const canDelete = () => isAdmin || (isTeacher && ...) // ✅ Using profile!
```

---

### **4. ✅ CourseListView.tsx**
**Issues Fixed:**
- Same fixes as CourseTileView.tsx
- Updated role checks and removed `app_metadata` dependency

---

### **5. ✅ CourseCardView.tsx**
**Issues Fixed:**
- Added `useUserProfile` hook import and usage
- Added `isAdmin` and `isTeacher` variables
- Fixed `canDelete` to use profile instead of `app_metadata`

**Changes:**
```typescript
// Added:
import { useUserProfile } from '@/hooks/useUserProfile';
const { profile } = useUserProfile();
const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
const isTeacher = profile?.role === 'teacher' || profile?.role === 'content_creator';
```

---

### **6. ✅ Dashboard.tsx** *(Previously Fixed)*
- Updated route filtering for admin and teacher routes
- Fixed maintenance mode check
- Updated CourseBuilder RoleGuard

---

### **7. ✅ GradeAssignments.tsx, CourseManagement.tsx, UsersManagement.tsx** *(Previously Fixed)*
- Fixed role checking logic
- Updated `isAdmin` and `isTeacher` variables
- Fixed stable role locking

---

## ⏳ **Remaining Files to Fix (7/14)**

### **8. ⏳ CourseOverview.tsx**
**Expected Issues:**
- Likely has `role === 'admin'` or `role === 'teacher'` checks
- May have access control logic that needs updating

**Search Pattern:**
```bash
grep "role === 'admin'\|role === 'teacher'" src/pages/CourseOverview.tsx
```

---

### **9. ⏳ MessagesPage.tsx**
**Expected Issues:**
- Admin/teacher role checks for message permissions
- May filter users by role

**Search Pattern:**
```bash
grep "role === 'admin'\|role === 'teacher'" src/pages/MessagesPage.tsx
```

---

### **10. ⏳ DiscussionsPage.tsx**
**Expected Issues:**
- Role-based permissions for creating/managing discussions
- Admin/teacher checks for moderation

---

### **11. ⏳ DiscussionViewPage.tsx**
**Expected Issues:**
- Similar to DiscussionsPage
- Role checks for editing/deleting discussions

---

### **12. ⏳ TeacherMeetings.tsx**
**Expected Issues:**
- `isAdmin` variable likely only checks for `'admin'`
- Meeting creation/management permissions

---

### **13. ⏳ IRISv2.tsx**
**Expected Issues:**
- Admin-only features need to include `super_user`

---

### **14. ⏳ Services (meetingService.ts, messagingService.ts, aiSafetyEthicsService.ts)**
**Expected Issues:**
- Backend role checks in service functions
- May filter users or data by role

---

## 🔍 **Common Patterns to Fix**

### **Pattern 1: Direct Role Comparison**
```typescript
// ❌ Before:
if (profile?.role === 'admin') { ... }
if (profile?.role === 'teacher') { ... }

// ✅ After:
if (profile?.role === 'admin' || profile?.role === 'super_user') { ... }
if (profile?.role === 'teacher' || profile?.role === 'content_creator') { ... }
```

### **Pattern 2: isAdmin/isTeacher Variables**
```typescript
// ❌ Before:
const isAdmin = profile?.role === 'admin';
const isTeacher = profile?.role === 'teacher';

// ✅ After:
const isAdmin = profile?.role === 'admin' || profile?.role === 'super_user';
const isTeacher = profile?.role === 'teacher' || profile?.role === 'content_creator';
```

### **Pattern 3: app_metadata Usage** ⚠️ **CRITICAL**
```typescript
// ❌ Before:
user.app_metadata.role === 'admin'

// ✅ After:
// 1. Add import: import { useUserProfile } from '@/hooks/useUserProfile';
// 2. Add hook: const { profile } = useUserProfile();
// 3. Use profile: profile?.role === 'admin' || profile?.role === 'super_user'
```

### **Pattern 4: Array Filtering**
```typescript
// ❌ Before:
users.filter(u => u.role === 'teacher')
members.filter(m => m.role === 'teacher')

// ✅ After:
users.filter(u => u.role === 'teacher' || u.role === 'content_creator')
members.filter(m => m.role === 'teacher' || m.role === 'content_creator')
```

---

## 🛠️ **Quick Fix Script for Remaining Files**

For each remaining file, follow these steps:

1. **Search for role checks:**
   ```bash
   grep -n "role === 'admin'\|role === 'teacher'\|app_metadata\.role" <filename>
   ```

2. **For each match, determine the fix:**
   - If checking for admin → add `|| profile?.role === 'super_user'`
   - If checking for teacher → add `|| profile?.role === 'content_creator'`
   - If using `app_metadata.role` → replace with `profile?.role` (add `useUserProfile` hook if needed)

3. **Test the component:**
   - Login as super_user
   - Verify access to admin features
   - Login as content_creator  
   - Verify access to teacher features

---

## 📊 **Progress Summary**

- **Total Files:** 14
- **Completed:** 7 (50%)
- **Remaining:** 7 (50%)
- **Critical Issues Fixed:** `app_metadata.role` usage (3 files)
- **Admin Checks Updated:** 7 files
- **Teacher Checks Updated:** 5 files

---

## 🚨 **Priority for Remaining Files**

### **High Priority:**
1. **CourseOverview.tsx** - Students/Teachers view courses here
2. **MessagesPage.tsx** - Communication feature
3. **DiscussionsPage.tsx** - Discussion feature

### **Medium Priority:**
4. **DiscussionViewPage.tsx**
5. **TeacherMeetings.tsx**

### **Low Priority** (Backend services - less user-facing):
6. **IRISv2.tsx**
7. **meetingService.ts**
8. **messagingService.ts**
9. **aiSafetyEthicsService.ts**

---

## ✅ **Testing Checklist for Fixed Files**

- [x] CourseContent.tsx - Super user can reorder content in draft courses
- [x] CourseBuilder.tsx - Content creators appear in teacher dropdowns
- [x] CourseTileView.tsx - Super user can delete courses, no app_metadata errors
- [x] CourseListView.tsx - Same as TileView
- [x] CourseCardView.tsx - Same as TileView
- [x] Dashboard.tsx - Super user sees admin routes
- [x] GradeAssignments.tsx - Super user can grade assignments

---

**Last Updated:** 2025-10-28
**Status:** In Progress - 50% Complete

