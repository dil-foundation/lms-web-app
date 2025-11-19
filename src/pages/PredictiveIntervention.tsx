import { ComingSoon } from '@/components/admin/ComingSoon';
import { TrendingDown } from 'lucide-react';

const PredictiveIntervention = () => {
  return (
    <ComingSoon
      title="Predictive Intervention System"
      description="AI-powered system to identify at-risk students and recommend interventions coming soon."
      icon={<TrendingDown className="w-6 h-6 text-primary" />}
    />
  );
};

export default PredictiveIntervention;

