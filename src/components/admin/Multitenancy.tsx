import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Building2 } from 'lucide-react';

interface MultitenancyProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const Multitenancy = ({ userProfile }: MultitenancyProps) => {
  return (
    <ComingSoon 
      title="Multitenancy"
      description="Multi-organization management and tenant isolation features are coming soon."
      icon={Building2}
    />
  );
};

/*
// Original Multitenancy component code commented out
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
// ... all other imports and component logic would be here
// This is preserved for future restoration if needed
*/