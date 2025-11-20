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
  Eye,
  UserCheck
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

interface SchoolOfficerDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

// MOCK DATA
const MOCK_SCHOOLS = [
  {
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
  },
  {
    id: 'school-2',
    name: 'Riverside Middle School',
    code: 'RMS-002',
    schoolType: 'Public',
    address: '456 Learning Avenue, City, Country',
    phone: '+1-234-567-8901',
    email: 'info@riverside.edu',
    principalName: 'Mr. James Wilson',
    totalStudents: 620,
    totalTeachers: 42,
    totalClasses: 24,
    status: 'active' as const
  },
  {
    id: 'school-3',
    name: 'Sunset High School',
    code: 'SHS-003',
    schoolType: 'Public',
    address: '789 Knowledge Road, City, Country',
    phone: '+1-234-567-8902',
    email: 'info@sunset.edu',
    principalName: 'Ms. Emily Davis',
    totalStudents: 850,
    totalTeachers: 55,
    totalClasses: 32,
    status: 'active' as const
  }
];

const MOCK_PRINCIPALS = [
  {
    id: 'principal-1',
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.johnson@greenwood.edu',
    schoolName: 'Greenwood Elementary School',
    schoolsManaged: 1,
    totalStudents: 450,
    totalTeachers: 28,
    averagePerformance: 87,
    status: 'active' as const
  },
  {
    id: 'principal-2',
    firstName: 'James',
    lastName: 'Wilson',
    email: 'james.wilson@riverside.edu',
    schoolName: 'Riverside Middle School',
    schoolsManaged: 1,
    totalStudents: 620,
    totalTeachers: 42,
    averagePerformance: 82,
    status: 'active' as const
  },
  {
    id: 'principal-3',
    firstName: 'Emily',
    lastName: 'Davis',
    email: 'emily.davis@sunset.edu',
    schoolName: 'Sunset High School',
    schoolsManaged: 1,
    totalStudents: 850,
    totalTeachers: 55,
    averagePerformance: 91,
    status: 'active' as const
  }
];

const MOCK_SCHOOL_PERFORMANCE = [
  { name: 'Greenwood Elementary', performance: 87, students: 450, teachers: 28 },
  { name: 'Riverside Middle', performance: 82, students: 620, teachers: 42 },
  { name: 'Sunset High', performance: 91, students: 850, teachers: 55 }
];

const MOCK_PERFORMANCE_TREND = [
  { month: 'Jan', avgPerformance: 80 },
  { month: 'Feb', avgPerformance: 82 },
  { month: 'Mar', avgPerformance: 84 },
  { month: 'Apr', avgPerformance: 86 },
  { month: 'May', avgPerformance: 87 }
];

