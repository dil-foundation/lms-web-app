
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface RolePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const RolePlaceholder = ({ title, description, icon: Icon }: RolePlaceholderProps) => {
  return (
    <div className="text-center py-12">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Icon className="h-16 w-16 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
};
