import React, { useState, useRef, useEffect } from 'react';
import { useAPEX } from '@/contexts/AIAssistantContext';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  MessageCircle,
  Send,
  X,
  Bot,
  User,
  Phone,
  Mail,
  HelpCircle,
  Sparkles,
  Minimize2,
  Maximize2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface APEXProps {
  className?: string;
}

export const APEX: React.FC<APEXProps> = ({ className }) => {
  const { user } = useAuth();
  const {
    state,
    openAssistant,
    closeAssistant,
    sendMessage,
    sendQuickReply,
    contactAdmin,
    clearMessages
  } = useAPEX();

  const [inputValue, setInputValue] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.messages, state.isTyping]);

  useEffect(() => {
    if (state.isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state.isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || state.isLoading) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await sendMessage(message);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickReply = async (reply: string) => {
    await sendQuickReply(reply);
  };

  const handleContactAdmin = async () => {
    await contactAdmin();
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const MessageBubble: React.FC<{ message: any }> = ({ message }) => {
    const isUser = message.sender === 'user';
    
    return (
      <div className={cn(
        "flex gap-3 mb-4",
        isUser ? "justify-end" : "justify-start"
      )}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0">
            <Bot className="w-4 h-4 text-primary" />
          </div>
        )}
        
        <div className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground ml-12" 
            : "bg-muted/50 text-foreground mr-12"
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          
          {message.quickReplies && message.quickReplies.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs opacity-75 mb-2">Quick replies:</p>
              <div className="flex flex-wrap gap-2">
                {message.quickReplies.slice(0, 3).map((reply: string, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 px-2 bg-background/50 hover:bg-background/80"
                    onClick={() => handleQuickReply(reply)}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {message.type === 'contact_admin' && (
            <div className="mt-3">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleContactAdmin}
              >
                <Phone className="w-3 h-3 mr-1" />
                Contact Admin
              </Button>
            </div>
          )}
          
          <div className="text-xs opacity-60 mt-2">
            {format(message.timestamp, 'HH:mm')}
          </div>
        </div>
        
        {isUser && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-secondary/20 to-secondary/30 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-secondary" />
          </div>
        )}
      </div>
    );
  };

  const TypingIndicator = () => (
    <div className="flex gap-3 mb-4 justify-start">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center flex-shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-muted/50 rounded-2xl px-4 py-3 mr-12">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Floating Assistant Button */}
      {!state.isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          {/* Pulsing Animation Rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="absolute w-14 h-14 rounded-full bg-primary/30" 
              style={{ 
                animation: 'ai-pulse 2s ease-in-out infinite',
                animationDelay: '0s'
              }}
            ></div>
            <div 
              className="absolute w-16 h-16 rounded-full bg-primary/20" 
              style={{ 
                animation: 'ai-pulse 2s ease-in-out infinite',
                animationDelay: '0.5s'
              }}
            ></div>
            <div 
              className="absolute w-18 h-18 rounded-full bg-primary/15" 
              style={{ 
                animation: 'ai-pulse 2s ease-in-out infinite',
                animationDelay: '1s'
              }}
            ></div>
            <div 
              className="absolute w-20 h-20 rounded-full bg-primary/10" 
              style={{ 
                animation: 'ai-wave 3s ease-out infinite',
                animationDelay: '1.5s'
              }}
            ></div>
          </div>
          
          {/* Main Button */}
          <Button
            onClick={openAssistant}
            className={cn(
              "relative h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:scale-105 hover:shadow-primary/25",
              className
            )}
            style={{
              boxShadow: '0 0 20px rgba(141, 198, 63, 0.3), 0 0 40px rgba(141, 198, 63, 0.1)'
            }}
          >
{user ? <Headphones className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse border-2 border-background shadow-lg"></div>
          </Button>
        </div>
      )}

      {/* Chat Dialog */}
      <Dialog open={state.isOpen} onOpenChange={closeAssistant}>
        <DialogContent className="max-w-md h-[600px] p-0 flex flex-col">
          <DialogHeader className="p-4 pb-2 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/30 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold">AI Digital Assistant</DialogTitle>
                  <p className="text-xs text-muted-foreground">Always here to help</p>
                </div>
              </div>
              
                             <div className="flex items-center gap-3">
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={toggleMinimize}
                   className="h-8 w-8 p-0 hover:bg-muted/50 rounded-lg transition-colors"
                 >
                   {isMinimized ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                 </Button>
                 <Button
                   variant="ghost"
                   size="sm"
                   onClick={clearMessages}
                   className="h-8 w-8 p-0 hover:bg-muted/50 rounded-lg transition-colors"
                 >
                   <RotateCcw className="h-4 w-4" />
                 </Button>
               </div>
            </div>
          </DialogHeader>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {state.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  
                  {state.isTyping && <TypingIndicator />}
                  
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              <Separator />

              {/* Input Area */}
              <div className="p-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about the platform..."
                    disabled={state.isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || state.isLoading}
                    size="sm"
                    className="px-3"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Quick Actions */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleContactAdmin()}
                    className="text-xs"
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Contact Admin
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickReply("I need help with my account")}
                    className="text-xs"
                  >
                    <HelpCircle className="w-3 h-3 mr-1" />
                    Account Help
                  </Button>
                </div>
              </div>
            </>
          )}

          {isMinimized && (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Bot className="w-12 h-12 text-primary/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">AI Assistant minimized</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleMinimize}
                  className="mt-2"
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  Expand
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
