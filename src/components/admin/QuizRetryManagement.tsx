import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  RotateCcw, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Users
} from 'lucide-react';
import { QuizRetrySettings } from './QuizRetrySettings';
import { QuizRetryApproval } from './QuizRetryApproval';
import { QuizRetryAnalytics } from './QuizRetryAnalytics';

interface QuizRetryManagementProps {
  lessonContentId?: string;
  courseId?: string;
  title?: string;
}

export const QuizRetryManagement: React.FC<QuizRetryManagementProps> = ({
  lessonContentId,
  courseId,
  title = "Quiz Retry Management"
}) => {
  const [activeTab, setActiveTab] = useState('settings');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight break-words">{title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground break-words">
            Manage quiz retry settings, review requests, and monitor analytics
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
          <RotateCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Retry System</span>
          <span className="sm:hidden">Retry</span>
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="approvals" className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4" />
            Approvals
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          {lessonContentId ? (
            <QuizRetrySettings
              lessonContentId={lessonContentId}
              onSettingsChange={(settings) => {
                console.log('Retry settings updated:', settings);
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Quiz Selected</h3>
                <p className="text-gray-500">
                  Please select a quiz to configure retry settings.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approvals" className="space-y-6">
          <QuizRetryApproval
            courseId={courseId}
            onRequestProcessed={() => {
              console.log('Retry request processed');
            }}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <QuizRetryAnalytics
            courseId={courseId}
            lessonContentId={lessonContentId}
            title="Quiz Retry Analytics"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
