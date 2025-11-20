# Backend Integration Guide: Principal Dashboard

## 📋 Overview

This guide provides step-by-step instructions for integrating the Principal Dashboard front-end with the backend database. The Principal Dashboard displays school-wide data for principals, including teachers, classes, students, and observation reports.

---

## 🗄️ Database Schema Requirements

### 1. Role Enum Update

Add the new role to the `app_role` enum:

```sql
-- Migration: Add principal role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'principal';
```

### 2. Principal-School Assignment Table

Create a table to assign principals to schools:

```sql
-- Migration: Create principal_schools table
CREATE TABLE IF NOT EXISTS principal_schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  principal_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  assigned_by UUID REFERENCES profiles(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(principal_id, school_id)
);

-- Indexes for performance
CREATE INDEX idx_principal_schools_principal_id ON principal_schools(principal_id);
CREATE INDEX idx_principal_schools_school_id ON principal_schools(school_id);

-- RLS Policies
ALTER TABLE principal_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Principals can view their own assignments"
  ON principal_schools FOR SELECT
  USING (principal_id = auth.uid());

CREATE POLICY "Admins can manage principal assignments"
  ON principal_schools FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_user')
    )
  );
```

### 3. Observation Reports Table

Create a table for ECE observation reports:

```sql
-- Migration: Create observation_reports table
CREATE TABLE IF NOT EXISTS observation_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('school', 'class', 'teacher')),
  entity_id UUID NOT NULL, -- Can reference school_id, class_id, or teacher profile_id
  observer_id UUID NOT NULL REFERENCES profiles(id),
  observation_number INTEGER NOT NULL CHECK (observation_number BETWEEN 1 AND 4),
  observation_date DATE NOT NULL,
  overall_score INTEGER NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('scheduled', 'in-progress', 'completed')),
  
  -- Key findings and assessments
  key_findings TEXT[],
  areas_of_strength TEXT[],
  areas_for_improvement TEXT[],
  
  -- Next observation scheduling
  next_observation_due DATE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES profiles(id),
  
  -- Ensure unique observation number per entity per year
  UNIQUE(entity_type, entity_id, observation_number, EXTRACT(YEAR FROM observation_date))
);

-- Indexes
CREATE INDEX idx_observation_reports_entity ON observation_reports(entity_type, entity_id);
CREATE INDEX idx_observation_reports_observer ON observation_reports(observer_id);
CREATE INDEX idx_observation_reports_date ON observation_reports(observation_date);

-- RLS Policies
ALTER TABLE observation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Principals can view observations for their schools"
  ON observation_reports FOR SELECT
  USING (
    -- If observation is for a school, check if principal is assigned
    (entity_type = 'school' AND EXISTS (
      SELECT 1 FROM principal_schools
      WHERE school_id = entity_id
      AND principal_id = auth.uid()
      AND status = 'active'
    ))
    OR
    -- If observation is for a class, check if class belongs to principal's school
    (entity_type = 'class' AND EXISTS (
      SELECT 1 FROM classes c
      INNER JOIN principal_schools ps ON ps.school_id = c.school_id
      WHERE c.id = entity_id
      AND ps.principal_id = auth.uid()
      AND ps.status = 'active'
    ))
    OR
    -- If observation is for a teacher, check if teacher belongs to principal's school
    (entity_type = 'teacher' AND EXISTS (
      SELECT 1 FROM classes c
      INNER JOIN class_members cm ON cm.class_id = c.id
      INNER JOIN principal_schools ps ON ps.school_id = c.school_id
      WHERE cm.user_id = entity_id
      AND cm.role = 'teacher'
      AND ps.principal_id = auth.uid()
      AND ps.status = 'active'
    ))
  );

CREATE POLICY "Observers can manage their observations"
  ON observation_reports FOR ALL
  USING (
    observer_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_user', 'ece_observer')
    )
  );
```

---

## 🔧 Backend Service Functions

### 1. Principal Dashboard Service

