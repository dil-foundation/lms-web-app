import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Wrench, 
  Clock, 
  AlertTriangle, 
  RefreshCw,
  Loader2,
  Home
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MaintenanceService from '@/services/maintenanceService';
import { toast } from 'sonner';

const MaintenancePage: React.FC = () => {
  const [maintenanceStatus, setMaintenanceStatus] = useState<{
    maintenance_mode: boolean;
    system_name: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkMaintenanceStatus();
  }, []);

  const checkMaintenanceStatus = async () => {
    try {
      setLoading(true);
      const status = await MaintenanceService.getMaintenanceStatus();
      setMaintenanceStatus(status);
      
      // If maintenance mode is disabled, redirect to dashboard
      if (!status.maintenance_mode) {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Error checking maintenance status:', error);
      toast.error('Failed to check maintenance status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await checkMaintenanceStatus();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-lg">Checking system status...</span>
        </div>
      </div>
    );
  }

  if (!maintenanceStatus?.maintenance_mode) {
    return null; // Will redirect to dashboard
  }

  return (
    <div className="bg-background flex items-center justify-center p-4 pt-16">
      <div className="w-full max-w-md">
        <Card className="border-2 border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center">
                <Wrench className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-orange-800 dark:text-orange-200">
              System Maintenance
            </CardTitle>
            <div className="flex justify-center mt-2">
              <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Maintenance Mode Active
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-orange-700 dark:text-orange-300">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Scheduled Maintenance</span>
              </div>
              
              <p className="text-sm text-orange-600 dark:text-orange-400 leading-relaxed">
                {maintenanceStatus.system_name} is currently undergoing scheduled maintenance to improve performance and security.
              </p>
              
              <div className="bg-white/50 dark:bg-orange-950/30 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <p className="text-xs text-orange-700 dark:text-orange-300">
                  We apologize for the inconvenience. Please check back later or contact your administrator for more information.
                </p>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
              <Button 
                onClick={handleRefresh}
                variant="outline"
                className="border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900 hover:text-orange-800 dark:hover:text-orange-200 hover:border-orange-400 dark:hover:border-orange-600"
              >
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Check Status
               </Button>
              
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground hover:border-accent"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-orange-200 dark:border-orange-800">
              <p className="text-xs text-orange-600 dark:text-orange-400">
                Expected completion time will be communicated by your administrator.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MaintenancePage;
