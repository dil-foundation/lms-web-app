import React from 'react';
import { Bot, GraduationCap } from 'lucide-react';
import { useAILMS } from '@/contexts/AILMSContext';
import { cn } from '@/lib/utils';

interface AILMSToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onToggle?: () => void;
}

export const AILMSToggle: React.FC<AILMSToggleProps> = ({ 
  className,
  size = 'md',
  onToggle,
}) => {
  const { mode, toggleMode, isAIMode } = useAILMS();

  const handleToggle = () => {
    toggleMode();
    if (onToggle) {
      onToggle();
    }
  };

  const sizeClasses = {
    sm: 'h-8 text-xs px-1',
    md: 'h-10 text-sm px-1',
    lg: 'h-12 text-base px-1.5'
  };

  const lmsIconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  };

  const botIconSizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-8 w-8',
    lg: 'h-9 w-9'
  };

  return (
    <div className={cn("flex items-center", className)}>
      <div 
        className={cn(
          "relative inline-flex items-center rounded-full bg-muted cursor-pointer transition-all duration-200 hover:bg-muted/80",
          sizeClasses[size],
          className
        )}
        onClick={handleToggle}
      >
        {/* Background slider */}
        <div
          className={cn(
            "absolute inset-y-1 bg-primary rounded-full shadow-sm transition-all duration-300 ease-in-out",
            isAIMode ? 'left-1 w-[48%]' : 'left-1/2 w-[48%]'
          )}
          style={{
            transform: isAIMode ? 'translateX(0)' : 'translateX(0)'
          }}
        />
        
        {/* AI Button */}
        <button
          type="button"
          className={cn(
            "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all duration-200 w-1/2 hover:scale-105 active:scale-95",
            isAIMode 
              ? "text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Bot className={botIconSizeClasses[size]} />
          <span className="whitespace-nowrap">AI Tutor</span>
        </button>

        {/* LMS Button */}
        <button
          type="button"
          className={cn(
            "relative z-10 flex items-center justify-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all duration-200 w-1/2 hover:scale-105 active:scale-95",
            !isAIMode 
              ? "text-primary-foreground" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <GraduationCap className={lmsIconSizeClasses[size]} />
          <span className="whitespace-nowrap">LMS</span>
        </button>
      </div>
    </div>
  );
}; 