Create `src/services/principalDashboardService.ts`:

```typescript
import { supabase } from '@/integrations/supabase/client';

export interface PrincipalDashboardStats {
  school: {
    id: string;
    name: string;
    code: string;
    schoolType: string;
    address?: string;
    phone?: string;
    email?: string;
    principalName?: string;
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    status: 'active' | 'inactive' | 'suspended';
  };
  metrics: {
    totalStudents: number;
    totalTeachers: number;
    totalClasses: number;
    averagePerformance: number;
    classesNeedingAttention: number;
  };
  teachers: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    classesCount: number;
    studentsCount: number;
    averagePerformance?: number;
    status: 'active' | 'inactive';
  }>;
  classes: Array<{
    id: string;
    name: string;
    grade: string;
    students: number;
    teacher: string;
    avgPerformance: number;
  }>;
  observations: Array<{
    id: string;
    observationDate: Date;
    observationNumber: number;
    overallScore: number;
    status: 'completed' | 'in-progress' | 'scheduled';
    keyFindings: string[];
    areasOfStrength: string[];
    areasForImprovement: string[];
    nextObservationDue?: Date;
  }>;
}

/**
 * Get principal's assigned school
 */
export async function getPrincipalSchool(principalId: string) {
  const { data, error } = await supabase
    .from('principal_schools')
    .select(`
      school_id,
      schools (
        id,
        name,
        code,
        school_type,
        address,
        phone,
        email,
        principal_name,
        status
      )
    `)
    .eq('principal_id', principalId)
    .eq('status', 'active')
    .single();

  if (error) throw error;

  const school = data.schools;
  if (!school) return null;

  // Get counts
  const [studentsCount, teachersCount, classesCount] = await Promise.all([
    getSchoolStudentsCount(school.id),
    getSchoolTeachersCount(school.id),
    getSchoolClassesCount(school.id)
  ]);

  return {
    id: school.id,
    name: school.name,
    code: school.code,
    schoolType: school.school_type,
    address: school.address,
    phone: school.phone,
    email: school.email,
    principalName: school.principal_name,
    totalStudents: studentsCount,
    totalTeachers: teachersCount,
    totalClasses: classesCount,
    status: school.status
  };
}

/**
 * Get school students count
 */
async function getSchoolStudentsCount(schoolId: string): Promise<number> {
  const { count, error } = await supabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .in('class_id', 
      supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId)
    )
    .eq('role', 'student');

  if (error) throw error;
  return count || 0;
}

/**
 * Get school teachers count
 */
async function getSchoolTeachersCount(schoolId: string): Promise<number> {
  const { count, error } = await supabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .in('class_id',
      supabase
        .from('classes')
        .select('id')
        .eq('school_id', schoolId)
    )
    .eq('role', 'teacher');

  if (error) throw error;
  return count || 0;
}

/**
 * Get school classes count
 */
async function getSchoolClassesCount(schoolId: string): Promise<number> {
  const { count, error } = await supabase
    .from('classes')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active');

  if (error) throw error;
  return count || 0;
}

/**
 * Get all teachers in principal's school
 */
export async function getSchoolTeachers(schoolId: string) {
  // Get all classes in the school
  const { data: classes, error: classesError } = await supabase
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
    .eq('status', 'active');

  if (classesError) throw classesError;

  const classIds = classes.map(c => c.id);

  // Get all teachers from these classes
  const { data: teacherMembers, error: membersError } = await supabase
    .from('class_members')
    .select(`
      user_id,
      profiles (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .in('class_id', classIds)
    .eq('role', 'teacher');

  if (membersError) throw membersError;

  // Get unique teachers and their stats
  const uniqueTeachers = new Map();
  
  for (const member of teacherMembers || []) {
    const teacherId = member.user_id;
    if (!uniqueTeachers.has(teacherId)) {
      const profile = member.profiles;
      uniqueTeachers.set(teacherId, {
        id: teacherId,
        firstName: profile?.first_name || '',
        lastName: profile?.last_name || '',
        email: profile?.email || '',
        classesCount: 0,
        studentsCount: 0,
        status: 'active'
      });
    }
    
    const teacher = uniqueTeachers.get(teacherId);
    teacher.classesCount++;
  }

  // Get students count for each teacher
  for (const [teacherId, teacher] of uniqueTeachers) {
    const { count } = await supabase
      .from('class_members')
      .select('*', { count: 'exact', head: true })
      .in('class_id', classIds)
      .eq('role', 'student')
      .in('class_id',
        supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', teacherId)
          .eq('role', 'teacher')
      );

    teacher.studentsCount = count || 0;
    
    // Calculate average performance (placeholder - implement based on your metrics)
    teacher.averagePerformance = await calculateTeacherPerformance(teacherId, classIds);
  }

  return Array.from(uniqueTeachers.values());
}

