import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';

interface ObservationData {
  id: string;
  observationDate: Date;
  observationNumber: number;
  overallScore: number;
  status: 'completed' | 'in-progress' | 'scheduled';
}

interface ObservationProgressChartProps {
  observations: ObservationData[];
  entityName: string;
  showTrend?: boolean;
}

export const ObservationProgressChart = ({
  observations,
  entityName,
  showTrend = true
}: ObservationProgressChartProps) => {
  // Sort observations by date
  const sortedObservations = [...observations]
    .filter(o => o.status === 'completed')
    .sort((a, b) => a.observationDate.getTime() - b.observationDate.getTime());

  if (sortedObservations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Observation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No completed observations to display
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data
  const chartData = sortedObservations.map(obs => ({
    observation: `Obs #${obs.observationNumber}`,
    date: format(obs.observationDate, 'MMM yyyy'),
    score: obs.overallScore,
    fullDate: obs.observationDate
  }));

  // Calculate trend
  const calculateTrend = () => {
    if (sortedObservations.length < 2) return null;
    
    const firstScore = sortedObservations[0].overallScore;
    const lastScore = sortedObservations[sortedObservations.length - 1].overallScore;
    const difference = lastScore - firstScore;
    const percentageChange = ((difference / firstScore) * 100).toFixed(1);
    
    return {
      value: Math.abs(parseFloat(percentageChange)),
      isPositive: difference > 0,
      isNeutral: difference === 0,
      difference
    };
  };

  const trend = calculateTrend();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Observation Progress - {entityName}</CardTitle>
          {showTrend && trend && (
            <div className="flex items-center gap-2">
              {trend.isNeutral ? (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Minus className="h-4 w-4" />
                  <span className="text-sm">No change</span>
                </div>
              ) : (
                <div className={`flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {trend.isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {trend.isPositive ? '+' : '-'}{trend.value}%
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({trend.difference > 0 ? '+' : ''}{trend.difference} points)
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="observation" 
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg p-3 shadow-lg">
                      <p className="font-semibold">{data.observation}</p>
                      <p className="text-sm text-muted-foreground">{data.date}</p>
                      <p className="text-lg font-bold text-primary">{data.score}%</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#8884d8" 
              strokeWidth={3}
              name="Score %"
              dot={{ r: 6, fill: '#8884d8' }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Observation details below chart */}
        <div className="mt-4 space-y-2">
          {sortedObservations.map((obs, index) => (
            <div key={obs.id} className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Observation #{obs.observationNumber}</span>
                <span className="text-muted-foreground">
                  {format(obs.observationDate, 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{obs.overallScore}%</span>
                {index > 0 && (
                  <span className={`text-xs ${
                    obs.overallScore > sortedObservations[index - 1].overallScore
                      ? 'text-green-600'
                      : obs.overallScore < sortedObservations[index - 1].overallScore
                      ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}>
                    {obs.overallScore > sortedObservations[index - 1].overallScore ? '↑' : 
                     obs.overallScore < sortedObservations[index - 1].overallScore ? '↓' : '→'}
                    {Math.abs(obs.overallScore - sortedObservations[index - 1].overallScore)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

