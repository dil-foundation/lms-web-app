import { ComingSoon } from '@/components/admin/ComingSoon';
import { Package } from 'lucide-react';

const InventoryManagement = () => {
  return (
    <ComingSoon
      title="Inventory Management"
      description="Track and manage educational resources, materials, and equipment inventory coming soon."
      icon={<Package className="w-6 h-6 text-primary" />}
    />
  );
};

export default InventoryManagement;

