import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Target,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  XCircle,
  ArrowLeft,
  Download,
  Share2,
  Calendar,
  MapPin,
  User,
  BarChart3,
  PieChart,
  Activity,
  Lightbulb,
  Flag,
  ThumbsUp,
  ThumbsDown,
  Star,
} from 'lucide-react';

interface PerformanceReportProps {
  observationData: any; // This would be the submitted form data
  onBack: () => void;
}

// Mock data for demonstration - in real implementation, this would come from the submitted form
const mockReportData = {
  observer: {
    name: "Dr. Sarah Johnson",
    role: "Principal",
    school: "Greenfield Elementary School",
    date: "March 15, 2024",
    teacher: "Ms. Emily Chen",
    lesson: "ENG-G3-L15",
    duration: "45 minutes"
  },
  overallScore: 4.2,
  previousScore: 3.8,
  categories: {
    instruction: { score: 4.5, weight: 30, trend: "up" },
    engagement: { score: 4.2, weight: 25, trend: "up" },
    environment: { score: 4.0, weight: 20, trend: "stable" },
    professionalism: { score: 4.1, weight: 15, trend: "up" },
    resources: { score: 3.8, weight: 10, trend: "down" }
  },
  strengths: [
    "Exceptional student engagement with 95% active participation",
    "Clear learning objectives communicated effectively",
    "Creative use of technology-enhanced learning materials",
    "Strong classroom management and positive learning environment"
  ],
  improvements: [
    "Increase use of differentiated instruction techniques",
    "Implement more frequent formative assessment checks",
    "Enhance physical learning resource availability"
  ],
  tealObservations: {
    videoUsed: true,
    guidingQuestion: true,
    thinkPairShare: true,
    collaborative: true,
    deviceEngagement: 4.3
  }
};

const ScoreCard = ({ title, score, maxScore = 5, trend, subtitle }: {
  title: string;
  score: number;
  maxScore?: number;
  trend?: 'up' | 'down' | 'stable';
  subtitle?: string;
}) => {
  const percentage = (score / maxScore) * 100;
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getScoreColor = () => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="bg-gradient-to-br from-card to-green-500/5">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-sm text-muted-foreground">{title}</h3>
          {trend && getTrendIcon()}
        </div>
        <div className="flex items-baseline space-x-2 mb-2">
          <span className={`text-2xl font-bold ${getScoreColor()}`}>
            {score.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground">/{maxScore}</span>
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mb-3">{subtitle}</p>
        )}
        <Progress value={percentage} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>Poor</span>
          <span>Excellent</span>
        </div>
      </CardContent>
    </Card>
  );
};

