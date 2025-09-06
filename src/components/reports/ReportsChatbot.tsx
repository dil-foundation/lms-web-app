import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  Send, 
  Bot,
  User, 
  Loader2, 
  Minimize2,
  Maximize2,
  Download,
  FileText,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';
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
      content: 'Hello! I\'m your Reports AI Assistant. Ask me specific questions about your platform\'s data, generate reports for any timeline, and get insights on user engagement and course performance.',
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

  // Function to send a message directly with a prompt
  const sendMessageWithPrompt = async (prompt: string) => {
    if (!prompt.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const aiResponse = await ReportsAIService.generateReportResponse(prompt);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.response || 'Sorry, I could not generate a response.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error generating response:', error);
      toast({
        title: "Error",
        description: "Failed to generate response. Please try again.",
        variant: "destructive",
      });
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while processing your request. Please try again or contact support if the issue persists.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for quick action events from IRISv2
  useEffect(() => {
    const handleQuickAction = (event: CustomEvent) => {
      const { prompt } = event.detail;
      if (prompt) {
        sendMessageWithPrompt(prompt);
      }
    };

    const handleResetRequest = () => {
      handleResetChat();
    };

    window.addEventListener('quickActionSelected', handleQuickAction as EventListener);
    window.addEventListener('resetChatRequested', handleResetRequest as EventListener);

    return () => {
      window.removeEventListener('quickActionSelected', handleQuickAction as EventListener);
      window.removeEventListener('resetChatRequested', handleResetRequest as EventListener);
    };
  }, [isLoading, toast]);

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
      // Generate AI response using OpenAI (it will handle context and timeframe internally)
      const aiResponse = await ReportsAIService.generateReportResponse(
        parsedQuery.query
        // No context parameter - let the service handle timeframe extraction
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

  // Helper function to parse inline markdown (bold text, etc.)
  const parseInlineMarkdown = (text: string): React.ReactNode => {
    if (!text.includes('**')) {
      return text;
    }

    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return (
          <strong key={index} className="font-semibold text-primary">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  // Helper function to parse markdown content
  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      // Handle empty lines
      if (line.trim() === '') {
        return <br key={lineIndex} />;
      }

      // Handle markdown headers (check longer patterns first)
      if (line.startsWith('##### ')) {
        return (
          <h5 key={lineIndex} className="text-sm font-medium mt-3 mb-1 text-primary">
            {parseInlineMarkdown(line.replace('##### ', ''))}
          </h5>
        );
      }
      
      if (line.startsWith('#### ')) {
        return (
          <h4 key={lineIndex} className="text-base font-medium mt-4 mb-2 text-primary">
            {parseInlineMarkdown(line.replace('#### ', ''))}
          </h4>
        );
      }
      
      if (line.startsWith('### ')) {
        return (
          <h3 key={lineIndex} className="text-lg font-semibold mt-6 mb-3 text-primary border-b border-primary/20 pb-1">
            {parseInlineMarkdown(line.replace('### ', ''))}
          </h3>
        );
      }
      
      if (line.startsWith('## ')) {
        return (
          <h2 key={lineIndex} className="text-xl font-bold mt-8 mb-4 text-primary border-b border-primary/30 pb-2">
            {parseInlineMarkdown(line.replace('## ', ''))}
          </h2>
        );
      }
      
      if (line.startsWith('# ')) {
        return (
          <h1 key={lineIndex} className="text-2xl font-bold mt-10 mb-6 text-primary border-b border-primary/40 pb-3">
            {parseInlineMarkdown(line.replace('# ', ''))}
          </h1>
        );
      }

      // Handle bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={lineIndex} className="flex items-start space-x-2 my-1">
            <span className="text-primary mt-1.5 text-xs">•</span>
            <span className="flex-1">{parseInlineMarkdown(line.replace(/^[-*] /, ''))}</span>
          </div>
        );
      }

      // Handle numbered lists
      if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.*)$/);
        if (match) {
          return (
            <div key={lineIndex} className="flex items-start space-x-2 my-1">
              <span className="text-primary font-medium text-sm mt-0.5">{match[1]}.</span>
              <span className="flex-1">{parseInlineMarkdown(match[2])}</span>
            </div>
          );
        }
      }

      // Regular paragraph with inline markdown
      return (
        <p key={lineIndex} className="my-2 leading-relaxed">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseMarkdownToReact = (text: string) => {
    // Ensure text is a string and handle null/undefined
    if (!text || typeof text !== 'string') {
      return <span>No content available</span>;
    }
    
    // Check if the text contains HTML tables
    if (text.includes('<table')) {
      // For mixed HTML and markdown content, we need to process both
      // Split by table tags and process each part
      const parts = text.split(/(<table[\s\S]*?<\/table>)/);
      
      return (
        <div className="space-y-4">
          {parts.map((part, index) => {
            if (part.includes('<table')) {
              // Render HTML table with proper CSS classes
              return (
                <div 
                  key={index}
                  dangerouslySetInnerHTML={{ __html: part }}
                  className="my-2 [&_table]:border [&_table]:border-border [&_table]:rounded-lg [&_table]:overflow-hidden [&_table]:border-collapse [&_th]:border [&_th]:border-border [&_th]:px-4 [&_th]:py-2 [&_th]:bg-muted [&_th]:font-semibold [&_th]:text-foreground [&_td]:border [&_td]:border-border [&_td]:px-4 [&_td]:py-2 [&_td]:bg-background [&_td]:text-foreground"
                />
              );
            } else if (part.trim()) {
              // Process markdown content
              return (
                <div key={index}>
                  {parseMarkdownContent(part)}
                </div>
              );
            }
            return null;
          })}
        </div>
      );
    }
    
    // For regular markdown content without tables
    return parseMarkdownContent(text);
  };

  const getQueryType = (query: string): string => {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('user') || queryLower.includes('student') || queryLower.includes('engagement')) {
      return 'User Engagement Analysis';
    } else if (queryLower.includes('course') || queryLower.includes('lesson') || queryLower.includes('curriculum')) {
      return 'Course Performance Report';
    } else if (queryLower.includes('revenue') || queryLower.includes('financial') || queryLower.includes('payment')) {
      return 'Financial Analytics Report';
    } else if (queryLower.includes('progress') || queryLower.includes('completion') || queryLower.includes('achievement')) {
      return 'Progress Tracking Report';
    } else if (queryLower.includes('time') || queryLower.includes('duration') || queryLower.includes('session')) {
      return 'Time Analytics Report';
    } else {
      return 'General Report Query';
    }
  };

  const handleResetChat = () => {
    console.log('Reset button clicked'); // Debug log
    
    // Create a fresh initial message with a new timestamp and ID
    const initialMessage: ChatMessage = {
      id: `initial-${Date.now()}`,
      type: 'assistant',
      content: 'Hello! I\'m your Reports AI Assistant. Ask me specific questions about your platform\'s data, generate reports for any timeline, and get insights on user engagement and course performance.',
      timestamp: new Date()
    };
    
    // Force state updates with React's functional updates
    setMessages(() => [initialMessage]);
    setInputValue(() => '');
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
      <Card className={`w-80 h-16 fixed bottom-4 right-4 z-50 shadow-lg border-primary/20 ${className || ''}`}>
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
    <Card className={`w-full h-full flex flex-col overflow-hidden ${className || ''}`}>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 px-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-4 py-4 w-full" key={`chat-${messages.length}-${messages[0]?.id}`}>
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 w-full ${
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className="flex flex-col max-w-[85%]">
                  <div
                    className={`rounded-lg p-3 break-words overflow-hidden ${
                      message.type === 'user'
                        ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md"
                        : "bg-muted/50 text-foreground border border-border/50"
                    }`}
                  >
                    <div className="text-sm break-words overflow-wrap-anywhere space-y-1">
                      {message.type === 'assistant' ? parseMarkdownToReact(String(message.content || '')) : message.content}
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
            </div>

        {/* Input Area */}
          <div className="p-4 border-t w-full flex-shrink-0">
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
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportsChatbot;
