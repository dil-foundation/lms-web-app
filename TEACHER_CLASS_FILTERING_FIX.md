# Teacher Class Filtering Fix

## Problem
In the Teacher LMS dashboard, the Classes tab was showing all classes in the system instead of only the classes that the teacher is assigned to teach.

## Solution
Updated the class fetching logic to filter classes by teacher ID when the current user is a teacher.

## Changes Made

### 1. Updated `ClassService` (`src/services/classService.ts`)
- Added `teacherId` parameter to `ClassPaginationParams` interface
- Modified `getClasses()` method to accept optional `teacherId` parameter
- Modified `getClassesPaginated()` method to filter by teacher when `teacherId` is provided
- Used inner join on `class_teachers` table when filtering by teacher to ensure only assigned classes are returned

### 2. Updated `useClasses` Hook (`src/hooks/useClasses.tsx`)
- Added `teacherId` parameter to the `useClasses()` hook
- Passed `teacherId` to `ClassService.getClasses()` method

### 3. Updated `ClassManagement` Component (`src/components/admin/ClassManagement.tsx`)
- Added `useUserProfile()` hook to reliably get the current user's role
- Determined if the current user is a teacher using `profile?.role === 'teacher'`
- Passed `teacherId` to both `useClasses()` and `useClassesPaginated()` hooks
- When user is a teacher, only their assigned classes are fetched and displayed

### 4. Updated `CourseBuilder` Component (`src/pages/CourseBuilder.tsx`)
- Added `useUserProfile()` hook to reliably get the current user's role
- Fixed import of `useAuth` to use the correct path (`@/contexts/AuthContext`)
- Determined if the current user is a teacher using `profile?.role === 'teacher'`
- Passed `teacherId` to `useClasses()` hook
- When user is a teacher, only their assigned classes are shown in the course class selection

### 5. Fixed CSS Import Order (`src/index.css`)
- Moved `@import './styles/accessibility-fix.css';` to the top of the file (after Tailwind imports)
- Removed duplicate import that was causing Vite CSS warnings

## How It Works

1. When a teacher logs in and navigates to the Classes tab:
   - The `ClassManagement` component checks the user's role via `useUserProfile()`
   - If the role is 'teacher', the user's ID is passed as `teacherId` to the class fetching hooks
   
2. The `ClassService` then:
   - Uses an inner join with the `class_teachers` table when `teacherId` is provided
   - Filters classes where `class_teachers.teacher_id` matches the provided `teacherId`
   - Returns only the classes where the teacher is assigned

3. For admin and super_user roles:
   - No `teacherId` is passed to the hooks
   - All classes are fetched and displayed as before

## Testing

To test this fix:

1. Log in as a teacher user
2. Navigate to the Classes tab in the dashboard
3. Verify that only classes where the teacher is assigned are displayed
4. Log in as an admin user
5. Navigate to the Classes tab
6. Verify that all classes in the system are displayed

## Impact

- **Teachers**: Will now only see classes they are assigned to teach
- **Admins/Super Users**: Continue to see all classes in the system
- **Course Builder**: Teachers can only assign their classes to courses they create
- **Performance**: Improved for teachers as fewer classes need to be fetched and rendered