const ExecutiveSummary = ({ data }: { data: any }) => (
  <Card className="mb-6">
    <CardHeader>
      <div className="flex items-center gap-3">
        <BarChart3 className="w-6 h-6 text-green-600" />
        <div>
          <CardTitle className="text-xl">Executive Summary</CardTitle>
          <CardDescription>Overall performance assessment and key insights</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
              <Award className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Strong Performance</h3>
              <p className="text-muted-foreground">
                Overall teaching effectiveness demonstrates significant improvement with a score of{' '}
                <span className="font-semibold text-green-600">{data.overallScore}/5.0</span>, 
                representing a {((data.overallScore - data.previousScore) / data.previousScore * 100).toFixed(1)}% 
                increase from the previous observation.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <ThumbsUp className="w-5 h-5 text-blue-600" />
                <span className="font-medium">Key Strengths</span>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Student engagement (95% active participation)</li>
                <li>• Technology integration excellence</li>
                <li>• Clear instructional delivery</li>
              </ul>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-orange-600" />
                <span className="font-medium">Growth Areas</span>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Differentiated instruction</li>
                <li>• Formative assessment frequency</li>
                <li>• Resource optimization</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-4xl font-bold text-green-600 mb-2">{data.overallScore}</div>
            <div className="text-sm font-medium text-green-700 dark:text-green-300">Overall Score</div>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(data.overallScore)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                +{((data.overallScore - data.previousScore) / data.previousScore * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Improvement</div>
              <div className="text-xs text-muted-foreground mt-1">vs. Previous Observation</div>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const ObservationDetails = ({ data }: { data: any }) => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Calendar className="w-5 h-5" />
        Observation Details
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <User className="w-4 h-4" />
            Observer
          </div>
          <div className="font-medium">{data.observer.name}</div>
          <div className="text-sm text-muted-foreground">{data.observer.role}</div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Location
          </div>
          <div className="font-medium">{data.observer.school}</div>
          <div className="text-sm text-muted-foreground">Teacher: {data.observer.teacher}</div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Date & Duration
          </div>
          <div className="font-medium">{data.observer.date}</div>
          <div className="text-sm text-muted-foreground">{data.observer.duration}</div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            Lesson Code
          </div>
          <div className="font-medium">{data.observer.lesson}</div>
          <Badge variant="outline" className="mt-1">TEAL Program</Badge>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PerformanceMetrics = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold flex items-center gap-2">
      <PieChart className="w-5 h-5" />
      Performance Metrics
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {Object.entries(data.categories).map(([key, category]: [string, any]) => (
        <ScoreCard
          key={key}
          title={key.charAt(0).toUpperCase() + key.slice(1)}
          score={category.score}
          trend={category.trend}
          subtitle={`Weight: ${category.weight}%`}
        />
      ))}
    </div>
  </div>
);

const TealAnalysis = ({ data }: { data: any }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-blue-600" />
        TEAL Implementation Analysis
      </CardTitle>
      <CardDescription>Technology Enhanced Active Learning assessment</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          {data.tealObservations.videoUsed ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Video Content</div>
            <div className="text-xs text-muted-foreground">
              {data.tealObservations.videoUsed ? 'Utilized' : 'Not Used'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          {data.tealObservations.guidingQuestion ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Guiding Question</div>
            <div className="text-xs text-muted-foreground">
              {data.tealObservations.guidingQuestion ? 'On Board' : 'Missing'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          {data.tealObservations.thinkPairShare ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Think-Pair-Share</div>
            <div className="text-xs text-muted-foreground">
              {data.tealObservations.thinkPairShare ? 'Conducted' : 'Not Done'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {data.tealObservations.deviceEngagement.toFixed(1)}
            </span>
          </div>
          <div>
            <div className="font-medium text-sm">Device Engagement</div>
            <div className="text-xs text-muted-foreground">Score: {data.tealObservations.deviceEngagement}/5.0</div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium mb-2">TEAL Fidelity Score: 92%</h4>
        <p className="text-sm text-muted-foreground">
          Excellent implementation of TEAL methodology. All core components were observed with high-quality execution. 
          Student device engagement exceeded target benchmarks.
        </p>
      </div>
    </CardContent>
  </Card>
);

const DetailedFindings = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <ThumbsUp className="w-5 h-5" />
            Key Strengths
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.strengths.map((strength: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{strength}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-600">
            <Lightbulb className="w-5 h-5" />
            Improvement Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {data.improvements.map((improvement: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <Flag className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{improvement}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);

const ActionPlan = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Target className="w-5 h-5" />
        Recommended Action Plan
      </CardTitle>
      <CardDescription>Strategic recommendations for continued improvement</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Immediate</Badge>
            <span className="font-medium">0-30 Days</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground ml-4">
            <li>• Schedule professional development session on differentiated instruction</li>
            <li>• Implement formative assessment checkpoints every 10-15 minutes</li>
          </ul>
        </div>
        
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Short-term</Badge>
            <span className="font-medium">1-3 Months</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground ml-4">
            <li>• Collaborate with resource coordinator to enhance material availability</li>
            <li>• Attend TEAL advanced training workshop</li>
            <li>• Establish peer observation partnership</li>
          </ul>
        </div>
        
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Long-term</Badge>
            <span className="font-medium">3-6 Months</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground ml-4">
            <li>• Lead professional learning community on student engagement strategies</li>
            <li>• Mentor new teachers in TEAL implementation</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const PerformanceReport: React.FC<PerformanceReportProps> = ({ observationData, onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  
  // In real implementation, process the observationData here
  const reportData = mockReportData;

  return (
    <div className="space-y-6 mx-auto p-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Assessment Report</h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive analysis and strategic recommendations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Form
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline">
            <Share2 className="w-4 h-4 mr-2" />
            Share Report
          </Button>
        </div>
      </div>

      {/* Executive Summary - Always Visible */}
      <ExecutiveSummary data={reportData} />
      
      {/* Observation Details */}
      <ObservationDetails data={reportData} />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Performance Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="teal">TEAL Assessment</TabsTrigger>
          <TabsTrigger value="action">Action Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PerformanceMetrics data={reportData} />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <DetailedFindings data={reportData} />
        </TabsContent>

        <TabsContent value="teal" className="space-y-6">
          <TealAnalysis data={reportData} />
        </TabsContent>

        <TabsContent value="action" className="space-y-6">
          <ActionPlan />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 