/**
 * Calculate teacher performance (placeholder - implement based on your metrics)
 */
async function calculateTeacherPerformance(teacherId: string, classIds: string[]): Promise<number> {
  // TODO: Implement actual performance calculation
  // This could be based on:
  // - Student course completion rates
  // - Average quiz/assignment scores
  // - Student engagement metrics
  // - etc.
  
  // Placeholder: return random value for now
  return Math.floor(Math.random() * 30) + 70;
}

/**
 * Get all classes in principal's school
 */
export async function getSchoolClasses(schoolId: string) {
  const { data: classes, error } = await supabase
    .from('classes')
    .select(`
      id,
      name,
      grade,
      current_students,
      class_members!inner (
        user_id,
        role,
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('school_id', schoolId)
    .eq('status', 'active');

  if (error) throw error;

  return classes.map(cls => {
    const teacher = cls.class_members.find((m: any) => m.role === 'teacher');
    const teacherName = teacher?.profiles 
      ? `${teacher.profiles.first_name} ${teacher.profiles.last_name}`
      : 'Unassigned';

    return {
      id: cls.id,
      name: cls.name,
      grade: cls.grade,
      students: cls.current_students,
      teacher: teacherName,
      avgPerformance: 0 // TODO: Calculate actual performance
    };
  });
}

/**
 * Get observation reports for principal's school
 */
export async function getSchoolObservations(schoolId: string) {
  const { data, error } = await supabase
    .from('observation_reports')
    .select('*')
    .eq('entity_type', 'school')
    .eq('entity_id', schoolId)
    .order('observation_date', { ascending: false });

  if (error) throw error;

  return data.map(obs => ({
    id: obs.id,
    observationDate: new Date(obs.observation_date),
    observationNumber: obs.observation_number,
    overallScore: obs.overall_score,
    status: obs.status,
    keyFindings: obs.key_findings || [],
    areasOfStrength: obs.areas_of_strength || [],
    areasForImprovement: obs.areas_for_improvement || [],
    nextObservationDue: obs.next_observation_due ? new Date(obs.next_observation_due) : undefined
  }));
}

/**
 * Get principal dashboard data
 */
export async function getPrincipalDashboardData(principalId: string): Promise<PrincipalDashboardStats> {
  const school = await getPrincipalSchool(principalId);
  if (!school) {
    throw new Error('Principal is not assigned to any school');
  }

  const [teachers, classes, observations] = await Promise.all([
    getSchoolTeachers(school.id),
    getSchoolClasses(school.id),
    getSchoolObservations(school.id)
  ]);

  // Calculate average performance
  const avgPerformance = classes.length > 0
    ? Math.round(classes.reduce((sum, cls) => sum + cls.avgPerformance, 0) / classes.length)
    : 0;

  // Count classes needing attention
  const classesNeedingAttention = classes.filter(cls => cls.avgPerformance < 80).length;

  return {
    school,
    metrics: {
      totalStudents: school.totalStudents,
      totalTeachers: school.totalTeachers,
      totalClasses: school.totalClasses,
      averagePerformance: avgPerformance,
      classesNeedingAttention
    },
    teachers,
    classes,
    observations
  };
}
```

---

## 🎣 Custom Hook

Create `src/hooks/usePrincipalDashboard.ts`:

```typescript
import { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { 
  getPrincipalDashboardData, 
  PrincipalDashboardStats 
} from '@/services/principalDashboardService';
import { toast } from 'sonner';

export function usePrincipalDashboard() {
  const { profile } = useUserProfile();
  const [data, setData] = useState<PrincipalDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const dashboardData = await getPrincipalDashboardData(profile.id);
        setData(dashboardData);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
        toast.error('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [profile?.id]);

  const refresh = async () => {
    if (!profile?.id) return;
    
    try {
      setLoading(true);
      const dashboardData = await getPrincipalDashboardData(profile.id);
      setData(dashboardData);
      toast.success('Dashboard refreshed');
    } catch (err: any) {
      toast.error('Failed to refresh dashboard');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, refresh };
}
```

---

## 🔄 Update PrincipalDashboard Component

Update `src/components/dashboard/PrincipalDashboard.tsx` to use the hook:

```typescript
// Replace mock data with hook
import { usePrincipalDashboard } from '@/hooks/usePrincipalDashboard';

export const PrincipalDashboard = ({ userProfile }: PrincipalDashboardProps) => {
  const { data, loading, error, refresh } = usePrincipalDashboard();

  if (loading) {
    return <ContentLoader message="Loading dashboard..." />;
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">{error || 'No data available'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Use data.school, data.metrics, data.teachers, etc. instead of MOCK_* constants
  // ... rest of component
};
```

---

## 🛣️ Routing Update

Update `src/pages/Dashboard.tsx` to include Principal route:

```typescript
// Add import
const PrincipalDashboard = lazy(() => import('@/components/dashboard/PrincipalDashboard').then(module => ({ default: module.PrincipalDashboard })));

// In routes section, add:
{finalRole === 'principal' && (
  <Route path="/" element={<PrincipalDashboard userProfile={finalProfile} />} />
)}
```

---

## 📝 Admin Interface for Principal Assignment

Create an admin interface to assign principals to schools:

```typescript
// src/components/admin/PrincipalAssignment.tsx
// Component to assign/unassign principals to schools
// Should allow:
// 1. Select a principal (filter by role = 'principal')
// 2. Select a school
// 3. Assign or unassign
// 4. View current assignments
```

---

## ✅ Testing Checklist

- [ ] Principal can view their assigned school
- [ ] Principal can see all teachers in their school
- [ ] Principal can see all classes in their school
- [ ] Principal can view observation reports for their school
- [ ] RLS policies prevent principals from seeing other schools' data
- [ ] Admin can assign/unassign principals to schools
- [ ] Performance metrics are calculated correctly
- [ ] Observation reports are filtered correctly

---

## 🚀 Next Steps

1. Implement the database migrations
2. Create the service functions
3. Create the custom hook
4. Update the PrincipalDashboard component
5. Test with real data
6. Implement performance calculation logic
7. Add admin interface for principal assignment

---

## 📚 Additional Notes

- **Performance Calculation**: The `calculateTeacherPerformance` function is a placeholder. Implement based on your actual metrics (course completion, quiz scores, engagement, etc.)
- **Observation Reports**: The observation system supports 3-4 observations per year. Ensure the `observation_number` constraint is enforced.
- **RLS Policies**: All policies should be tested thoroughly to ensure data isolation between principals.
- **Caching**: Consider implementing caching for dashboard data to improve performance.

---

## 🔗 Related Files

- `src/components/dashboard/PrincipalDashboard.tsx` - Main dashboard component
- `src/services/principalDashboardService.ts` - Backend service (to be created)
- `src/hooks/usePrincipalDashboard.ts` - Custom hook (to be created)
- `src/pages/Dashboard.tsx` - Routing file

---

**Last Updated**: [Current Date]
**Version**: 1.0.0

