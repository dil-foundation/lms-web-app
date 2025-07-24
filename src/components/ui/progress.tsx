import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, ...props }, ref) => {
    const progressValue = Math.max(0, Math.min(100, value || 0));

    return (
      <div
        ref={ref}
        className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
        {...props}
      >
        {progressValue > 0 && (
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${progressValue}%` }}
          />
        )}
      </div>
    );
  }
);
Progress.displayName = "Progress"

export { Progress } 