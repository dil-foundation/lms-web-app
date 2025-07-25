import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { BookOpen } from 'lucide-react';

// Props interface for AIStudentLearn component (empty by design)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AIStudentLearnProps {}

export const AIStudentLearn: React.FC<AIStudentLearnProps> = () => {
  return (
    <ComingSoon 
      title="AI Learn Feature" 
      description="Advanced AI-powered learning features are currently under development and will be available soon." 
      icon={BookOpen} 
    />
  );
};