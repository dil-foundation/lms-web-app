import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ContentLoader } from '@/components/ContentLoader';
import { 
  ClipboardCheck,
  FileText,
  Calendar,
  CheckCircle,
  Clock,
  AlertTriangle,
  Eye,
  Plus
} from 'lucide-react';
import { ObservationSummaryCard } from './widgets/ObservationSummaryCard';
import { DashboardLayout } from './shared/DashboardLayout';
import { DashboardHeader } from './shared/DashboardHeader';
import { format } from 'date-fns';

interface ECEObserverDashboardProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
}

// MOCK DATA
const MOCK_OBSERVATIONS = [
  {
    id: 'obs-1',
    entityType: 'school' as const,
    entityName: 'Greenwood Elementary School',
    entityId: 'school-1',
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
    entityType: 'school' as const,
    entityName: 'Greenwood Elementary School',
    entityId: 'school-1',
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
  },
  {
    id: 'obs-3',
    entityType: 'class' as const,
    entityName: 'Grade 1-A',
    entityId: 'class-1',
    observationDate: new Date('2024-02-10'),
    observationNumber: 1,
    overallScore: 79,
    status: 'completed' as const,
    keyFindings: [
      'Good classroom management',
      'Age-appropriate activities'
    ],
    areasOfStrength: ['Classroom Management', 'Activity Design'],
    areasForImprovement: ['Student Assessment', 'Individual Attention'],
    nextObservationDue: new Date('2024-05-10')
  },
  {
    id: 'obs-4',
    entityType: 'teacher' as const,
    entityName: 'Ms. Emily Davis',
    entityId: 'teacher-1',
    observationDate: new Date('2024-03-05'),
    observationNumber: 1,
    overallScore: 88,
    status: 'completed' as const,
    keyFindings: [
      'Excellent teaching methodology',
      'Strong student-teacher rapport'
    ],
    areasOfStrength: ['Teaching Methodology', 'Student Rapport', 'Lesson Planning'],
    areasForImprovement: ['Use of Technology'],
    nextObservationDue: new Date('2024-06-05')
  },
  {
    id: 'obs-5',
    entityType: 'school' as const,
    entityName: 'Riverside Middle School',
    entityId: 'school-2',
    observationDate: new Date('2024-05-12'),
    observationNumber: 1,
    overallScore: 75,
    status: 'in-progress' as const,
    keyFindings: [],
    areasOfStrength: [],
    areasForImprovement: [],
    nextObservationDue: undefined
  }
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'in-progress':
      return <Clock className="h-4 w-4 text-yellow-600" />;
    case 'scheduled':
      return <Calendar className="h-4 w-4 text-blue-600" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-gray-600" />;
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
  return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
};

export const ECEObserverDashboard = ({ userProfile }: ECEObserverDashboardProps) => {
  const [loading, setLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);

  // Group observations by entity
  const observationsByEntity = MOCK_OBSERVATIONS.reduce((acc, obs) => {
    const key = `${obs.entityType}-${obs.entityId}`;
    if (!acc[key]) {
      acc[key] = {
        entityType: obs.entityType,
        entityId: obs.entityId,
        entityName: obs.entityName,
        observations: []
      };
    }
    acc[key].observations.push(obs);
    return acc;
  }, {} as Record<string, { entityType: string; entityId: string; entityName: string; observations: typeof MOCK_OBSERVATIONS }>);

  const entities = Object.values(observationsByEntity);

  // Calculate stats
  const totalObservations = MOCK_OBSERVATIONS.length;
  const completedObservations = MOCK_OBSERVATIONS.filter(o => o.status === 'completed').length;
  const inProgressObservations = MOCK_OBSERVATIONS.filter(o => o.status === 'in-progress').length;
  const scheduledObservations = MOCK_OBSERVATIONS.filter(o => o.status === 'scheduled').length;
  const averageScore = Math.round(
    MOCK_OBSERVATIONS
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + o.overallScore, 0) / completedObservations
  );

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleViewObservation = (observationId: string) => {
    console.log('View observation:', observationId);
  };

  const handleCreateObservation = () => {
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
        title="ECE Observer Dashboard"
        subtitle={`Welcome back, ${userProfile?.first_name || 'Observer'}`}
        icon={ClipboardCheck}
        onRefresh={handleRefresh}
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Observations</CardTitle>
            <FileText className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalObservations}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedObservations}</div>
            <p className="text-xs text-muted-foreground">Finished reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressObservations}</div>
            <p className="text-xs text-muted-foreground">Active observations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}%</div>
            <p className="text-xs text-muted-foreground">Completed observations</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">Create a new observation report</p>
            </div>
            <Button onClick={handleCreateObservation}>
              <Plus className="h-4 w-4 mr-2" />
              New Observation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Section */}
      <Tabs defaultValue="entities" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entities">By Entity</TabsTrigger>
          <TabsTrigger value="all">All Observations</TabsTrigger>
        </TabsList>

        {/* By Entity Tab */}
        <TabsContent value="entities" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {entities.map((entity) => (
              <ObservationSummaryCard
                key={`${entity.entityType}-${entity.entityId}`}
                observations={entity.observations}
                entityName={entity.entityName}
                entityType={entity.entityType as 'school' | 'class' | 'teacher'}
                onViewDetails={handleViewObservation}
                onCreateNew={handleCreateObservation}
              />
            ))}
          </div>
        </TabsContent>

        {/* All Observations Tab */}
        <TabsContent value="all" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Observation Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Observation #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_OBSERVATIONS.map((obs) => (
                    <TableRow key={obs.id}>
                      <TableCell className="font-medium">{obs.entityName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {obs.entityType}
                        </Badge>
                      </TableCell>
                      <TableCell>#{obs.observationNumber}</TableCell>
                      <TableCell>{format(obs.observationDate, 'MMM dd, yyyy')}</TableCell>
                      <TableCell>
                        <Badge className={getScoreColor(obs.overallScore)}>
                          {obs.overallScore}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(obs.status)}
                          <span className="capitalize">{obs.status.replace('-', ' ')}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewObservation(obs.id)}>
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
      </Tabs>
    </DashboardLayout>
  );
};

