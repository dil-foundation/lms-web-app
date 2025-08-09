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
    instruction: { score: 4.0, weight: 25, trend: "up" },
    engagement: { score: 4.0, weight: 30, trend: "up" },
    environment: { score: 4.0, weight: 20, trend: "stable" },
    resources: { score: 3.5, weight: 15, trend: "up" },
    fidelity: { score: 4.0, weight: 10, trend: "up" }
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
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getScoreColor = () => {
    if (percentage >= 70) return "text-green-600 dark:text-green-400";
    if (percentage >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getPerformanceLevel = () => {
    if (percentage >= 80) return "Exceeds Standards";
    if (percentage >= 70) return "Meets Standards";
    return "Below Standards";
  };

  const getPerformanceColor = () => {
    if (percentage >= 80) return "from-green-500 to-green-600 dark:from-green-400 dark:to-green-500";
    if (percentage >= 70) return "from-green-500 to-green-600 dark:from-green-400 dark:to-green-500";
    if (percentage >= 50) return "from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500";
    return "from-red-500 to-red-600 dark:from-red-400 dark:to-red-500";
  };

  const getCircleColor = () => {
    if (percentage >= 80) return "#10b981"; // green-500
    if (percentage >= 70) return "#10b981"; // green-500
    if (percentage >= 50) return "#f59e0b"; // yellow-500
    return "#ef4444"; // red-500
  };

  const getCircleColorDark = () => {
    if (percentage >= 80) return "#4ade80"; // green-400
    if (percentage >= 70) return "#4ade80"; // green-400
    if (percentage >= 50) return "#fbbf24"; // yellow-400
    return "#f87171"; // red-400
  };

  // Calculate stroke dash array for the circle progress
  const radius = 32; // radius of the circle
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <Card className="bg-gradient-to-br from-card to-primary/5 dark:bg-card hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 border border-border/50">
      <CardContent className="p-6">
        {/* Header with proper spacing */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/15 to-primary/25 rounded-lg flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-primary" />
        </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-lg text-foreground truncate">{title}</h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground font-medium truncate">{subtitle}</p>
              )}
            </div>
          </div>
          {trend && (
            <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 rounded-lg flex items-center justify-center flex-shrink-0 ml-2">
              {getTrendIcon()}
            </div>
          )}
        </div>

        {/* McKinsey-style Performance Indicator */}
        <div className="space-y-4">
          {/* Score Display */}
          <div className="text-center">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className={`text-4xl font-bold ${getScoreColor()}`}>
            {score.toFixed(1)}
          </span>
              <span className="text-lg text-muted-foreground font-medium">/{maxScore}</span>
        </div>
            <div className="text-sm font-medium text-muted-foreground">
              {getPerformanceLevel()}
            </div>
          </div>

          {/* Clean SVG Progress Ring */}
          <div className="flex justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                {/* Background Circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-gray-200 dark:text-gray-700"
                />
                {/* Progress Circle */}
                <circle
                  cx="40"
                  cy="40"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset="0"
                  strokeLinecap="round"
                  className={`transition-all duration-500 ease-out ${
                    percentage >= 80 
                      ? 'text-green-500 dark:text-green-400' 
                      : percentage >= 70 
                      ? 'text-green-500 dark:text-green-400'
                      : percentage >= 50 
                      ? 'text-yellow-500 dark:text-yellow-400'
                      : 'text-red-500 dark:text-red-400'
                  }`}
                  style={{
                    transformOrigin: '40px 40px'
                  }}
                />
              </svg>
              {/* Center Content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className={`text-sm font-bold ${getScoreColor()}`}>
                    {percentage.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Status */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${getPerformanceColor()} text-white text-xs font-medium`}>
              <div className="w-2 h-2 bg-white rounded-full"></div>
              {getPerformanceLevel()}
            </div>
          </div>
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
    <div className="space-y-8">
      {/* McKinsey-style Header Section */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 rounded-3xl"></div>
        <div className="relative p-8 border border-border/30 rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
        <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
                  Executive Summary
                </h2>
                <p className="text-lg text-muted-foreground font-light mt-1">
                  Strategic performance assessment and key insights
                </p>
        </div>
      </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground font-medium">Observation Score</div>
              <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {overallScore.toFixed(1)}
            </div>
              <div className="text-sm text-muted-foreground">out of 5.0</div>
            </div>
          </div>
          
          {/* Performance Status Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Performance Level</span>
              <span className="text-sm font-bold text-primary dark:text-primary/90">
                {overallScore >= 4.0 ? 'Exceeds Standards' : overallScore >= 3.0 ? 'Meets Standards' : 'Below Standards'}
              </span>
              </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-primary to-primary/80 dark:from-primary/90 dark:to-primary/70 h-3 rounded-full transition-all duration-500"
                style={{ 
                  width: `${Math.min(100, Math.max(0, 
                    // Handle different score scales - if score > 5, assume it's on 0-100 scale, otherwise 0-5 scale
                    overallScore > 5 ? overallScore : (overallScore / 5) * 100
                  ))}%` 
                }}
              ></div>
            </div>
            </div>
            
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-r from-green-50/50 to-green-100/30 dark:from-green-900/20 dark:to-green-900/10 rounded-2xl border border-green-200/50 dark:border-green-800/30">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">{overallScore.toFixed(1)}</div>
              <div className="text-sm text-green-700 dark:text-green-300 font-medium">Current Score</div>
              </div>
            {previousScore && (
              <div className="text-center p-4 bg-gradient-to-r from-blue-50/50 to-blue-100/30 dark:from-blue-900/20 dark:to-blue-900/10 rounded-2xl border border-blue-200/50 dark:border-blue-800/30">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {parseFloat(improvementPercent) >= 0 ? '+' : ''}{improvementPercent}%
                </div>
                <div className="text-sm text-blue-700 dark:text-blue-300 font-medium">Improvement</div>
              </div>
            )}
            <div className="text-center p-4 bg-gradient-to-r from-purple-50/50 to-purple-100/30 dark:from-purple-900/20 dark:to-purple-900/10 rounded-2xl border border-purple-200/50 dark:border-purple-800/30">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">{strengths.length}</div>
              <div className="text-sm text-purple-700 dark:text-purple-300 font-medium">Key Strengths</div>
            </div>
            </div>
          </div>
        </div>
        
      {/* Strategic Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Strengths Analysis */}
        <div className="bg-gradient-to-br from-card to-primary/5 dark:bg-card border border-border/50 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500/20 to-green-600/30 rounded-2xl flex items-center justify-center">
              <ThumbsUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Strategic Strengths</h3>
              <p className="text-sm text-muted-foreground">Key areas of excellence</p>
            </div>
          </div>
        <div className="space-y-4">
            {strengths.length > 0 ? (
              strengths.slice(0, 3).map((strength: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-green-50/30 to-green-100/20 dark:from-green-900/10 dark:to-green-900/5 rounded-xl">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-green-700 dark:text-green-300">{strength.length > 50 ? strength.substring(0, 50) + '...' : strength}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No specific strengths noted</p>
              </div>
            )}
            </div>
          </div>
          
        {/* Growth Areas Analysis */}
        <div className="bg-gradient-to-br from-card to-primary/5 dark:bg-card border border-border/50 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500/20 to-orange-600/30 rounded-2xl flex items-center justify-center">
              <Target className="w-6 h-6 text-orange-600" />
                </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Development Areas</h3>
              <p className="text-sm text-muted-foreground">Opportunities for growth</p>
                </div>
              </div>
          <div className="space-y-4">
            {improvements.length > 0 ? (
              improvements.slice(0, 3).map((improvement: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-r from-orange-50/30 to-orange-100/20 dark:from-orange-900/10 dark:to-orange-900/5 rounded-xl">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-sm text-orange-700 dark:text-orange-300">{improvement.length > 50 ? improvement.substring(0, 50) + '...' : improvement}</span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No specific improvements noted</p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
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
    <div className="space-y-8">
      {/* McKinsey-style Header Section */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 rounded-3xl"></div>
        <div className="relative p-8 border border-border/30 rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center shadow-lg">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
        Observation Details
              </h2>
              <p className="text-lg text-muted-foreground font-light mt-1">
                Comprehensive observation information and context
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="bg-gradient-to-br from-card to-primary/5 dark:bg-card border border-border/50 rounded-3xl p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-lg flex items-center justify-center">
                <User className="w-3 h-3 text-blue-600" />
          </div>
              <span className="text-sm font-bold text-muted-foreground">Observer</span>
            </div>
            <div className="font-bold text-foreground">{observer.name || 'N/A'}</div>
            <div className="text-sm text-muted-foreground capitalize font-medium">
              {observer.role ? observer.role.replace('-', ' ') : 'N/A'}
            </div>
        </div>
        
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-green-500/10 to-green-600/20 rounded-lg flex items-center justify-center">
                <MapPin className="w-3 h-3 text-green-600" />
          </div>
              <span className="text-sm font-bold text-muted-foreground">Location</span>
            </div>
            <div className="font-bold text-foreground">{school.name || observer.school || 'N/A'}</div>
            <div className="text-sm text-muted-foreground font-medium">
              Teacher: {teacher.name || observer.teacher || 'N/A'}
            </div>
        </div>
        
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-orange-500/10 to-orange-600/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-3 h-3 text-orange-600" />
          </div>
              <span className="text-sm font-bold text-muted-foreground">Date & Duration</span>
            </div>
            <div className="font-bold text-foreground">{lesson.date || observer.date || 'N/A'}</div>
            <div className="text-sm text-muted-foreground font-medium">
              {lesson.startTime && lesson.endTime 
                ? `${lesson.startTime} - ${lesson.endTime}`
                : observer.duration || 'N/A'
              }
            </div>
        </div>
        
          <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-500/10 to-purple-600/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-purple-600" />
          </div>
              <span className="text-sm font-bold text-muted-foreground">Lesson Code</span>
            </div>
            <div className="font-bold text-foreground">{lesson.code || observer.lesson || 'N/A'}</div>
            <Badge variant="outline" className="mt-2 bg-gradient-to-r from-primary/10 to-primary/20 border-primary/30 text-primary font-semibold">
              {project.name || 'N/A'}
            </Badge>
          </div>
      </div>
      </div>
    </div>
);
};

const PerformanceMetrics = ({ data }: { data: any }) => {
  // Handle both new data structure from form submission and legacy mock data
  const categories = data.categories || {};

  return (
    <div className="space-y-8">
      {/* McKinsey-style Header Section */}
      <div className="relative overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 rounded-3xl"></div>
        <div className="relative p-8 border border-border/30 rounded-3xl bg-gradient-to-br from-background/80 to-background/40 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl flex items-center justify-center shadow-lg">
              <PieChart className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent">
      Performance Metrics
    </h2>
              <p className="text-lg text-muted-foreground font-light mt-1">
                Strategic breakdown of teaching effectiveness across key competency areas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
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
        <div className="text-center py-12 text-muted-foreground">
          <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <PieChart className="w-8 h-8 text-primary opacity-50" />
          </div>
          <p className="text-lg font-medium">No performance metrics available</p>
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
            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800/50">Immediate</Badge>
            <span className="font-medium">0-30 Days</span>
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground ml-4">
            <li>• Schedule professional development session on differentiated instruction</li>
            <li>• Implement formative assessment checkpoints every 10-15 minutes</li>
          </ul>
        </div>
        
        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-200 dark:border-yellow-800/50">Short-term</Badge>
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
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800/50">Long-term</Badge>
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

  // Custom tab change handler to prevent scroll behavior
  const handleTabChange = (value: string) => {
    // Prevent any default behavior that might cause scrolling
    setActiveTab(value);
  };

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
        })
        .catch(err => {
          setError(err.message || 'Failed to load report');
          // Use mock data as fallback
          const reportData = mockReportData;
          setReportData(reportData);
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
    }
  }, [observationData]);

  // Separate useEffect to handle TEAL tab validation when reportData changes
  useEffect(() => {
    if (reportData && !reportData.showTealObservations && activeTab === 'teal') {
      setActiveTab('overview');
    }
  }, [reportData, activeTab]);

  if (loading) {
    return (
      <div className="space-y-6 mx-auto text-center">
        <ContentLoader />
        <p className="text-muted-foreground">Loading report...</p>
      </div>
    );
  }

  if (error && !reportData) {
    return (
      <div className="space-y-6 mx-auto">
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
      <div className="space-y-6 mx-auto text-center">
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
    <div className="space-y-8 mx-auto">
      {/* Premium Header Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 dark:from-primary/10 dark:via-transparent dark:to-primary/10 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 max-w-2xl">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 dark:from-primary/20 dark:to-primary/30 rounded-2xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-primary dark:text-primary/90" />
              </div>
              <div className="flex-1">
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 dark:from-primary/90 dark:via-primary dark:to-primary/70 bg-clip-text text-transparent" style={{ backgroundClip: 'text', WebkitBackgroundClip: 'text' }}>
                  Performance Assessment Report
                </h1>
                <p className="text-lg text-muted-foreground font-light pr-8">
                  Comprehensive analysis and strategic recommendations for educational excellence
          </p>
        </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0 ml-8">
              <Button 
                variant="outline" 
                onClick={onBack}
                className="h-10 px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Form
          </Button>
              <Button 
                variant="outline" 
                onClick={exportToPDF} 
                disabled={isExporting}
                className="h-10 px-6 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
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
        </div>
      </div>

      {/* Executive Summary - Always Visible */}
      <ExecutiveSummary data={reportData} />
      
      {/* Observation Details */}
      <ObservationDetails data={reportData} />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-8">
        <div className="bg-gradient-to-r from-background to-background/95 backdrop-blur-sm border border-border/50 rounded-2xl p-2 sticky top-4 z-10">
          <TabsList className={`grid w-full h-12 ${reportData.showTealObservations ? 'grid-cols-4' : 'grid-cols-3'} bg-transparent`}>
            <TabsTrigger 
              value="overview" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white rounded-xl transition-all duration-300 hover:bg-muted/50 dark:hover:bg-muted/30"
            >
              Performance Overview
            </TabsTrigger>
            <TabsTrigger 
              value="detailed" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white rounded-xl transition-all duration-300 hover:bg-muted/50 dark:hover:bg-muted/30"
            >
              Detailed Analysis
            </TabsTrigger>
          {reportData.showTealObservations && (
              <TabsTrigger 
                value="teal" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white rounded-xl transition-all duration-300 hover:bg-muted/50 dark:hover:bg-muted/30"
              >
                TEAL Assessment
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="action" 
              className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-primary/90 data-[state=active]:text-white rounded-xl transition-all duration-300 hover:bg-muted/50 dark:hover:bg-muted/30"
            >
              Action Plan
            </TabsTrigger>
        </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 duration-300">
          <PerformanceMetrics data={reportData} />
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6 animate-in fade-in-0 duration-300">
          <DetailedFindings data={reportData} />
        </TabsContent>

        {reportData.showTealObservations && (
        <TabsContent value="teal" className="space-y-6 animate-in fade-in-0 duration-300">
          <TealAnalysis data={reportData} />
        </TabsContent>
        )}

        <TabsContent value="action" className="space-y-6 animate-in fade-in-0 duration-300">
          <ActionPlan />
        </TabsContent>
      </Tabs>
    </div>
  );
}; 