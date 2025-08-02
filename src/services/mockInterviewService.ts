import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';

export interface MockInterviewQuestion {
  id: string;
  scenario_type: 'university' | 'job' | 'scholarship' | string;
  scenario_title?: string;
  scenario_description?: string;
  question: string;
  question_order?: number;
  category?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  expected_duration_seconds?: number;
  tips?: string[];
  keywords?: string[];
  expected_keywords?: string[];
  vocabulary_focus?: string[];
  expected_structure?: string;
  speaking_duration?: string;
  thinking_time?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MockInterviewScenario {
  id: string;
  title: string;
  description: string;
  questions: MockInterviewQuestion[];
}

export interface MockInterviewEvaluationRequest {
  audio_base64: string;
  question_id: number;
  filename: string;
  user_id: string;
  time_spent_seconds: number;
  urdu_used: boolean;
}

export interface MockInterviewEvaluationResponse {
  score: number;
  feedback: string;
  suggestions: string[];
  transcription?: string;
  strengths?: string[];
  areas_for_improvement?: string[];
  vocabulary_used?: string[];
  keywords_used?: string[];
  fluency_score?: number;
  pronunciation_score?: number;
  content_relevance_score?: number;
  grammar_score?: number;
  message?: string;
  next_steps?: string;
}

// API Functions
const fetchMockInterviewQuestions = async (): Promise<MockInterviewQuestion[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log('🔍 Fetching mock interview questions...');

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.MOCK_INTERVIEW_QUESTIONS}`, {
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

    console.log('📥 Raw mock interview questions response:', result);

    // Handle different possible response formats
    let questions: any[] = [];
    
    if (Array.isArray(result)) {
      questions = result;
    } else if (result && typeof result === 'object') {
      if (Array.isArray(result.data)) {
        questions = result.data;
      } else if (Array.isArray(result.questions)) {
        questions = result.questions;
      } else if (Array.isArray(result.mock_interview_questions)) {
        questions = result.mock_interview_questions;
      } else if (Array.isArray(result.items)) {
        questions = result.items;
      }
    }

    if (!Array.isArray(questions)) {
      throw new Error('Expected an array of questions from API');
    }

    // Normalize questions to our expected format
    const normalizedQuestions: MockInterviewQuestion[] = questions.map((question: any, index: number) => ({
      id: question.id || question.question_id || question._id || String(index + 1),
      scenario_type: question.scenario_type || question.scenarioType || question.type || question.category || 'job',
      scenario_title: question.scenario_title || question.scenarioTitle || question.scenario || question.title,
      scenario_description: question.scenario_description || question.scenarioDescription || question.description || question.desc,
      question: question.question || question.text || question.prompt || question.content || 'Sample interview question',
      question_order: question.question_order || question.questionOrder || question.order || question.sequence || index + 1,
      category: question.category || question.type || question.subject,
      difficulty_level: question.difficulty_level || question.difficulty || question.level || 'intermediate',
      expected_duration_seconds: question.expected_duration_seconds || question.duration || question.time_limit || 120,
      tips: question.tips || question.hints || question.suggestions || [],
      keywords: question.keywords || question.tags || question.focus_areas || [],
      expected_keywords: question.expected_keywords || question.expectedKeywords || [],
      vocabulary_focus: question.vocabulary_focus || question.vocabularyFocus || [],
      expected_structure: question.expected_structure || question.expectedStructure,
      speaking_duration: question.speaking_duration || question.speakingDuration,
      thinking_time: question.thinking_time || question.thinkingTime,
      created_at: question.created_at || question.createdAt,
      updated_at: question.updated_at || question.updatedAt,
    }));

    console.log('✅ Normalized mock interview questions:', normalizedQuestions.length, 'questions');

    return normalizedQuestions;
  } catch (error) {
    console.error('Failed to fetch mock interview questions:', error);
    throw error;
  }
};

const fetchMockInterviewQuestionById = async (questionId: string): Promise<MockInterviewQuestion> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    console.log(`🔍 Fetching mock interview question by ID: ${questionId}`);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.MOCK_INTERVIEW_QUESTION_DETAIL(questionId)}`, {
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

    console.log('📥 Raw question detail response:', result);

    // Handle different possible response formats
    let question: any = result;
    if (result && typeof result === 'object') {
      if (result.data && typeof result.data === 'object') {
        question = result.data;
      } else if (result.question && typeof result.question === 'object') {
        question = result.question;
      }
    }

    // Normalize question to our expected format
    const normalizedQuestion: MockInterviewQuestion = {
      id: question.id || question.question_id || question._id || questionId,
      scenario_type: question.scenario_type || question.scenarioType || question.type || question.category || 'job',
      scenario_title: question.scenario_title || question.scenarioTitle || question.scenario || question.title,
      scenario_description: question.scenario_description || question.scenarioDescription || question.description || question.desc,
      question: question.question || question.text || question.prompt || question.content || 'Sample interview question',
      question_order: question.question_order || question.questionOrder || question.order || question.sequence,
      category: question.category || question.type || question.subject,
      difficulty_level: question.difficulty_level || question.difficulty || question.level || 'intermediate',
      expected_duration_seconds: question.expected_duration_seconds || question.duration || question.time_limit || 120,
      tips: question.tips || question.hints || question.suggestions || [],
      keywords: question.keywords || question.tags || question.focus_areas || [],
      expected_keywords: question.expected_keywords || question.expectedKeywords || [],
      vocabulary_focus: question.vocabulary_focus || question.vocabularyFocus || [],
      expected_structure: question.expected_structure || question.expectedStructure,
      speaking_duration: question.speaking_duration || question.speakingDuration,
      thinking_time: question.thinking_time || question.thinkingTime,
      created_at: question.created_at || question.createdAt,
      updated_at: question.updated_at || question.updatedAt,
    };

    console.log('✅ Normalized question detail:', normalizedQuestion);

    return normalizedQuestion;
  } catch (error) {
    console.error(`Failed to fetch mock interview question ${questionId}:`, error);
    throw error;
  }
};

