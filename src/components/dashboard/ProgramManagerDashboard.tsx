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
  Briefcase
} from 'lucide-react';
import { MetricCard } from './widgets/MetricCard';
import { ProjectCard } from './widgets/ProjectCard';
import { SchoolInfoCard } from './widgets/SchoolInfoCard';
import { ObservationReminderCard } from './widgets/ObservationReminderCard';
import { ObservationProgressChart } from './widgets/ObservationProgressChart';
import { ObservationScoreComparison } from './widgets/ObservationScoreComparison';
import { DashboardLayout } from './shared/DashboardLayout';
import { DashboardHeader } from './shared/DashboardHeader';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ProgramManagerDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

// MOCK DATA
const MOCK_PROJECTS = [
  {
    id: 'project-1',
    name: 'Urban Education Initiative',
    code: 'UEI-001',
    schoolsCount: 8,
    studentsCount: 3200,
    teachersCount: 185,
    averagePerformance: 85,
    status: 'active' as const,
    location: 'Metropolitan Area'
  },
  {
    id: 'project-2',
    name: 'Rural Schools Program',
    code: 'RSP-002',
    schoolsCount: 12,
    studentsCount: 2800,
    teachersCount: 165,
    averagePerformance: 78,
    status: 'active' as const,
    location: 'Rural Districts'
  },
  {
    id: 'project-3',
    name: 'Coastal Education Network',
    code: 'CEN-003',
    schoolsCount: 6,
    studentsCount: 2100,
    teachersCount: 125,
    averagePerformance: 88,
    status: 'active' as const,
    location: 'Coastal Region'
  }
];

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
  }
];

const MOCK_PROJECT_PERFORMANCE = [
  { name: 'Urban Education', performance: 85, schools: 8, students: 3200 },
  { name: 'Rural Schools', performance: 78, schools: 12, students: 2800 },
  { name: 'Coastal Education', performance: 88, schools: 6, students: 2100 }
];

