import { BASE_API_URL } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

// Fallback topics for when API is not available
const fallbackTopics: SpontaneousSpeechTopic[] = [
  {
    id: 1,
    title: "Cultural Communication Styles",
    description: "Explore how different cultures approach communication and express ideas",
    complexity: "Intermediate",
    difficulty_level: "Intermediate",
    category: "Culture",
    expected_keywords: ["culture", "communication", "directness", "harmony", "respect"],
    prompt_text: "How do you think directness in communication is perceived differently across cultures?"
  },
  {
    id: 2,
    title: "Technology and Society",
    description: "Discuss the impact of modern technology on social interactions and daily life",
    complexity: "Intermediate",
    difficulty_level: "Intermediate", 
    category: "Technology",
    expected_keywords: ["technology", "social media", "digital", "connection", "impact"],
    prompt_text: "What are the positive and negative effects of social media on modern relationships?"
  },
  {
    id: 3,
    title: "Environmental Responsibility",
    description: "Share your thoughts on individual and collective environmental responsibility",
    complexity: "Advanced",
    difficulty_level: "Advanced",
    category: "Environment",
    expected_keywords: ["environment", "sustainability", "responsibility", "climate", "future"],
    prompt_text: "What role should individuals play in addressing climate change?"
  },
  {
    id: 4,
    title: "Education and Learning",
    description: "Discuss modern approaches to education and lifelong learning",
    complexity: "Intermediate",
    difficulty_level: "Intermediate",
    category: "Education", 
    expected_keywords: ["education", "learning", "skills", "knowledge", "development"],
    prompt_text: "How has the concept of education changed in the digital age?"
  },
  {
    id: 5,
    title: "Work-Life Balance",
    description: "Express your views on maintaining balance between professional and personal life",
    complexity: "Beginner",
    difficulty_level: "Beginner",
    category: "Lifestyle",
    expected_keywords: ["work", "life", "balance", "productivity", "wellbeing"],
    prompt_text: "What does work-life balance mean to you and how do you achieve it?"
  }
];

// Interfaces
export interface SpontaneousSpeechTopic {
  id: number;
  title: string;
  description: string;
  complexity?: string;
  category?: string;
  difficulty_level?: string;
  expected_keywords?: string[];
  prompt_text?: string;
}

export interface SpontaneousSpeechEvaluation {
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

class SpontaneousSpeechService {
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
    
    // Default mapping for any other values
    if (lower.includes('advanced') || lower.includes('hard') || lower.includes('difficult')) {
      return 'Advanced';
    }
    if (lower.includes('beginner') || lower.includes('easy') || lower.includes('basic')) {
      return 'Beginner';
    }
    
    // Capitalize first letter and return, default to Intermediate
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
  }

  // Get all spontaneous speech topics
  async getAllTopics(): Promise<SpontaneousSpeechTopic[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/spontaneous-speech-topics`, {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Spontaneous speech topics received:', data);
      
      // Handle different response structures
      let topics: any[] = [];
      
      if (Array.isArray(data)) {
        topics = data;
      } else if (data && Array.isArray(data.topics)) {
        topics = data.topics;
      } else if (data && Array.isArray(data.data)) {
        topics = data.data;
      } else if (data && typeof data === 'object') {
        // Look for any array property
        const arrayProperties = Object.keys(data).filter(key => Array.isArray(data[key]));
        if (arrayProperties.length > 0) {
          topics = data[arrayProperties[0]];
        } else {
          console.warn('No topics array found in response');
          return [];
        }
      } else {
        console.warn('Unexpected API response structure:', data);
        return [];
      }

      // Normalize topics to ensure consistent format
      const normalizedTopics: SpontaneousSpeechTopic[] = topics.map((topic: any, index: number) => ({
        id: topic.id || topic.topic_id || index + 1,
        title: topic.title || topic.topic_title || topic.name || topic.topic || topic.question || topic.prompt || `Topic ${index + 1}`,
        description: topic.description || topic.topic_description || topic.desc || topic.content || topic.details || topic.prompt_text || 'Practice spontaneous speech on this topic',
        complexity: this.normalizeDifficulty(topic.complexity || topic.difficulty_level || topic.difficulty || 'Intermediate'),
        difficulty_level: this.normalizeDifficulty(topic.difficulty_level || topic.complexity || topic.difficulty || 'Intermediate'),
        category: topic.category || topic.type || topic.subject || 'General',
        expected_keywords: Array.isArray(topic.expected_keywords) ? topic.expected_keywords : 
                          Array.isArray(topic.keywords) ? topic.keywords : [],
        prompt_text: topic.prompt_text || topic.prompt || topic.instructions || topic.description
      }));

      console.log('✅ Normalized spontaneous speech topics:', normalizedTopics);
      return normalizedTopics;
    } catch (error) {
      console.error('❌ Error fetching spontaneous speech topics:', error);
      console.log('🔄 Using fallback topics');
      return fallbackTopics;
    }
  }

  // Get specific topic by ID
  async getTopicById(topicId: number): Promise<SpontaneousSpeechTopic> {
    try {
      const response = await fetch(`${this.baseUrl}/api/spontaneous-speech-topics/${topicId}`, {
        method: 'GET',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Spontaneous speech topic received:', data);
      
      // Extract topic data from response
      const topicData = data.data || data.topic || data;
      
      // Normalize topic to ensure consistent format
      const normalizedTopic: SpontaneousSpeechTopic = {
        id: topicData.id || topicData.topic_id || topicId,
        title: topicData.title || topicData.topic_title || topicData.name || topicData.topic || topicData.question || topicData.prompt || `Topic ${topicId}`,
        description: topicData.description || topicData.topic_description || topicData.desc || topicData.content || topicData.details || topicData.prompt_text || 'Practice spontaneous speech on this topic',
        complexity: this.normalizeDifficulty(topicData.complexity || topicData.difficulty_level || topicData.difficulty || 'Intermediate'),
        difficulty_level: this.normalizeDifficulty(topicData.difficulty_level || topicData.complexity || topicData.difficulty || 'Intermediate'),
        category: topicData.category || topicData.type || topicData.subject || 'General',
        expected_keywords: Array.isArray(topicData.expected_keywords) ? topicData.expected_keywords : 
                          Array.isArray(topicData.keywords) ? topicData.keywords : [],
        prompt_text: topicData.prompt_text || topicData.prompt || topicData.instructions || topicData.description
      };

      console.log('✅ Normalized spontaneous speech topic:', normalizedTopic);
      return normalizedTopic;
    } catch (error) {
      console.error('❌ Error fetching spontaneous speech topic:', error);
      console.log('🔄 Using fallback topic');
      const fallbackTopic = fallbackTopics.find(topic => topic.id === topicId) || fallbackTopics[0];
      return fallbackTopic;
    }
  }

  // Get audio for a specific topic
  async getTopicAudio(topicId: number): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/spontaneous-speech/${topicId}`, {
        method: 'POST',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📥 Spontaneous speech audio received:', data);
      
      // Handle different possible response formats for audio
      let audioUrl: string | null = null;
      
      if (typeof data === 'string') {
        // Direct audio URL string
        audioUrl = data;
      } else if (data && typeof data === 'object') {
        // Check for base64 audio data first
        if (data.audio_base64) {
          try {
            // Convert base64 to blob URL
            const base64Data = data.audio_base64.replace(/^data:audio\/[^;]+;base64,/, '');
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
            audioUrl = URL.createObjectURL(audioBlob);
          } catch (base64Error) {
            throw new Error('Failed to process base64 audio data');
          }
        } else {
          // Check for regular audio URL properties
          audioUrl = data.audio_url || data.audioUrl || data.url || data.audio || data.file_url;
        }
      }

      if (!audioUrl) {
        throw new Error('No audio URL or base64 data found in response');
      }

      return audioUrl;
    } catch (error) {
      console.error('❌ Error fetching spontaneous speech audio:', error);
      throw error;
    }
  }

