import { BASE_API_URL } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// Fallback topics for when API is not available
const fallbackTopics: CriticalOpinionTopic[] = [
  {
    id: 1,
    title: "Education Policy",
    description: "Should standardized testing be eliminated from educational assessment systems?",
    category: "Education",
    complexity: "Advanced",
    difficulty_level: "Advanced",
    expected_keywords: ["assessment", "standardization", "educational outcomes", "equity", "pedagogy"],
    prompt_text: "Develop a comprehensive opinion on the role of standardized testing in modern education systems."
  },
  {
    id: 2,
    title: "Digital Privacy",
    description: "Is complete digital privacy a fundamental right in the modern world?",
    category: "Technology",
    complexity: "Advanced",
    difficulty_level: "Advanced",
    expected_keywords: ["privacy", "surveillance", "digital rights", "security", "freedom"],
    prompt_text: "Present your perspective on balancing digital privacy with security and convenience."
  },
  {
    id: 3,
    title: "Scientific Investment",
    description: "Should governments prioritize space exploration over addressing earthly problems?",
    category: "Science",
    complexity: "Intermediate",
    difficulty_level: "Intermediate",
    expected_keywords: ["resource allocation", "scientific progress", "societal priorities", "innovation"],
    prompt_text: "Argue for or against prioritizing space exploration in government spending."
  },
  {
    id: 4,
    title: "Technology Policy",
    description: "Should artificial intelligence development be regulated by international law?",
    category: "Technology",
    complexity: "Advanced",
    difficulty_level: "Advanced",
    expected_keywords: ["regulation", "artificial intelligence", "ethics", "governance", "innovation"],
    prompt_text: "Develop your position on international regulation of AI development."
  }
];

// Interfaces
export interface CriticalOpinionTopic {
  id: number;
  title: string;
  description: string;
  category: string;
  complexity?: string;
  difficulty_level?: string;
  expected_keywords?: string[];
  prompt_text?: string;
}

export interface CriticalOpinionEvaluation {
  success: boolean;
  topic: string;
  expected_keywords: string[];
  vocabulary_focus: string[];
  academic_expressions: string[];
  user_text: string;
  evaluation: {
    score: number;
    is_correct: boolean;
    completed: boolean;
    keyword_matches: number;
    total_keywords: number;
    academic_expressions_used: number;
    total_academic_expressions: number;
    detailed_feedback: {
      argument_structure: string;
      logical_flow: string;
      academic_expressions: string;
      critical_thinking: string;
      vocabulary_usage: string;
    };
    suggested_improvement: string;
    strengths: string[];
    areas_for_improvement: string[];
    structure_analysis: {
      thesis_present: boolean;
      supporting_arguments: number;
      counterpoint_addressed: boolean;
      conclusion_present: boolean;
    };
  };
  suggested_improvement: string;
  progress_recorded: boolean;
  unlocked_content: any[];
  keyword_matches: number;
  total_keywords: number;
  academic_expressions_used: number;
  total_academic_expressions: number;
}

class CriticalOpinionService {
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

  // Get all critical opinion topics
  async getAllTopics(): Promise<CriticalOpinionTopic[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/critical-opinion-topics`, {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Critical opinion topics received:', data);
      
      // Handle different response structures
      let topics: any[] = [];
      if (Array.isArray(data)) {
        topics = data;
      } else if (data && Array.isArray(data.topics)) {
        topics = data.topics;
      } else if (data && Array.isArray(data.data)) {
        topics = data.data;
      } else {
        console.warn('Unexpected API response structure:', data);
        console.log('🔄 Using fallback topics');
        return fallbackTopics;
      }

      // Normalize the data with proper field mapping
      const normalizedTopics = topics.map(topic => ({
        id: topic.id,
        title: topic.title || topic.name || topic.topic || 'Untitled Topic',
        description: topic.description || topic.desc || topic.content || topic.prompt_text || 'No description available',
        category: topic.category || topic.type || topic.subject || 'General',
        complexity: this.normalizeDifficulty(topic.complexity || topic.difficulty_level || topic.difficulty || 'Intermediate'),
        difficulty_level: this.normalizeDifficulty(topic.difficulty_level || topic.complexity || topic.difficulty || 'Intermediate'),
        expected_keywords: topic.expected_keywords || topic.keywords || [],
        prompt_text: topic.prompt_text || topic.prompt || topic.question || topic.description
      }));

      console.log('✅ Normalized critical opinion topics:', normalizedTopics);
      return normalizedTopics;
    } catch (error) {
      console.error('❌ Error fetching critical opinion topics:', error);
      console.log('🔄 Using fallback topics');
      return fallbackTopics;
    }
  }

  // Get specific topic by ID
  async getTopicById(topicId: number): Promise<CriticalOpinionTopic> {
    try {
      const response = await fetch(`${this.baseUrl}/api/critical-opinion-topics/${topicId}`, {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Critical opinion topic received:', data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching critical opinion topic:', error);
      throw error;
    }
  }

  // Get audio for a specific topic
  async getTopicAudio(topicId: number): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/critical-opinion-builder/${topicId}`, {
        method: 'POST',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Critical opinion audio received:', data);
      
      const convertBase64ToBlob = (base64String: string): string => {
        try {
          const cleanBase64 = base64String.replace(/^data:audio\/[^;]+;base64,/, '');
          const binaryString = atob(cleanBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
          return URL.createObjectURL(audioBlob);
        } catch (error) {
          console.error('Error converting base64 to blob:', error);
          throw new Error('Failed to convert audio data');
        }
      };

      // Handle different response structures for audio data
      if (typeof data === 'string') {
        try {
          return convertBase64ToBlob(data);
        } catch (error) {
          return data; // Fallback to URL if not base64
        }
      } else if (data.audio_base64) {
        return convertBase64ToBlob(data.audio_base64);
      } else if (data.audio_data) {
        return convertBase64ToBlob(data.audio_data);
      } else if (data.audio_url) {
        return data.audio_url;
      } else if (data.url) {
        return data.url;
      } else {
        throw new Error('No audio data found in response');
      }
    } catch (error) {
      console.error('❌ Error fetching critical opinion audio:', error);
      throw error;
    }
  }

  // Evaluate critical opinion audio response
  async evaluateCriticalOpinion(
    audioBase64: string,
    topicId: number,
    filename: string,
    userId: string,
    timeSpentSeconds: number,
    urduUsed: boolean = false
  ): Promise<CriticalOpinionEvaluation> {
    try {
      const response = await fetch(`${this.baseUrl}/api/evaluate-critical-opinion`, {
        method: 'POST',
        headers: getAuthHeadersWithAccept(),
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
      console.log('📥 Critical opinion evaluation received:', data);
      return data;
    } catch (error) {
      console.error('❌ Error evaluating critical opinion:', error);
      throw error;
    }
  }
}

export const criticalOpinionService = new CriticalOpinionService();