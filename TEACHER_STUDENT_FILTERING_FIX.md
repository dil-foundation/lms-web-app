# Teacher Student Filtering Fix

## Problems Identified

1. **Class Filtering Issue**: Teachers were seeing all classes in the system instead of only their assigned classes
2. **Inconsistent Student Lists**: 
   - Teachers seeing only some grade students (e.g., Class 9th but not Class 10th) even though they teach both
   - Two teachers from the same school and class seeing different numbers of students
   
## Root Cause

The database functions were fetching students based on **course enrollment** (`course_members` table) instead of **class membership** (`class_students` and `class_teachers` tables). This caused:

- Students to appear only if they were enrolled in a course, not if they were just in a class
- Inconsistent results because not all students in a class may be enrolled in the same courses
- Teachers missing students who were in their classes but not yet enrolled in any courses

## Solutions Implemented

### 1. Class Filtering (Frontend)

**Files Changed:**
- `src/services/classService.ts`
- `src/hooks/useClasses.tsx`
- `src/components/admin/ClassManagement.tsx`
- `src/pages/CourseBuilder.tsx`

**Changes:**
- Added `teacherId` parameter to class fetching functions
- Teachers now only see classes where they are assigned in `class_teachers` table
- Used `!inner` join on `class_teachers` when filtering by teacher ID

### 2. Student Filtering (Database Functions)

**Migration File:** `supabase/migrations/20251127100000_fix_teacher_student_filtering.sql`

#### Functions Updated:

##### a) `get_students_for_teacher`
**Purpose:** Fetches paginated student list for StudentsPage

**Old Logic:**
```sql
-- Got students from course_members where teacher was also a course member
FROM public.course_members as teacher_cm
JOIN public.course_members as cm on teacher_cm.course_id = cm.course_id
```

**New Logic:**
```sql
-- Gets students from classes where teacher is assigned
FROM public.class_teachers ct
JOIN public.class_students cs on ct.class_id = cs.class_id
JOIN public.profiles p on cs.student_id = p.id
WHERE ct.teacher_id = p_teacher_id
```

**Benefits:**
- Teachers see ALL students from their assigned classes
- Consistent results across all teachers teaching the same class
- Students appear regardless of course enrollment status

##### b) `get_students_for_teacher_count`
**Purpose:** Counts total students for pagination

**Changes:** Same logic as above, counting students from classes instead of courses

##### c) `get_students_data`
**Purpose:** Fetches student data with course progress for ReportsPage

**Old Logic:**
- Only showed students enrolled in courses where teacher was a member

**New Logic:**
```sql
WITH teacher_students AS (
    -- Get all students from teacher's classes
    SELECT DISTINCT p.id, p.first_name, p.last_name, ...
    FROM class_teachers ct
    JOIN class_students cs ON ct.class_id = cs.class_id
    ...
),
student_enrollments AS (
    -- LEFT JOIN course enrollments (optional)
    SELECT ... FROM teacher_students ts
    LEFT JOIN course_members cm ON ts.user_id = cm.user_id
    LEFT JOIN courses c ON cm.course_id = c.id
)
```

**Benefits:**
- Shows ALL students from teacher's classes
- Displays "Not Enrolled" for students not in any course
- Shows course progress for students who are enrolled
- Consistent student list across all views

## How It Works Now

### For Teachers:

1. **Classes Tab:**
   - Only shows classes where the teacher is listed in `class_teachers` table
   - Filters using inner join: `class_teachers!inner` with `teacher_id = current_user_id`

2. **Students Page:**
   - Shows ALL students from ALL classes the teacher teaches
   - Students from Class 9, Class 10, etc. all appear together
   - Includes students even if they haven't enrolled in any courses yet

3. **Reports Page:**
   - Shows ALL students from teacher's classes
   - Displays course progress if student is enrolled in a course
   - Shows "Not Enrolled" status for students without course enrollment

4. **Course Builder:**
   - Only shows teacher's assigned classes when creating/editing courses
   - Students from those classes can be enrolled in courses

### For Admins:

- No changes - admins continue to see all classes and students system-wide

## Database Schema Dependencies

The fix relies on these tables:

```
class_teachers (junction table)
├── teacher_id (uuid) → profiles.id
└── class_id (uuid) → classes.id

class_students (junction table)
├── student_id (uuid) → profiles.id
└── class_id (uuid) → classes.id

course_members (junction table)
├── user_id (uuid) → profiles.id
├── course_id (uuid) → courses.id
└── role (text) → 'teacher' | 'student'
```

## Testing Instructions

### Test 1: Class Filtering
1. Log in as Teacher A assigned to Class 9A and Class 10B
2. Navigate to Classes tab
3. **Expected:** See only Class 9A and Class 10B
4. Log in as Teacher B assigned to different classes
5. **Expected:** See different classes than Teacher A

### Test 2: Student List Consistency
1. Create Class 9A with 20 students
2. Assign Teacher A and Teacher B to Class 9A
3. Log in as Teacher A → Navigate to Students page
4. **Expected:** See all 20 students
5. Log in as Teacher B → Navigate to Students page
6. **Expected:** See the same 20 students (not a different count)

### Test 3: Multi-Grade Students
1. Assign Teacher C to both Class 9A and Class 10B
2. Add 15 students to Class 9A and 18 students to Class 10B
3. Log in as Teacher C → Navigate to Students page
4. **Expected:** See all 33 students (15 + 18)

### Test 4: Students Without Course Enrollment
1. Create Class 11A with 10 students
2. Assign Teacher D to Class 11A
3. DO NOT enroll these students in any course
4. Log in as Teacher D → Navigate to Students page
5. **Expected:** See all 10 students
6. Navigate to Reports page
7. **Expected:** See all 10 students with "Not Enrolled" status

## Migration Deployment

1. **Backup Database** (recommended before any migration)
2. Run the migration:
   ```bash
   # If using Supabase CLI
   supabase db push
   
   # Or apply the migration file directly
   psql <connection_string> -f supabase/migrations/20251127100000_fix_teacher_student_filtering.sql
   ```
3. Verify functions are updated:
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname IN (
     'get_students_for_teacher', 
     'get_students_for_teacher_count', 
     'get_students_data'
   );
   ```

## Rollback Plan

If issues occur, you can rollback by:

1. Restoring the previous function definitions from:
   - `supabase/migrations/20250922172405_remote_schema.sql` (lines 7437-7800)
2. Or manually reverting the functions using the old SQL definitions

## Performance Considerations

- The new queries use proper indexes on `class_teachers(teacher_id)` and `class_students(class_id)`
- `DISTINCT` is used to prevent duplicate students when they're in multiple classes
- Pagination is maintained for large student lists
- Course progress calculations remain unchanged

## Security

- All functions maintain `SECURITY DEFINER` with proper authorization checks
- Teachers can only access students from their assigned classes
- Admins retain full access to all data
- RLS policies remain unchanged

