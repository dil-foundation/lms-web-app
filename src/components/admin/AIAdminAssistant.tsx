import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Settings, 
  Users, 
  BookOpen, 
  Shield, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  FileText, 
  BarChart3, 
  Zap, 
  Brain, 
  Target, 
  Globe, 
  Database, 
  Lock, 
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  HelpCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  category?: 'general' | 'users' | 'courses' | 'analytics' | 'system' | 'security';
  suggestions?: string[];
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: string;
}

interface IRISProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const IRIS: React.FC<IRISProps> = ({ userProfile }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello ${userProfile?.first_name || 'Administrator'}! I'm your AI-powered platform management assistant. I'm here to help you with user analytics, course management, system optimization, and comprehensive insights. The system is currently being updated with new functionality.`,
      timestamp: new Date(),
      category: 'general',
      suggestions: [
        'Show me user analytics',
        'Help with course management',
        'Check system performance',
        'Generate a report'
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions: QuickAction[] = [
    {
      id: '1',
      title: 'User Analytics',
      description: 'Get insights on user engagement and growth',
      icon: <Users className="h-5 w-5" />,
      category: 'analytics',
      action: 'Show me detailed user analytics including registration trends, active users, and engagement metrics.'
    },
    {
      id: '2',
      title: 'Course Management',
      description: 'Help with course creation and management',
      icon: <BookOpen className="h-5 w-5" />,
      category: 'courses',
      action: 'I need help managing courses. Show me course performance metrics and suggest improvements.'
    },
    {
      id: '3',
      title: 'System Health',
      description: 'Check platform performance and issues',
      icon: <Shield className="h-5 w-5" />,
      category: 'system',
      action: 'Check system health and performance metrics. Are there any issues I should be aware of?'
    },
    {
      id: '4',
      title: 'Security Overview',
      description: 'Review security status and recommendations',
      icon: <Lock className="h-5 w-5" />,
      category: 'security',
      action: 'Provide a security overview and any recommendations for improving platform security.'
    },
    {
      id: '5',
      title: 'Generate Report',
      description: 'Create comprehensive platform reports',
      icon: <FileText className="h-5 w-5" />,
      category: 'analytics',
      action: 'Generate a comprehensive platform report including user metrics, course performance, and system status.'
    },
    {
      id: '6',
      title: 'Optimization Tips',
      description: 'Get AI-powered optimization suggestions',
      icon: <Zap className="h-5 w-5" />,
      category: 'general',
      action: 'What optimization suggestions do you have for improving the platform performance and user experience?'
    }
  ];

  // Synthetic responses removed - ready for new implementation

  const scrollToBottom = () => {
    // Use setTimeout to ensure DOM has updated before scrolling
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    // Only scroll if there are messages
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: content.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Placeholder for new IRIS implementation
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Thank you for your message: "${content}". 

The AI assistant system is currently being reimplemented with new functionality. This placeholder response confirms that the UI is working and ready for the new implementation.

🔧 **Status**: Implementation in progress
📝 **Message received**: ${content}
⏰ **Timestamp**: ${new Date().toLocaleString()}`,
        timestamp: new Date(),
        category: 'general'
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1000);
  };

  const handleQuickAction = (action: QuickAction) => {
    handleSendMessage(action.action);
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case 'analytics': return <BarChart3 className="h-4 w-4" />;
      case 'users': return <Users className="h-4 w-4" />;
      case 'courses': return <BookOpen className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'security': return <Shield className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'analytics': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'users': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'courses': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'system': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'security': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
        <div className="relative p-8 md:p-10 rounded-3xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center shadow-lg">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                  IRIS
                </h1>
                <p className="text-lg text-muted-foreground font-light mt-2">
                  Intelligent Response & Insight System
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1 bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
              <Badge variant="outline" className="px-3 py-1">
                <Clock className="h-3 w-3 mr-1" />
                Always Available
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="quick-actions" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Actions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface */}
            <div className="lg:col-span-2">
                             <Card className="h-[700px] flex flex-col">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    AI Chat Interface
                  </CardTitle>
                </CardHeader>
                                 <CardContent className="flex-1 flex flex-col p-0">
                   <ScrollArea className="flex-1 px-6">
                     <div className="space-y-4 pb-4 min-h-0">
                      {messages.map((message) => (
                                                 <div
                           key={message.id}
                           className={cn(
                             "w-full mb-4",
                             message.type === 'user' ? 'flex justify-end' : 'flex justify-start'
                           )}
                         >
                          {message.type === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0">
                              <Bot className="h-4 w-4 text-primary" />
                            </div>
                          )}
                          
                                                     <div className={cn(
                             "max-w-[95%] sm:max-w-[90%] md:max-w-[85%] rounded-2xl px-4 py-3 ai-chat-container",
                             message.type === 'user' 
                               ? 'bg-primary text-primary-foreground ml-2' 
                               : 'bg-muted/50 text-foreground mr-2'
                           )}>
                             <div className="text-sm leading-relaxed ai-chat-message">
                               {message.content}
                             </div>
                             <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/20">
                               <div className="flex items-center gap-2">
                                 {message.category && (
                                   <Badge 
                                     variant="secondary" 
                                     className={cn("text-xs px-2 py-0.5", getCategoryColor(message.category))}
                                   >
                                     {getCategoryIcon(message.category)}
                                     <span className="ml-1 capitalize">{message.category}</span>
                                   </Badge>
                                 )}
                               </div>
                               <span className="text-xs opacity-60">
                                 {format(message.timestamp, 'HH:mm')}
                               </span>
                             </div>
                           </div>
                          
                          {message.type === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-600/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                {userProfile?.first_name?.[0] || 'A'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {isLoading && (
                        <div className="flex gap-3 justify-start">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-muted/50 rounded-2xl px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex space-x-1">
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                              <span className="text-sm text-muted-foreground">AI is thinking...</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                  
                  <div className="p-6 border-t">
                    <div className="flex gap-3">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about platform management..."
                        className="flex-1"
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                        disabled={isLoading}
                      />
                      <Button 
                        onClick={() => handleSendMessage(inputValue)}
                        disabled={!inputValue.trim() || isLoading}
                        className="px-6"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5 text-primary" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="outline"
                      className="w-full justify-start h-auto p-4 text-left hover:bg-primary/5 hover:border-primary/20 transition-all duration-200"
                      onClick={() => handleQuickAction(action)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          {action.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{action.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">{action.description}</div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Info className="h-5 w-5 text-primary" />
                    Capabilities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>User Analytics & Insights</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Course Management</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>System Health Monitoring</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Security Analysis</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Performance Optimization</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Report Generation</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => (
              <Card key={action.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => handleQuickAction(action)}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                      {action.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {action.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {action.description}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-3 w-full group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    Execute
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
