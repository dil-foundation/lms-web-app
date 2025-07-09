
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface RolePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const RolePlaceholder = ({ title, description, icon: Icon }: RolePlaceholderProps) => {
  return (
    <div className="w-full h-full flex items-center justify-center min-h-[400px]">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <Icon className="h-16 w-16 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold mb-4">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};
