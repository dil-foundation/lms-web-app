import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PerformanceReportProps {
  observationData: any; // This would be the submitted form data or report ID
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
  showTealObservations: true, // Added to control TEAL tab visibility
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

const ExecutiveSummary = ({ data }: { data: any }) => {
  // Handle both new data structure from form submission and legacy mock data
  const overall = data.overall || {};
  const overallScore = overall.score || data.overallScore || 4.0;
  const previousScore = data.previousScore || 3.5;
  const improvementPercent = ((overallScore - previousScore) / previousScore * 100).toFixed(1);
  const strengths = data.strengths || [];
  const improvements = data.improvements || [];

  return (
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
                <h3 className="text-lg font-semibold">
                  {overallScore >= 4.0 ? 'Strong Performance' : overallScore >= 3.0 ? 'Good Performance' : 'Developing Performance'}
                </h3>
              <p className="text-muted-foreground">
                  Overall teaching effectiveness shows a score of{' '}
                  <span className="font-semibold text-green-600">{overallScore.toFixed(1)}/5.0</span>
                  {previousScore && (
                    <>
                      , representing a {improvementPercent}% 
                      {parseFloat(improvementPercent) >= 0 ? 'increase' : 'change'} from the previous observation.
                    </>
                  )}
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
                {strengths.length > 0 ? (
                  strengths.slice(0, 3).map((strength: string, index: number) => (
                    <li key={index}>• {strength.length > 40 ? strength.substring(0, 40) + '...' : strength}</li>
                  ))
                ) : (
                  <li>• No specific strengths noted</li>
                )}
              </ul>
            </div>
            
            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 text-orange-600" />
                <span className="font-medium">Growth Areas</span>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {improvements.length > 0 ? (
                  improvements.slice(0, 3).map((improvement: string, index: number) => (
                    <li key={index}>• {improvement.length > 40 ? improvement.substring(0, 40) + '...' : improvement}</li>
                  ))
                ) : (
                  <li>• No specific improvements noted</li>
                )}
              </ul>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-4xl font-bold text-green-600 mb-2">{overallScore.toFixed(1)}</div>
            <div className="text-sm font-medium text-green-700 dark:text-green-300">Overall Score</div>
            <div className="flex justify-center mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${
                    star <= Math.round(overallScore)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {previousScore && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                  {parseFloat(improvementPercent) >= 0 ? '+' : ''}{improvementPercent}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {parseFloat(improvementPercent) >= 0 ? 'Improvement' : 'Change'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">vs. Previous Observation</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
);
};

const ObservationDetails = ({ data }: { data: any }) => {
  // Handle both new data structure from form submission and legacy mock data
  const observer = data.observer || {};
  const school = data.school || {};
  const teacher = data.teacher || {};
  const lesson = data.lesson || {};
  const project = data.project || {};

  return (
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
            <div className="font-medium">{observer.name || 'N/A'}</div>
            <div className="text-sm text-muted-foreground capitalize">
              {observer.role ? observer.role.replace('-', ' ') : 'N/A'}
            </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            Location
          </div>
            <div className="font-medium">{school.name || observer.school || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">
              Teacher: {teacher.name || observer.teacher || 'N/A'}
            </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            Date & Duration
          </div>
            <div className="font-medium">{lesson.date || observer.date || 'N/A'}</div>
            <div className="text-sm text-muted-foreground">
              {lesson.startTime && lesson.endTime 
                ? `${lesson.startTime} - ${lesson.endTime}`
                : observer.duration || 'N/A'
              }
            </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            Lesson Code
          </div>
            <div className="font-medium">{lesson.code || observer.lesson || 'N/A'}</div>
            <Badge variant="outline" className="mt-1">
              {project.name || 'N/A'}
            </Badge>
          </div>
      </div>
    </CardContent>
  </Card>
);
};

const PerformanceMetrics = ({ data }: { data: any }) => {
  // Handle both new data structure from form submission and legacy mock data
  const categories = data.categories || {};

  return (
  <div className="space-y-6">
    <h2 className="text-xl font-semibold flex items-center gap-2">
      <PieChart className="w-5 h-5" />
      Performance Metrics
    </h2>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Object.entries(categories).map(([key, category]: [string, any]) => (
        <ScoreCard
          key={key}
          title={key.charAt(0).toUpperCase() + key.slice(1)}
            score={category?.score || 0}
            trend={category?.trend || 'stable'}
            subtitle={`Weight: ${category?.weight || 0}%`}
        />
      ))}
    </div>
      
      {Object.keys(categories).length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <PieChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No performance metrics available</p>
        </div>
      )}
  </div>
);
};

const TealAnalysis = ({ data }: { data: any }) => {
  // Handle both new data structure from form submission and legacy mock data
  const tealObservations = data.tealObservations || {};

  return (
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
            {tealObservations.videoUsed ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Video Content</div>
            <div className="text-xs text-muted-foreground">
                {tealObservations.videoUsed ? 'Utilized' : 'Not Used'}
              </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          {tealObservations.guidingQuestion ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Guiding Question</div>
            <div className="text-xs text-muted-foreground">
              {tealObservations.guidingQuestion ? 'On Board' : 'Missing'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          {tealObservations.thinkPairShare ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600" />
          )}
          <div>
            <div className="font-medium text-sm">Think-Pair-Share</div>
            <div className="text-xs text-muted-foreground">
              {tealObservations.thinkPairShare ? 'Conducted' : 'Not Done'}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 border rounded-lg">
          <div className="w-5 h-5 rounded-full bg-green-600 flex items-center justify-center">
            <span className="text-xs text-white font-bold">
              {(tealObservations.deviceEngagement || 0).toFixed(1)}
            </span>
          </div>
          <div>
            <div className="font-medium text-sm">Device Engagement</div>
            <div className="text-xs text-muted-foreground">
              Score: {(tealObservations.deviceEngagement || 0).toFixed(1)}/5.0
            </div>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
        <h4 className="font-medium mb-2">
          TEAL Fidelity Score: {
            Object.keys(tealObservations).length > 0 
              ? `${Math.round(Object.values(tealObservations).filter(v => v === true).length / 4 * 100)}%`
              : 'N/A'
          }
        </h4>
        <p className="text-sm text-muted-foreground">
          {Object.keys(tealObservations).length > 0 
            ? `TEAL methodology implementation with ${Object.values(tealObservations).filter(v => v === true).length} out of 4 core components observed.`
            : 'No TEAL observations data available for this report.'
          }
        </p>
      </div>
    </CardContent>
  </Card>
);
};

const DetailedFindings = ({ data }: { data: any }) => {
  // Handle both new data structure from form submission and legacy mock data
  const strengths = data.strengths || [];
  const improvements = data.improvements || [];

  return (
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
              {strengths.length > 0 ? (
                strengths.map((strength: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{strength}</span>
              </li>
                ))
              ) : (
                <li className="flex items-start gap-3 text-muted-foreground">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">No specific strengths documented in this observation</span>
                </li>
              )}
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
              {improvements.length > 0 ? (
                improvements.map((improvement: string, index: number) => (
              <li key={index} className="flex items-start gap-3">
                <Flag className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{improvement}</span>
              </li>
                ))
              ) : (
                <li className="flex items-start gap-3 text-muted-foreground">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">No specific improvement areas documented in this observation</span>
                </li>
              )}
          </ul>
        </CardContent>
      </Card>
    </div>
  </div>
);
};

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

// API function to fetch report by ID - Updated to use database
const fetchReportById = async (reportId: string): Promise<any> => {
  try {
    // Import the service and supabase client
    const { default: ObservationReportsService } = await import('@/services/observationReportsService');
    const { supabase } = await import('@/integrations/supabase/client');
    
    // Get current user from supabase session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user?.id) {
      console.log('No authenticated user found, will use fallback data');
      return null;
    }
    
    const userId = session.user.id;
    const report = await ObservationReportsService.getReportById(reportId, userId);
    
    if (!report) {
      console.log('Report not found, will use fallback data');
      return null; // Will trigger fallback to mock data or error handling
    }

    // Transform database report to expected format
    return {
      reportId: report.id,
      submissionDate: report.created_at,
      
      // Observer information
      observer: {
        name: report.observer_name,
        role: report.observer_role,
        school: report.school_name,
        date: report.observation_date,
        teacher: report.teacher_name,
        lesson: report.lesson_code,
        duration: `${report.start_time} - ${report.end_time}`
      },
      
      // Basic fields
      overallScore: report.overall_score / 20, // Convert from 0-100 to 0-5 scale for display
      showTealObservations: report.show_teal_observations,
      
      // Extract data from form_data JSON
      school: {
        name: report.school_name,
        location: 'Location not specified'
      },
      
      teacher: {
        name: report.teacher_name,
        qualification: report.form_data?.teacherQualification || 'Not specified',
        joiningDate: report.form_data?.teacherJoiningDate || 'Not specified'
      },
      
      lesson: {
        code: report.lesson_code,
        date: report.observation_date,
        startTime: report.start_time,
        endTime: report.end_time,
        subject: 'General Instruction'
      },
      
      project: {
        name: report.project_name,
        association: report.form_data?.projectAssociation || 'Not specified',
        quarter: report.form_data?.quarter || 'Not specified'
      },
      
      // Calculate performance categories from form data
      categories: {
        instruction: {
          score: report.form_data?.clearInstructions ? parseInt(report.form_data.clearInstructions) : 3,
          weight: 25,
          trend: 'up',
          items: [
            { name: 'Clear Instructions', score: report.form_data?.clearInstructions ? parseInt(report.form_data.clearInstructions) * 20 : 60 },
            { name: 'Lesson Adherence', score: report.form_data?.lessonAdherence ? parseInt(report.form_data.lessonAdherence) * 20 : 60 }
          ]
        },
        engagement: {
          score: report.form_data?.studentEngagement ? parseInt(report.form_data.studentEngagement) : 3.5,
          weight: 30,
          trend: 'up',
          items: [
            { name: 'Student Engagement', score: report.form_data?.studentEngagement ? parseInt(report.form_data.studentEngagement) * 20 : 70 },
            { name: 'Emotional Engagement', score: 75 }
          ]
        },
        environment: {
          score: report.form_data?.classroomDisplays ? parseInt(report.form_data.classroomDisplays) : 3.2,
          weight: 20,
          trend: 'stable',
          items: [
            { name: 'Classroom Displays', score: report.form_data?.classroomDisplays ? parseInt(report.form_data.classroomDisplays) * 20 : 65 },
            { name: 'Learning Environment', score: report.form_data?.environmentRating ? 80 : 65 }
          ]
        },
        resources: {
          score: 3.5,
          weight: 15,
          trend: 'up',
          items: [
            { name: 'Material Usage', score: 70 },
            { name: 'Technology Integration', score: 75 }
          ]
        },
        fidelity: {
          score: report.form_data?.fidelityScore ? parseInt(report.form_data.fidelityScore) : 4,
          weight: 10,
          trend: 'up',
          items: [
            { name: 'Program Fidelity', score: report.form_data?.fidelityScore ? parseInt(report.form_data.fidelityScore) * 20 : 80 },
            { name: 'Implementation Quality', score: 85 }
          ]
        }
      },
      
      // Extract or generate strengths and improvements
      strengths: report.form_data?.strengths || [
        "Professional conduct observed during lesson delivery",
        "Good classroom management and organization",
        "Appropriate use of available learning materials"
      ],
      
      improvements: report.form_data?.improvements || [
        "Consider implementing more interactive teaching methods",
        "Increase student participation opportunities",
        "Enhance assessment and feedback mechanisms"
      ],
      
      // TEAL observations from form data
      tealObservations: {
        videoUsed: report.form_data?.tealVideoContent === 'yes' || false,
        guidingQuestion: report.form_data?.tealGuidingQuestion === 'yes' || false,
        thinkPairShare: report.form_data?.tealThinkPairShare === 'yes' || false,
        collaborative: report.form_data?.tealCollaborative === 'yes' || false,
        deviceEngagement: report.form_data?.tealDeviceEngagement ? parseFloat(report.form_data.tealDeviceEngagement) : 3.0
      },
      
      // Overall metrics
      overall: {
        score: report.overall_score,
        grade: report.overall_score >= 80 ? 'A' : report.overall_score >= 70 ? 'B+' : report.overall_score >= 60 ? 'B' : 'C',
        status: report.overall_score >= 70 ? 'meets_expectations' : 'needs_improvement'
      }
    };

  } catch (error: any) {
    console.error('Error fetching report from database:', error);
    
    // Don't throw errors - handle them gracefully with fallback
    if (error.message && error.message.includes('not authenticated')) {
      console.log('Authentication error, will use fallback data');
      return null;
    }
    
    console.log('Database error, will use fallback data');
    return null;
  }
};

export const PerformanceReport: React.FC<PerformanceReportProps> = ({ observationData, onBack }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // PDF Export Function
  const exportToPDF = async () => {
    if (!reportData) {
      toast.error('No report data available to export');
      return;
    }

    setIsExporting(true);
    toast.info('Generating PDF... This may take a moment');

    try {
      // Create a temporary container for the report content
      const reportElement = document.createElement('div');
      reportElement.style.width = '210mm'; // A4 width
      reportElement.style.minHeight = '297mm'; // A4 height
      reportElement.style.padding = '20px';
      reportElement.style.backgroundColor = 'white';
      reportElement.style.fontFamily = 'Arial, sans-serif';
      reportElement.style.color = 'black';
      reportElement.style.position = 'fixed';
      reportElement.style.top = '-9999px';
      reportElement.style.left = '-9999px';

      // Generate the report content HTML
      const reportHTML = generateReportHTML(reportData);
      reportElement.innerHTML = reportHTML;

      // Temporarily add to DOM
      document.body.appendChild(reportElement);

      // Generate canvas from HTML
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: reportElement.scrollWidth,
        height: reportElement.scrollHeight,
      });

      // Remove from DOM
      document.body.removeChild(reportElement);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Generate filename
      const observerName = reportData.observer?.name || 'Observer';
      const schoolName = reportData.school?.name || 'School';
      const date = reportData.lesson?.date || new Date().toISOString().split('T')[0];
      const filename = `Observation_Report_${observerName}_${schoolName}_${date}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');

      // Save the PDF
      pdf.save(filename);
      toast.success('PDF exported successfully!');

    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Generate HTML content for PDF
  const generateReportHTML = (data: any): string => {
    const observer = data.observer || {};
    const school = data.school || {};
    const teacher = data.teacher || {};
    const lesson = data.lesson || {};
    const project = data.project || {};
    const overall = data.overall || {};
    const categories = data.categories || {};
    const strengths = data.strengths || [];
    const improvements = data.improvements || [];

    return `
      <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <!-- Header -->
        <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #22C55E; padding-bottom: 20px;">
          <h1 style="color: #22C55E; margin: 0; font-size: 28px;">Performance Assessment Report</h1>
          <p style="color: #666; margin: 5px 0;">Comprehensive analysis and strategic recommendations</p>
        </div>

        <!-- Observer Information -->
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: #22C55E; margin-top: 0;">Observation Details</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div><strong>Observer:</strong> ${observer.name || 'N/A'}</div>
            <div><strong>Role:</strong> ${(observer.role || 'N/A').replace('-', ' ').toUpperCase()}</div>
            <div><strong>School:</strong> ${school.name || 'N/A'}</div>
            <div><strong>Teacher:</strong> ${teacher.name || 'N/A'}</div>
            <div><strong>Date:</strong> ${lesson.date || 'N/A'}</div>
            <div><strong>Time:</strong> ${lesson.startTime || 'N/A'} - ${lesson.endTime || 'N/A'}</div>
            <div><strong>Lesson Code:</strong> ${lesson.code || 'N/A'}</div>
            <div><strong>Project:</strong> ${project.name || 'N/A'}</div>
          </div>
        </div>

        <!-- Overall Score -->
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: linear-gradient(135deg, #22C55E20, #22C55E10); border-radius: 12px;">
          <h2 style="color: #22C55E; margin: 0;">Overall Score</h2>
          <div style="font-size: 48px; font-weight: bold; color: #22C55E; margin: 10px 0;">${overall.score || 'N/A'}</div>
          <div style="color: #666;">Grade: ${overall.grade || 'N/A'} | Status: ${(overall.status || 'N/A').replace('_', ' ').toUpperCase()}</div>
        </div>

        <!-- Performance Categories -->
        <div style="margin: 30px 0;">
          <h2 style="color: #22C55E; margin-bottom: 20px;">Performance Metrics</h2>
          ${Object.entries(categories).map(([key, category]: [string, any]) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 10px;">
              <div>
                <div style="font-weight: bold; text-transform: capitalize;">${key}</div>
                <div style="color: #666; font-size: 14px;">Weight: ${category?.weight || 0}%</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 24px; font-weight: bold; color: #22C55E;">${(category?.score || 0).toFixed(1)}</div>
                <div style="color: #666; font-size: 12px;">out of 5.0</div>
              </div>
            </div>
          `).join('')}
        </div>

        <!-- Key Strengths -->
        <div style="margin: 30px 0;">
          <h2 style="color: #22C55E; margin-bottom: 15px;">Key Strengths</h2>
          ${strengths.length > 0 ? 
            `<ul style="padding-left: 20px;">${strengths.map((strength: string) => `<li style="margin-bottom: 8px;">${strength}</li>`).join('')}</ul>` :
            '<p style="color: #666;">No specific strengths documented in this observation</p>'
          }
        </div>

        <!-- Improvement Opportunities -->
        <div style="margin: 30px 0;">
          <h2 style="color: #22C55E; margin-bottom: 15px;">Improvement Opportunities</h2>
          ${improvements.length > 0 ? 
            `<ul style="padding-left: 20px;">${improvements.map((improvement: string) => `<li style="margin-bottom: 8px;">${improvement}</li>`).join('')}</ul>` :
            '<p style="color: #666;">No specific improvement areas documented in this observation</p>'
          }
        </div>

        ${data.showTealObservations ? `
          <!-- TEAL Assessment -->
          <div style="margin: 30px 0; page-break-inside: avoid;">
            <h2 style="color: #22C55E; margin-bottom: 15px;">TEAL Implementation Analysis</h2>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div><strong>Video Content:</strong> ${data.tealObservations?.videoUsed ? '✓ Utilized' : '✗ Not Used'}</div>
                <div><strong>Guiding Question:</strong> ${data.tealObservations?.guidingQuestion ? '✓ On Board' : '✗ Missing'}</div>
                <div><strong>Think-Pair-Share:</strong> ${data.tealObservations?.thinkPairShare ? '✓ Conducted' : '✗ Not Done'}</div>
                <div><strong>Collaborative Learning:</strong> ${data.tealObservations?.collaborative ? '✓ Conducted' : '✗ Not Done'}</div>
              </div>
              <div style="margin-top: 15px;">
                <strong>Device Engagement Score:</strong> ${(data.tealObservations?.deviceEngagement || 0).toFixed(1)}/5.0
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e5e7eb; text-align: center; color: #666; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleString()}</p>
          <p>Performance Assessment Report - Confidential</p>
        </div>
      </div>
    `;
  };

  useEffect(() => {
    // If observationData has reportId, fetch the report from API
    if (observationData?.reportId) {
      setLoading(true);
      setError(null);
      
      fetchReportById(observationData.reportId)
        .then(data => {
          // Transform API data to expected format or use mock data as fallback
          const reportData = data || mockReportData;
          setReportData(reportData);
          
          // If TEAL is not enabled and current tab is teal, switch to overview
          if (!reportData.showTealObservations && activeTab === 'teal') {
            setActiveTab('overview');
          }
        })
        .catch(err => {
          setError(err.message || 'Failed to load report');
          // Use mock data as fallback
  const reportData = mockReportData;
          setReportData(reportData);
          
          // If TEAL is not enabled and current tab is teal, switch to overview
          if (!reportData.showTealObservations && activeTab === 'teal') {
            setActiveTab('overview');
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // Handle form submission data - check if it's the nested response structure or direct data
      let reportData;
      
      if (observationData?.data) {
        // This is the response from form submission with nested data structure
        reportData = observationData.data;
      } else if (observationData) {
        // This is direct data (legacy format)
        reportData = observationData;
      } else {
        // Fallback to mock data
        reportData = mockReportData;
      }
      
      setReportData(reportData);
      
      // If TEAL is not enabled and current tab is teal, switch to overview
      if (!reportData.showTealObservations && activeTab === 'teal') {
        setActiveTab('overview');
      }
    }
  }, [observationData, activeTab]);

  if (loading) {
    return (
      <div className="space-y-6 mx-auto p-4 text-center">
        <ContentLoader />
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="space-y-6 mx-auto p-4">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="space-y-6 mx-auto p-4 text-center">
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No report data available
          </AlertDescription>
        </Alert>
      </div>
    );
  }

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
          <Button variant="outline" onClick={exportToPDF} disabled={isExporting}>
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Executive Summary - Always Visible */}
      <ExecutiveSummary data={reportData} />
      
      {/* Observation Details */}
      <ObservationDetails data={reportData} />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${reportData.showTealObservations ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview">Performance Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          {reportData.showTealObservations && (
          <TabsTrigger value="teal">TEAL Assessment</TabsTrigger>
          )}
          <TabsTrigger value="action">Action Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <PerformanceMetrics data={reportData} />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          <DetailedFindings data={reportData} />
        </TabsContent>

        {reportData.showTealObservations && (
        <TabsContent value="teal" className="space-y-6">
          <TealAnalysis data={reportData} />
        </TabsContent>
        )}

        <TabsContent value="action" className="space-y-6">
          <ActionPlan />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 