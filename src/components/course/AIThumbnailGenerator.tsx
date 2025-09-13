import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Wand2, RefreshCw, Eye, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { aiThumbnailService, CourseThumbnailRequest } from '@/services/aiThumbnailService';

interface AIThumbnailGeneratorProps {
  courseId: string;
  courseTitle: string;
  courseDescription?: string;
  currentThumbnail?: string;
  onThumbnailGenerated: (imageUrl: string) => void;
  className?: string;
}

export const AIThumbnailGenerator: React.FC<AIThumbnailGeneratorProps> = ({
  courseId,
  courseTitle,
  courseDescription,
  currentThumbnail,
  onThumbnailGenerated,
  className
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [generatedThumbnail, setGeneratedThumbnail] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<'academic' | 'modern' | 'minimal' | 'illustrative' | 'photographic'>('academic');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerateThumbnail = async () => {
    setIsGenerating(true);
    
    try {
      const request: CourseThumbnailRequest = {
        courseId,
        title: courseTitle,
        description: courseDescription,
        style: selectedStyle,
        subject: extractSubjectFromTitle(courseTitle),
        level: extractLevelFromTitle(courseTitle)
      };

      const result = await aiThumbnailService.generateCourseThumbnail(request);

      if (result.success && result.imageUrl) {
        setGeneratedThumbnail(result.imageUrl);
        onThumbnailGenerated(result.imageUrl);
        toast.success('Thumbnail generated successfully!', {
          description: 'Your AI-generated course thumbnail is ready.'
        });
      } else {
        toast.error('Failed to generate thumbnail', {
          description: result.error || 'Please try again.'
        });
      }
    } catch (error) {
      console.error('Error generating thumbnail:', error);
      toast.error('Error generating thumbnail', {
        description: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateThumbnail = async () => {
    setIsRegenerating(true);
    
    try {
      const request: CourseThumbnailRequest = {
        courseId,
        title: courseTitle,
        description: courseDescription,
        style: selectedStyle,
        subject: extractSubjectFromTitle(courseTitle),
        level: extractLevelFromTitle(courseTitle)
      };

      const result = await aiThumbnailService.regenerateThumbnail(request);

      if (result.success && result.imageUrl) {
        setGeneratedThumbnail(result.imageUrl);
        onThumbnailGenerated(result.imageUrl);
        toast.success('New thumbnail generated!', {
          description: 'A fresh version has been created.'
        });
      } else {
        toast.error('Failed to regenerate thumbnail', {
          description: result.error || 'Please try again.'
        });
      }
    } catch (error) {
      console.error('Error regenerating thumbnail:', error);
      toast.error('Error regenerating thumbnail', {
        description: 'Something went wrong. Please try again.'
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const extractSubjectFromTitle = (title: string): string => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('math') || titleLower.includes('calculus') || titleLower.includes('algebra')) {
      return 'mathematics';
    } else if (titleLower.includes('science') || titleLower.includes('physics') || titleLower.includes('chemistry')) {
      return 'science';
    } else if (titleLower.includes('history') || titleLower.includes('historical')) {
      return 'history';
    } else if (titleLower.includes('literature') || titleLower.includes('english') || titleLower.includes('writing')) {
      return 'literature';
    } else if (titleLower.includes('art') || titleLower.includes('design') || titleLower.includes('creative')) {
      return 'art';
    } else if (titleLower.includes('tech') || titleLower.includes('programming') || titleLower.includes('computer')) {
      return 'technology';
    } else if (titleLower.includes('language') || titleLower.includes('spanish') || titleLower.includes('french')) {
      return 'language';
    } else if (titleLower.includes('business') || titleLower.includes('management') || titleLower.includes('marketing')) {
      return 'business';
    } else if (titleLower.includes('psychology') || titleLower.includes('psych')) {
      return 'psychology';
    } else if (titleLower.includes('philosophy') || titleLower.includes('phil')) {
      return 'philosophy';
    }
    
    return 'general education';
  };

  const extractLevelFromTitle = (title: string): string => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('beginner') || titleLower.includes('intro') || titleLower.includes('basic')) {
      return 'beginner';
    } else if (titleLower.includes('advanced') || titleLower.includes('expert') || titleLower.includes('master')) {
      return 'advanced';
    } else if (titleLower.includes('intermediate') || titleLower.includes('intermediate')) {
      return 'intermediate';
    }
    
    return 'intermediate';
  };

  const styleDescriptions = {
    academic: 'Professional, scholarly design with clean lines',
    modern: 'Contemporary, sleek design with bold elements',
    minimal: 'Simple, clean design with geometric shapes',
    illustrative: 'Detailed, artistic illustration style',
    photographic: 'Realistic, high-quality photographic style'
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          AI Thumbnail Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Thumbnail Preview */}
        {(currentThumbnail || generatedThumbnail) && (
          <div className="space-y-2">
            <Label>Current Thumbnail</Label>
            <div className="relative group">
              <img
                src={generatedThumbnail || currentThumbnail}
                alt="Course thumbnail"
                className="w-full h-32 object-cover rounded-lg border"
                onLoad={() => setShowPreview(true)}
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.open(generatedThumbnail || currentThumbnail, '_blank')}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Full Size
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Style Selection */}
        <div className="space-y-2">
          <Label htmlFor="style-select">Thumbnail Style</Label>
          <Select value={selectedStyle} onValueChange={(value: any) => setSelectedStyle(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a style" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(styleDescriptions).map(([key, description]) => (
                <SelectItem key={key} value={key}>
                  <div className="flex flex-col">
                    <span className="capitalize font-medium">{key}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Detected Course Information */}
        <div className="space-y-2">
          <Label>Detected Course Information</Label>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Subject: {extractSubjectFromTitle(courseTitle)}
            </Badge>
            <Badge variant="secondary">
              Level: {extractLevelFromTitle(courseTitle)}
            </Badge>
            <Badge variant="outline">
              Style: {selectedStyle}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleGenerateThumbnail}
            disabled={isGenerating || isRegenerating}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 mr-2" />
                Generate Thumbnail
              </>
            )}
          </Button>
          
          {generatedThumbnail && (
            <Button
              onClick={handleRegenerateThumbnail}
              disabled={isGenerating || isRegenerating}
              variant="outline"
            >
              {isRegenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Info Text */}
        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="space-y-1 text-xs">
            <li>• AI analyzes your course title and description</li>
            <li>• Generates a contextually relevant thumbnail</li>
            <li>• Uses DALL-E 3 for high-quality images</li>
            <li>• Automatically uploads to your course</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
