import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LayoutGrid, List, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ViewMode = 'card' | 'tile' | 'list';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  className?: string;
  showLabels?: boolean;
  availableViews?: ViewMode[];
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  className,
  showLabels = true,
  availableViews = ['card', 'tile', 'list']
}) => {
  const viewOptions = [
    {
      mode: 'card' as ViewMode,
      icon: LayoutGrid,
      label: 'Card View',
      description: 'Large detailed cards with comprehensive information and rich layouts'
    },
    {
      mode: 'tile' as ViewMode,
      icon: Grid3X3,
      label: 'Tile View',
      description: 'Compact grid tiles optimized for quick scanning and overview'
    },
    {
      mode: 'list' as ViewMode,
      icon: List,
      label: 'List View',
      description: 'Dense list format with essential information in rows'
    }
  ].filter(option => availableViews.includes(option.mode));

  return (
    <Card className={cn("p-1 sm:p-2 w-full sm:w-auto", className)}>
      <CardContent className="p-0">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {viewOptions.map((option) => {
            const Icon = option.icon;
            const isActive = currentView === option.mode;
            
            return (
              <Button
                key={option.mode}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => onViewChange(option.mode)}
                className={cn(
                  "h-8 sm:h-9 px-2 sm:px-2.5 transition-all duration-200 flex-1 sm:flex-none min-w-0",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted hover:text-foreground",
                  showLabels && "gap-1 sm:gap-1.5"
                )}
                title={option.description}
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                {showLabels && (
                  <span className="text-[10px] sm:text-xs font-medium whitespace-nowrap truncate">{option.label}</span>
                )}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Compact version for smaller spaces
export const ViewToggleCompact: React.FC<Omit<ViewToggleProps, 'showLabels'>> = (props) => (
  <ViewToggle {...props} showLabels={false} />
);

// Preset configurations for different contexts
export const CourseViewToggle: React.FC<Omit<ViewToggleProps, 'availableViews'>> = (props) => (
  <ViewToggle {...props} availableViews={['card', 'tile']} />
);

export const AdminViewToggle: React.FC<Omit<ViewToggleProps, 'availableViews'>> = (props) => (
  <ViewToggle {...props} availableViews={['card', 'tile', 'list']} />
);
