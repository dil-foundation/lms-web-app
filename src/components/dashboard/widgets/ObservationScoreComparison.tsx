import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

interface Observation {
  id: string;
  observationDate: Date;
  observationNumber: number;
  overallScore: number;
  keyFindings: string[];
  areasOfStrength: string[];
  areasForImprovement: string[];
}

interface ObservationScoreComparisonProps {
  previousObservation?: Observation;
  currentObservation?: Observation;
  entityName: string;
}

export const ObservationScoreComparison = ({
  previousObservation,
  currentObservation,
  entityName
}: ObservationScoreComparisonProps) => {
  if (!previousObservation && !currentObservation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Observation Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No observations to compare</p>
        </CardContent>
      </Card>
    );
  }

  if (!previousObservation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Observation Comparison - {entityName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">This will be the first observation</p>
            {currentObservation && (
              <div className="mt-4">
                <p className="text-sm font-semibold">Current Observation Score:</p>
                <p className="text-3xl font-bold text-primary">{currentObservation.overallScore}%</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const scoreDifference = currentObservation
    ? currentObservation.overallScore - previousObservation.overallScore
    : 0;
  const percentageChange = previousObservation.overallScore > 0
    ? ((scoreDifference / previousObservation.overallScore) * 100).toFixed(1)
    : '0.0';

  const getTrendIcon = () => {
    if (scoreDifference > 0) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (scoreDifference < 0) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-yellow-600" />;
  };

  const getTrendColor = () => {
    if (scoreDifference > 0) return 'text-green-600';
    if (scoreDifference < 0) return 'text-red-600';
    return 'text-yellow-600';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Observation Comparison - {entityName}</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Compare previous and current observation scores
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Previous Observation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Previous</span>
              <Badge variant="outline">
                Observation #{previousObservation.observationNumber}
              </Badge>
            </div>
            <div className="text-3xl font-bold">{previousObservation.overallScore}%</div>
            <p className="text-xs text-muted-foreground">
              {format(previousObservation.observationDate, 'MMM dd, yyyy')}
            </p>
            <Progress value={previousObservation.overallScore} className="h-2" />
          </div>

          {/* Trend Indicator */}
          <div className="flex items-center justify-center">
            <div className="text-center">
              {getTrendIcon()}
              <div className={`mt-2 font-semibold ${getTrendColor()}`}>
                {scoreDifference > 0 ? '+' : ''}{scoreDifference} points
              </div>
              <div className={`text-sm ${getTrendColor()}`}>
                {percentageChange !== '0.0' && (
                  <span>{scoreDifference > 0 ? '+' : ''}{percentageChange}%</span>
                )}
              </div>
            </div>
          </div>

          {/* Current Observation */}
          {currentObservation ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Current</span>
                <Badge variant="outline">
                  Observation #{currentObservation.observationNumber}
                </Badge>
              </div>
              <div className="text-3xl font-bold text-primary">
                {currentObservation.overallScore}%
              </div>
              <p className="text-xs text-muted-foreground">
                {format(currentObservation.observationDate, 'MMM dd, yyyy')}
              </p>
              <Progress value={currentObservation.overallScore} className="h-2" />
            </div>
          ) : (
            <div className="space-y-2 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <ArrowRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Next observation</p>
              </div>
            </div>
          )}
        </div>

        {/* Areas Comparison */}
        {previousObservation && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            {/* Previous Areas of Strength */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                Previous Strengths
              </h4>
              <div className="flex flex-wrap gap-1">
                {previousObservation.areasOfStrength.map((strength, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    {strength}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Previous Areas for Improvement */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                Previous Areas for Improvement
              </h4>
              <div className="flex flex-wrap gap-1">
                {previousObservation.areasForImprovement.map((area, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                    {area}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Key Findings from Previous */}
        {previousObservation.keyFindings.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Previous Key Findings</h4>
            <ul className="space-y-1 text-sm">
              {previousObservation.keyFindings.map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

