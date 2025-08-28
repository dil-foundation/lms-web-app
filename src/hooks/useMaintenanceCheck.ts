import { useState, useEffect } from 'react';
import MaintenanceService from '@/services/maintenanceService';

export const useMaintenanceCheck = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkMaintenanceStatus();
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await MaintenanceService.getMaintenanceStatus();
      setIsMaintenanceMode(status.maintenance_mode);
    } catch (err) {
      console.error('Error checking maintenance status:', err);
      setError('Failed to check maintenance status');
      setIsMaintenanceMode(false); // Default to false to prevent blocking
    } finally {
      setLoading(false);
    }
  };

  const refreshStatus = async () => {
    await checkMaintenanceStatus();
  };

  return {
    isMaintenanceMode,
    loading,
    error,
    refreshStatus
  };
};
