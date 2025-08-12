import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Download } from 'lucide-react';

interface OfflineLearningProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const OfflineLearning = ({ userProfile }: OfflineLearningProps) => {
  return (
    <ComingSoon 
      title="Offline Learning"
      description="Content synchronization and offline learning management tools are coming soon."
      icon={Download}
    />
  );
};

/*
// Original OfflineLearning component code commented out
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// ... all other imports and component logic would be here
// This is preserved for future restoration if needed
*/