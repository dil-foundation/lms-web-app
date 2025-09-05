import React from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIAssistantButtonProps {
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({
  className,
  variant = 'outline',
  size = 'sm',
  showLabel = false
}) => {
  const { openAssistant, state } = useAIAssistant();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-9 px-3';
      case 'md':
        return 'h-10 px-4';
      case 'lg':
        return 'h-11 px-6';
      default:
        return 'h-9 px-3';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'md':
        return 'h-4 w-4';
      case 'lg':
        return 'h-5 w-5';
      default:
        return 'h-4 w-4';
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={openAssistant}
      className={cn(
        "relative transition-all duration-300 hover:scale-105",
        getSizeClasses(),
        className
      )}
    >
      <Bot className={cn("mr-2", getIconSize())} />
      {showLabel && "AI Assistant"}
      
      {/* Online indicator */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-background"></div>
    </Button>
  );
};
