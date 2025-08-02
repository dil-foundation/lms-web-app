import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';

export interface NewsSummaryItem {
  id: string;
  title: string;
  level: string;
  duration: string;
  content: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  category?: string;
  estimated_time_minutes?: number;
  keywords?: string[];
  vocabulary_focus?: string[];
  expected_keywords?: string[];
  expected_structure?: string;
  summary_time?: string;
  listening_duration?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NewsSummaryEvaluationRequest {
  audio_base64: string;
  news_id: number;
  filename: string;
  user_id: string;
  time_spent_seconds: number;
  urdu_used: boolean;
}

export interface NewsSummaryEvaluationResponse {
  score?: number;
  feedback?: string;
  suggestions?: string[];
  transcription?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  vocabulary_used?: string[];
  fluency_score?: number;
  pronunciation_score?: number;
  content_relevance_score?: number;
  grammar_score?: number;
  summary_quality_score?: number;
  comprehension_score?: number;
  message?: string;
  next_steps?: string;
}

// API Functions
const fetchNewsSummaryItems = async (): Promise<NewsSummaryItem[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log('🔍 Fetching news summary items...');

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.NEWS_SUMMARY_ITEMS}`, {
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

    console.log('📥 Raw news summary items response:', result);

    // Handle different possible response formats
    let items: any[] = [];

    if (Array.isArray(result)) {
      items = result;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.data)) {
        items = result.data;
      } else if (Array.isArray(result.items)) {
        items = result.items;
      } else if (Array.isArray(result.news_items)) {
        items = result.news_items;
      } else if (Array.isArray(result.news_summary_items)) {
        items = result.news_summary_items;
      } else {
        // Look for any array property
        const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
        if (arrayProperties.length > 0) {
          items = result[arrayProperties[0]];
        } else {
          throw new Error('No news items array found in response');
        }
      }
    }

    if (!Array.isArray(items)) {
      throw new Error('Expected an array of news items from API');
    }

    // Normalize items to our expected format
    const normalizedItems: NewsSummaryItem[] = items.map((item: any, index: number) => ({
      id: item.id || item.news_id || item._id || String(index + 1),
      title: item.title || item.headline || item.subject || item.topic || 'Untitled News',
      level: item.difficulty || item.level || item.difficulty_level || item.language_level || 'B2 Level',
      duration: item.listening_duration || item.duration || item.time || item.length || '1:00',
      content: item.summary_text || item.content || item.text || item.article || item.body || item.description || 'No content available',
      difficulty_level: item.difficulty_level || item.difficulty || item.level || 'intermediate',
      category: item.category || item.type || item.subject || item.topic_category,
      estimated_time_minutes: item.estimated_time_minutes || item.duration_minutes || item.time_limit || 2,
      keywords: item.keywords || item.tags || item.focus_areas || [],
      vocabulary_focus: item.vocabulary_focus || item.vocabularyFocus || item.vocabulary || [],
      expected_keywords: item.expected_keywords || item.expectedKeywords || [],
      expected_structure: item.expected_structure || item.expectedStructure,
      summary_time: item.summary_time || item.summaryTime,
      listening_duration: item.listening_duration || item.listeningDuration,
      created_at: item.created_at || item.createdAt,
      updated_at: item.updated_at || item.updatedAt,
    }));

    console.log('✅ Normalized news summary items:', normalizedItems.length, 'items');

    return normalizedItems;
  } catch (error) {
    console.error('Failed to fetch news summary items:', error);
    throw error;
  }
};

const fetchNewsSummaryItemById = async (newsId: string): Promise<NewsSummaryItem> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log(`🔍 Fetching news summary item by ID: ${newsId}`);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.NEWS_SUMMARY_ITEM_DETAIL(newsId)}`, {
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

    console.log('📥 Raw news item detail response:', result);

    // Handle different possible response formats
    let item: any = result;
    if (result && typeof result === 'object') {
      if (result.data && typeof result.data === 'object') {
        item = result.data;
      } else if (result.item && typeof result.item === 'object') {
        item = result.item;
      } else if (result.news_item && typeof result.news_item === 'object') {
        item = result.news_item;
      }
    }

    // Normalize item to our expected format
    const normalizedItem: NewsSummaryItem = {
      id: item.id || item.news_id || item._id || newsId,
      title: item.title || item.headline || item.subject || item.topic || 'Untitled News',
      level: item.difficulty || item.level || item.difficulty_level || item.language_level || 'B2 Level',
      duration: item.listening_duration || item.duration || item.time || item.length || '1:00',
      content: item.summary_text || item.content || item.text || item.article || item.body || item.description || 'No content available',
      difficulty_level: item.difficulty_level || item.difficulty || item.level || 'intermediate',
      category: item.category || item.type || item.subject || item.topic_category,
      estimated_time_minutes: item.estimated_time_minutes || item.duration_minutes || item.time_limit || 2,
      keywords: item.keywords || item.tags || item.focus_areas || [],
      vocabulary_focus: item.vocabulary_focus || item.vocabularyFocus || item.vocabulary || [],
      expected_keywords: item.expected_keywords || item.expectedKeywords || [],
      expected_structure: item.expected_structure || item.expectedStructure,
      summary_time: item.summary_time || item.summaryTime,
      listening_duration: item.listening_duration || item.listeningDuration,
      created_at: item.created_at || item.createdAt,
      updated_at: item.updated_at || item.updatedAt,
    };

    console.log('✅ Normalized news item detail:', normalizedItem);

    return normalizedItem;
  } catch (error) {
    console.error(`Failed to fetch news summary item ${newsId}:`, error);
    throw error;
  }
};

