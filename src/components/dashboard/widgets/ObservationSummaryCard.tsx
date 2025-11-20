import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, FileText, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ObservationResult {
  id: string;
  observationDate: Date;
  observationNumber: number; // 1, 2, 3, or 4
  overallScore: number;
  status: 'completed' | 'in-progress' | 'scheduled';
  keyFindings: string[];
  areasOfStrength: string[];
  areasForImprovement: string[];
  nextObservationDue?: Date;
}

interface ObservationSummaryCardProps {
  observations: ObservationResult[];
  entityName: string;
  entityType: 'school' | 'class' | 'teacher' | 'principal' | 'project';
  onViewDetails?: (observationId: string) => void;
  onCreateNew?: () => void;
}

export const ObservationSummaryCard = ({ 
  observations, 
  entityName, 
  entityType,
  onViewDetails,
  onCreateNew 
}: ObservationSummaryCardProps) => {
  const latestObservation = observations.length > 0 
    ? observations.sort((a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime())[0]
    : null;

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

  const getNextObservationNumber = () => {
    if (observations.length === 0) return 1;
    const maxNumber = Math.max(...observations.map(o => o.observationNumber));
    return maxNumber < 4 ? maxNumber + 1 : null; // Max 4 observations per year
  };

  const nextObservationNumber = getNextObservationNumber();

  return (
    <Card className="hover:shadow-lg transition-all duration-300">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Observation Reports
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {entityType.charAt(0).toUpperCase() + entityType.slice(1)}: {entityName}
            </p>
          </div>
          {nextObservationNumber && (
            <Button size="sm" onClick={onCreateNew}>
              New Observation
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latestObservation ? (
          <>
            {/* Latest Observation Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(latestObservation.status)}
                  <span className="font-semibold">
                    Observation #{latestObservation.observationNumber}
                  </span>
                  <Badge className={getScoreColor(latestObservation.overallScore)}>
                    {latestObservation.overallScore}%
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(latestObservation.observationDate), 'MMM dd, yyyy')}
                </span>
              </div>

              {/* Key Findings */}
              {latestObservation.keyFindings.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Key Findings:</p>
                  <ul className="text-sm space-y-1">
                    {latestObservation.keyFindings.slice(0, 3).map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Areas of Strength */}
              {latestObservation.areasOfStrength.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    Strengths:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {latestObservation.areasOfStrength.slice(0, 3).map((strength, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                        {strength}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {latestObservation.areasForImprovement.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Areas for Improvement:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {latestObservation.areasForImprovement.slice(0, 3).map((area, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                        {area}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {onViewDetails && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => onViewDetails(latestObservation.id)}
                >
                  View Full Report
                </Button>
              )}
            </div>

            {/* Observation History */}
            {observations.length > 1 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-2">Observation History ({observations.length})</p>
                <div className="space-y-2">
                  {observations
                    .sort((a, b) => new Date(b.observationDate).getTime() - new Date(a.observationDate).getTime())
                    .slice(0, 3)
                    .map((obs) => (
                      <div 
                        key={obs.id} 
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                        onClick={() => onViewDetails?.(obs.id)}
                      >
                        <div className="flex items-center gap-2">
                          {getStatusIcon(obs.status)}
                          <span className="text-sm">
                            Observation #{obs.observationNumber} - {format(new Date(obs.observationDate), 'MMM yyyy')}
                          </span>
                        </div>
                        <Badge className={getScoreColor(obs.overallScore)}>
                          {obs.overallScore}%
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Next Observation Due */}
            {latestObservation.nextObservationDue && (
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Next observation due:</span>
                  <span className="font-semibold">
                    {format(new Date(latestObservation.nextObservationDue), 'MMM dd, yyyy')}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              No observations recorded yet for this {entityType}.
            </p>
            {onCreateNew && (
              <Button onClick={onCreateNew}>
                Create First Observation
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

