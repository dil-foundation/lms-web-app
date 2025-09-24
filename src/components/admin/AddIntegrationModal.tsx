import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  Cloud, 
  HardDrive, 
  Palette, 
  Layout, 
  Briefcase, 
  ArrowLeft,
  Plus,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { integrationService } from '@/services/integrationService';

interface AddIntegrationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIntegrationAdded: () => void;
  existingIntegrations: string[];
}

interface AvailableIntegration {
  name: string;
  type: 'communication' | 'payment' | 'productivity';
  description: string;
  icon: string;
}

interface IntegrationFormData {
  title: string;
  description: string;
  url: string;
}

const iconMap = {
  MessageSquare,
  Cloud,
  HardDrive,
  Palette,
  Layout,
  Briefcase,
  CreditCard
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'communication':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'payment':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'productivity':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export const AddIntegrationModal: React.FC<AddIntegrationModalProps> = ({
  open,
  onOpenChange,
  onIntegrationAdded,
  existingIntegrations
}) => {
  const [selectedIntegration, setSelectedIntegration] = useState<AvailableIntegration | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>({
    title: '',
    description: '',
    url: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableIntegrations = integrationService.getAvailableIntegrations()
    .filter(integration => !existingIntegrations.includes(integration.name));

  const handleIntegrationSelect = (integration: AvailableIntegration) => {
    setSelectedIntegration(integration);
    setFormData({
      title: integration.name,
      description: integration.description,
      url: ''
    });
  };

  const handleBackToList = () => {
    setSelectedIntegration(null);
    setFormData({ title: '', description: '', url: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedIntegration) return;
    
    if (!formData.title.trim() || !formData.description.trim() || !formData.url.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.url);
    } catch {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await integrationService.createIntegration({
        name: selectedIntegration.name,
        type: selectedIntegration.type,
        status: 'disabled',
        settings: {
          title: formData.title,
          description: formData.description,
          url: formData.url
        },
        is_configured: true,
        last_sync: null,
        version: '1.0.0'
      });

      toast.success(`${selectedIntegration.name} integration added successfully!`);
      onIntegrationAdded();
      onOpenChange(false);
      handleBackToList();
    } catch (error) {
      console.error('Error adding integration:', error);
      toast.error('Failed to add integration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    handleBackToList();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedIntegration && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToList}
                className="mr-2 p-1 h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {selectedIntegration ? `Configure ${selectedIntegration.name}` : 'Add New Integration'}
          </DialogTitle>
        </DialogHeader>

        {!selectedIntegration ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose an integration to add to your LMS. You can configure the connection details in the next step.
            </p>
            
            {availableIntegrations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">All available integrations have already been added.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {availableIntegrations.map((integration) => {
                  const IconComponent = iconMap[integration.icon as keyof typeof iconMap];
                  
                  return (
                    <Card 
                      key={integration.name} 
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleIntegrationSelect(integration)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-lg">
                            <IconComponent className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg">{integration.name}</CardTitle>
                            <Badge variant="outline" className={`mt-1 text-xs ${getTypeColor(integration.type)}`}>
                              {integration.type}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          {integration.description}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center space-x-4 p-6 bg-gradient-to-r from-muted/30 to-muted/50 rounded-xl border border-border/50">
              <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl">
                {(() => {
                  const IconComponent = iconMap[selectedIntegration.icon as keyof typeof iconMap];
                  return <IconComponent className="h-6 w-6 text-primary" />;
                })()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground">{selectedIntegration.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className={`text-xs font-medium ${getTypeColor(selectedIntegration.type)}`}>
                    {selectedIntegration.type}
                  </Badge>
                  <span className="text-sm text-muted-foreground">Integration</span>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Integration Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter a custom title for this integration"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  This will be displayed as the integration name in your dashboard.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe how this integration will be used in your LMS"
                  rows={3}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Provide details about how this integration will be used in your learning management system.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="url">Integration URL *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="url"
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com/api"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(formData.url, '_blank')}
                    disabled={!formData.url}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  The API endpoint or connection URL for this integration.
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={handleBackToList}>
                Back
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Adding...' : 'Add Integration'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
