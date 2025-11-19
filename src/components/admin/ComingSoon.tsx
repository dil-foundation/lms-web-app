import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Clock } from 'lucide-react';

interface ComingSoonProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export const ComingSoon = ({ title, description, icon }: ComingSoonProps) => {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-card to-card/50 dark:bg-card">
          <CardHeader className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-primary/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
                {icon || <Sparkles className="w-6 h-6 text-primary" />}
              </div>
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-white dark:via-gray-100 dark:to-gray-200 bg-clip-text text-transparent">
                  {title}
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center">
                <Clock className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                  Coming Soon
                </h2>
                {description ? (
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    {description}
                  </p>
                ) : (
                  <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    We're working hard to bring you this feature. Check back soon for updates!
                  </p>
                )}
              </div>
              <div className="pt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 dark:bg-primary/20 rounded-full">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Feature in Development</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

