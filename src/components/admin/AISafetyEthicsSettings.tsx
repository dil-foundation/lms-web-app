import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Shield } from 'lucide-react';

interface AISafetyEthicsSettingsProps {
  userProfile: {
    id: string;
    first_name?: string;
    last_name?: string;
    role?: string;
  };
}

export const AISafetyEthicsSettings = ({ userProfile }: AISafetyEthicsSettingsProps) => {
  return (
    <ComingSoon 
      title="AI Safety & Ethics"
      description="Comprehensive AI safety monitoring, ethical guidelines, and bias detection tools are coming soon."
      icon={Shield}
    />
  );
};