import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Plug } from 'lucide-react';

interface IntegrationAPIsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const IntegrationAPIs = ({ userProfile }: IntegrationAPIsProps) => {
  return (
    <ComingSoon 
      title="Integration APIs"
      description="Central hub to manage connections with external tools and services is coming soon."
      icon={Plug}
    />
  );
};

/*
// Original IntegrationAPIs component code commented out
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
// ... all other imports and component logic would be here
// This is preserved for future restoration if needed
*/