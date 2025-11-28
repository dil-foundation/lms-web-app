# Teacher Filtering Fix - Testing Checklist

## Prerequisites
- [ ] Migration `20251127100000_fix_teacher_student_filtering.sql` has been applied
- [ ] Frontend changes have been deployed
- [ ] Database functions have been updated successfully

## Test Environment Setup

### Create Test Data
```sql
-- Create test boards and schools
INSERT INTO boards (id, name, code, status) VALUES 
  ('board-1', 'Test Board', 'TB001', 'active');

INSERT INTO schools (id, name, code, board_id, status) VALUES 
  ('school-1', 'Test School', 'TS001', 'board-1', 'active');

-- Create test classes
INSERT INTO classes (id, name, code, grade, school_id, board_id) VALUES 
  ('class-9a', 'Class 9A', 'C9A', '9', 'school-1', 'board-1'),
  ('class-10b', 'Class 10B', 'C10B', '10', 'school-1', 'board-1'),
  ('class-11c', 'Class 11C', 'C11C', '11', 'school-1', 'board-1');

-- Create test teachers
-- (Assume teacher-1, teacher-2, teacher-3 already exist in profiles)

-- Assign teachers to classes
INSERT INTO class_teachers (class_id, teacher_id, is_primary) VALUES 
  ('class-9a', 'teacher-1', true),
  ('class-10b', 'teacher-1', false),
  ('class-9a', 'teacher-2', false),
  ('class-11c', 'teacher-3', true);

-- Create test students
-- (Assume student-1 through student-50 exist in profiles)

-- Assign students to classes
-- 15 students in Class 9A
INSERT INTO class_students (class_id, student_id, student_number) 
  SELECT 'class-9a', id, ROW_NUMBER() OVER ()
  FROM profiles 
  WHERE role = 'student' 
  LIMIT 15;

-- 20 students in Class 10B
INSERT INTO class_students (class_id, student_id, student_number) 
  SELECT 'class-10b', id, ROW_NUMBER() OVER ()
  FROM profiles 
  WHERE role = 'student' 
  OFFSET 15 LIMIT 20;

-- 12 students in Class 11C
INSERT INTO class_students (class_id, student_id, student_number) 
  SELECT 'class-11c', id, ROW_NUMBER() OVER ()
  FROM profiles 
  WHERE role = 'student' 
  OFFSET 35 LIMIT 12;
```

## Test Cases

