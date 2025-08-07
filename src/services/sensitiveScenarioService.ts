import { BASE_API_URL } from '@/config/api';
import { getAuthHeaders } from '@/utils/authUtils';

// Interfaces
export interface SensitiveScenario {
  id: number;
  title: string;
  description: string;
  context: string;
  scenario?: string;
  difficulty?: string;
  difficulty_level?: string;
  emotionalComplexity?: string;
  emotional_complexity?: string;
  category?: string;
  expected_keywords?: string[];
  prompt_text?: string;
}

export interface SensitiveScenarioEvaluation {
  success: boolean;
  overall_score: number;
  fluency_score: number;
  vocabulary_score: number;
  grammar_score: number;
  content_relevance_score: number;
  keyword_usage_score: number;
  response_time_score: number;
  strengths: string[];
  areas_for_improvement: string[];
  keyword_matches: string[];
  total_keywords_expected: number;
  keywords_used_count: number;
  feedback: string;
  suggestions: string[];
  message?: string;
  error?: string;
}

class SensitiveScenarioService {
  private baseUrl = BASE_API_URL;

  // Normalize difficulty levels and filter out C2
  private normalizeDifficulty(difficulty: string): string {
    if (!difficulty) return 'Intermediate';
    
    const lower = difficulty.toLowerCase().trim();
    
    // Map C2 and other advanced levels to Advanced
    if (lower.includes('c2') || lower.includes('expert') || lower.includes('proficiency')) {
      return 'Advanced';
    }
    if (lower.includes('c1') || lower.includes('advanced')) {
      return 'Advanced';
    }
    if (lower.includes('b2') || lower.includes('upper intermediate')) {
      return 'Intermediate';
    }
    if (lower.includes('b1') || lower.includes('intermediate')) {
      return 'Intermediate';
    }
    if (lower.includes('a2') || lower.includes('elementary')) {
      return 'Beginner';
    }
    if (lower.includes('a1') || lower.includes('beginner')) {
      return 'Beginner';
    }
    
    // Default mapping for other cases
    return difficulty;
  }

  // Get all sensitive scenario scenarios
  async getAllScenarios(): Promise<SensitiveScenario[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sensitive-scenario-scenarios`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Sensitive scenario scenarios received:', data);
      
      // Handle different response structures
      let scenarios: any[] = [];
      if (Array.isArray(data)) {
        scenarios = data;
      } else if (data && Array.isArray(data.scenarios)) {
        scenarios = data.scenarios;
      } else if (data && Array.isArray(data.data)) {
        scenarios = data.data;
      } else {
        console.warn('Unexpected API response structure:', data);
        return [];
      }

      // Normalize difficulty levels
      const normalizedScenarios = scenarios.map(scenario => ({
        ...scenario,
        difficulty: this.normalizeDifficulty(scenario.difficulty || scenario.difficulty_level || 'Intermediate'),
        difficulty_level: this.normalizeDifficulty(scenario.difficulty_level || scenario.difficulty || 'Intermediate'),
      }));

      console.log('✅ Normalized sensitive scenarios:', normalizedScenarios);
      return normalizedScenarios;
    } catch (error) {
      console.error('❌ Error fetching sensitive scenario scenarios:', error);
      throw error;
    }
  }

  // Get specific scenario by ID
  async getScenarioById(scenarioId: number): Promise<SensitiveScenario> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sensitive-scenario-scenarios/${scenarioId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Sensitive scenario scenario received:', data);
      
      // Normalize difficulty levels for single scenario
      const normalizedScenario = {
        ...data,
        difficulty: this.normalizeDifficulty(data.difficulty || data.difficulty_level || 'Intermediate'),
        difficulty_level: this.normalizeDifficulty(data.difficulty_level || data.difficulty || 'Intermediate'),
      };

      console.log('✅ Normalized sensitive scenario:', normalizedScenario);
      return normalizedScenario;
    } catch (error) {
      console.error('❌ Error fetching sensitive scenario scenario:', error);
      throw error;
    }
  }

  // Get audio for a specific scenario
  async getScenarioAudio(scenarioId: number): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/sensitive-scenario/${scenarioId}`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Sensitive scenario audio received:', data);
      
      // Handle different possible response formats for audio
      const convertBase64ToBlob = (base64String: string): string => {
        try {
          // Remove any data URL prefix if present
          const cleanBase64 = base64String.replace(/^data:audio\/[^;]+;base64,/, '');
          
          // Convert base64 to binary string
          const binaryString = atob(cleanBase64);
          
          // Convert binary string to Uint8Array
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Create blob with proper MIME type
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          return URL.createObjectURL(audioBlob);
        } catch (error) {
          console.error('Error converting base64 to blob:', error);
          throw new Error('Failed to convert audio data');
        }
      };

      if (typeof data === 'string') {
        // Direct base64 audio data
        try {
          return convertBase64ToBlob(data);
        } catch (error) {
          // If it's not base64, treat as URL
          return data;
        }
      } else if (data.audio_base64) {
        // Base64 audio data in audio_base64 field
        return convertBase64ToBlob(data.audio_base64);
      } else if (data.audio_data) {
        // Base64 audio data in audio_data field
        return convertBase64ToBlob(data.audio_data);
      } else if (data.audio_url) {
        return data.audio_url;
      } else if (data.url) {
        return data.url;
      } else {
        throw new Error('No audio data found in response');
      }
    } catch (error) {
      console.error('❌ Error fetching sensitive scenario audio:', error);
      throw error;
    }
  }

  // Evaluate sensitive scenario audio response
  async evaluateSensitiveScenario(
    audioBase64: string,
    topicId: number,
    filename: string,
    userId: string,
    timeSpentSeconds: number,
    urduUsed: boolean = false
  ): Promise<SensitiveScenarioEvaluation> {
    try {
      const response = await fetch(`${this.baseUrl}/api/evaluate-critical-opinion`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          audio_base64: audioBase64,
          topic_id: topicId,
          filename: filename,
          user_id: userId,
          time_spent_seconds: timeSpentSeconds,
          urdu_used: urduUsed
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Sensitive scenario evaluation received:', data);
      return data;
    } catch (error) {
      console.error('❌ Error evaluating sensitive scenario:', error);
      throw error;
    }
  }
}

export const sensitiveScenarioService = new SensitiveScenarioService();