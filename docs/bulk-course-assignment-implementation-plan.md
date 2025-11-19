# Bulk Course Assignment - Implementation Plan

## Overview
This document outlines the implementation plan for adding bulk school/project assignment capabilities to the course access management system, enabling administrators to assign courses to multiple schools across projects from a single interface.

## Problem Statement
Currently, courses must be assigned to classes individually, creating significant administrative overhead when scaling across multiple schools and projects (e.g., Harvard scenario with multiple schools under different projects).

## Solution Architecture

### Frontend Changes

#### 1. UI Components

**1.1 Assignment Mode Selector**
- **Location**: Top of Access tab, above "Manage Classes" card
- **Type**: Radio button group or Toggle switch
- **Options**: 
  - "Bulk Assignment" (new)
  - "Individual Selection" (existing)
- **Default**: Individual Selection (maintains backward compatibility)

**1.2 Bulk Assignment Panel** (shown when Bulk mode is active)
- **Components**:
  - Project selection (MultiSelect or Checkbox list)
    - "Assign to All Projects" checkbox
    - Individual project checkboxes with stats (school count, class count)
  - Preview section showing:
    - Total schools that will be assigned
    - Total classes that will be enrolled
    - Breakdown by project
  - "Apply Bulk Assignment" button
  - Confirmation dialog for large operations (>50 schools)

**1.3 Individual Selection Panel** (shown when Individual mode is active)
- **Components**: Existing UI (no changes)
  - School selection MultiSelect
  - Class selection MultiSelect

#### 2. State Management

**New State Variables:**
```typescript
// Assignment mode
const [assignmentMode, setAssignmentMode] = useState<'bulk' | 'individual'>('individual');

// Bulk assignment state
const [bulkSelectedProjects, setBulkSelectedProjects] = useState<string[]>([]);
const [assignToAllProjects, setAssignToAllProjects] = useState(false);
const [bulkPreviewData, setBulkPreviewData] = useState<{
  schools: School[];
  classes: ClassWithMembers[];
  projectBreakdown: { projectId: string; projectName: string; schoolCount: number; classCount: number }[];
} | null>(null);
const [isBulkLoading, setIsBulkLoading] = useState(false);
```

#### 3. Data Fetching Functions

**3.1 Fetch All Schools by Project IDs**
```typescript
const fetchSchoolsByProjects = async (projectIds: string[]): Promise<School[]> => {
  if (projectIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .in('project_id', projectIds)
    .eq('status', 'active')
    .order('name');
  
  if (error) throw error;
  return data || [];
};
```

**3.2 Fetch All Classes by School IDs**
```typescript
const fetchClassesBySchools = async (schoolIds: string[]): Promise<ClassWithMembers[]> => {
  if (schoolIds.length === 0) return [];
  
  // Use existing classService or create optimized query
  const allClasses = await classService.getClasses();
  return allClasses.filter(cls => schoolIds.includes(cls.school_id));
};
```

**3.3 Fetch All Projects** (for bulk selection)
```typescript
const fetchAllProjects = async (): Promise<Project[]> => {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('name');
  
  if (error) throw error;
  return data || [];
};
```

#### 4. Business Logic Functions

**4.1 Calculate Bulk Preview**
```typescript
const calculateBulkPreview = async (projectIds: string[]) => {
  setIsBulkLoading(true);
  try {
    // Fetch schools for selected projects
    const schools = await fetchSchoolsByProjects(projectIds);
    const schoolIds = schools.map(s => s.id);
    
    // Fetch classes for those schools
    const classes = await fetchClassesBySchools(schoolIds);
    
    // Calculate breakdown by project
    const projectBreakdown = projectIds.map(projectId => {
      const projectSchools = schools.filter(s => s.project_id === projectId);
      const projectSchoolIds = projectSchools.map(s => s.id);
      const projectClasses = classes.filter(c => projectSchoolIds.includes(c.school_id));
      
      return {
        projectId,
        projectName: projects.find(p => p.id === projectId)?.name || 'Unknown',
        schoolCount: projectSchools.length,
        classCount: projectClasses.length
      };
    });
    
    setBulkPreviewData({
      schools,
      classes,
      projectBreakdown
    });
  } catch (error) {
    toast.error('Failed to calculate preview');
    console.error(error);
  } finally {
    setIsBulkLoading(false);
  }
};
```

