import { BASE_API_URL } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// Interfaces
export interface InDepthInterviewPrompt {
  id: number;
  question: string;
  title?: string;
  description?: string;
  difficulty_level?: string;
  category?: string;
  prompt_text?: string;
  expected_keywords?: string[];
  length?: number;
}

export interface InDepthInterviewAudioResponse {
  audio_url?: string;
  audio_base64?: string;
  success?: boolean;
  message?: string;
}

export interface InDepthInterviewEvaluationRequest {
  audio_base64: string;
  prompt_id: number;
  filename: string;
  user_id: string;
  time_spent_seconds: number;
  urdu_used: boolean;
}

export interface InDepthInterviewEvaluationResponse {
  success: boolean;
  evaluation: {
    evaluation: {
      overall_score: number;
      star_model_usage?: number;
      vocabulary_sophistication?: number;
      fluency_precision?: number;
      content_relevance?: number;
      keyword_matches?: string[];
      matched_keywords_count?: number;
      total_keywords?: number;
      suggested_improvements?: string[];
      star_feedback?: string;
      vocabulary_suggestions?: string;
      fluency_feedback?: string;
      next_steps?: string;
      encouragement?: string;
    };
  };
}

class InDepthInterviewService {
  private baseUrl = BASE_API_URL;

  // Get all interview prompts
  async getAllPrompts(): Promise<InDepthInterviewPrompt[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/in-depth-interview-prompts`, {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Interview prompts received:', data);
      
      // Handle different response structures
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.prompts)) {
        return data.prompts;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      } else {
        console.warn('Unexpected API response structure:', data);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching interview prompts:', error);
      throw error;
    }
  }

  // Get specific prompt by ID
  async getPromptById(promptId: number): Promise<InDepthInterviewPrompt> {
    try {
      const response = await fetch(`${this.baseUrl}/api/in-depth-interview-prompts/${promptId}`, {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Interview prompt received:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching interview prompt:', error);
      throw error;
    }
  }

  // Get audio for interview prompt
  async getPromptAudio(promptId: number): Promise<InDepthInterviewAudioResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${this.baseUrl}/api/in-depth-interview/${promptId}`, {
        method: 'POST',
        headers: getAuthHeadersWithAccept(),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      let result: InDepthInterviewAudioResponse;

      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Interview audio response:', result);

      // Handle base64 audio data
      if (result.audio_base64 && !result.audio_url) {
        try {
          // Convert base64 to blob URL
          const audioData = atob(result.audio_base64);
          const audioArray = new Uint8Array(audioData.length);
          for (let i = 0; i < audioData.length; i++) {
            audioArray[i] = audioData.charCodeAt(i);
          }
          const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
          result.audio_url = URL.createObjectURL(audioBlob);
          console.log('✅ Converted base64 to blob URL:', result.audio_url);
        } catch (conversionError) {
          console.error('❌ Error converting base64 to blob:', conversionError);
          throw new Error('Failed to process audio data');
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Error fetching interview audio:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  }

  // Evaluate interview response
  async evaluateResponse(evaluationData: InDepthInterviewEvaluationRequest): Promise<InDepthInterviewEvaluationResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

      console.log('📤 Sending interview evaluation request:', {
        ...evaluationData,
        audio_base64: `[${evaluationData.audio_base64.length} characters]`
      });

      const response = await fetch(`${this.baseUrl}/api/evaluate-in-depth-interview`, {
        method: 'POST',
        headers: getAuthHeadersWithAccept(),
        body: JSON.stringify(evaluationData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server error response:', errorText);
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      let result: any;
      
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      console.log('📥 Raw interview evaluation response:', result);
      console.log('✅ Returning interview evaluation:', result);
      return result as InDepthInterviewEvaluationResponse;

    } catch (error) {
      console.error('❌ Error evaluating interview response:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout - please try again');
      }
      throw error;
    }
  }

  // Helper function to convert audio blob to base64
  async audioToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  // Helper function to generate filename
  generateFilename(promptId: number, userId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `interview_${promptId}_${userId}_${timestamp}.wav`;
  }
}

export const inDepthInterviewService = new InDepthInterviewService();