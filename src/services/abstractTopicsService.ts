import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { getAuthHeadersWithAccept } from '@/utils/authUtils';

export interface AbstractTopic {
  id: string;
  title: string;
  description?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  estimated_time_minutes?: number;
  key_connectors?: string[];
  vocabulary_focus?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface AbstractTopicEvaluationRequest {
  audio_base64: string;
  topic_id: number;
  filename: string;
  user_id: string;
  time_spent_seconds: number;
  urdu_used: boolean;
}

export interface AbstractTopicEvaluationResponse {
  score?: number;
  feedback?: string;
  suggestions?: string[];
  transcription?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  vocabulary_used?: string[];
  key_connectors_used?: string[];
  fluency_score?: number;
  pronunciation_score?: number;
  content_relevance_score?: number;
  grammar_score?: number;
  message?: string;
  next_steps?: string;
}

export interface CurrentTopicResponse {
  success: boolean;
  current_topic?: {
    topic_id: string;
    topic_title?: string;
    topic_index?: number;
    progress?: number;
  };
  message?: string;
}

// API Functions
const fetchAbstractTopics = async (): Promise<AbstractTopic[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ABSTRACT_TOPICS}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
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

    // Handle different possible response formats
    let topics: any[] = [];

    if (Array.isArray(result)) {
      topics = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      topics = result.data;
    } else if (result && typeof result === 'object' && result.topics && Array.isArray(result.topics)) {
      topics = result.topics;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        topics = result[arrayProperties[0]];
      } else {
        throw new Error('No topics array found in response');
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Normalize topics to our expected format
    const normalizedTopics: AbstractTopic[] = topics.map((topic: any, index: number) => ({
      id: topic.id || topic.topic_id || topic._id || String(index + 1),
      title: topic.topic || topic.title || topic.name || topic.text || topic.question || topic.prompt || 'Untitled Topic',
      description: topic.description || topic.desc || topic.content || topic.details || topic.context,
      difficulty_level: topic.difficulty_level || topic.difficulty || topic.level || 'intermediate',
      category: topic.category || topic.type || topic.subject || topic.topic_category,
      estimated_time_minutes: topic.estimated_time_minutes || topic.duration || topic.time_limit || 2,
      key_connectors: topic.key_connectors || topic.keyConnectors || topic.connectors || [],
      vocabulary_focus: topic.vocabulary_focus || topic.vocabularyFocus || topic.vocabulary || topic.keywords || [],
      created_at: topic.created_at || topic.createdAt,
      updated_at: topic.updated_at || topic.updatedAt,
    }));

    return normalizedTopics;
  } catch (error) {
    console.error('Failed to fetch abstract topics:', error);
    throw error;
  }
};

const fetchAbstractTopicById = async (topicId: string): Promise<AbstractTopic> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ABSTRACT_TOPIC_DETAIL(topicId)}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
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

    // Handle different possible response formats
    let topic: any = null;

    if (result && typeof result === 'object') {
      // Check if it's wrapped in a data property
      if (result.data && typeof result.data === 'object') {
        topic = result.data;
      } else if (result.topic && typeof result.topic === 'object') {
        topic = result.topic;
      } else if (result.id || result.title) {
        // Direct topic object
        topic = result;
      } else {
        throw new Error('No topic found in response');
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Normalize topic to our expected format
    const normalizedTopic: AbstractTopic = {
      id: topic.id || topic.topic_id || topic._id || topicId,
      title: topic.title || topic.name || topic.text || 'Untitled Topic',
      description: topic.description || topic.desc || topic.content || topic.prompt,
      difficulty_level: topic.difficulty_level || topic.difficulty || topic.level || 'intermediate',
      category: topic.category || topic.type || topic.subject,
      estimated_time_minutes: topic.estimated_time_minutes || topic.duration || 2,
      created_at: topic.created_at || topic.createdAt,
      updated_at: topic.updated_at || topic.updatedAt,
    };

    return normalizedTopic;
  } catch (error) {
    console.error(`Failed to fetch abstract topic ${topicId}:`, error);
    throw error;
  }
};

const fetchAbstractTopicAudio = async (topicId: string): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for audio generation

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ABSTRACT_TOPIC_AUDIO(topicId)}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
      body: JSON.stringify({
        topic_id: topicId
      }),
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

    // Handle different possible response formats for audio
    let audioUrl: string | null = null;
    
    if (typeof result === 'string') {
      audioUrl = result;
    } else if (result && typeof result === 'object') {
      // Check for base64 audio data first
      if (result.audio_base64) {
        try {
          const base64Data = result.audio_base64.replace(/^data:audio\/[^;]+;base64,/, '');
          
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
        audioUrl = result.audio_url || result.audioUrl || result.url || result.audio || result.file_url;
      }
    }

    if (!audioUrl) {
      throw new Error('No audio URL or base64 data found in response');
    }

    return audioUrl;
  } catch (error) {
    console.error(`Failed to fetch audio for abstract topic ${topicId}:`, error);
    throw error;
  }
};

