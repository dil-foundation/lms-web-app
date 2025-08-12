import React from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { Settings } from 'lucide-react';

const AdminSettings: React.FC = () => {
  return (
    <ComingSoon 
      title="Admin Settings"
      description="Advanced system configuration and management tools are coming soon."
      icon={Settings}
    />
  );
}; 

export default AdminSettings;