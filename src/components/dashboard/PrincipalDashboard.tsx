import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ContentLoader } from '@/components/ContentLoader';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  TrendingUp, 
  AlertTriangle,
  Building2,
  BarChart3,
  Eye
} from 'lucide-react';
import { MetricCard } from './widgets/MetricCard';
import { SchoolInfoCard } from './widgets/SchoolInfoCard';
import { TeacherCard } from './widgets/TeacherCard';
import { ObservationSummaryCard } from './widgets/ObservationSummaryCard';
import { ObservationReminderCard } from './widgets/ObservationReminderCard';
import { ObservationProgressChart } from './widgets/ObservationProgressChart';
import { ObservationScoreComparison } from './widgets/ObservationScoreComparison';
import { DashboardLayout } from './shared/DashboardLayout';
import { DashboardHeader } from './shared/DashboardHeader';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PrincipalDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

// MOCK DATA - Replace with actual API calls
const MOCK_SCHOOL = {
  id: 'school-1',
  name: 'Greenwood Elementary School',
  code: 'GES-001',
  schoolType: 'Public',
  address: '123 Education Street, City, Country',
  phone: '+1-234-567-8900',
  email: 'info@greenwood.edu',
  principalName: 'Dr. Sarah Johnson',
  totalStudents: 450,
  totalTeachers: 28,
  totalClasses: 18,
  status: 'active' as const
};

const MOCK_TEACHERS = [
  {
    id: 'teacher-1',
    firstName: 'John',
    lastName: 'Smith',
    email: 'john.smith@greenwood.edu',
    classesCount: 3,
    studentsCount: 75,
    averagePerformance: 85,
    status: 'active' as const
  },
  {
    id: 'teacher-2',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@greenwood.edu',
    classesCount: 2,
    studentsCount: 52,
    averagePerformance: 92,
    status: 'active' as const
  },
  {
    id: 'teacher-3',
    firstName: 'Michael',
    lastName: 'Brown',
    email: 'michael.brown@greenwood.edu',
    classesCount: 4,
    studentsCount: 98,
    averagePerformance: 78,
    status: 'active' as const
  }
];

const MOCK_CLASSES = [
  { id: 'class-1', name: 'Grade 1-A', grade: '1', students: 25, teacher: 'John Smith', avgPerformance: 88 },
  { id: 'class-2', name: 'Grade 2-B', grade: '2', students: 28, teacher: 'Emily Davis', avgPerformance: 92 },
  { id: 'class-3', name: 'Grade 3-A', grade: '3', students: 30, teacher: 'Michael Brown', avgPerformance: 78 },
  { id: 'class-4', name: 'Grade 4-B', grade: '4', students: 27, teacher: 'John Smith', avgPerformance: 85 }
];

const MOCK_OBSERVATIONS = [
  {
    id: 'obs-1',
    observationDate: new Date('2024-01-15'),
    observationNumber: 1,
    overallScore: 82,
    status: 'completed' as const,
    keyFindings: [
      'Strong student engagement in mathematics',
      'Effective use of technology in classrooms',
      'Well-organized learning environment'
    ],
    areasOfStrength: ['Technology Integration', 'Student Engagement', 'Classroom Management'],
    areasForImprovement: ['Assessment Methods', 'Differentiated Instruction'],
    nextObservationDue: new Date('2024-04-15')
  },
  {
    id: 'obs-2',
    observationDate: new Date('2024-04-20'),
    observationNumber: 2,
    overallScore: 87,
    status: 'completed' as const,
    keyFindings: [
      'Improved assessment strategies',
      'Enhanced differentiated instruction',
      'Continued strong student engagement'
    ],
    areasOfStrength: ['Assessment Methods', 'Differentiated Instruction', 'Student Engagement'],
    areasForImprovement: ['Parent Communication'],
    nextObservationDue: new Date('2024-07-20')
  }
];