**4.2 Apply Bulk Assignment**
```typescript
const applyBulkAssignment = () => {
  if (!bulkPreviewData) return;
  
  // Update course data
  const schoolIds = bulkPreviewData.schools.map(s => s.id);
  const classIds = bulkPreviewData.classes.map(c => c.id);
  
  setCourseData(prev => ({
    ...prev,
    school_ids: [...new Set([...prev.school_ids, ...schoolIds])], // Merge with existing
    class_ids: [...new Set([...prev.class_ids, ...classIds])] // Merge with existing
  }));
  
  // Update selected classes for UI
  setSelectedClasses(prev => [...new Set([...prev, ...classIds])]);
  
  // Refresh course members
  refreshCourseMembers();
  
  toast.success(`Successfully assigned to ${schoolIds.length} schools and ${classIds.length} classes`);
  
  // Reset bulk state
  setBulkSelectedProjects([]);
  setAssignToAllProjects(false);
  setBulkPreviewData(null);
};
```

#### 5. Event Handlers

**5.1 Mode Change Handler**
```typescript
const handleModeChange = (mode: 'bulk' | 'individual') => {
  setAssignmentMode(mode);
  if (mode === 'individual') {
    // Clear bulk selection when switching to individual
    setBulkSelectedProjects([]);
    setAssignToAllProjects(false);
    setBulkPreviewData(null);
  }
};
```

**5.2 Project Selection Handler**
```typescript
const handleBulkProjectSelection = async (projectIds: string[]) => {
  setBulkSelectedProjects(projectIds);
  
  if (projectIds.length > 0) {
    await calculateBulkPreview(projectIds);
  } else {
    setBulkPreviewData(null);
  }
};
```

**5.3 "Assign to All Projects" Handler**
```typescript
const handleAssignToAllProjects = async (checked: boolean) => {
  setAssignToAllProjects(checked);
  
  if (checked) {
    const allProjects = await fetchAllProjects();
    const allProjectIds = allProjects.map(p => p.id);
    setBulkSelectedProjects(allProjectIds);
    await calculateBulkPreview(allProjectIds);
  } else {
    setBulkSelectedProjects([]);
    setBulkPreviewData(null);
  }
};
```

---

## Backend Integration Plan

### Option 1: Frontend-Only Approach (Recommended for MVP)

**Pros:**
- Faster implementation
- No backend changes required
- Leverages existing Supabase queries
- Good for initial rollout

**Cons:**
- May be slower for very large datasets (1000+ schools)
- Multiple queries required

**Implementation:**
- Use existing Supabase client-side queries
- Implement pagination if needed for large datasets
- Add loading states and progress indicators

### Option 2: Supabase Edge Function (Recommended for Scale)

**Pros:**
- Single optimized query
- Better performance for large datasets
- Can include business logic validation
- Atomic operations

**Cons:**
- Requires backend deployment
- Additional complexity

**Implementation:**

**2.1 Create Edge Function: `bulk-assign-course`**