const evaluateAbstractTopic = async (evaluationData: AbstractTopicEvaluationRequest): Promise<AbstractTopicEvaluationResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds for evaluation

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_ABSTRACT_TOPIC}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
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

    // Handle different possible response formats
    let evaluation: any = result;
    
    if (result && typeof result === 'object') {
      // Check if it's wrapped in a data property
      if (result.data && typeof result.data === 'object') {
        evaluation = result.data;
      } else if (result.evaluation && typeof result.evaluation === 'object') {
        evaluation = result.evaluation;
      }
    }

    // Handle nested evaluation structure and extract detailed scores
    let detailedEvaluation = evaluation;
    if (evaluation.evaluation && typeof evaluation.evaluation === 'object') {
      detailedEvaluation = { ...evaluation, ...evaluation.evaluation };
      console.log('📊 Extracted nested evaluation data:', {
        next_steps: detailedEvaluation.next_steps,
        suggested_improvements: detailedEvaluation.suggested_improvements,
        fluency_score: detailedEvaluation.fluency_score
      });
    }

    // Normalize evaluation response to our expected format
    const normalizedEvaluation: AbstractTopicEvaluationResponse = {
      score: detailedEvaluation.score || detailedEvaluation.overall_score || detailedEvaluation.total_score || evaluation.score,
      feedback: detailedEvaluation.feedback || detailedEvaluation.overall_feedback || detailedEvaluation.comment,
      suggestions: detailedEvaluation.suggested_improvements || detailedEvaluation.suggestions || detailedEvaluation.recommendations || detailedEvaluation.tips || [],
      transcription: detailedEvaluation.transcription || detailedEvaluation.transcript || detailedEvaluation.text,
      strengths: detailedEvaluation.strengths || detailedEvaluation.positive_aspects || detailedEvaluation.good_points || [],
      areas_for_improvement: detailedEvaluation.areas_for_improvement || detailedEvaluation.improvements || detailedEvaluation.weaknesses || [],
      vocabulary_used: detailedEvaluation.vocabulary_matches || detailedEvaluation.vocabulary_used || detailedEvaluation.vocabulary || detailedEvaluation.words_used || [],
      key_connectors_used: detailedEvaluation.connector_matches || detailedEvaluation.key_connectors_used || detailedEvaluation.connectors_used || detailedEvaluation.transitions || [],
      fluency_score: detailedEvaluation.fluency_score || detailedEvaluation.fluency,
      pronunciation_score: detailedEvaluation.pronunciation_score || detailedEvaluation.pronunciation,
      content_relevance_score: detailedEvaluation.content_relevance_score || detailedEvaluation.content_score || detailedEvaluation.relevance,
      grammar_score: detailedEvaluation.grammar_score || detailedEvaluation.grammar,
      message: detailedEvaluation.message || detailedEvaluation.status_message,
      next_steps: detailedEvaluation.next_steps || detailedEvaluation.next_step || detailedEvaluation.recommendations,
    };

    console.log('🎯 Final normalized evaluation:', {
      score: normalizedEvaluation.score,
      suggestions: normalizedEvaluation.suggestions,
      next_steps: normalizedEvaluation.next_steps,
      fluency_score: normalizedEvaluation.fluency_score
    });

    return normalizedEvaluation;
  } catch (error) {
    console.error('Failed to evaluate abstract topic:', error);
    throw error;
  }
};

const fetchUserCurrentTopic = async (userId: string): Promise<CurrentTopicResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

    console.log('🔍 Fetching current topic for user:', userId);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ABSTRACT_TOPIC_CURRENT(userId)}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
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

    console.log('📥 Current topic response:', result);

    // Normalize the response
    const normalizedResponse: CurrentTopicResponse = {
      success: result.success || false,
      current_topic: result.current_topic || result.currentTopic || result.topic,
      message: result.message || result.msg,
    };

    return normalizedResponse;
  } catch (error) {
    console.error('Failed to fetch current topic:', error);
    // Return a default response instead of throwing to allow graceful fallback
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch current topic'
    };
  }
};

const AbstractTopicsService = {
  getAll: fetchAbstractTopics,
  getById: fetchAbstractTopicById,
  getAudio: fetchAbstractTopicAudio,
  getCurrentTopic: fetchUserCurrentTopic,
  evaluate: evaluateAbstractTopic,
};

export default AbstractTopicsService;