### Test 1: Class Filtering for Teachers ✓
**Scenario:** Teacher should only see their assigned classes

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 1.1 | Log in as Teacher 1 | Login successful | | [ ] |
| 1.2 | Navigate to Classes tab | See 2 classes: Class 9A and Class 10B | | [ ] |
| 1.3 | Check class count | Count shows 2 | | [ ] |
| 1.4 | Verify Class 11C is NOT visible | Class 11C not in list | | [ ] |
| 1.5 | Log out and log in as Teacher 2 | Login successful | | [ ] |
| 1.6 | Navigate to Classes tab | See 1 class: Class 9A only | | [ ] |
| 1.7 | Log out and log in as Teacher 3 | Login successful | | [ ] |
| 1.8 | Navigate to Classes tab | See 1 class: Class 11C only | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 2: Multi-Grade Student Visibility ✓
**Scenario:** Teacher teaching multiple grades should see students from all grades

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 2.1 | Log in as Teacher 1 (teaches 9A and 10B) | Login successful | | [ ] |
| 2.2 | Navigate to Students page | See students list | | [ ] |
| 2.3 | Count total students visible | See 35 students (15 from 9A + 20 from 10B) | | [ ] |
| 2.4 | Filter by Grade 9 | See 15 students | | [ ] |
| 2.5 | Filter by Grade 10 | See 20 students | | [ ] |
| 2.6 | Clear filters | See all 35 students again | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 3: Consistent Student Lists Between Teachers ✓
**Scenario:** Two teachers teaching the same class should see the same students

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 3.1 | Log in as Teacher 1 | Login successful | | [ ] |
| 3.2 | Navigate to Students page | See students list | | [ ] |
| 3.3 | Filter to show only Class 9A students | See 15 students | | [ ] |
| 3.4 | Note student names/count | List: [record names] | | [ ] |
| 3.5 | Log out and log in as Teacher 2 | Login successful | | [ ] |
| 3.6 | Navigate to Students page | See students list | | [ ] |
| 3.7 | Filter to show only Class 9A students | See same 15 students as Teacher 1 | | [ ] |
| 3.8 | Compare lists | Lists are identical | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 4: Students Without Course Enrollment ✓
**Scenario:** Students in a class but not enrolled in any course should still be visible

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 4.1 | Verify Class 11C students have NO course enrollments | 0 course_members records for these students | | [ ] |
| 4.2 | Log in as Teacher 3 (teaches Class 11C) | Login successful | | [ ] |
| 4.3 | Navigate to Students page | See students list | | [ ] |
| 4.4 | Count total students | See 12 students (all from Class 11C) | | [ ] |
| 4.5 | Navigate to Reports page | See reports page | | [ ] |
| 4.6 | Check student list in reports | See same 12 students | | [ ] |
| 4.7 | Check course status | Shows "Not Enrolled" or similar | | [ ] |
| 4.8 | Check progress | Shows 0% or "Not Started" | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 5: Course Builder Class Selection ✓
**Scenario:** Teacher creating a course should only see their assigned classes

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 5.1 | Log in as Teacher 1 (teaches 9A and 10B) | Login successful | | [ ] |
| 5.2 | Navigate to Course Builder | Open course creation | | [ ] |
| 5.3 | Go to "Access" or "Classes" tab | See class selection | | [ ] |
| 5.4 | Check available classes | See only Class 9A and Class 10B | | [ ] |
| 5.5 | Verify Class 11C is NOT available | Class 11C not in dropdown/list | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 6: Admin Access (No Regression) ✓
**Scenario:** Admin should still see all classes and students

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 6.1 | Log in as Admin user | Login successful | | [ ] |
| 6.2 | Navigate to Classes tab | See all classes in system | | [ ] |
| 6.3 | Count classes | See 3+ classes (9A, 10B, 11C, plus any others) | | [ ] |
| 6.4 | Navigate to Students page | See all students in system | | [ ] |
| 6.5 | Count students | See 47+ students (all test students) | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 7: Search and Filter Functionality ✓
**Scenario:** Search and filters should work correctly with new filtering logic

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 7.1 | Log in as Teacher 1 | Login successful | | [ ] |
| 7.2 | Navigate to Students page | See 35 students | | [ ] |
| 7.3 | Search for a specific student name | Results show only matching students | | [ ] |
| 7.4 | Clear search | All 35 students visible again | | [ ] |
| 7.5 | Apply status filter (e.g., "Active") | See filtered results | | [ ] |
| 7.6 | Clear filters | All students visible again | | [ ] |
| 7.7 | Apply course filter | See students in that course | | [ ] |

**Notes:**
- _____________________________________________________

---

### Test 8: Pagination ✓
**Scenario:** Pagination should work correctly with new student counts

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|----------------|---------------|--------|
| 8.1 | Log in as Teacher 1 (35 students total) | Login successful | | [ ] |
| 8.2 | Navigate to Students page | See first page of students | | [ ] |
| 8.3 | Check pagination controls | Shows correct total count (35) | | [ ] |
| 8.4 | Navigate to page 2 | See next set of students | | [ ] |
| 8.5 | Navigate back to page 1 | See first set of students again | | [ ] |
| 8.6 | Change items per page | Pagination adjusts correctly | | [ ] |

**Notes:**
- _____________________________________________________

---

## Performance Tests

### Test 9: Query Performance ✓
**Scenario:** New queries should perform adequately

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Class listing load time (teacher) | < 1 second | | [ ] |
| Student listing load time (teacher) | < 2 seconds | | [ ] |
| Reports page load time | < 3 seconds | | [ ] |
| Course builder class dropdown | < 1 second | | [ ] |

**Notes:**
- _____________________________________________________

---

## Edge Cases

### Test 10: Edge Cases ✓

| Scenario | Expected Behavior | Actual Behavior | Status |
|----------|------------------|-----------------|--------|
| Teacher with no assigned classes | See empty state message | | [ ] |
| Teacher with 100+ students | Pagination works correctly | | [ ] |
| Student in multiple classes of same teacher | Appears once in student list | | [ ] |
| Newly assigned teacher | Immediately sees assigned classes | | [ ] |
| Teacher removed from class | No longer sees that class or its students | | [ ] |

**Notes:**
- _____________________________________________________

---

## Sign-off

**Tested By:** _____________________  
**Date:** _____________________  
**Environment:** [ ] Development [ ] Staging [ ] Production  
**Overall Status:** [ ] Pass [ ] Fail [ ] Needs Revision  

**Issues Found:**
1. _____________________________________________________
2. _____________________________________________________
3. _____________________________________________________

**Additional Notes:**
_____________________________________________________
_____________________________________________________
_____________________________________________________

