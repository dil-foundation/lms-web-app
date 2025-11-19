import { ComingSoon } from '@/components/admin/ComingSoon';
import { LayoutDashboard } from 'lucide-react';

const ExecutiveDashboard = () => {
  return (
    <ComingSoon
      title="Executive Dashboard"
      description="Comprehensive executive-level insights and analytics dashboard coming soon."
      icon={<LayoutDashboard className="w-6 h-6 text-primary" />}
    />
  );
};

export default ExecutiveDashboard;