// Mock observation reminders for principals and schools
const MOCK_OBSERVATION_REMINDERS = [
  {
    id: 'reminder-1',
    entityType: 'principal' as const,
    entityId: 'principal-1',
    entityName: 'Dr. Sarah Johnson',
    lastObservationDate: new Date('2024-03-15'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-06-15'),
    nextObservationNumber: 2,
    status: 'due' as const,
    lastScore: 85
  },
  {
    id: 'reminder-2',
    entityType: 'school' as const,
    entityId: 'school-1',
    entityName: 'Greenwood Elementary School',
    lastObservationDate: new Date('2024-02-20'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-05-20'),
    nextObservationNumber: 2,
    status: 'overdue' as const,
    lastScore: 82
  },
  {
    id: 'reminder-3',
    entityType: 'school' as const,
    entityId: 'school-2',
    entityName: 'Riverside Middle School',
    lastObservationDate: new Date('2024-04-10'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-07-10'),
    nextObservationNumber: 2,
    status: 'upcoming' as const,
    lastScore: 80
  }
];

const MOCK_SCHOOL_OBSERVATIONS = [
  {
    id: 'obs-school-1',
    observationDate: new Date('2024-02-20'),
    observationNumber: 1,
    overallScore: 82,
    status: 'completed' as const,
    keyFindings: ['Good overall school management', 'Strong teacher collaboration'],
    areasOfStrength: ['School Management', 'Teacher Collaboration'],
    areasForImprovement: ['Student Engagement', 'Parent Communication'],
    nextObservationDue: new Date('2024-05-20')
  }
];

export const SchoolOfficerDashboard = ({ userProfile }: SchoolOfficerDashboardProps) => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedSchool, setSelectedSchool] = useState<string | null>(null);

  // Calculate metrics
  const totalSchools = MOCK_SCHOOLS.length;
  const totalStudents = MOCK_SCHOOLS.reduce((sum, school) => sum + school.totalStudents, 0);
  const totalTeachers = MOCK_SCHOOLS.reduce((sum, school) => sum + school.totalTeachers, 0);
  const totalClasses = MOCK_SCHOOLS.reduce((sum, school) => sum + school.totalClasses, 0);
  const averagePerformance = Math.round(
    MOCK_SCHOOL_PERFORMANCE.reduce((sum, school) => sum + school.performance, 0) / MOCK_SCHOOL_PERFORMANCE.length
  );
  const schoolsNeedingAttention = MOCK_SCHOOL_PERFORMANCE.filter(s => s.performance < 85).length;

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleViewSchool = (schoolId: string) => {
    setSelectedSchool(schoolId);
  };

  const handleViewPrincipal = (principalId: string) => {
    console.log('View principal:', principalId);
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
        title="School Officer Dashboard"
        subtitle={`Welcome back, ${userProfile?.first_name || 'School Officer'}`}
        icon={UserCheck}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Schools"
          value={totalSchools}
          icon={Building2}
          color="text-blue-600"
          subtitle="Under management"
        />
        <MetricCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="text-green-600"
          subtitle="Across all schools"
        />
        <MetricCard
          title="Total Teachers"
          value={totalTeachers}
          icon={GraduationCap}
          color="text-purple-600"
          subtitle="Active staff"
        />
        <MetricCard
          title="Total Classes"
          value={totalClasses}
          icon={BookOpen}
          color="text-orange-600"
          subtitle="Active classes"
        />
        <MetricCard
          title="Avg Performance"
          value={`${averagePerformance}%`}
          icon={TrendingUp}
          color="text-indigo-600"
          subtitle="School-wide average"
          trend={{ value: 3, isPositive: true }}
        />
      </div>

      {/* Alert for Schools Needing Attention */}
      {schoolsNeedingAttention > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {schoolsNeedingAttention} {schoolsNeedingAttention === 1 ? 'school' : 'schools'} need attention
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Schools with performance below 85% require intervention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observation Reminders - School Officer observes Principals and Schools */}
      <ObservationReminderCard
        dueObservations={MOCK_OBSERVATION_REMINDERS}
        title="Observation Reminders"
        description="Principals and schools that need observation (School Officers observe Principals and Schools under their management)"
        onViewEntity={(entityId, entityType) => {
          console.log('View entity:', entityId, entityType);
          // Navigate to entity detail view with observation history
        }}
        onCreateObservation={(observationDue) => {
          console.log('Create observation for:', observationDue);
          // Open observation form with context
        }}
      />

      {/* Tabs Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="principals">Principals</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* School Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  School Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MOCK_SCHOOL_PERFORMANCE}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="performance" fill="#8884d8" name="Performance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Average Performance Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={MOCK_PERFORMANCE_TREND}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgPerformance" stroke="#82ca9d" strokeWidth={2} name="Avg Performance %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_SCHOOLS.map((school) => (
              <SchoolInfoCard
                key={school.id}
                school={school}
              />
            ))}
          </div>
        </TabsContent>

        {/* Principals Tab */}
        <TabsContent value="principals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Principals Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Principal</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Teachers</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PRINCIPALS.map((principal) => (
                    <TableRow key={principal.id}>
                      <TableCell className="font-medium">
                        {principal.firstName} {principal.lastName}
                      </TableCell>
                      <TableCell>{principal.schoolName}</TableCell>
                      <TableCell>{principal.totalStudents}</TableCell>
                      <TableCell>{principal.totalTeachers}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={principal.averagePerformance} className="w-20 h-2" />
                          <span className="text-sm font-medium">{principal.averagePerformance}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={principal.status === 'active' ? 'default' : 'secondary'}>
                          {principal.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewPrincipal(principal.id)}>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Overall Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Average School Performance</span>
                    <span className="font-semibold">{averagePerformance}%</span>
                  </div>
                  <Progress value={averagePerformance} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Student Engagement</span>
                    <span className="font-semibold">84%</span>
                  </div>
                  <Progress value={84} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Course Completion</span>
                    <span className="font-semibold">79%</span>
                  </div>
                  <Progress value={79} />
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
                    <p className="text-sm text-muted-foreground">Total Schools</p>
                    <p className="text-2xl font-bold">{totalSchools}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{totalStudents}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Teachers</p>
                    <p className="text-2xl font-bold">{totalTeachers}</p>
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