```typescript
// supabase/functions/bulk-assign-course/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  try {
    const { courseId, projectIds, assignToAllProjects } = await req.json();
    
    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Determine project IDs
    let finalProjectIds = projectIds;
    if (assignToAllProjects) {
      const { data: allProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('status', 'active');
      finalProjectIds = allProjects?.map(p => p.id) || [];
    }
    
    // Fetch all schools for selected projects
    const { data: schools, error: schoolsError } = await supabase
      .from('schools')
      .select('id, project_id')
      .in('project_id', finalProjectIds)
      .eq('status', 'active');
    
    if (schoolsError) throw schoolsError;
    
    const schoolIds = schools?.map(s => s.id) || [];
    
    // Fetch all classes for those schools
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, school_id')
      .in('school_id', schoolIds)
      .eq('status', 'active');
    
    if (classesError) throw classesError;
    
    const classIds = classes?.map(c => c.id) || [];
    
    // Get current course data
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('school_ids, class_ids')
      .eq('id', courseId)
      .single();
    
    if (courseError) throw courseError;
    
    // Merge with existing assignments (avoid duplicates)
    const updatedSchoolIds = [...new Set([...(course.school_ids || []), ...schoolIds])];
    const updatedClassIds = [...new Set([...(course.class_ids || []), ...classIds])];
    
    // Update course
    const { error: updateError } = await supabase
      .from('courses')
      .update({
        school_ids: updatedSchoolIds,
        class_ids: updatedClassIds,
        updated_at: new Date().toISOString()
      })
      .eq('id', courseId);
    
    if (updateError) throw updateError;
    
    // Return summary
    return new Response(
      JSON.stringify({
        success: true,
        schoolsAssigned: schoolIds.length,
        classesEnrolled: classIds.length,
        schoolIds: updatedSchoolIds,
        classIds: updatedClassIds
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**2.2 Frontend Integration**

```typescript
const applyBulkAssignment = async () => {
  if (!bulkPreviewData || !courseId) return;
  
  setIsBulkLoading(true);
  try {
    const { data, error } = await supabase.functions.invoke('bulk-assign-course', {
      body: {
        courseId,
        projectIds: bulkSelectedProjects,
        assignToAllProjects
      }
    });
    
    if (error) throw error;
    
    // Update local state
    setCourseData(prev => ({
      ...prev,
      school_ids: data.schoolIds,
      class_ids: data.classIds
    }));
    
    setSelectedClasses(data.classIds);
    refreshCourseMembers();
    
    toast.success(`Successfully assigned to ${data.schoolsAssigned} schools and ${data.classesEnrolled} classes`);
    
    // Reset bulk state
    setBulkSelectedProjects([]);
    setAssignToAllProjects(false);
    setBulkPreviewData(null);
  } catch (error) {
    toast.error('Failed to apply bulk assignment');
    console.error(error);
  } finally {
    setIsBulkLoading(false);
  }
};
```

### Option 3: Database Function (Most Performant)

**Pros:**
- Best performance (runs in database)
- Atomic transaction
- Can handle very large datasets efficiently

**Cons:**
- More complex to maintain
- Requires database migration

**Implementation:**

**3.1 Create Database Function**

```sql
-- Migration: create_bulk_assign_course_function.sql

CREATE OR REPLACE FUNCTION bulk_assign_course_to_projects(
  p_course_id UUID,
  p_project_ids UUID[],
  p_assign_to_all BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_final_project_ids UUID[];
  v_school_ids UUID[];
  v_class_ids UUID[];
  v_current_school_ids UUID[];
  v_current_class_ids UUID[];
  v_updated_school_ids UUID[];
  v_updated_class_ids UUID[];
  v_result JSONB;
BEGIN
  -- Determine project IDs
  IF p_assign_to_all THEN
    SELECT ARRAY_AGG(id) INTO v_final_project_ids
    FROM projects
    WHERE status = 'active';
  ELSE
    v_final_project_ids := p_project_ids;
  END IF;
  
  -- Get all schools for selected projects
  SELECT ARRAY_AGG(id) INTO v_school_ids
  FROM schools
  WHERE project_id = ANY(v_final_project_ids)
    AND status = 'active';
  
  -- Get all classes for those schools
  SELECT ARRAY_AGG(id) INTO v_class_ids
  FROM classes
  WHERE school_id = ANY(v_school_ids)
    AND status = 'active';
  
  -- Get current course assignments
  SELECT school_ids, class_ids
  INTO v_current_school_ids, v_current_class_ids
  FROM courses
  WHERE id = p_course_id;
  
  -- Merge (avoid duplicates)
  v_updated_school_ids := (
    SELECT ARRAY_AGG(DISTINCT unnest)
    FROM (
      SELECT unnest(COALESCE(v_current_school_ids, ARRAY[]::UUID[]) || v_school_ids)
    ) t
  );
  
  v_updated_class_ids := (
    SELECT ARRAY_AGG(DISTINCT unnest)
    FROM (
      SELECT unnest(COALESCE(v_current_class_ids, ARRAY[]::UUID[]) || v_class_ids)
    ) t
  );
  
  -- Update course
  UPDATE courses
  SET 
    school_ids = v_updated_school_ids,
    class_ids = v_updated_class_ids,
    updated_at = NOW()
  WHERE id = p_course_id;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'schools_assigned', array_length(v_school_ids, 1),
    'classes_enrolled', array_length(v_class_ids, 1),
    'school_ids', v_updated_school_ids,
    'class_ids', v_updated_class_ids
  );
  
  RETURN v_result;
