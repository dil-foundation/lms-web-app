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
      description: 'Large cards with detailed information'
    },
    {
      mode: 'tile' as ViewMode,
      icon: Grid3X3,
      label: 'Tile View',
      description: 'Compact tiles for quick browsing'
    },
    {
      mode: 'list' as ViewMode,
      icon: List,
      label: 'List View',
      description: 'Dense list with essential information'
    }
  ].filter(option => availableViews.includes(option.mode));

  return (
    <Card className={cn("p-2", className)}>
      <CardContent className="p-0">
        <div className="flex items-center gap-1">
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
                  "h-9 px-3 transition-all duration-200",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted hover:text-foreground",
                  showLabels && "gap-2"
                )}
                title={option.description}
              >
                <Icon className="w-4 h-4" />
                {showLabels && (
                  <span className="text-sm font-medium">{option.label}</span>
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