// Mock data for observation reminders (teachers and classes that need observation)
// Principal observes: Teachers and Classes (single school only)
const MOCK_OBSERVATION_REMINDERS = [
  {
    id: 'reminder-teacher-1',
    entityType: 'teacher' as const,
    entityId: 'teacher-1',
    entityName: 'John Smith',
    lastObservationDate: new Date('2024-04-10'),
    lastObservationNumber: 2,
    nextObservationDue: new Date('2024-07-10'),
    nextObservationNumber: 3,
    status: 'upcoming' as const,
    lastScore: 85
  },
  {
    id: 'reminder-teacher-2',
    entityType: 'teacher' as const,
    entityId: 'teacher-2',
    entityName: 'Emily Davis',
    lastObservationDate: new Date('2024-03-15'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-06-15'),
    nextObservationNumber: 2,
    status: 'due' as const,
    lastScore: 92
  },
  {
    id: 'reminder-teacher-3',
    entityType: 'teacher' as const,
    entityId: 'teacher-3',
    entityName: 'Michael Brown',
    lastObservationDate: new Date('2024-02-01'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-05-01'),
    nextObservationNumber: 2,
    status: 'overdue' as const,
    lastScore: 78
  },
  {
    id: 'reminder-class-1',
    entityType: 'class' as const,
    entityId: 'class-1',
    entityName: 'Grade 1-A',
    lastObservationDate: new Date('2024-02-20'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-05-20'),
    nextObservationNumber: 2,
    status: 'overdue' as const,
    lastScore: 88
  },
  {
    id: 'reminder-class-2',
    entityType: 'class' as const,
    entityId: 'class-3',
    entityName: 'Grade 3-A',
    lastObservationDate: new Date('2024-03-25'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-06-25'),
    nextObservationNumber: 2,
    status: 'due' as const,
    lastScore: 78
  }
];

const MOCK_PERFORMANCE_DATA = [
  { month: 'Jan', students: 420, completion: 75 },
  { month: 'Feb', students: 435, completion: 78 },
  { month: 'Mar', students: 445, completion: 82 },
  { month: 'Apr', students: 450, completion: 85 },
  { month: 'May', students: 450, completion: 87 }
];

const MOCK_CLASS_PERFORMANCE = [
  { name: 'Grade 1-A', performance: 88, students: 25 },
  { name: 'Grade 2-B', performance: 92, students: 28 },
  { name: 'Grade 3-A', performance: 78, students: 30 },
  { name: 'Grade 4-B', performance: 85, students: 27 }
];

export const PrincipalDashboard = ({ userProfile }: PrincipalDashboardProps) => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  // Calculate metrics from mock data
  const totalStudents = MOCK_SCHOOL.totalStudents;
  const totalTeachers = MOCK_SCHOOL.totalTeachers;
  const totalClasses = MOCK_SCHOOL.totalClasses;
  const averagePerformance = Math.round(
    MOCK_CLASSES.reduce((sum, cls) => sum + cls.avgPerformance, 0) / MOCK_CLASSES.length
  );
  const classesNeedingAttention = MOCK_CLASSES.filter(cls => cls.avgPerformance < 80).length;

  const handleRefresh = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleViewTeacher = (teacherId: string) => {
    setSelectedTeacher(teacherId);
    // Navigate to teacher details or open modal
  };

  const handleViewObservation = (observationId: string) => {
    // Navigate to observation details
    console.log('View observation:', observationId);
  };

  const handleCreateObservation = () => {
    // Navigate to create observation form
    console.log('Create new observation');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <ContentLoader message="Loading dashboard..." />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Principal Dashboard"
        subtitle={`Welcome back, ${userProfile?.first_name || 'Principal'}`}
        icon={Building2}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
      />

      {/* School Info Card */}
      <SchoolInfoCard school={MOCK_SCHOOL} />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="text-blue-600"
          subtitle="Across all classes"
        />
        <MetricCard
          title="Total Teachers"
          value={totalTeachers}
          icon={GraduationCap}
          color="text-green-600"
          subtitle="Active staff"
        />
        <MetricCard
          title="Total Classes"
          value={totalClasses}
          icon={BookOpen}
          color="text-purple-600"
          subtitle="Active classes"
        />
        <MetricCard
          title="Avg Performance"
          value={`${averagePerformance}%`}
          icon={TrendingUp}
          color="text-orange-600"
          subtitle="School-wide average"
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      {/* Alert for Classes Needing Attention */}
      {classesNeedingAttention > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {classesNeedingAttention} {classesNeedingAttention === 1 ? 'class' : 'classes'} need attention
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Classes with performance below 80% require intervention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observation Reminders - Principal observes Teachers and Classes */}
      <ObservationReminderCard
        dueObservations={MOCK_OBSERVATION_REMINDERS}
        title="Observation Reminders"
        description="Teachers and classes that need observation (Principal observes Teachers and Classes in their school)"
        onViewEntity={(entityId, entityType) => {
          console.log('View entity:', entityId, entityType);
          // Navigate to entity detail view with observation history
        }}
        onCreateObservation={(observationDue) => {
          console.log('Create observation for:', observationDue);
          // Open observation form with context
        }}
      />

      {/* School Observation Summary */}
      <ObservationSummaryCard
        observations={MOCK_OBSERVATIONS}
        entityName={MOCK_SCHOOL.name}
        entityType="school"
        onViewDetails={handleViewObservation}
        onCreateNew={handleCreateObservation}
      />

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Student Growth Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Student Growth Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={MOCK_PERFORMANCE_DATA}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="students" stroke="#8884d8" name="Total Students" />
                    <Line type="monotone" dataKey="completion" stroke="#82ca9d" name="Completion %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Class Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Class Performance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MOCK_CLASS_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="performance" fill="#8884d8" name="Performance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_TEACHERS.map((teacher) => (
              <TeacherCard
                key={teacher.id}
                teacher={teacher}
                onClick={() => handleViewTeacher(teacher.id)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Classes Tab */}
        <TabsContent value="classes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CLASSES.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>Grade {cls.grade}</TableCell>
                      <TableCell>{cls.teacher}</TableCell>
                      <TableCell>{cls.students}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={cls.avgPerformance} className="w-20 h-2" />
                          <span className="text-sm font-medium">{cls.avgPerformance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cls.avgPerformance >= 80 ? 'default' : 'destructive'}>
                          {cls.avgPerformance >= 80 ? 'Good' : 'Needs Attention'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Observation Progress Chart */}
          <ObservationProgressChart
            observations={MOCK_OBSERVATIONS.map(o => ({
              id: o.id,
              observationDate: o.observationDate,
              observationNumber: o.observationNumber,
              overallScore: o.overallScore,
              status: o.status
            }))}
            entityName={MOCK_SCHOOL.name}
          />

          {/* Score Comparison */}
          {MOCK_OBSERVATIONS.length >= 2 && (
            <ObservationScoreComparison
              previousObservation={MOCK_OBSERVATIONS[0]}
              currentObservation={MOCK_OBSERVATIONS[1]}
              entityName={MOCK_SCHOOL.name}
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>School Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Performance</span>
                    <span className="font-semibold">{averagePerformance}%</span>
                  </div>
                  <Progress value={averagePerformance} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Student Engagement</span>
                    <span className="font-semibold">85%</span>
                  </div>
                  <Progress value={85} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Course Completion</span>
                    <span className="font-semibold">78%</span>
                  </div>
                  <Progress value={78} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Students</p>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Teachers</p>
                    <p className="text-2xl font-bold">{totalTeachers}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Classes</p>
                    <p className="text-2xl font-bold">{totalClasses}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Performance</p>
                    <p className="text-2xl font-bold">{averagePerformance}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