END;
$$;
```

**3.2 Frontend Integration**

```typescript
const applyBulkAssignment = async () => {
  if (!courseId) return;
  
  setIsBulkLoading(true);
  try {
    const { data, error } = await supabase.rpc('bulk_assign_course_to_projects', {
      p_course_id: courseId,
      p_project_ids: bulkSelectedProjects,
      p_assign_to_all: assignToAllProjects
    });
    
    if (error) throw error;
    
    // Update local state
    setCourseData(prev => ({
      ...prev,
      school_ids: data.school_ids,
      class_ids: data.class_ids
    }));
    
    setSelectedClasses(data.class_ids);
    refreshCourseMembers();
    
    toast.success(`Successfully assigned to ${data.schools_assigned} schools and ${data.classes_enrolled} classes`);
    
    // Reset bulk state
    setBulkSelectedProjects([]);
    setAssignToAllProjects(false);
    setBulkPreviewData(null);
  } catch (error) {
    toast.error('Failed to apply bulk assignment');
    console.error(error);
  } finally {
    setIsBulkLoading(false);
  }
};
```

---

## Recommended Implementation Path

### Phase 1: Frontend-Only (MVP) - Week 1
1. ✅ Implement UI components (mode selector, bulk panel)
2. ✅ Add state management
3. ✅ Implement client-side data fetching
4. ✅ Add preview functionality
5. ✅ Test with small datasets (<100 schools)

### Phase 2: Backend Optimization (Scale) - Week 2
1. Implement Supabase Edge Function (Option 2)
2. Migrate frontend to use Edge Function
3. Add error handling and retry logic
4. Performance testing with large datasets (1000+ schools)

### Phase 3: Database Optimization (Enterprise) - Week 3 (Optional)
1. Create database function (Option 3)
2. Migrate to database function for maximum performance
3. Add database-level validation
4. Add audit logging

---

## Testing Strategy

### Unit Tests
- Mode switching logic
- Project selection handlers
- Preview calculation
- Data merging logic

### Integration Tests
- Bulk assignment flow (end-to-end)
- Individual assignment flow (regression)
- Mode switching with existing data
- Error handling scenarios

### Performance Tests
- Small dataset (<50 schools)
- Medium dataset (50-200 schools)
- Large dataset (200-1000 schools)
- Very large dataset (1000+ schools)

### User Acceptance Tests
- Admin can switch between modes
- Bulk assignment works correctly
- Preview shows accurate counts
- Individual assignment still works
- No data loss when switching modes

---

## Security Considerations

1. **Authorization**: Ensure only admins can use bulk assignment
2. **Validation**: Validate project IDs before processing
3. **Rate Limiting**: Prevent abuse of bulk operations
4. **Audit Logging**: Log all bulk assignment operations
5. **Transaction Safety**: Ensure atomic updates

---

## Rollout Plan

1. **Development**: Implement in feature branch
2. **Staging**: Test with production-like data
3. **Beta**: Release to select admins for feedback
4. **Production**: Gradual rollout with monitoring
5. **Documentation**: Update admin documentation

---

## Success Metrics

- **Time Savings**: Reduce assignment time from hours to minutes
- **Adoption Rate**: % of admins using bulk assignment
- **Error Rate**: <1% failed assignments
- **Performance**: <5 seconds for 500 schools
- **User Satisfaction**: Positive feedback from admins

---

## Future Enhancements

1. **Selective Bulk**: Assign to all schools in Project A, but only selected schools in Project B
2. **Scheduled Assignment**: Schedule bulk assignments for future dates
3. **Bulk Unassignment**: Remove assignments in bulk
4. **Assignment Templates**: Save common assignment patterns
5. **Analytics Dashboard**: Track assignment patterns and usage

---

## Notes

- Maintain backward compatibility with existing individual assignment
- Ensure no data loss when switching between modes
- Provide clear feedback during bulk operations
- Handle edge cases (no schools, no classes, etc.)
- Consider pagination for very large project lists

