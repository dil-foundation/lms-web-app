import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Building2, Info, FileText } from 'lucide-react';
import { Multitenancy } from '@/components/admin/Multitenancy';
import PolicyManagement from '@/pages/PolicyManagement';
import { useUserProfile } from '@/hooks/useUserProfile';

const AdvancedTools = () => {
  const [activeTab, setActiveTab] = useState('multitenancy');
  const { profile: userProfile } = useUserProfile();

  // Default profile if not loaded yet
  const finalProfile = userProfile || {
    id: '',
    first_name: '',
    last_name: '',
    role: ''
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                <Wrench className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                  Advanced Tools
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  System administration and advanced configuration tools
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <TabsTrigger 
              value="multitenancy" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Multitenancy
            </TabsTrigger>
            <TabsTrigger 
              value="policy-management" 
              className="data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-gray-700 rounded-md transition-all"
            >
              <FileText className="w-4 h-4 mr-2" />
              Policy Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="multitenancy" className="mt-0">
            <Multitenancy userProfile={finalProfile} />
          </TabsContent>

          <TabsContent value="policy-management" className="mt-0">
            <PolicyManagement />
          </TabsContent>
        </Tabs>

        {/* Info Card */}
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200/50 dark:border-blue-700/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm">
                  Advanced Tools
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  Additional system administration tools and utilities will be added here in future updates.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedTools;

