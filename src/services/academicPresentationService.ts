import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';

export interface AcademicPresentationTopic {
  id: number;
  topic: string;
  topic_urdu?: string;
  difficulty_level?: string;
  category?: string;
}

export interface AcademicPresentationEvaluation {
  audio_base64: string;
  topic_id: number;
  filename: string;
  user_id: string;
  time_spent_seconds: number;
  urdu_used: boolean;
}

export interface EvaluationResponse {
  success: boolean;
  topic: string;
  expected_keywords: string[];
  user_text: string;
  evaluation: {
    success: boolean;
    evaluation: {
      overall_score: number;
      argument_structure_score: number;
      evidence_usage_score: number;
      academic_tone_score: number;
      fluency_pacing_score: number;
      vocabulary_range_score: number;
      keyword_matches: string[];
      matched_keywords_count: number;
      total_keywords: number;
      vocabulary_matches: string[];
      matched_vocabulary_count: number;
      total_vocabulary: number;
      structure_followed: boolean;
      evidence_provided: boolean;
      academic_tone_maintained: boolean;
      detailed_feedback: {
        argument_structure_feedback: string;
        evidence_usage_feedback: string;
        academic_tone_feedback: string;
        fluency_feedback: string;
        vocabulary_feedback: string;
      };
      suggested_improvements: string[];
      encouragement: string;
      next_steps: string;
      score: number;
      completed: boolean;
      is_correct: boolean;
    };
    suggested_improvement: string;
    keyword_matches: string[];
    total_keywords: number;
    matched_keywords_count: number;
    vocabulary_matches: string[];
    total_vocabulary: number;
    matched_vocabulary_count: number;
    fluency_score: number;
    grammar_score: number;
    argument_structure_score: number;
    academic_tone_score: number;
    evidence_usage_score: number;
    vocabulary_range_score: number;
    structure_followed: boolean;
    evidence_provided: boolean;
    academic_tone_maintained: boolean;
    score: number;
    is_correct: boolean;
    completed: boolean;
  };
  suggested_improvement: string;
  progress_recorded: boolean;
  unlocked_content: string[];
  keyword_matches: string[];
  total_keywords: number;
  fluency_score: number;
  grammar_score: number;
  argument_structure_score: number;
  academic_tone_score: number;
}

class AcademicPresentationService {
  private baseUrl = BASE_API_URL;

  // Get all academic presentation topics
  async getAllTopics(): Promise<AcademicPresentationTopic[]> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.ACADEMIC_PRESENTATION_TOPICS}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch topics: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      if (Array.isArray(data)) {
        return data;
      } else if (data.topics && Array.isArray(data.topics)) {
        return data.topics;
      } else if (data.data && Array.isArray(data.data)) {
        return data.data;
      } else {
        console.warn('Unexpected API response format:', data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching academic presentation topics:', error);
      throw error;
    }
  }

  // Get a specific topic by ID
  async getTopicById(topicId: number): Promise<AcademicPresentationTopic> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.ACADEMIC_PRESENTATION_TOPIC_DETAIL(topicId.toString())}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch topic: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching topic ${topicId}:`, error);
      throw error;
    }
  }

  // Get audio for a specific topic
  async getTopicAudio(topicId: number): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.ACADEMIC_PRESENTATION_AUDIO(topicId.toString())}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get audio: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      console.error(`Error getting audio for topic ${topicId}:`, error);
      throw error;
    }
  }

  // Submit presentation for evaluation
  async evaluatePresentation(evaluation: AcademicPresentationEvaluation): Promise<EvaluationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}${API_ENDPOINTS.EVALUATE_ACADEMIC_PRESENTATION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluation),
      });

      if (!response.ok) {
        throw new Error(`Failed to evaluate presentation: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error evaluating presentation:', error);
      throw error;
    }
  }

  // Convert audio blob to base64
  async audioToBase64(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/wav;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(audioBlob);
    });
  }

  // Generate filename for audio recording
  generateFilename(topicId: number, userId: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `academic_presentation_${topicId}_${userId}_${timestamp}.wav`;
  }
}

export const academicPresentationService = new AcademicPresentationService();