import { ComingSoon } from '@/components/admin/ComingSoon';
import { FileText } from 'lucide-react';

const PolicyManagement = () => {
  return (
    <ComingSoon
      title="Policy Management"
      description="Centralized policy creation, management, and distribution system coming soon."
      icon={<FileText className="w-6 h-6 text-primary" />}
    />
  );
};

export default PolicyManagement;

