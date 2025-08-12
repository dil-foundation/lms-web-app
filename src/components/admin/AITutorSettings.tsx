import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Bot } from 'lucide-react';

interface AITutorSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AITutorSettings = ({ userProfile }: AITutorSettingsProps) => {
  return (
    <ComingSoon 
      title="AI Tutor Settings"
      description="Intelligent tutoring configuration and behavior customization tools are coming soon."
      icon={Bot}
    />
  );
};