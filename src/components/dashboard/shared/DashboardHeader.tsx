import { ReactNode } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Filter, RefreshCw } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  timeRange?: string;
  onTimeRangeChange?: (value: string) => void;
  onRefresh?: () => void;
  onFilterClick?: () => void;
  actions?: ReactNode;
}

export const DashboardHeader = ({
  title,
  subtitle,
  icon: Icon,
  timeRange,
  onTimeRangeChange,
  onRefresh,
  onFilterClick,
  actions
}: DashboardHeaderProps) => {
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 rounded-3xl"></div>
      <div className="relative p-8 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl flex items-center justify-center">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary via-primary to-primary/80 bg-clip-text text-transparent">
                {title}
              </h1>
              {subtitle && (
                <p className="text-lg text-muted-foreground mt-2 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {timeRange && onTimeRangeChange && (
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-40 h-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                  <SelectItem value="3months">Last 3 months</SelectItem>
                  <SelectItem value="6months">Last 6 months</SelectItem>
                  <SelectItem value="1year">Last 1 year</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            )}

            {onFilterClick && (
              <Button
                variant="outline"
                className="h-9 px-4 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                onClick={onFilterClick}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            )}

            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl bg-background border border-input shadow-sm hover:shadow-lg hover:shadow-primary/10 transition-all duration-300"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}

            {actions}
          </div>
        </div>
      </div>
    </div>
  );
};

