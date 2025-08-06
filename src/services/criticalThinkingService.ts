import { BASE_API_URL } from '@/config/api';

// Types and Interfaces
export interface CriticalThinkingTopic {
  topic_id: string;
  topic_title: string;
  topic_description: string;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
  questions: string[];
  keywords: string[];
  estimated_duration: number; // in minutes
  created_at?: string;
  updated_at?: string;
}

export interface CriticalThinkingTopicDetail extends CriticalThinkingTopic {
  topic: string; // The actual topic text from API response
  expected_keywords?: string[]; // Expected keywords from API response
  audio_url?: string;
  sample_responses?: string[];
  discussion_points?: string[];
  related_topics?: string[];
}

export interface CriticalThinkingAudioResponse {
  audio_url: string;
  audio_duration?: number;
  transcript?: string;
  topic_id: string;
  message?: string;
}

export interface CriticalThinkingEvaluationRequest {
  audio_base64: string;
  topic_id: number;
  filename: string;
  user_id: string;
  time_spent_seconds: number;
  urdu_used: boolean;
}

export interface CriticalThinkingEvaluationResponse {
  success: boolean;
  topic: string;
  expected_keywords: string[];
  user_text: string;
  evaluation: {
    success: boolean;
    evaluation: {
      success: boolean;
      overall_score: number;
      argument_structure_score: number;
      critical_thinking_score: number;
      vocabulary_range_score: number;
      fluency_grammar_score: number;
      discourse_markers_score: number;
      keyword_matches: string[];
      total_keywords: number;
      matched_keywords_count: number;
      vocabulary_matches: string[];
      total_vocabulary: number;
      matched_vocabulary_count: number;
      argument_type_detected: string;
      detailed_feedback: {
        argument_structure_feedback: string;
        critical_thinking_feedback: string;
        vocabulary_feedback: string;
        fluency_feedback: string;
        discourse_feedback: string;
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
    argument_type: string;
    score: number;
    is_correct: boolean;
    completed: boolean;
  };
  suggested_improvement: string;
  progress_recorded: boolean;
  unlocked_content: string[];
  keyword_matches: number;
  total_keywords: number;
  fluency_score: number;
  grammar_score: number;
  argument_type: string;
  topic_title: string;
  topic_category: string;
}

// API Endpoints
const API_ENDPOINTS = {
  CRITICAL_THINKING_TOPICS: '/api/critical-thinking-topics',
  CRITICAL_THINKING_TOPIC_DETAIL: (topicId: string) => `/api/critical-thinking-topics/${topicId}`,
  CRITICAL_THINKING_TOPIC_AUDIO: (topicId: string) => `/api/critical-thinking-topics/${topicId}`,
  EVALUATE_CRITICAL_THINKING: '/api/evaluate-critical-thinking',
} as const;

// API Functions
const fetchCriticalThinkingTopics = async (): Promise<CriticalThinkingTopic[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log('🔍 Fetching critical thinking topics...');

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.CRITICAL_THINKING_TOPICS}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    console.log('📥 Raw critical thinking topics response:', result);

    // Handle different possible response formats
    let topics: any[] = [];

    if (Array.isArray(result)) {
      topics = result;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.data)) {
        topics = result.data;
      } else if (Array.isArray(result.topics)) {
        topics = result.topics;
      } else if (Array.isArray(result.critical_thinking_topics)) {
        topics = result.critical_thinking_topics;
      } else {
        // Look for any array property
        const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
        if (arrayProperties.length > 0) {
          topics = result[arrayProperties[0]];
        } else {
          throw new Error('No topics array found in response');
        }
      }
    }

    if (!Array.isArray(topics)) {
      throw new Error('Topics data is not an array');
    }

    // Normalize topics to our expected format
    const normalizedTopics: CriticalThinkingTopic[] = topics.map((topic: any, index: number) => ({
      topic_id: topic.topic_id || topic.id || `topic_${index + 1}`,
      topic_title: topic.topic_title || topic.title || topic.name || `Critical Thinking Topic ${index + 1}`,
      topic_description: topic.topic_description || topic.description || 'Engage in critical thinking discussion',
      difficulty_level: topic.difficulty_level || topic.difficulty || 'intermediate',
      category: topic.category || 'General',
      questions: Array.isArray(topic.questions) ? topic.questions : 
                Array.isArray(topic.discussion_questions) ? topic.discussion_questions :
                ['What are your thoughts on this topic?'],
      keywords: Array.isArray(topic.keywords) ? topic.keywords : 
               Array.isArray(topic.tags) ? topic.tags : [],
      estimated_duration: topic.estimated_duration || topic.duration || 15,
      created_at: topic.created_at,
      updated_at: topic.updated_at,
    }));

    console.log('✅ Normalized critical thinking topics:', normalizedTopics);
    return normalizedTopics;

  } catch (error) {
    console.error('❌ Error fetching critical thinking topics:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred while fetching topics');
  }
};

