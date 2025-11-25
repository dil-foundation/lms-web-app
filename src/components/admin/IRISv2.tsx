import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { IRISService } from '@/services/irisService';
import { IRISMessage, IRISContext, PlatformType } from '@/types/iris';
import { useAuth } from '@/hooks/useAuth';
import { useAILMS } from '@/contexts/AILMSContext';
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
  const { isAIMode } = useAILMS();

  // Auto-detect platform based on current mode (AI Tutor vs LMS)
  // When in AI mode, lock to 'ai_tutor', when in LMS mode, lock to 'lms'
  const lockedPlatform: PlatformType = isAIMode ? 'ai_tutor' : 'lms';
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>(lockedPlatform);
  const [messages, setMessages] = useState<IRISMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userContext, setUserContext] = useState<IRISContext | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [serviceHealth, setServiceHealth] = useState(true);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef<boolean>(true);

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

  // Sync platform with current mode (AI vs LMS)
  useEffect(() => {
    const newPlatform: PlatformType = isAIMode ? 'ai_tutor' : 'lms';
    if (selectedPlatform !== newPlatform) {
      setSelectedPlatform(newPlatform);
    }
  }, [isAIMode]);

  // Initialize component
  useEffect(() => {
    initializeIRIS();
  }, [user]);

  // Re-initialize when platform changes
  useEffect(() => {
    if (userContext) {
      initializeIRIS();
    }
  }, [selectedPlatform]);

  // Auto-scroll to bottom when messages change (only if user is near bottom)
  useEffect(() => {
    if (messages.length === 0 || !shouldAutoScrollRef.current) return;

    const container = chatContainerRef.current;
    if (!container) return;

    // Check if user is near the bottom of the chat (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

    if (isNearBottom) {
      // Scroll the container to the bottom (not the whole page)
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
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

  // Countdown timer effect for rate limit
  useEffect(() => {
    if (rateLimitCountdown === null || rateLimitCountdown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev === null || prev <= 1) {
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

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

      // Set welcome message based on selected platform
      const platformName = selectedPlatform === 'ai_tutor' ? 'AI Tutor' : 'LMS';
      const platformDescription = selectedPlatform === 'ai_tutor'
        ? 'Ask me about AI Tutor stages, exercises, student progress, learning milestones, and analytics!'
        : 'Ask me about courses, enrollments, assignments, quizzes, students, and teachers!';

      const welcomeMessage: IRISMessage = {
        role: 'assistant',
        content: `Hello! I'm IRIS, your AI assistant for **${platformName} Platform** analytics and insights.

**Role:** ${context.role.charAt(0).toUpperCase() + context.role.slice(1)} | **Platform:** ${platformName} | **Access:** ${context.role === 'admin' ? 'Full Platform' : context.role === 'teacher' ? 'Course & Students' : 'Student View'}

${platformDescription}`,
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
      console.log('🌊 Sending streaming message to IRIS:', content);

      // Track if we've started adding the assistant message
      let assistantMessageStarted = false;

      // Truncate conversation history to prevent context overflow
      // Keep only the last 6 messages (3 exchanges) plus the welcome message
      const allMessages = [...messages, userMessage];
      const truncatedMessages = allMessages.length > 7
        ? [allMessages[0], ...allMessages.slice(-6)] // Keep welcome + last 6 messages
        : allMessages;

      console.log(`📊 Message history: ${allMessages.length} total, sending ${truncatedMessages.length} to IRIS`);

      // Use streaming API with platform context
      await IRISService.sendMessageStream(
        truncatedMessages,
        { ...userContext, platform: selectedPlatform },
        // onChunk - update the message content as chunks arrive
        (chunk: string) => {
          setMessages(prev => {
            const updated = [...prev];

            // On first chunk, create the assistant message
            if (!assistantMessageStarted) {
              assistantMessageStarted = true;
              return [...updated, {
                role: 'assistant' as const,
                content: chunk,
                timestamp: new Date()
              }];
            }

            // For subsequent chunks, update the last message
            const lastIndex = updated.length - 1;
            if (updated[lastIndex] && updated[lastIndex].role === 'assistant') {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: updated[lastIndex].content + chunk
              };
            }
            return updated;
          });
        },
        // onComplete - handle completion
        (data) => {
          console.log('✅ Stream complete:', data);
          if (data.tokensUsed) {
            console.log(`💰 Tokens used: ${data.tokensUsed}`);
          }
          setIsLoading(false);
        },
        // onError - handle errors
        (error: string) => {
          console.error('❌ Streaming error:', error);
          console.error('🔍 [IRIS ERROR DEBUG] Full error details:', {
            errorString: error,
            errorType: typeof error,
            errorLength: error?.length || 0,
            contains429: error?.includes('429') || false,
            containsRateLimit: error?.toLowerCase().includes('rate limit') || false,
            containsMCP: error?.includes('MCP') || false,
            containsTools: error?.includes('tools') || false,
            containsDatabase: error?.toLowerCase().includes('database') || false,
            containsConnection: error?.toLowerCase().includes('connection') || false,
            errorPreview: error?.substring(0, 500) || 'N/A',
            timestamp: new Date().toISOString()
          });

          // Check if it's a quota exceeded error (different from rate limit)
          const isQuotaError = error.includes('exceeded your current quota') ||
                              error.includes('insufficient_quota') ||
                              error.includes('check your plan and billing');

          if (isQuotaError) {
            console.log('🔍 [IRIS ERROR DEBUG] Quota exceeded error detected');
            const quotaMessage = `💳 **OpenAI API Quota Exceeded**\n\nThe AI service has exceeded its API quota. This means:\n\n• Your OpenAI account has run out of credits\n• Monthly spending limit has been reached\n• Payment method needs to be updated\n\n**To resolve this:**\n1. Check your OpenAI account billing at https://platform.openai.com/account/billing\n2. Add credits or update your payment method\n3. Increase your usage limits if needed\n\nThis is not a temporary issue - the service will not work until the quota is increased.`;

            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;

              if (lastIndex >= 0 && updated[lastIndex].role === 'assistant') {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: quotaMessage,
                  timestamp: new Date()
                };
              } else {
                updated.push({
                  role: 'assistant',
                  content: quotaMessage,
                  timestamp: new Date()
                });
              }

              return updated;
            });

            setIsLoading(false);
            return;
          }

          // Check if it's a rate limit error (temporary - can retry)
          const rateLimitMatch = error.match(/try again in (\d+)(\w+)/i);
          const retryAfterMatch = error.match(/retry-after[:\s]+(\d+)/i);
          const resetTokensMatch = error.match(/reset-tokens[:\s]+"?(\d+\.?\d*)s/i);

          if (rateLimitMatch || retryAfterMatch || resetTokensMatch || error.toLowerCase().includes('rate limit')) {
            console.log('🔍 [IRIS ERROR DEBUG] Rate limit error detected (temporary)');
            // Extract wait time in seconds
            let waitSeconds = 60; // Default to 60 seconds

            if (rateLimitMatch) {
              const value = parseInt(rateLimitMatch[1]);
              const unit = rateLimitMatch[2].toLowerCase();

              // Convert to seconds based on unit
              if (unit.startsWith('ms')) {
                waitSeconds = Math.ceil(value / 1000);
              } else if (unit.startsWith('s')) {
                waitSeconds = value;
              } else if (unit.startsWith('m')) {
                waitSeconds = value * 60;
              }
            } else if (resetTokensMatch) {
              waitSeconds = Math.ceil(parseFloat(resetTokensMatch[1]));
            } else if (retryAfterMatch) {
              waitSeconds = parseInt(retryAfterMatch[1]);
            }

            console.log(`⏳ Rate limit detected: ${waitSeconds} seconds wait time`);

            // Start countdown timer
            setRateLimitCountdown(waitSeconds);

            // Create user-friendly rate limit message
            const rateLimitMessage = `⏳ **Rate Limit Reached**\n\nThe AI service is currently experiencing high demand. Please wait approximately **${waitSeconds} seconds** before trying again.\n\nThis helps ensure fair usage for all users. Thank you for your patience!`;

            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              // If assistant message already exists, update it
              if (updated[lastIndex] && updated[lastIndex].role === 'assistant') {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: rateLimitMessage
                };
                return updated;
              }
              // Otherwise, add a new assistant message with the error
              return [...updated, {
                role: 'assistant' as const,
                content: rateLimitMessage,
                timestamp: new Date()
              }];
            });

            toast({
              title: "Rate Limit Reached",
              description: `Please wait ${waitSeconds} seconds before trying again`,
              variant: "destructive",
              duration: 5000
            });
          } else {
            // Regular error handling
            console.log('🔍 [IRIS ERROR DEBUG] Non-rate-limit error - displaying to user');
            setMessages(prev => {
              const updated = [...prev];
              const lastIndex = updated.length - 1;
              // If assistant message already exists, update it
              if (updated[lastIndex] && updated[lastIndex].role === 'assistant') {
                updated[lastIndex] = {
                  ...updated[lastIndex],
                  content: `❌ Error: ${error}`
                };
                return updated;
              }
              // Otherwise, add a new assistant message with the error
              return [...updated, {
                role: 'assistant' as const,
                content: `❌ Error: ${error}`,
                timestamp: new Date()
              }];
            });

            toast({
              title: "Request Failed",
              description: "Failed to process your request",
              variant: "destructive"
            });
          }

          setIsLoading(false);
        }
      );

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
        <div className="relative p-4 sm:p-6 md:p-8 rounded-3xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent leading-tight break-words">
                  IRIS
                </h1>
                <p className="text-xs sm:text-sm md:text-lg text-muted-foreground font-light break-words">
                  Intelligent Response & Insight System
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-pulse flex-shrink-0"></div>
                <span className="text-xs sm:text-sm font-medium text-primary whitespace-nowrap">AI Powered</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetChat}
                className="h-8 px-2 sm:px-3 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 flex-shrink-0"
                title="Reset Chat"
              >
                <RotateCcw className="h-3 w-3 sm:mr-1" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Rate Limit Warning Banner - Prominent at top */}
      {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
        <div className="mb-6 p-4 bg-amber-100 dark:bg-amber-950/40 border-2 border-amber-500 dark:border-amber-600 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-pulse" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping"></div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">
                  Rate Limit Active
                </h3>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Too many requests. Please wait before sending another message.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                  {rateLimitCountdown}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                  seconds
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div
                ref={chatContainerRef}
                className="flex-1 p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
              >
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
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => handleExportReport(message, 'pdf', findUserQueryForMessage(index))}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              PDF
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0 shadow-sm">
                        <Bot className="h-4 w-4 text-primary animate-pulse" />
                      </div>
                      <div className="bg-muted/50 border border-border/50 rounded-lg p-4 max-w-[85%] break-words">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-muted-foreground">IRIS is thinking</span>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '1s' }}></div>
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '1s' }}></div>
                            <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '1s' }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>


              {/* Chat Input Area */}
              <div className="p-3 sm:p-4 border-t bg-background/50">
                <div className="flex gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about students, courses, analytics..."
                    className="flex-1 min-h-[44px] max-h-[120px] resize-none text-sm sm:text-base"
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
                    disabled={!inputValue.trim() || isLoading || !userContext || rateLimitCountdown !== null}
                    size="sm"
                    className="flex-shrink-0 self-end h-11 w-11 sm:h-10 sm:w-10 p-0"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 sm:h-4 sm:w-4 animate-spin" />
                    ) : rateLimitCountdown !== null ? (
                      <Clock className="h-4 w-4 sm:h-4 sm:w-4" />
                    ) : (
                      <Send className="h-4 w-4 sm:h-4 sm:w-4" />
                    )}
                  </Button>
                </div>

                {/* Rate Limit Countdown Banner */}
                {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
                  <div className="mt-2 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400 animate-pulse flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-amber-900 dark:text-amber-100">
                        Rate limit in effect
                      </p>
                      <p className="text-[10px] sm:text-xs text-amber-700 dark:text-amber-300 truncate">
                        Wait {rateLimitCountdown}s before sending
                      </p>
                    </div>
                    <div className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums flex-shrink-0">
                      {rateLimitCountdown}
                    </div>
                  </div>
                )}

                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 hidden sm:block">
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
              {/* Platform Indicator - Auto-detected based on mode */}
              <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-1">
                  {selectedPlatform === 'ai_tutor' ? (
                    <Brain className="h-4 w-4 text-primary" />
                  ) : (
                    <BookOpen className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-semibold text-sm text-foreground">
                    {selectedPlatform === 'ai_tutor' ? 'AI Tutor Platform' : 'LMS Platform'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedPlatform === 'ai_tutor'
                    ? 'Answering questions about AI Tutor stages, exercises, and progress'
                    : 'Answering questions about courses, assignments, and enrollments'}
                </p>
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
