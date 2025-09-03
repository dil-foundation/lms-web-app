import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2, 
  Calendar,
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Minimize2,
  Maximize2,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReportsAIService, ReportContext } from '@/services/reportsAIService';
import { ReportExportService, ExportFormat } from '@/services/reportExportService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  reportData?: any;
  data?: any;
}

interface ReportsQuery {
  type: 'timeline' | 'user' | 'course' | 'engagement' | 'general';
  parameters: {
    startDate?: string;
    endDate?: string;
    userId?: string;
    courseId?: string;
    metric?: string;
  };
  query: string;
}

interface ReportsChatbotProps {
  className?: string;
  minimized?: boolean;
  onToggleSize?: () => void;
}

export const ReportsChatbot: React.FC<ReportsChatbotProps> = ({
  className,
  minimized = false,
  onToggleSize
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m your Reports AI Assistant. Select a platform and choose from the Quick Insights below to get real-time AI-powered insights about your platform performance, or ask me specific questions about your data.',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<'ai_tutor' | 'lms'>('ai_tutor');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseUserQuery = (query: string): ReportsQuery => {
    const queryLower = query.toLowerCase();
    
    // Extract dates
    const dateRegex = /(\d{4}-\d{2}-\d{2})|(\d{1,2}\/\d{1,2}\/\d{4})|(\d{1,2}-\d{1,2}-\d{4})/g;
    const dates = query.match(dateRegex);
    
    // Determine query type
    let type: ReportsQuery['type'] = 'general';
    
    if (queryLower.includes('user') || queryLower.includes('student') || queryLower.includes('teacher')) {
      type = 'user';
    } else if (queryLower.includes('course') || queryLower.includes('lesson')) {
      type = 'course';
    } else if (queryLower.includes('engagement') || queryLower.includes('activity')) {
      type = 'engagement';
    } else if (dates && dates.length > 0) {
      type = 'timeline';
    }

    return {
      type,
      parameters: {
        startDate: dates?.[0],
        endDate: dates?.[1],
      },
      query
    };
  };

  const generateReportData = async (parsedQuery: ReportsQuery): Promise<any> => {
    try {
      // Get platform context for better AI responses
      const context = await ReportsAIService.getPlatformContext();
      
      // Generate AI response using OpenAI
      const aiResponse = await ReportsAIService.generateReportResponse(
        parsedQuery.query,
        context
      );

      if (aiResponse.success) {
        return {
          type: 'ai_generated_report',
          content: aiResponse.response,
          data: aiResponse.reportData || {}
        };
      } else {
        throw new Error(aiResponse.error || 'Failed to generate report');
      }
    } catch (error) {
      console.error('Error generating AI report:', error);
      
      // Fallback to basic mock data if AI service fails
      return {
        type: 'fallback_response',
        content: `I encountered an issue generating your report for "${parsedQuery.query}". Here's some basic information I can provide:

📊 **Current Platform Status:**
- Total registered users: 1,250+
- Active courses: 15
- Average engagement rate: 78%
- Course completion rate: 65%

Please try rephrasing your question or contact support if the issue persists.`,
        data: {
          totalUsers: 1250,
          totalCourses: 15,
          engagementRate: 78,
          completionRate: 65
        }
      };
    }
  };

  const formatReportResponse = (reportData: any, originalQuery: string): string => {
    switch (reportData.type) {
      case 'ai_generated_report':
        // Return the AI-generated content directly
        return reportData.content;
      
      case 'fallback_response':
        // Return fallback content
        return reportData.content;

      case 'timeline_report':
        return `📊 **Report for ${reportData.data.timeframe}**

🙋‍♂️ **Total Users**: ${reportData.data.totalUsers.toLocaleString()}
✨ **New Users**: ${reportData.data.newUsers.toLocaleString()}
📈 **Engagement Rate**: ${reportData.data.engagement}%
🎯 **Courses Completed**: ${reportData.data.coursesCompleted.toLocaleString()}

This shows strong growth in user acquisition and course completion rates during your selected timeframe.`;

      case 'user_report':
        return `👥 **User Analytics Report**

🔥 **Active Users**: ${reportData.data.activeUsers.toLocaleString()}
🆕 **New Registrations**: ${reportData.data.newRegistrations.toLocaleString()}
📊 **Average Progress**: ${reportData.data.averageProgress}%

**Top Performers**: ${reportData.data.topPerformers.join(', ')}

Your user base is showing healthy activity levels with consistent progress across courses.`;

      case 'course_report':
        return `📚 **Course Performance Report**

📖 **Total Courses**: ${reportData.data.totalCourses}
✅ **Completion Rate**: ${reportData.data.completionRate}%
⭐ **Average Rating**: ${reportData.data.averageRating}/5.0

**Most Popular Courses**:
${reportData.data.popularCourses.map((course: string, index: number) => `${index + 1}. ${course}`).join('\n')}

Your courses are performing well with high completion rates and excellent user satisfaction.`;

      case 'engagement_report':
        return `📱 **Engagement Analytics**

👤 **Daily Active Users**: ${reportData.data.dailyActiveUsers.toLocaleString()}
⏱️ **Avg Session Duration**: ${reportData.data.sessionDuration} minutes
🎯 **Interaction Rate**: ${reportData.data.interactionRate}%
🔄 **Retention Rate**: ${reportData.data.retentionRate}%

Your platform shows excellent user engagement with strong retention metrics.`;

      case 'general_response':
        return reportData.data.message;

      default:
        return "I've generated the report based on your query. Is there anything specific you'd like me to explain further?";
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Parse the user query
      const parsedQuery = parseUserQuery(userMessage.content);
      
      // Generate report data (this would call OpenAI API in production)
      const reportData = await generateReportData(parsedQuery);
      
      // Format the response
      const responseContent = formatReportResponse(reportData, userMessage.content);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        reportData,
        data: reportData?.data || reportData
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Focus back to input
      inputRef.current?.focus();
      
    } catch (error) {
      console.error('Error generating report:', error);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while generating your report. Please try again or rephrase your question.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleExportReport = async (message: ChatMessage, format: ExportFormat, userQuery: string) => {
    try {
      const exportData = ReportExportService.extractExportData(
        {
          content: message.content,
          timestamp: message.timestamp.toLocaleString(),
          data: message.data || message.reportData
        },
        userQuery
      );

      if (!exportData) {
        toast({
          title: 'Export Failed',
          description: 'No exportable data found in this message.',
          variant: 'destructive'
        });
        return;
      }

      await ReportExportService.exportReport(exportData, format);
      
      toast({
        title: 'Export Successful',
        description: `Report exported as ${format.toUpperCase()} format.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export report. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const getExportIcon = (format: ExportFormat) => {
    switch (format) {
      case 'pdf': return <FileText className="h-4 w-4" />;
      case 'xlsx': return <FileSpreadsheet className="h-4 w-4" />;
      default: return <Download className="h-4 w-4" />;
    }
  };

  const findUserQueryForMessage = (messageIndex: number): string => {
    // Find the user message that preceded this assistant message
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].type === 'user') {
        return messages[i].content;
      }
    }
    return 'General Report Query';
  };

  const parseMarkdownToReact = (text: string) => {
    // Split text by lines to handle line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Handle empty lines
      if (line.trim() === '') {
        return <br key={lineIndex} />;
      }

      // Handle markdown headers
      if (line.startsWith('### ')) {
        return (
          <h3 key={lineIndex} className="text-lg font-semibold mt-6 mb-3 text-primary border-b border-primary/20 pb-1">
            {line.replace('### ', '')}
          </h3>
        );
      }
      
      if (line.startsWith('## ')) {
        return (
          <h2 key={lineIndex} className="text-xl font-bold mt-8 mb-4 text-primary border-b border-primary/30 pb-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      
      if (line.startsWith('# ')) {
        return (
          <h1 key={lineIndex} className="text-2xl font-bold mt-8 mb-6 text-primary border-b-2 border-primary/40 pb-3">
            {line.replace('# ', '')}
          </h1>
        );
      }

      // Handle bullet points
      if (line.startsWith('- ')) {
        return (
          <div key={lineIndex} className="flex items-start gap-3 ml-2 mb-2 py-1">
            <span className="text-primary font-bold text-sm mt-0.5 min-w-[8px]">•</span>
            <div className="flex-1">{parseInlineMarkdown(line.replace('- ', ''))}</div>
          </div>
        );
      }

      // Handle regular text with inline markdown
      return (
        <div key={lineIndex} className="leading-relaxed mb-2">
          {parseInlineMarkdown(line)}
        </div>
      );
    });
  };

  const parseInlineMarkdown = (text: string) => {
    const parts = [];
    let currentIndex = 0;
    
    // Find all **text** patterns
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    
    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold part
      if (match.index > currentIndex) {
        parts.push(text.substring(currentIndex, match.index));
      }
      
      // Add the bold part
      parts.push(
        <strong key={match.index} className="font-semibold text-primary">
          {match[1]}
        </strong>
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text after the last match
    if (currentIndex < text.length) {
      parts.push(text.substring(currentIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  const aiTutorInsights = [
    { 
      value: "tutor_overview", 
      label: "Tutor Overview", 
      query: "Generate a comprehensive AI Tutor platform performance report including: total AI tutoring sessions conducted, unique students served by AI tutors, average session duration with AI tutors, most frequently used AI tutor features, and overall AI tutoring system utilization metrics. Focus exclusively on AI-powered tutoring interactions, not traditional LMS course activities." 
    },
    { 
      value: "learning_outcomes", 
      label: "Learning Outcomes", 
      query: "Analyze AI tutoring session effectiveness by examining: student learning progress achieved through AI tutor interactions, knowledge retention rates from AI-guided lessons, skill improvement metrics tracked during AI tutoring sessions, pre/post AI tutoring assessment comparisons, and learning objective completion rates specifically from AI tutor engagements. Exclude traditional classroom or LMS course performance data." 
    },
    { 
      value: "interaction_patterns", 
      label: "Interaction Patterns", 
      query: "Provide detailed analysis of student interaction patterns with AI tutors including: conversation flow patterns during AI tutoring sessions, question types most frequently asked to AI tutors, student response patterns to AI tutor prompts, peak usage times for AI tutoring services, session length distributions for AI tutor interactions, and engagement quality metrics specific to AI-powered tutoring conversations." 
    },
    { 
      value: "session_analytics", 
      label: "Session Analytics", 
      query: "Generate comprehensive AI tutoring session analytics covering: total number of AI tutoring sessions initiated, average duration of AI tutor conversations, session completion rates for AI tutoring, most active AI tutoring time periods, student retention across multiple AI tutoring sessions, and AI tutor response time metrics. Focus only on one-on-one AI tutoring session data, not group classes or LMS activities." 
    },
    { 
      value: "student_progress", 
      label: "Student Progress", 
      query: "Analyze individual student learning progress specifically through AI tutor interactions including: skill development trajectories tracked during AI tutoring sessions, personalized learning path effectiveness in AI tutoring, student mastery levels achieved through AI tutor guidance, improvement rates in specific subjects via AI tutoring, adaptive learning algorithm performance, and individual student engagement trends with AI tutors. Exclude progress from traditional courses or LMS modules." 
    },
    { 
      value: "tutor_performance", 
      label: "Tutor Performance", 
      query: "Evaluate AI tutor system performance metrics including: AI response accuracy and relevance scores, student satisfaction ratings for AI tutor interactions, AI tutor's ability to provide personalized learning experiences, effectiveness of AI tutor's adaptive questioning techniques, natural language processing quality in AI conversations, and AI tutor's success rate in helping students achieve learning objectives. Focus on AI system performance, not human instructor metrics." 
    }
  ];

  const lmsInsights = [
    { 
      value: "platform_overview", 
      label: "Platform Overview", 
      query: "Generate a comprehensive LMS platform performance report including: total enrolled students across all LMS courses, number of published courses and modules, overall course completion rates, average time spent in LMS coursework, instructor-to-student ratios, and LMS system uptime metrics. Focus exclusively on traditional Learning Management System activities including course enrollment, module completion, and structured curriculum progress. Exclude AI tutoring session data." 
    },
    { 
      value: "course_analytics", 
      label: "Course Analytics", 
      query: "Analyze LMS course performance metrics including: individual course enrollment numbers, course completion rates by subject, student drop-off points within LMS courses, most popular LMS course modules, course rating and feedback scores, assignment submission rates, quiz and exam performance across LMS courses, and instructor engagement levels. Focus on structured course content delivery, not AI tutoring interactions." 
    },
    { 
      value: "user_engagement", 
      label: "User Engagement", 
      query: "Provide detailed LMS user engagement analysis covering: student login frequency to LMS platform, time spent on course materials and lectures, discussion forum participation rates, assignment and project submission patterns, peer-to-peer interaction in LMS courses, course resource download statistics, and student retention rates across LMS program duration. Exclude one-on-one AI tutoring engagement data." 
    },
    { 
      value: "assessment_results", 
      label: "Assessment Results", 
      query: "Generate comprehensive LMS assessment performance report including: quiz and exam scores across all LMS courses, assignment grading distributions, student performance trends by course subject, assessment completion rates, grade improvement over course duration, comparative performance between different LMS course cohorts, and instructor feedback effectiveness. Focus on formal assessments within structured LMS courses, not AI tutor evaluation metrics." 
    },
    { 
      value: "content_performance", 
      label: "Content Performance", 
      query: "Analyze LMS content effectiveness metrics including: most accessed course materials and resources, video lecture engagement rates, reading material completion statistics, interactive content utilization, student feedback on course content quality, content format preferences (video, text, interactive), and learning resource effectiveness across different LMS course subjects. Exclude AI-generated or AI tutor content performance." 
    },
    { 
      value: "system_usage", 
      label: "System Usage", 
      query: "Review LMS system utilization patterns including: peak usage hours for LMS platform access, device preferences for LMS access (mobile, desktop, tablet), geographic distribution of LMS users, system performance metrics and load times, feature utilization within LMS (forums, gradebook, calendar), bandwidth usage for LMS content delivery, and technical support ticket trends. Focus on LMS infrastructure usage, not AI tutoring system performance." 
    }
  ];

  const getCurrentInsights = () => {
    return selectedPlatform === 'ai_tutor' ? aiTutorInsights : lmsInsights;
  };

  const handleQuickInsightSelect = (insight: { value: string; label: string; query: string }) => {
    // Add platform context to the query to ensure correct analysis
    const platformContext = selectedPlatform === 'ai_tutor' 
      ? `[AI TUTOR PLATFORM ANALYSIS ONLY] ${insight.query}` 
      : `[LMS PLATFORM ANALYSIS ONLY] ${insight.query}`;
    
    setInputValue(platformContext);
    // Auto-send the query
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleResetChat = () => {
    console.log('Reset button clicked'); // Debug log
    
    // Create a fresh initial message with a new timestamp and ID
    const initialMessage: ChatMessage = {
      id: `initial-${Date.now()}`,
      type: 'assistant',
      content: 'Hello! I\'m your Reports AI Assistant. Select a platform and choose from the Quick Insights below to get real-time AI-powered insights about your platform performance, or ask me specific questions about your data.',
      timestamp: new Date()
    };
    
    // Force state updates with React's functional updates
    setMessages(() => [initialMessage]);
    setInputValue(() => '');
    setSelectedPlatform(() => 'ai_tutor');
    setIsLoading(() => false);
    
    // Show success message after state updates
    setTimeout(() => {
      toast({
        title: 'Chat Reset',
        description: 'Conversation has been cleared successfully.',
      });
    }, 100);
    
    console.log('Reset completed'); // Debug log
  };

  if (minimized && onToggleSize) {
    return (
      <Card className={cn("w-80 h-16 fixed bottom-4 right-4 z-50 shadow-lg border-primary/20", className)}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <span className="font-medium text-sm text-foreground">Reports AI Assistant</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleSize}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full h-[600px] flex flex-col overflow-hidden", className)}>
      {/* Chat Header with Reset Button */}
      <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
            <Bot className="h-3 w-3 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">AI Reports Assistant</span>
          <Badge 
            className={cn(
              "text-xs px-2 py-0.5 font-medium",
              selectedPlatform === 'ai_tutor' 
                ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15" 
                : "bg-secondary/10 text-secondary border-secondary/20 hover:bg-secondary/15"
            )}
          >
            {selectedPlatform === 'ai_tutor' ? 'AI Tutor' : 'LMS'}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleResetChat();
          }}
          className="h-8 px-2 text-xs hover:bg-destructive/10 hover:text-destructive"
          title="Reset Chat"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        <ScrollArea className="flex-1 px-4 overflow-hidden">
          <div className="space-y-4 py-4 w-full" key={`chat-${messages.length}-${messages[0]?.id}`}>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-3 w-full",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-lg p-3 break-words overflow-hidden",
                      message.type === 'user'
                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md"
                        : "bg-muted/50 text-foreground border border-border/50"
                    )}
                  >
                    <div className="text-sm break-words overflow-wrap-anywhere space-y-1">
                      {message.type === 'assistant' ? parseMarkdownToReact(message.content) : message.content}
                    </div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </div>
                  </div>
                  
                  {/* Export buttons for assistant messages with data */}
                  {message.type === 'assistant' && ReportExportService.hasExportableData(message) && (
                    <div className="flex items-center gap-2 mt-2 ml-1">
                      <span className="text-xs text-gray-500">Export:</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                            <Download className="h-3 w-3 mr-1" />
                            Export
                            <ChevronDown className="h-3 w-3 ml-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => handleExportReport(message, 'pdf', findUserQueryForMessage(index))}>
                            <FileText className="h-4 w-4 mr-2" />
                            PDF Report
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportReport(message, 'xlsx', findUserQueryForMessage(index))}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            Excel File
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                </div>
                
                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-primary/90 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3 w-full">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted/50 border border-border/50 rounded-lg p-3 max-w-[85%] break-words">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Generating report...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Quick Insights */}
        {messages.length <= 1 && (
          <div className="px-4 py-4 border-t w-full bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center shadow-sm">
                <BarChart3 className="h-3 w-3 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground">Quick Insights</span>
            </div>
            
            {/* Platform Selector */}
            <div className="mb-4">
              <Select value={selectedPlatform} onValueChange={(value: 'ai_tutor' | 'lms') => setSelectedPlatform(value)}>
                <SelectTrigger className="w-full bg-background border-border hover:border-primary/30 focus:border-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_tutor" className="focus:bg-primary/10 data-[highlighted]:bg-primary/10">
                    <div className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-primary" />
                      <span>AI Tutor Platform</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="lms" className="focus:bg-secondary/10 data-[highlighted]:bg-secondary/10">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-secondary data-[highlighted]:text-secondary" />
                      <span>LMS Platform</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Insights Pills */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {getCurrentInsights().map((insight) => (
                <Button
                  key={insight.value}
                  variant="outline"
                  size="sm"
                  className="h-auto py-2 px-3 text-xs font-medium text-left justify-start bg-card/50 border-border/60 text-card-foreground hover:bg-primary/10 hover:border-primary/30 hover:text-card-foreground hover:shadow-sm transition-all duration-200 group"
                  onClick={() => handleQuickInsightSelect(insight)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 group-hover:bg-primary"></div>
                    <span className="truncate text-card-foreground group-hover:text-card-foreground">{insight.label}</span>
                  </div>
                </Button>
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageCircle className="h-3 w-3" />
              Or ask me specific questions about your data in the input below
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t w-full">
          <div className="flex space-x-2 w-full">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about reports, timelines, users, courses..."
              className="flex-1 min-w-0"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="sm"
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsChatbot;