  // Evaluate spontaneous speech recording
  async evaluateSpontaneousSpeech(
    audioBase64: string,
    topicId: number,
    filename: string,
    userId: string,
    timeSpentSeconds: number,
    urduUsed: boolean = false
  ): Promise<SpontaneousSpeechEvaluation> {
    try {
      const response = await fetch(`${this.baseUrl}/api/evaluate-spontaneous-speech`, {
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
      console.log('📥 Spontaneous speech evaluation received:', data);
      
      // Handle API error responses
      if (data.success === false || data.error) {
        const errorMessage = data.message || data.error || 'Speech evaluation failed';
        
        // Create evaluation object for error cases
        const evaluation: SpontaneousSpeechEvaluation = {
          success: false,
          overall_score: 0,
          fluency_score: 0,
          vocabulary_score: 0,
          grammar_score: 0,
          content_relevance_score: 0,
          keyword_usage_score: 0,
          response_time_score: 0,
          strengths: [],
          areas_for_improvement: ['Please speak more clearly and try again'],
          keyword_matches: [],
          total_keywords_expected: 0,
          keywords_used_count: 0,
          feedback: errorMessage,
          suggestions: ['Please speak more clearly and try again'],
          error: errorMessage
        };
        
        return evaluation;
      }
      
      // Handle successful evaluation responses
      const evaluation = data.evaluation || data;
      
      const normalizedEvaluation: SpontaneousSpeechEvaluation = {
        success: evaluation.success !== false,
        overall_score: evaluation.overall_score || evaluation.score || 0,
        fluency_score: evaluation.fluency_score || 0,
        vocabulary_score: evaluation.vocabulary_score || 0,
        grammar_score: evaluation.grammar_score || 0,
        content_relevance_score: evaluation.content_relevance_score || 0,
        keyword_usage_score: evaluation.keyword_usage_score || 0,
        response_time_score: evaluation.response_time_score || 0,
        strengths: Array.isArray(evaluation.strengths) ? evaluation.strengths : [],
        areas_for_improvement: Array.isArray(evaluation.areas_for_improvement) ? evaluation.areas_for_improvement : [],
        keyword_matches: Array.isArray(evaluation.keyword_matches) ? evaluation.keyword_matches : [],
        total_keywords_expected: evaluation.total_keywords_expected || 0,
        keywords_used_count: evaluation.keywords_used_count || 0,
        feedback: evaluation.feedback || evaluation.message || 'Evaluation completed',
        suggestions: Array.isArray(evaluation.suggestions) ? evaluation.suggestions : []
      };
      
      console.log('✅ Normalized spontaneous speech evaluation:', normalizedEvaluation);
      return normalizedEvaluation;
    } catch (error) {
      console.error('❌ Error evaluating spontaneous speech:', error);
      throw error;
    }
  }
}

export const spontaneousSpeechService = new SpontaneousSpeechService();