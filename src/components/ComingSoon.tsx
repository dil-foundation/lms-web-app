import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Clock, Sparkles } from 'lucide-react';

interface ComingSoonProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const ComingSoon: React.FC<ComingSoonProps> = ({ 
  title = "Coming Soon", 
  description = "This feature is currently under development and will be available soon.",
  icon: Icon = MessageSquare 
}) => {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6 pb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Icon className="h-16 w-16 text-muted-foreground" />
              <Sparkles className="h-6 w-6 text-primary absolute -top-1 -right-1 animate-pulse" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold mb-3 text-foreground">
            {title}
          </h2>
          
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Stay tuned for updates</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}; 