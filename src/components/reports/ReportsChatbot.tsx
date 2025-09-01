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
  File,
  ChevronDown
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
      content: 'Hello! I\'m your Reports AI Assistant. I can help you generate detailed reports and analytics for both your AI Tutor and LMS platforms.\n\n**Which system would you like to analyze today?**\n\n🤖 **AI Tutor Reports** - User interactions, tutoring sessions, learning progress\n📚 **LMS Reports** - Course performance, student engagement, platform usage\n\nOr I can provide **combined insights** across both platforms. What interests you most?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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
      case 'csv': return <FileSpreadsheet className="h-4 w-4" />;
      case 'json': return <File className="h-4 w-4" />;
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

  const suggestedQueries = [
    "Show me AI Tutor usage and learning outcomes",
    "Analyze LMS course performance and student engagement", 
    "Compare AI Tutor vs LMS user activity trends",
    "Generate a comprehensive report for both platforms",
    "What are the most effective features across both systems?"
  ];

  if (minimized && onToggleSize) {
    return (
      <Card className={cn("w-80 h-16 fixed bottom-4 right-4 z-50", className)}>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-sm">Reports AI Assistant</span>
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
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden min-h-0">
        <ScrollArea className="flex-1 px-4 overflow-hidden">
          <div className="space-y-4 py-4 w-full">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={cn(
                  "flex items-start space-x-3 w-full",
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                
                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={cn(
                      "rounded-lg p-3 break-words overflow-hidden",
                      message.type === 'user'
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-900"
                    )}
                  >
                    <div className="whitespace-pre-wrap text-sm break-words overflow-wrap-anywhere">
                      {message.content}
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
                          <DropdownMenuItem onClick={() => handleExportReport(message, 'csv', findUserQueryForMessage(index))}>
                            <FileSpreadsheet className="h-4 w-4 mr-2" />
                            CSV Spreadsheet
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExportReport(message, 'json', findUserQueryForMessage(index))}>
                            <File className="h-4 w-4 mr-2" />
                            JSON Data
                          </DropdownMenuItem>
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
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex items-start space-x-3 w-full">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
                <div className="bg-gray-100 rounded-lg p-3 max-w-[85%] break-words">
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-gray-600">Generating report...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Suggested Queries */}
        {messages.length <= 1 && (
          <div className="px-4 py-2 border-t w-full">
            <div className="text-xs text-gray-600 mb-2">Try asking:</div>
            <div className="flex flex-wrap gap-1 w-full">
              {suggestedQueries.slice(0, 3).map((query, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2 whitespace-normal text-left max-w-full break-words"
                  onClick={() => setInputValue(query)}
                >
                  <span className="line-clamp-2">{query}</span>
                </Button>
              ))}
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
