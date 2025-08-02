import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CenteredLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export function CenteredLoader({ 
  size = "md", 
  className,
  text 
}: CenteredLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 space-y-2",
      className
    )}>
      <Loader2 className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size]
      )} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  );
} 