const fetchCriticalThinkingTopic = async (topicId: string): Promise<CriticalThinkingTopicDetail> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log(`🔍 Fetching critical thinking topic: ${topicId}`);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.CRITICAL_THINKING_TOPIC_DETAIL(topicId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    console.log('📥 Raw critical thinking topic detail response:', result);

    // Handle different possible response formats
    let topicData = result;
    if (result && typeof result === 'object') {
      if (result.data && typeof result.data === 'object') {
        topicData = result.data;
      } else if (result.topic && typeof result.topic === 'object') {
        topicData = result.topic;
      }
    }

    // Normalize topic to our expected format
    const normalizedTopic: CriticalThinkingTopicDetail = {
      topic_id: topicData.topic_id || topicData.id || topicId,
      topic_title: topicData.topic_title || topicData.title || topicData.name || 'Critical Thinking Topic',
      topic_description: topicData.topic_description || topicData.description || 'Engage in critical thinking discussion',
      topic: topicData.topic || topicData.topic_title || topicData.title || 'Critical Thinking Topic', // Use the "topic" field from API
      expected_keywords: Array.isArray(topicData.expected_keywords) ? topicData.expected_keywords : [], // Expected keywords from API
      difficulty_level: topicData.difficulty_level || topicData.difficulty || 'intermediate',
      category: topicData.category || 'General',
      questions: Array.isArray(topicData.questions) ? topicData.questions : 
                Array.isArray(topicData.discussion_questions) ? topicData.discussion_questions :
                ['What are your thoughts on this topic?'],
      keywords: Array.isArray(topicData.keywords) ? topicData.keywords : 
               Array.isArray(topicData.tags) ? topicData.tags : [],
      estimated_duration: topicData.estimated_duration || topicData.duration || 15,
      audio_url: topicData.audio_url,
      sample_responses: Array.isArray(topicData.sample_responses) ? topicData.sample_responses : [],
      discussion_points: Array.isArray(topicData.discussion_points) ? topicData.discussion_points : [],
      related_topics: Array.isArray(topicData.related_topics) ? topicData.related_topics : [],
      created_at: topicData.created_at,
      updated_at: topicData.updated_at,
    };

    console.log('✅ Normalized critical thinking topic detail:', normalizedTopic);
    return normalizedTopic;

  } catch (error) {
    console.error(`❌ Error fetching critical thinking topic ${topicId}:`, error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred while fetching topic details');
  }
};

const fetchCriticalThinkingTopicAudio = async (topicId: string): Promise<CriticalThinkingAudioResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for audio

    console.log(`🔍 Fetching critical thinking topic audio: ${topicId}`);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.CRITICAL_THINKING_TOPIC_AUDIO(topicId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ topic_id: parseInt(topicId) || 0 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    console.log('📥 Raw critical thinking topic audio response:', result);

    // Handle different possible response formats
    let audioData = result;
    if (result && typeof result === 'object') {
      if (result.data && typeof result.data === 'object') {
        audioData = result.data;
      } else if (result.audio && typeof result.audio === 'object') {
        audioData = result.audio;
      }
    }

    // Normalize audio response to our expected format
    const normalizedAudio: CriticalThinkingAudioResponse = {
      audio_url: audioData.audio_url || audioData.url || '',
      audio_duration: audioData.audio_duration || audioData.duration,
      transcript: audioData.transcript || audioData.text,
      topic_id: audioData.topic_id || topicId,
      message: audioData.message,
    };

    if (!normalizedAudio.audio_url) {
      throw new Error('No audio URL provided in response');
    }

    console.log('✅ Normalized critical thinking topic audio:', normalizedAudio);
    return normalizedAudio;

  } catch (error) {
    console.error(`❌ Error fetching critical thinking topic audio ${topicId}:`, error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred while fetching topic audio');
  }
};

const evaluateCriticalThinking = async (evaluationData: CriticalThinkingEvaluationRequest): Promise<CriticalThinkingEvaluationResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds for evaluation

    console.log('🔍 Evaluating critical thinking response:', evaluationData);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_CRITICAL_THINKING}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(evaluationData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    console.log('📥 Raw critical thinking evaluation response:', result);

    // Handle different possible response formats
    let evaluation = result;
    if (result && typeof result === 'object') {
      if (result.data && typeof result.data === 'object') {
        evaluation = result.data;
      } else if (result.evaluation && typeof result.evaluation === 'object') {
        evaluation = result.evaluation;
      }
    }

    // Normalize evaluation response to our expected format
    const normalizedEvaluation: CriticalThinkingEvaluationResponse = {
      evaluation: {
        critical_analysis_score: evaluation.evaluation?.critical_analysis_score || evaluation.critical_analysis_score || 0,
        argumentation_score: evaluation.evaluation?.argumentation_score || evaluation.argumentation_score || 0,
        clarity_score: evaluation.evaluation?.clarity_score || evaluation.clarity_score || 0,
        depth_score: evaluation.evaluation?.depth_score || evaluation.depth_score || 0,
        overall_score: evaluation.evaluation?.overall_score || evaluation.overall_score || 0,
      },
      feedback: {
        strengths: evaluation.feedback?.strengths || evaluation.strengths || [],
        areas_for_improvement: evaluation.feedback?.areas_for_improvement || evaluation.areas_for_improvement || [],
        specific_suggestions: evaluation.feedback?.specific_suggestions || evaluation.specific_suggestions || [],
        critical_analysis_feedback: evaluation.feedback?.critical_analysis_feedback || evaluation.critical_analysis_feedback || '',
        argumentation_feedback: evaluation.feedback?.argumentation_feedback || evaluation.argumentation_feedback || '',
      },
      next_steps: evaluation.next_steps,
      message: evaluation.message,
    };

    console.log('✅ Normalized critical thinking evaluation:', normalizedEvaluation);
    return normalizedEvaluation;

  } catch (error) {
    console.error('❌ Error evaluating critical thinking:', error);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - please check your connection and try again');
      }
      throw error;
    }
    
    throw new Error('An unexpected error occurred while evaluating response');
  }
};

// Export all functions and types
export {
  fetchCriticalThinkingTopics,
  fetchCriticalThinkingTopic,
  fetchCriticalThinkingTopicAudio,
  evaluateCriticalThinking,
};