const fetchMockInterviewQuestionAudio = async (questionId: string): Promise<string> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds for audio generation

    console.log(`🔊 Generating audio for mock interview question: ${questionId}`);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.MOCK_INTERVIEW_QUESTION_AUDIO(questionId)}`, {
      method: 'POST',
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
      // If it's not JSON, assume it's a direct audio URL or base64
      return responseText;
    }

    console.log('📥 Audio generation response:', result);

    // Handle different possible response formats
    let audioUrl: string = '';
    
    if (typeof result === 'string') {
      audioUrl = result;
    } else if (result && typeof result === 'object') {
      if (result.audio_base64) {
        // Convert base64 to data URL
        audioUrl = `data:audio/mpeg;base64,${result.audio_base64}`;
      } else if (result.data && result.data.audio_base64) {
        audioUrl = `data:audio/mpeg;base64,${result.data.audio_base64}`;
      } else {
        audioUrl = result.audio_url || result.audioUrl || result.url || result.audio || result.file_url;
      }
    }

    if (!audioUrl) {
      throw new Error('No audio URL or base64 data found in response');
    }

    return audioUrl;
  } catch (error) {
    console.error(`Failed to fetch audio for mock interview question ${questionId}:`, error);
    throw error;
  }
};

// Helper function to group questions by scenario type
const groupQuestionsByScenario = (questions: MockInterviewQuestion[]): MockInterviewScenario[] => {
  const scenarioMap = new Map<string, MockInterviewScenario>();

  questions.forEach(question => {
    const scenarioType = question.scenario_type;
    
    if (!scenarioMap.has(scenarioType)) {
      scenarioMap.set(scenarioType, {
        id: scenarioType,
        title: question.scenario_title || getDefaultScenarioTitle(scenarioType),
        description: question.scenario_description || getDefaultScenarioDescription(scenarioType),
        questions: []
      });
    }

    scenarioMap.get(scenarioType)!.questions.push(question);
  });

  // Sort questions within each scenario by question_order
  scenarioMap.forEach(scenario => {
    scenario.questions.sort((a, b) => (a.question_order || 0) - (b.question_order || 0));
  });

  return Array.from(scenarioMap.values());
};

const getDefaultScenarioTitle = (scenarioType: string): string => {
  switch (scenarioType) {
    case 'university':
      return 'University Admissions Interview';
    case 'job':
      return 'Job Interview';
    case 'scholarship':
      return 'Scholarship Interview';
    default:
      return scenarioType.charAt(0).toUpperCase() + scenarioType.slice(1) + ' Interview';
  }
};

const getDefaultScenarioDescription = (scenarioType: string): string => {
  switch (scenarioType) {
    case 'university':
      return 'You are in an interview with a university admissions officer. Answer their questions confidently.';
    case 'job':
      return 'You are interviewing for your dream job. Show your qualifications and enthusiasm.';
    case 'scholarship':
      return 'You are applying for a prestigious scholarship. Demonstrate your worthiness.';
    default:
      return `You are in a ${scenarioType} interview. Answer the questions professionally and confidently.`;
  }
};

const evaluateMockInterview = async (request: MockInterviewEvaluationRequest): Promise<MockInterviewEvaluationResponse> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.error('⏰ Mock interview evaluation timed out after 45 seconds');
      controller.abort();
    }, 45000); // Increased timeout to 45 seconds

    console.log('🎤 Evaluating mock interview response:', {
      question_id: request.question_id,
      user_id: request.user_id,
      filename: request.filename,
      time_spent_seconds: request.time_spent_seconds,
      urdu_used: request.urdu_used,
      audio_size: request.audio_base64.length
    });

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_MOCK_INTERVIEW}`, {
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
      console.error('❌ Mock interview evaluation API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText: errorText
      });
      
      // Provide user-friendly error messages
      let userMessage = 'Failed to evaluate your response';
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

    console.log('📥 Raw mock interview evaluation response:', result);

    // Normalize the response structure to handle different possible formats
    const evaluation = result.evaluation || result.data || result;
    const detailedEvaluation = evaluation.evaluation || evaluation;

    const normalizedEvaluation: MockInterviewEvaluationResponse = {
      score: detailedEvaluation.score || detailedEvaluation.overall_score || detailedEvaluation.total_score || evaluation.score || 0,
      feedback: detailedEvaluation.feedback || detailedEvaluation.overall_feedback || detailedEvaluation.comment || evaluation.feedback || '',
      suggestions: detailedEvaluation.suggested_improvements || detailedEvaluation.suggestions || detailedEvaluation.recommendations || detailedEvaluation.tips || evaluation.suggestions || [],
      transcription: detailedEvaluation.transcription || detailedEvaluation.transcript || detailedEvaluation.text || evaluation.transcription,
      strengths: detailedEvaluation.strengths || detailedEvaluation.positive_aspects || detailedEvaluation.good_points || evaluation.strengths || [],
      areas_for_improvement: detailedEvaluation.areas_for_improvement || detailedEvaluation.improvements || detailedEvaluation.weaknesses || evaluation.areas_for_improvement || [],
      vocabulary_used: detailedEvaluation.vocabulary_matches || detailedEvaluation.vocabulary_used || detailedEvaluation.vocabulary || detailedEvaluation.words_used || evaluation.vocabulary_used || [],
      keywords_used: detailedEvaluation.keyword_matches || detailedEvaluation.keywords_used || detailedEvaluation.keywords || detailedEvaluation.matched_keywords || evaluation.keywords_used || [],
      fluency_score: detailedEvaluation.fluency_score || detailedEvaluation.fluency || evaluation.fluency_score,
      pronunciation_score: detailedEvaluation.pronunciation_score || detailedEvaluation.pronunciation || evaluation.pronunciation_score,
      content_relevance_score: detailedEvaluation.content_relevance_score || detailedEvaluation.content_score || detailedEvaluation.relevance || evaluation.content_relevance_score,
      grammar_score: detailedEvaluation.grammar_score || detailedEvaluation.grammar || evaluation.grammar_score,
      message: detailedEvaluation.message || detailedEvaluation.status_message || evaluation.message,
      next_steps: detailedEvaluation.next_steps || detailedEvaluation.next_step || detailedEvaluation.recommendations || evaluation.next_steps,
    };

    console.log('✅ Normalized mock interview evaluation:', normalizedEvaluation);

    return normalizedEvaluation;
  } catch (error) {
    console.error('Failed to evaluate mock interview:', error);
    
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

const MockInterviewService = {
  getAll: fetchMockInterviewQuestions,
  getById: fetchMockInterviewQuestionById,
  getAudio: fetchMockInterviewQuestionAudio,
  groupByScenario: groupQuestionsByScenario,
  evaluate: evaluateMockInterview,
};

export default MockInterviewService;