import { ComingSoon } from '@/components/admin/ComingSoon';
import { Sparkles } from 'lucide-react';

const AIContentDevelopment = () => {
  return (
    <ComingSoon
      title="AI Content Development"
      description="AI-powered tools for automated course content creation, enhancement, and optimization coming soon."
      icon={<Sparkles className="w-6 h-6 text-primary" />}
    />
  );
};

export default AIContentDevelopment;

