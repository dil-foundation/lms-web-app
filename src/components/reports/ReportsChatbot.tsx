import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  
  // Debug: Log messages changes
  useEffect(() => {
    console.log('📝 Messages updated:', messages.length, 'messages');
    messages.forEach((msg, idx) => {
      console.log(`Message ${idx}:`, msg.type, msg.content.substring(0, 50) + '...');
    });
  }, [messages]);
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
  const sendMessageWithPrompt = useCallback(async (prompt: string) => {
    console.log('🚀 sendMessageWithPrompt called with:', prompt);
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
      // Convert messages to conversation history format (reduced for token efficiency)
      const conversationHistory = messages
        .filter(msg => msg.type !== 'user' || msg.content !== prompt) // Exclude the current message
        .slice(-3) // Keep only last 3 messages to save tokens
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content.substring(0, 500) // Truncate long messages
        }));

      console.log('📝 sendMessageWithPrompt - Sending conversation history:', conversationHistory.length, 'messages');
      
      const aiResponse = await ReportsAIService.generateReportResponse(prompt, undefined, conversationHistory);
      
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
  }, [isLoading, toast, messages]);

  // Reset chat function
  const handleResetChat = useCallback(() => {
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
  }, [toast]);

  // Listen for quick action events from IRISv2
  useEffect(() => {
    const handleQuickAction = (event: CustomEvent) => {
      const { prompt } = event.detail;
      console.log('🔍 Quick action triggered:', prompt);
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
  }, [sendMessageWithPrompt, handleResetChat]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const queryText = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      // Convert messages to conversation history format (reduced for token efficiency)
      const conversationHistory = messages
        .filter(msg => msg.type !== 'user' || msg.content !== queryText) // Exclude the current message
        .slice(-3) // Keep only last 3 messages to save tokens
        .map(msg => ({
          role: msg.type === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.content.substring(0, 500) // Truncate long messages
        }));

      console.log('📝 Sending conversation history:', conversationHistory.length, 'messages');
      
      // Use ReportsAIService directly for consistent behavior
      const aiResponse = await ReportsAIService.generateReportResponse(queryText, undefined, conversationHistory);
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.response || 'Sorry, I could not generate a response.',
        timestamp: new Date(),
        reportData: aiResponse.reportData,
        data: aiResponse.reportData
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

  const processRegularLine = (line: string, lineIndex: number) => {
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
  };

  // Helper function to parse markdown content
  const parseMarkdownContent = (text: string) => {
    const lines = text.split('\n');
    let result: React.ReactNode[] = [];
    let tableLines: string[] = [];
    let inTable = false;
    
    const processTable = (tableLines: string[]) => {
      if (tableLines.length < 2) return null;
      
      // First line is headers, second line is separator (ignored), rest are data
      const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
      const rows = tableLines.slice(2).map(row => 
        row.split('|').map(cell => cell.trim()).filter(cell => cell)
      );
      
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full border border-border rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="border border-border px-4 py-2 bg-muted font-semibold text-foreground text-left">
                    {parseInlineMarkdown(header)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border border-border px-4 py-2 bg-background text-foreground">
                      {parseInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };
    
    lines.forEach((line, lineIndex) => {
      // Check if this line looks like a table row
      const isTableRow = line.includes('|') && line.trim().startsWith('|') && line.trim().endsWith('|');
      const isTableSeparator = line.includes('|') && line.includes('-');
      
      if (isTableRow || isTableSeparator) {
        if (!inTable) {
          inTable = true;
          tableLines = [];
        }
        tableLines.push(line);
      } else {
        // End of table, process it
        if (inTable) {
          const table = processTable(tableLines);
          if (table) {
            result.push(<div key={`table-${lineIndex}`}>{table}</div>);
          }
          inTable = false;
          tableLines = [];
        }
        
        // Process regular line
        result.push(processRegularLine(line, lineIndex));
      }
    });
    
    // Handle table at end of content
    if (inTable && tableLines.length > 0) {
      const table = processTable(tableLines);
      if (table) {
        result.push(<div key={`table-end`}>{table}</div>);
      }
    }
    
    return result;
  };

  // UNIVERSAL list formatter - works for ANY entity type (users, courses, etc.)
  const formatUserList = (text: string): string => {
    // Skip formatting for initial greeting messages
    if (text.includes('Hello! I\'m your Reports AI Assistant') || 
        text.includes('Ask me specific questions') ||
        text.length < 50) {
      return text;
    }
    
    const lines = text.split('\n');
    let userData: Array<{name: string, email: string, date: string, role?: string}> = [];
    let courseData: Array<{title: string, subtitle: string, status: string, created: string}> = [];
    
    // SMART DETECTION: Extract entity type dynamically from the text
    const userTypeMatch = text.match(/(\d+)\s+([\w]+)\s+(?:registered|who are|enrolled|not enrolled)/i);
    const courseMatch = text.match(/(\d+)\s+(courses?|classes?)/i);
    
    // Only process if we have clear indicators of list data
    const hasTableStructure = text.includes('|') && text.includes('---');
    const hasListKeywords = text.toLowerCase().includes('found') || text.toLowerCase().includes('list') || 
                           text.toLowerCase().includes('registered') || text.toLowerCase().includes('enrolled');
    
    // Skip if this doesn't look like actual data response
    if (!hasTableStructure && !hasListKeywords && !userTypeMatch && !courseMatch) {
      return text;
    }
    
    const isUserList = text.toLowerCase().includes('student') || text.toLowerCase().includes('teacher') || 
                      text.toLowerCase().includes('admin') || text.toLowerCase().includes('user');
    const isCourseList = text.toLowerCase().includes('course') || text.toLowerCase().includes('class');
    
    // ENROLLMENT-SPECIFIC DETECTION
    const isNotEnrolled = text.toLowerCase().includes('not enrolled') || text.toLowerCase().includes('without') || 
                         text.toLowerCase().includes('haven\'t enrolled');
    const isEnrolled = text.toLowerCase().includes('enrolled') && !isNotEnrolled;
    
    // ACTIVITY-SPECIFIC DETECTION
    const isRecentActivity = text.toLowerCase().includes('logged in') || text.toLowerCase().includes('login') ||
                            (text.toLowerCase().includes('active') && (text.toLowerCase().includes('today') || 
                             text.toLowerCase().includes('24') || text.toLowerCase().includes('recent')));
    
    if (isCourseList && courseMatch) {
      // COURSE LIST FORMATTING
      const courseCount = courseMatch[1];
      const entityType = 'courses';
      
      // Extract course data from various formats
      for (const line of lines) {
        // Format: | Course Title | Subtitle | Status | Created Date |
        if (line.includes('|') && !line.includes('Title') && !line.includes('---')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p);
          if (parts.length >= 3) {
            courseData.push({
              title: parts[0] || 'Untitled Course',
              subtitle: parts[1] || 'No description',
              status: parts[2] || 'Unknown',
              created: parts[3] || 'Unknown'
            });
          }
        }
      }
      
      if (courseData.length > 0) {
        let formattedText = `## 📚 Courses Available on the Platform\n\n`;
        formattedText += `### Summary\n`;
        formattedText += `Found **${courseData.length} courses** available on the platform.\n\n`;
        formattedText += `| Course Title | Description | Status | Created Date |\n`;
        formattedText += `|--------------|-------------|--------|-------------|\n`;
        
        for (const course of courseData) {
          formattedText += `| ${course.title} | ${course.subtitle} | ${course.status} | ${course.created} |\n`;
        }
        
        formattedText += `\n### Recommendations\n`;
        formattedText += `1. Promote active courses to increase enrollment\n`;
        formattedText += `2. Review inactive courses for potential updates or archival\n`;
        formattedText += `3. Monitor course performance and student feedback\n`;
        
        return formattedText;
      }
    } else if (isUserList) {
      // USER LIST FORMATTING with enrollment-specific logic
      const userType = userTypeMatch ? userTypeMatch[2].toLowerCase() : 'users';
      
      // DYNAMIC ICONS: Map any user type to appropriate icon
      const iconMap: {[key: string]: string} = {
        'teacher': '👨‍🏫', 'teachers': '👨‍🏫',
        'student': '📚', 'students': '📚', 
        'admin': '👑', 'admins': '👑',
        'user': '👥', 'users': '👥'
      };
      const icon = iconMap[userType] || '📚';
      
      // DYNAMIC TITLE based on enrollment status or activity
      const capitalizedType = userType.charAt(0).toUpperCase() + userType.slice(1);
      let title = `${capitalizedType} Registered on the Platform`;
      
      if (isRecentActivity) {
        title = `${capitalizedType} Recently Active on Platform`;
      } else if (isNotEnrolled) {
        title = `${capitalizedType} Not Enrolled in Any Course`;
      } else if (isEnrolled) {
        title = `${capitalizedType} Enrolled in Courses`;
      }
      
      // Extract user data from various formats
      for (const line of lines) {
        // Format: | Arun | Varadharajalu | arunvaradharajalu@gmail.com | 2025-07-09 |
        if (line.includes('|') && line.includes('@') && !line.includes('First Name')) {
          const parts = line.split('|').map(p => p.trim()).filter(p => p);
          if (parts.length >= 4) {
            const firstName = parts[0];
            const lastName = parts[1];
            const email = parts[2];
            const date = parts[3];
            const role = parts[4] || 'Registered';
            
            userData.push({
              name: `${firstName} ${lastName}`,
              email: email,
              date: date,
              role: role
            });
          }
        }
      }
      
      // Format the response regardless of whether we have data or not
      let formattedText = `## ${icon} ${title}\n\n`;
      formattedText += `### Summary\n`;
      
      if (isRecentActivity) {
        if (userData.length === 0) {
          formattedText += `**No ${userType} have logged in within the past 24 hours.**\n\n`;
          formattedText += `This could indicate:\n`;
          formattedText += `- Low platform engagement\n`;
          formattedText += `- Users may be accessing during different time periods\n`;
          formattedText += `- Possible technical issues preventing login\n\n`;
        } else {
          formattedText += `Found **${userData.length} ${userType}** who have been active recently (logged in within the past 24 hours).\n\n`;
        }
      } else if (isNotEnrolled) {
        formattedText += `Found **${userData.length} ${userType}** who haven't enrolled in any course yet.\n\n`;
      } else if (isEnrolled) {
        formattedText += `Found **${userData.length} ${userType}** who are enrolled in at least one course.\n\n`;
      } else {
        formattedText += `Found **${userData.length} ${userType}** who are registered on the platform.\n\n`;
      }
      
      // Create the table only if we have data
      if (userData.length > 0) {
        formattedText += `| Name | Email | Registration Date | Status |\n`;
        formattedText += `|------|-------|-------------------|--------|\n`;
        
        for (const user of userData) {
          let status = user.role || 'Registered';
          if (isRecentActivity) {
            status = 'Recently Active';
          } else if (isNotEnrolled) {
            status = 'Not Enrolled';
          } else if (isEnrolled) {
            status = 'Enrolled';
          }
          formattedText += `| ${user.name} | ${user.email} | ${user.date} | ${status} |\n`;
        }
      }
      
      // ACTIVITY/ENROLLMENT-SPECIFIC RECOMMENDATIONS
      formattedText += `\n### Recommendations\n`;
      if (isRecentActivity) {
        if (userData.length === 0) {
          formattedText += `1. Review system logs to ensure login tracking is working correctly\n`;
          formattedText += `2. Consider sending email reminders to encourage platform engagement\n`;
          formattedText += `3. Check if users are experiencing technical difficulties accessing the platform\n`;
          formattedText += `4. Consider expanding the time window to see broader user activity patterns\n`;
        } else {
          formattedText += `1. Engage with these active users through personalized content and notifications\n`;
          formattedText += `2. Analyze their activity patterns to optimize platform features\n`;
          formattedText += `3. Consider sending targeted promotions or course recommendations while they're engaged\n`;
        }
      } else if (isNotEnrolled) {
        formattedText += `1. Send personalized course recommendations to these students\n`;
        formattedText += `2. Follow up with enrollment assistance and onboarding support\n`;
        formattedText += `3. Consider targeted marketing campaigns to encourage course enrollment\n`;
      } else if (isEnrolled) {
        formattedText += `1. Monitor their progress and engagement levels in enrolled courses\n`;
        formattedText += `2. Provide additional support for struggling students\n`;
        formattedText += `3. Consider advanced course recommendations for high performers\n`;
      } else {
        formattedText += `1. Send personalized welcome and onboarding communications\n`;
        formattedText += `2. Provide role-specific training and support materials\n`;
        formattedText += `3. Monitor engagement levels and platform activity\n`;
      }
      
      return formattedText;
    }
    
    return text; // Return original if no formatting needed
  };

  const parseMarkdownToReact = (text: string) => {
    // Ensure text is a string and handle null/undefined
    if (!text || typeof text !== 'string') {
      return <span>No content available</span>;
    }
    
    // First, try to format user lists (students, teachers, etc.)
    const formattedText = formatUserList(text);
    
    // Check if the text contains HTML tables
    if (formattedText.includes('<table')) {
      // For mixed HTML and markdown content, we need to process both
      // Split by table tags and process each part
      const parts = formattedText.split(/(<table[\s\S]*?<\/table>)/);
      
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
    return parseMarkdownContent(formattedText);
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