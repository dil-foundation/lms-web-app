import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, AlertTriangle, CheckCircle, ArrowRight, Plus } from 'lucide-react';
import { format, isPast, isBefore, addDays, differenceInDays } from 'date-fns';

interface ObservationDue {
  id: string;
  entityType: 'school' | 'class' | 'teacher' | 'principal' | 'project' | 'school_officer';
  entityId: string;
  entityName: string;
  lastObservationDate?: Date;
  lastObservationNumber?: number;
  nextObservationDue: Date;
  nextObservationNumber: number;
  status: 'due' | 'upcoming' | 'overdue';
  lastScore?: number;
}

interface ObservationReminderCardProps {
  dueObservations: ObservationDue[];
  onViewEntity?: (entityId: string, entityType: string) => void;
  onCreateObservation?: (observationDue: ObservationDue) => void;
  title?: string;
  description?: string;
}

export const ObservationReminderCard = ({
  dueObservations,
  onViewEntity,
  onCreateObservation,
  title = "Observation Reminders",
  description = "Observations that are due or upcoming"
}: ObservationReminderCardProps) => {
  const overdueCount = dueObservations.filter(o => o.status === 'overdue').length;
  const dueCount = dueObservations.filter(o => o.status === 'due').length;
  const upcomingCount = dueObservations.filter(o => o.status === 'upcoming').length;
  const totalCount = dueObservations.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'due':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'due':
        return <Clock className="h-4 w-4" />;
      case 'upcoming':
        return <Calendar className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const days = differenceInDays(dueDate, new Date());
    if (days < 0) return `Overdue by ${Math.abs(days)} days`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `Due in ${days} days`;
  };

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No observations due at this time
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            {overdueCount > 0 && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {overdueCount} Overdue
              </Badge>
            )}
            {dueCount > 0 && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
                {dueCount} Due
              </Badge>
            )}
            {upcomingCount > 0 && (
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                {upcomingCount} Upcoming
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Alert for overdue observations */}
        {overdueCount > 0 && (
          <Alert className="border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800 dark:text-red-200">
              <strong>{overdueCount}</strong> observation{overdueCount !== 1 ? 's' : ''} {overdueCount === 1 ? 'is' : 'are'} overdue and require immediate attention.
            </AlertDescription>
          </Alert>
        )}

        {/* List of due observations */}
        <div className="space-y-3">
          {dueObservations
            .sort((a, b) => {
              // Sort: overdue first, then due, then upcoming
              const statusOrder = { overdue: 0, due: 1, upcoming: 2 };
              if (statusOrder[a.status] !== statusOrder[b.status]) {
                return statusOrder[a.status] - statusOrder[b.status];
              }
              // Then sort by due date
              return a.nextObservationDue.getTime() - b.nextObservationDue.getTime();
            })
            .map((observation) => (
              <div
                key={observation.id}
                className={`p-4 rounded-lg border-2 transition-all ${
                  observation.status === 'overdue'
                    ? 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
                    : observation.status === 'due'
                    ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800'
                    : 'border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(observation.status)}
                      <h4 className="font-semibold">{observation.entityName}</h4>
                      <Badge className={getStatusColor(observation.status)}>
                        {observation.status.charAt(0).toUpperCase() + observation.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        <span>{getDaysUntilDue(observation.nextObservationDue)}</span>
                        <span className="text-xs">
                          ({format(observation.nextObservationDue, 'MMM dd, yyyy')})
                        </span>
                      </div>
                      
                      {observation.lastObservationDate && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            Last: Observation #{observation.lastObservationNumber} on{' '}
                            {format(observation.lastObservationDate, 'MMM dd, yyyy')}
                            {observation.lastScore !== undefined && (
                              <span className="ml-2 font-semibold text-foreground">
                                ({observation.lastScore}%)
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground capitalize">
                        Type: {observation.entityType}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 ml-4">
                    {onViewEntity && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewEntity(observation.entityId, observation.entityType)}
                      >
                        <ArrowRight className="h-3 w-3 mr-1" />
                        View History
                      </Button>
                    )}
                    {onCreateObservation && (
                      <Button
                        size="sm"
                        onClick={() => onCreateObservation(observation)}
                        className={
                          observation.status === 'overdue'
                            ? 'bg-red-600 hover:bg-red-700'
                            : observation.status === 'due'
                            ? 'bg-amber-600 hover:bg-amber-700'
                            : ''
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Create Observation #{observation.nextObservationNumber}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};

