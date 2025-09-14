import { supabase } from '@/integrations/supabase/client';

export interface CourseThumbnailRequest {
  courseId: string;
  title: string;
  description?: string;
  subject?: string;
  level?: string;
  style?: 'academic' | 'modern' | 'minimal' | 'illustrative' | 'photographic';
}

export interface ThumbnailGenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  prompt?: string;
}

class AIThumbnailService {
  private generateThumbnailPrompt(course: CourseThumbnailRequest): string {
    const { title, description, subject, level, style = 'academic' } = course;
    
    // Extract key themes from title and description
    const titleWords = title.toLowerCase().split(' ');
    const descriptionWords = description?.toLowerCase().split(' ') || [];
    
    // Common academic subjects and their visual representations
    const subjectKeywords = {
      'mathematics': ['mathematical', 'equations', 'geometric shapes', 'numbers', 'formulas'],
      'science': ['scientific', 'laboratory', 'experiments', 'molecules', 'atoms'],
      'history': ['historical', 'ancient', 'timeline', 'artifacts', 'monuments'],
      'literature': ['books', 'writing', 'poetry', 'classic literature', 'quill pen'],
      'art': ['artistic', 'paintbrush', 'canvas', 'color palette', 'creative'],
      'technology': ['digital', 'circuits', 'computer', 'innovation', 'cyber'],
      'language': ['linguistic', 'alphabet', 'communication', 'global', 'translation'],
      'business': ['corporate', 'growth', 'strategy', 'professional', 'success'],
      'psychology': ['brain', 'mind', 'behavior', 'analysis', 'human'],
      'philosophy': ['thinking', 'wisdom', 'contemplation', 'ideas', 'debate']
    };

    // Determine subject category
    let detectedSubject = 'general education';
    for (const [key, keywords] of Object.entries(subjectKeywords)) {
      if (titleWords.some(word => keywords.some(keyword => keyword.includes(word))) ||
          descriptionWords.some(word => keywords.some(keyword => keyword.includes(word)))) {
        detectedSubject = key;
        break;
      }
    }

    // Style-specific prompts
    const stylePrompts = {
      academic: 'professional academic illustration, clean and scholarly',
      modern: 'contemporary design, sleek and minimalist',
      minimal: 'simple geometric design, clean lines, minimal colors',
      illustrative: 'detailed illustration, artistic and engaging',
      photographic: 'high-quality photograph, realistic and professional'
    };

    // Level-specific adjustments
    const levelAdjustments = {
      'beginner': 'introductory, accessible, welcoming',
      'intermediate': 'balanced, comprehensive, engaging',
      'advanced': 'sophisticated, detailed, expert-level',
      'expert': 'complex, professional, cutting-edge'
    };

    const levelAdj = levelAdjustments[level as keyof typeof levelAdjustments] || 'comprehensive';
    const stylePrompt = stylePrompts[style];

    // Build the main prompt
    let prompt = `Create a ${stylePrompt} course thumbnail image for "${title}". `;
    
    if (description) {
      prompt += `Course description: "${description}". `;
    }
    
    prompt += `Subject area: ${detectedSubject}. `;
    prompt += `Style: ${levelAdj} and ${stylePrompt}. `;
    
    // Add subject-specific visual elements
    if (detectedSubject in subjectKeywords) {
      const visualElements = subjectKeywords[detectedSubject as keyof typeof subjectKeywords];
      prompt += `Include visual elements related to: ${visualElements.slice(0, 3).join(', ')}. `;
    }
    
    // Add technical specifications
    prompt += `The image should be 16:9 aspect ratio, high resolution, suitable for web use. `;
    prompt += `Use a professional color palette with good contrast. `;
    prompt += `Avoid text overlays, focus on visual representation of the course content. `;
    prompt += `The image should be engaging and appropriate for an educational platform.`;

    return prompt;
  }

  async generateCourseThumbnail(course: CourseThumbnailRequest): Promise<ThumbnailGenerationResult> {
    try {
      // Generate the prompt
      const prompt = this.generateThumbnailPrompt(course);
      
      // Call the Supabase function that will handle OpenAI API
      const { data, error } = await supabase.functions.invoke('generate-course-thumbnail', {
        body: {
          courseId: course.courseId,
          title: course.title,
          description: course.description,
          prompt: prompt,
          style: course.style || 'academic'
        }
      });

      if (error) {
        console.error('Error generating thumbnail:', error);
        return {
          success: false,
          error: error.message || 'Failed to generate thumbnail'
        };
      }

      return {
        success: true,
        imageUrl: data.imageUrl,
        prompt: prompt
      };

    } catch (error) {
      console.error('Error in generateCourseThumbnail:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async regenerateThumbnail(course: CourseThumbnailRequest): Promise<ThumbnailGenerationResult> {
    // For regeneration, we might want to add some variation
    const variations = ['academic', 'modern', 'illustrative'];
    const randomStyle = variations[Math.floor(Math.random() * variations.length)] as CourseThumbnailRequest['style'];
    
    return this.generateCourseThumbnail({
      ...course,
      style: randomStyle
    });
  }

  async getThumbnailHistory(courseId: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('course_thumbnails')
        .select('image_url, created_at')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching thumbnail history:', error);
        return [];
      }

      // Generate fresh signed URLs for each thumbnail
      const signedUrls = await Promise.all(
        data?.map(async (item) => {
          const { data: signedUrlData } = await supabase.storage
            .from('dil-lms')
            .createSignedUrl(item.image_url, 3600); // 1 hour expiration
          return signedUrlData?.signedUrl || '';
        }) || []
      );

      return signedUrls.filter(url => url !== '');
    } catch (error) {
      console.error('Error in getThumbnailHistory:', error);
      return [];
    }
  }

  async getSignedUrl(filename: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from('dil-lms')
        .createSignedUrl(filename, 3600); // 1 hour expiration

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data?.signedUrl || null;
    } catch (error) {
      console.error('Error in getSignedUrl:', error);
      return null;
    }
  }
}

export const aiThumbnailService = new AIThumbnailService();
