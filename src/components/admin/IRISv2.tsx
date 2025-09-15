import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { IRISService } from '@/services/irisService';
import { IRISMessage, IRISContext, PlatformType } from '@/types/iris';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { ReportExportService, ExportFormat } from '@/services/reportExportService';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Bot, 
  Send, 
  Zap, 
  CheckCircle, 
  FileText, 
  Activity, 
  Shield, 
  Users, 
  BookOpen, 
  TrendingUp,
  MessageSquare,
  MessageCircle,
  BarChart3,
  Settings,
  GraduationCap,
  Clock,
  Award,
  Target,
  Brain,
  Mic,
  Calendar,
  Trophy,
  Lightbulb,
  RotateCcw,
  Unlock,
  Loader2,
  AlertCircle,
  Sparkles,
  Database,
  TrendingDown,
  Download,
  FileSpreadsheet,
  ChevronDown
} from 'lucide-react';

export const IRISv2 = () => {
  const { user } = useAuth();
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>('lms');
  const [messages, setMessages] = useState<IRISMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<IRISContext | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [serviceHealth, setServiceHealth] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Platform-specific quick actions (AI Tutor tables)
  const aiTutorActions = [
    {
      title: "Daily Learning Analytics",
      description: "KPIs from daily analytics table",
      icon: BarChart3,
      prompt: "Show me daily learning analytics for AI Tutor platform"
    },
    {
      title: "Learning Milestones",
      description: "Achievements unlocked by users",
      icon: Trophy,
      prompt: "Give me a report on learning milestones and achievements"
    },
    {
      title: "Learning Unlocks",
      description: "Stages/topics users unlocked",
      icon: Unlock,
      prompt: "Show me learning unlocks and topic progression"
    },
    {
      title: "Exercise Progress",
      description: "Completion & accuracy by exercise",
      icon: Target,
      prompt: "Generate exercise progress and completion analytics"
    },
    {
      title: "User Progress Summary",
      description: "Overall learner progression",
      icon: TrendingUp,
      prompt: "Give me a list of students and their progress"
    },
    {
      title: "Weekly Summary",
      description: "Weekly learning highlights",
      icon: Calendar,
      prompt: "Give me this week's learning analytics summary"
    }
  ];

  const lmsActions = [
    {
      title: "Course Management",
      description: "Create & manage courses",
      icon: BookOpen,
      prompt: "Give me a list of courses and their enrollment status"
    },
    {
      title: "Student Analytics",
      description: "Track student engagement",
      icon: Users,
      prompt: "Give me a list of students registered on the platform"
    },
    {
      title: "Teacher Overview",
      description: "Review teacher activity",
      icon: GraduationCap,
      prompt: "Give me a list of teachers we have"
    },
    {
      title: "Admin Users",
      description: "View admin accounts",
      icon: Shield,
      prompt: "Show me a list of admin users"
    },
    {
      title: "Learning Outcomes",
      description: "Assess course effectiveness",
      icon: Trophy,
      prompt: "Generate learning outcomes and course effectiveness report"
    },
    {
      title: "Content Management Analytics",
      description: "Analyze course content & structure",
      icon: FileText,
      prompt: "Show me content management and course structure analytics"
    }
  ];

  const currentActions = selectedPlatform === 'ai_tutor' ? aiTutorActions : lmsActions;

  // Initialize component
  useEffect(() => {
    initializeIRIS();
  }, [user]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update suggestions when messages change
  useEffect(() => {
    if (messages.length > 0 && userContext) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const newSuggestions = IRISService.generateSuggestions(
          lastMessage.content, 
          userContext.role
        );
        setSuggestions(newSuggestions);
      }
    }
  }, [messages, userContext]);

  const initializeIRIS = async () => {
    try {
      console.log('🚀 Initializing IRIS...');
      
      // Get user context first
      const context = await IRISService.getUserContext();
      setUserContext(context);

      if (!context) {
        console.warn('No user context available');
        toast({
          title: "Authentication Required",
          description: "Please log in to use IRIS",
          variant: "destructive"
        });
        return;
      }

      console.log('👤 User context loaded:', context.role);

      // Check service health (don't block on this)
      IRISService.checkServiceHealth()
        .then(health => {
          setServiceHealth(health);
          console.log(`🏥 Service health: ${health ? 'healthy' : 'degraded'}`);
        })
        .catch(error => {
          console.warn('Health check failed:', error);
          setServiceHealth(false);
        });

      // Set welcome message
      const welcomeMessage: IRISMessage = {
        role: 'assistant',
        content: `Hello! I'm IRIS, your AI assistant for platform analytics and insights.

**Role:** ${context.role.charAt(0).toUpperCase() + context.role.slice(1)} | **Access:** ${context.role === 'admin' ? 'Full Platform' : context.role === 'teacher' ? 'Course & Students' : 'Student View'}

Ask me about students, courses, analytics, or any platform data you need!`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);

      // Set initial suggestions
      setSuggestions(IRISService.generateSuggestions('', context.role));

      console.log('✅ IRIS initialized successfully');

    } catch (error) {
      console.error('Failed to initialize IRIS:', error);
      
      // Set error message
      const errorMessage: IRISMessage = {
        role: 'assistant',
        content: `I encountered an error during initialization. This might be due to:

• **Network connectivity issues**
• **Authentication problems** 
• **Service unavailability**

**What you can try:**
1. Refresh the page
2. Check your internet connection
3. Log out and log back in
4. Contact support if the issue persists

Error details: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      
      setMessages([errorMessage]);
      
      toast({
        title: "Initialization Error",
        description: "IRIS encountered an error during startup. See the chat for details.",
        variant: "destructive"
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading || !userContext) return;

    // Validate message
    const validation = IRISService.validateMessage(content);
    if (!validation.valid) {
      toast({
        title: "Invalid Message",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    const userMessage: IRISMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      console.log('🚀 Sending message to IRIS:', content);

      const response = await IRISService.sendMessage([...messages, userMessage], userContext);
      
      if (response.success) {
        const assistantMessage: IRISMessage = {
          ...response.message,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, assistantMessage]);
        
        // Show success toast with tools used
        if (response.toolsUsed && response.toolsUsed.length > 0) {
          toast({
            title: "Query Executed Successfully",
            description: `Used database tools: ${response.toolsUsed.join(', ')}`,
          });
        }

        // Log tokens used if available
        if (response.tokensUsed) {
          console.log(`💰 Tokens used: ${response.tokensUsed}`);
        }
      } else {
        // Handle error response
        const errorMessage: IRISMessage = {
          role: 'assistant',
          content: response.message.content,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, errorMessage]);
        
        toast({
          title: "Request Failed",
          description: response.error || "Failed to process your request",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: IRISMessage = {
        role: 'assistant',
        content: `I apologize, but I encountered an unexpected error. Please try again or contact support if the issue persists.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Connection Error",
        description: "Failed to connect to IRIS service",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (prompt: string) => {
    if (!isLoading && userContext) {
      handleSendMessage(prompt);
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setInputValue('');
    setSuggestions([]);
    initializeIRIS();
    
    toast({
      title: "Chat Reset",
      description: "Starting a new conversation with IRIS"
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  // Export functionality handlers
  const handleExportReport = async (message: IRISMessage, format: ExportFormat, userQuery: string) => {
    try {
      const exportData = ReportExportService.extractExportData(
        {
          content: message.content,
          timestamp: message.timestamp?.toLocaleString(),
          data: (message as any).data || (message as any).reportData
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

  const findUserQueryForMessage = (messageIndex: number): string => {
    // Find the user message that preceded this assistant message
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content;
      }
    }
    return 'General Report Query';
  };

  const formatMessage = (content: string): string => {
    let formatted = content;
  
    // Handle tables
    const tableRegex = /(\|[^\n]*\|\n)+/g;
    formatted = formatted.replace(tableRegex, (match) => {
      const rows = match.trim().split('\n');
      if (rows.length < 2) return match;
  
      const allHeaders = rows[0].split('|').map(h => h.trim()).filter(h => h);
      const avatarColumnIndices: number[] = [];
  
      const headers = allHeaders.filter((header, index) => {
        const headerLower = header.toLowerCase();
        if (headerLower.includes('avatar') || headerLower.includes('profile_picture') || headerLower.includes('image_url')) {
          avatarColumnIndices.push(index);
          return false;
        }
        return true;
      });
  
      let dataStartIndex = 1;
      if (rows[1] && rows[1].includes('-')) {
        dataStartIndex = 2;
      }
  
      const dataRows = rows.slice(dataStartIndex).map(row => {
        const allCells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
        return allCells.filter((_, index) => !avatarColumnIndices.includes(index));
      }).filter(row => row.length > 0);
  
      let tableHTML = `
        <div class="overflow-x-auto my-4 rounded-xl border border-border shadow-sm">
          <table class="w-full table-auto border-collapse text-sm">
            <thead class="bg-muted sticky top-0">
              <tr>
                ${headers.map(header => `
                  <th class="px-4 py-2 text-left font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap border-b border-border">
                    ${header}
                  </th>`).join('')}
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              ${dataRows.map((row, rowIndex) => `
                <tr class="hover:bg-muted/40 transition-colors">
                  ${row.map((cell, cellIndex) => {
                    const header = headers[cellIndex] || '';
                    const headerLower = header.toLowerCase();
                    let extraClasses = "px-4 py-2 align-top text-foreground";
  
                    if (headerLower.includes('email')) {
                      extraClasses += " font-mono text-xs truncate max-w-[200px]";
                    } else if (headerLower.includes('id')) {
                      extraClasses += " font-mono text-xs break-all";
                    } else if (cell && cell.length > 30) {
                      extraClasses += " max-w-[250px] break-words";
                    }
  
                    return `<td class="${extraClasses}" title="${cell || ''}">${cell || ''}</td>`;
                  }).join('')}
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      `;
  
      return tableHTML;
    });
  
    // Headings - consistent style with dividers
formatted = formatted.replace(/^###### (.*$)/gm, '<h6 class="text-sm font-semibold text-foreground mt-3 mb-2 border-b border-border">$1</h6>');
formatted = formatted.replace(/^##### (.*$)/gm, '<h5 class="text-base font-semibold text-foreground mt-3 mb-2 border-b border-border">$1</h5>');
formatted = formatted.replace(/^#### (.*$)/gm, '<h4 class="text-lg font-semibold text-foreground mt-4 mb-2 border-b border-border">$1</h4>');
formatted = formatted.replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-foreground mt-5 mb-3 border-b border-border">$1</h3>');
formatted = formatted.replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold text-foreground mt-6 mb-4 border-b border-border">$1</h2>');
formatted = formatted.replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-foreground mt-8 mb-5 border-b border-border">$1</h1>');

// Bold / italic (keep consistent)
formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
formatted = formatted.replace(/\*(.*?)\*/g, '<em class="italic text-muted-foreground">$1</em>');

// Bullet point lists
formatted = formatted.replace(/^- (.*$)/gm, '<li>$1</li>');
formatted = formatted.replace(/^• (.*$)/gm, '<li>$1</li>');
formatted = formatted.replace(/(<li>.*?<\/li>\s*)+/g,
  match => `<ul class="list-disc list-inside space-y-2 text-sm md:text-base text-muted-foreground my-2">${match}</ul>`
);

// Numbered lists (for Recommendations, Steps, etc.)
formatted = formatted.replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>');
formatted = formatted.replace(/(<li>.*?<\/li>\s*)+/g,
  match => `<ol class="list-decimal list-inside space-y-2 text-sm md:text-base text-muted-foreground my-2">${match}</ol>`
);

// Key Insights & Recommendations
formatted = formatted.replace(/📊 Key Insights:?|Key Insights:?/g,
  '<div class="text-lg font-semibold text-foreground mt-5 mb-2 flex items-center gap-2">📊 Key Insights</div>'
);

formatted = formatted.replace(/💡 Recommendations:?|Recommendations:?/g,
  '<div class="text-lg font-semibold text-foreground mt-5 mb-2 flex items-center gap-2">💡 Recommendations</div>'
);
  
    return formatted;
  };
  

  return (
    <div className="space-y-6">
      {/* IRIS Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 rounded-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent" style={{ lineHeight: '3rem' }}>
                  IRIS
                </h1>
                <p className="text-lg text-muted-foreground font-light">
                  Intelligent Response & Insight System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-primary">AI Powered</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChat}
                className="h-8 px-3 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                title="Reset Chat"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main IRIS Interface */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* IRIS Chat Interface - Takes up 2 columns */}
        <div className="xl:col-span-2">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/95">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
              <CardTitle className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                AI Chat Interface
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 h-[750px] flex flex-col">
              {/* Service Status Bar */}
              {!serviceHealth && (
                <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-700">
                    IRIS service is experiencing issues. Some features may be limited.
                  </span>
                </div>
              )}

              {/* Chat Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                <div className="space-y-6 max-w-none">
                  {messages.map((message, index) => (
                    <div key={index} className="space-y-2">
                      <div className={`flex items-start space-x-3 ${
                        message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                          {message.role === 'user' ? (
                            <div className="w-4 h-4 bg-primary rounded-full" />
                          ) : (
                            <Bot className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className={`rounded-lg p-4 max-w-[85%] break-words ${
                          message.role === 'user' 
                            ? 'bg-primary text-primary-foreground ml-auto' 
                            : 'bg-muted/50 border border-border/50'
                        }`}>
                          <div 
                            className={`prose prose-sm max-w-none leading-relaxed ${
                              message.role === 'user' ? 'prose-invert' : ''
                            }`}
                            style={{ 
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word'
                            }}
                            dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                          />
                          {message.timestamp && (
                            <div className={`text-xs mt-2 ${
                              message.role === 'user' 
                                ? 'text-primary-foreground/70' 
                                : 'text-muted-foreground'
                            }`}>
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Export buttons for assistant messages with data - positioned below the message */}
                      {message.role === 'assistant' && ReportExportService.hasExportableData(message) && (
                        <div className="flex items-center gap-2 mt-2 ml-11">
                          <span className="text-xs text-muted-foreground">Export:</span>
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
                  ))}
                  
                  {isLoading && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="bg-muted/50 border border-border/50 rounded-lg p-4 max-w-[85%] break-words">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">
                            Analyzing your request and querying the database...
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>


              {/* Chat Input Area */}
              <div className="p-4 border-t bg-background/50">
                <div className="flex space-x-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about students, courses, analytics, or any platform data..."
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                    disabled={isLoading || !userContext}
                    rows={1}
                    style={{ height: 'auto' }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                  />
                  <Button
                    onClick={() => handleSendMessage(inputValue)}
                    disabled={!inputValue.trim() || isLoading || !userContext}
                    size="sm"
                    className="flex-shrink-0 self-end"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="xl:col-span-1 space-y-6">
          {/* Quick Actions */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-primary/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <Zap className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Platform Selector */}
              <div>
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

              <div className="space-y-2">
                {currentActions.map((action, index) => {
                  const IconComponent = action.icon;
                  return (
                    <Button 
                      key={index}
                      variant="ghost" 
                      className="w-full justify-start hover:bg-primary/10 hover:text-primary h-auto py-3 px-3 text-left"
                      onClick={() => handleQuickAction(action.prompt)}
                    >
                      <div className="flex items-start gap-3 w-full min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="font-medium text-sm leading-tight">{action.title}</div>
                          <div className="text-xs text-muted-foreground leading-tight mt-0.5 break-words">{action.description}</div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Capabilities */}
          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-green-50/30 dark:to-green-950/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-primary">
                <CheckCircle className="w-4 h-4" />
                Capabilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Database className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Real-time Database Queries</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Brain className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>AI-Powered Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Natural Language Queries</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Smart Insights & Recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Multi-Platform Support</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span>Role-Based Data Access</span>
              </div>
              {serviceHealth && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span>Service Online & Ready</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