const MOCK_PERFORMANCE_TREND = [
  { month: 'Jan', avgPerformance: 75 },
  { month: 'Feb', avgPerformance: 78 },
  { month: 'Mar', avgPerformance: 80 },
  { month: 'Apr', avgPerformance: 82 },
  { month: 'May', avgPerformance: 84 }
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

// Mock observation reminders for school officers and projects
// Program Manager observes: School Officers and Projects (multiple projects assigned to them)
const MOCK_OBSERVATION_REMINDERS = [
  {
    id: 'reminder-officer-1',
    entityType: 'principal' as const, // Using principal type for school officer observations
    entityId: 'officer-1',
    entityName: 'Ms. Jennifer Martinez - School Officer',
    lastObservationDate: new Date('2024-03-10'),
    lastObservationNumber: 2,
    nextObservationDue: new Date('2024-06-10'),
    nextObservationNumber: 3,
    status: 'due' as const,
    lastScore: 87
  },
  {
    id: 'reminder-officer-2',
    entityType: 'principal' as const,
    entityId: 'officer-2',
    entityName: 'Mr. David Kim - School Officer',
    lastObservationDate: new Date('2024-02-05'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-05-05'),
    nextObservationNumber: 2,
    status: 'overdue' as const,
    lastScore: 82
  },
  {
    id: 'reminder-project-1',
    entityType: 'project' as const,
    entityId: 'project-1',
    entityName: 'Urban Education Initiative',
    lastObservationDate: new Date('2024-03-15'),
    lastObservationNumber: 2,
    nextObservationDue: new Date('2024-06-15'),
    nextObservationNumber: 3,
    status: 'due' as const,
    lastScore: 85
  },
  {
    id: 'reminder-project-2',
    entityType: 'project' as const,
    entityId: 'project-2',
    entityName: 'Rural Schools Program',
    lastObservationDate: new Date('2024-02-20'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-05-20'),
    nextObservationNumber: 2,
    status: 'overdue' as const,
    lastScore: 78
  },
  {
    id: 'reminder-project-3',
    entityType: 'project' as const,
    entityId: 'project-3',
    entityName: 'STEM Education Initiative',
    lastObservationDate: new Date('2024-04-01'),
    lastObservationNumber: 1,
    nextObservationDue: new Date('2024-07-01'),
    nextObservationNumber: 2,
    status: 'upcoming' as const,
    lastScore: 90
  }
];

const MOCK_PROJECT_OBSERVATIONS = [
  {
    id: 'obs-project-1',
    observationDate: new Date('2024-03-10'),
    observationNumber: 1,
    overallScore: 85,
    status: 'completed' as const,
    keyFindings: ['Strong project management', 'Good school engagement'],
    areasOfStrength: ['Project Management', 'School Engagement'],
    areasForImprovement: ['Resource Allocation', 'Timeline Management'],
    nextObservationDue: new Date('2024-06-10')
  }
];

export const ProgramManagerDashboard = ({ userProfile }: ProgramManagerDashboardProps) => {
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('30days');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Calculate metrics
  const totalProjects = MOCK_PROJECTS.length;
  const totalSchools = MOCK_PROJECTS.reduce((sum, project) => sum + project.schoolsCount, 0);
  const totalStudents = MOCK_PROJECTS.reduce((sum, project) => sum + project.studentsCount, 0);
  const totalTeachers = MOCK_PROJECTS.reduce((sum, project) => sum + project.teachersCount, 0);
  const averagePerformance = Math.round(
    MOCK_PROJECTS.reduce((sum, project) => sum + project.averagePerformance, 0) / MOCK_PROJECTS.length
  );
  const projectsNeedingAttention = MOCK_PROJECTS.filter(p => p.averagePerformance < 80).length;

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleViewProject = (projectId: string) => {
    setSelectedProject(projectId);
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
        title="Program Manager Dashboard"
        subtitle={`Welcome back, ${userProfile?.first_name || 'Program Manager'}`}
        icon={Briefcase}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        onRefresh={handleRefresh}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <MetricCard
          title="Total Projects"
          value={totalProjects}
          icon={Briefcase}
          color="text-blue-600"
          subtitle="Under management"
        />
        <MetricCard
          title="Total Schools"
          value={totalSchools}
          icon={Building2}
          color="text-green-600"
          subtitle="Across all projects"
        />
        <MetricCard
          title="Total Students"
          value={totalStudents}
          icon={Users}
          color="text-purple-600"
          subtitle="All projects combined"
        />
        <MetricCard
          title="Total Teachers"
          value={totalTeachers}
          icon={GraduationCap}
          color="text-orange-600"
          subtitle="Active staff"
        />
        <MetricCard
          title="Avg Performance"
          value={`${averagePerformance}%`}
          icon={TrendingUp}
          color="text-indigo-600"
          subtitle="Program-wide average"
          trend={{ value: 5, isPositive: true }}
        />
      </div>

      {/* Alert for Projects Needing Attention */}
      {projectsNeedingAttention > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  {projectsNeedingAttention} {projectsNeedingAttention === 1 ? 'project' : 'projects'} need attention
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-200">
                  Projects with performance below 80% require intervention
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observation Reminders - Program Manager observes School Officers and Projects */}
      <ObservationReminderCard
        dueObservations={MOCK_OBSERVATION_REMINDERS}
        title="Observation Reminders"
        description="School Officers and projects that need observation (Program Managers observe School Officers and Projects assigned to them)"
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
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="schools">Schools</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Project Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={MOCK_PROJECT_PERFORMANCE}>
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

          {/* Project Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Project Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={MOCK_PROJECT_PERFORMANCE}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, schools }) => `${name}: ${schools} schools`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="schools"
                  >
                    {MOCK_PROJECT_PERFORMANCE.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MOCK_PROJECTS.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onClick={() => handleViewProject(project.id)}
              />
            ))}
          </div>
        </TabsContent>

        {/* Schools Tab */}
        <TabsContent value="schools" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Schools Across Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_SCHOOLS.map((school) => (
                  <SchoolInfoCard key={school.id} school={school} />
                ))}
              </div>
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
                    <span>Average Project Performance</span>
                    <span className="font-semibold">{averagePerformance}%</span>
                  </div>
                  <Progress value={averagePerformance} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Student Engagement</span>
                    <span className="font-semibold">83%</span>
                  </div>
                  <Progress value={83} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Course Completion</span>
                    <span className="font-semibold">77%</span>
                  </div>
                  <Progress value={77} />
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
                    <p className="text-sm text-muted-foreground">Total Projects</p>
                    <p className="text-2xl font-bold">{totalProjects}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Schools</p>
                    <p className="text-2xl font-bold">{totalSchools}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{totalStudents}</p>
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

