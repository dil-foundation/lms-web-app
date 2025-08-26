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

  const handleRefresh = () => {
    window.location.reload();
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
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-2 border-orange-200 bg-orange-50/50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Wrench className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-orange-800">
              System Maintenance
            </CardTitle>
            <div className="flex justify-center mt-2">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Maintenance Mode Active
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2 text-orange-700">
                <Clock className="w-5 h-5" />
                <span className="font-medium">Scheduled Maintenance</span>
              </div>
              
              <p className="text-sm text-orange-600 leading-relaxed">
                {maintenanceStatus.system_name} is currently undergoing scheduled maintenance to improve performance and security.
              </p>
              
              <div className="bg-white/50 rounded-lg p-4 border border-orange-200">
                <p className="text-xs text-orange-700">
                  We apologize for the inconvenience. Please check back later or contact your administrator for more information.
                </p>
              </div>
            </div>

            <div className="flex flex-col space-y-3">
                             <Button 
                 onClick={handleRefresh}
                 variant="outline"
                 className="border-orange-300 text-orange-700 hover:bg-orange-100"
               >
                 <RefreshCw className="w-4 h-4 mr-2" />
                 Check Status
               </Button>
              
              <Button 
                onClick={handleGoHome}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Home
              </Button>
            </div>

            <div className="text-center pt-4 border-t border-orange-200">
              <p className="text-xs text-orange-600">
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
