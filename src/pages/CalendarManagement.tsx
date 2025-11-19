import { ComingSoon } from '@/components/admin/ComingSoon';
import { Calendar } from 'lucide-react';

const CalendarManagement = () => {
  return (
    <ComingSoon
      title="Calendar Management"
      description="Manage central calendar events and school-specific calendars. Create, schedule, and organize academic events, holidays, and school activities across your institution."
      icon={<Calendar className="w-6 h-6 text-primary" />}
    />
  );
};

export default CalendarManagement;