const fetchNewsSummaryAudio = async (newsId: string): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for audio generation

    console.log(`🔊 Generating audio for news summary: ${newsId}`);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.NEWS_SUMMARY_AUDIO(newsId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        news_id: newsId
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

    console.log('📥 Audio generation response:', result);

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
    console.error(`Failed to fetch audio for news summary ${newsId}:`, error);
    throw error;
  }
};

const evaluateNewsSummary = async (request: NewsSummaryEvaluationRequest): Promise<NewsSummaryEvaluationResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏰ News summary evaluation timed out after 45 seconds');
      controller.abort();
    }, 45000); // 45 seconds timeout

    console.log('🎤 Evaluating news summary response:', {
      news_id: request.news_id,
      user_id: request.user_id,
      filename: request.filename,
      time_spent_seconds: request.time_spent_seconds,
      urdu_used: request.urdu_used,
      audio_size: request.audio_base64.length
    });

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_NEWS_SUMMARY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      console.error('❌ News summary evaluation API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to evaluate your summary';
      if (response.status === 429) {
        userMessage = 'Too many requests. Please wait a moment and try again.';
      } else if (response.status >= 500) {
        userMessage = 'Server error. Please try again later.';
      } else if (response.status === 404) {
        userMessage = 'Evaluation service not found. Please contact support.';
      }
      
      throw new Error(`${userMessage} (${response.status})`);
    }

    const responseText = await response.text();
    
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    console.log('📥 Raw news summary evaluation response:', result);

    // Normalize the response structure to handle different possible formats
    const evaluation = result.evaluation || result.data || result;
    const detailedEvaluation = evaluation.evaluation || evaluation;

    const normalizedEvaluation: NewsSummaryEvaluationResponse = {
      score: detailedEvaluation.score || detailedEvaluation.overall_score || detailedEvaluation.total_score || evaluation.score || 0,
      feedback: detailedEvaluation.feedback || detailedEvaluation.overall_feedback || detailedEvaluation.comment || evaluation.feedback || '',
      suggestions: detailedEvaluation.suggested_improvements || detailedEvaluation.suggestions || detailedEvaluation.recommendations || detailedEvaluation.tips || evaluation.suggestions || [],
      transcription: detailedEvaluation.transcription || detailedEvaluation.transcript || detailedEvaluation.text || evaluation.transcription,
      strengths: detailedEvaluation.strengths || detailedEvaluation.positive_aspects || detailedEvaluation.good_points || evaluation.strengths || [],
      areas_for_improvement: detailedEvaluation.areas_for_improvement || detailedEvaluation.improvements || detailedEvaluation.weaknesses || evaluation.areas_for_improvement || [],
      vocabulary_used: detailedEvaluation.vocabulary_matches || detailedEvaluation.vocabulary_used || detailedEvaluation.vocabulary || detailedEvaluation.words_used || evaluation.vocabulary_used || [],
      fluency_score: detailedEvaluation.fluency_score || detailedEvaluation.fluency || evaluation.fluency_score,
      pronunciation_score: detailedEvaluation.pronunciation_score || detailedEvaluation.pronunciation || evaluation.pronunciation_score,
      content_relevance_score: detailedEvaluation.content_relevance_score || detailedEvaluation.content_score || detailedEvaluation.relevance || evaluation.content_relevance_score,
      grammar_score: detailedEvaluation.grammar_score || detailedEvaluation.grammar || evaluation.grammar_score,
      summary_quality_score: detailedEvaluation.summary_quality_score || detailedEvaluation.summary_quality || detailedEvaluation.quality_score || evaluation.summary_quality_score,
      comprehension_score: detailedEvaluation.comprehension_score || detailedEvaluation.comprehension || detailedEvaluation.understanding_score || evaluation.comprehension_score,
      message: detailedEvaluation.message || detailedEvaluation.status_message || evaluation.message,
      next_steps: detailedEvaluation.next_steps || detailedEvaluation.next_step || detailedEvaluation.recommendations || evaluation.next_steps,
    };

    console.log('✅ Normalized news summary evaluation:', normalizedEvaluation);

    return normalizedEvaluation;
  } catch (error) {
    console.error('Failed to evaluate news summary:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Evaluation was cancelled or timed out. Please try again.');
      }
      throw error;
    }
    
    throw new Error('Unknown error occurred during evaluation');
  }
};

const NewsSummaryService = {
  getAll: fetchNewsSummaryItems,
  getById: fetchNewsSummaryItemById,
  getAudio: fetchNewsSummaryAudio,
  evaluate: evaluateNewsSummary,
};

export default NewsSummaryService;