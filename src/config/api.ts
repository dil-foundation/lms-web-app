

// Use same staging URL for both development and production
const API_URL = import.meta.env.VITE_API_BASE_URL;


// Determine the API URL
let apiUrl: string = API_URL;



export const BASE_API_URL: string = apiUrl;

// API endpoints
export const API_ENDPOINTS = {
 
  // Active Practice endpoints
  WEBSOCKET_PRACTICE: '/api/ws/practice',
  AUDIO_UPLOAD: '/api/audio/upload',
  AUDIO_PROCESS: '/api/audio/process',
  PHRASES: '/api/phrases',
  PHRASE_DETAIL: (phraseId: string) => `/api/phrases/${phraseId}`,
  REPEAT_AFTER_ME_AUDIO: (phraseId: string) => `/api/repeat-after-me/${phraseId}`,
  EVALUATE_AUDIO: '/api/evaluate-audio',
  PROMPTS: '/api/prompts',
  PROMPT_DETAIL: (promptId: string) => `/api/prompts/${promptId}`,
  QUICK_RESPONSE_AUDIO: (promptId: string) => `/api/quick-response/${promptId}`,
  EVALUATE_QUICK_RESPONSE: '/api/evaluate-quick-response',
  DIALOGUES: '/api/dialogues',
  DIALOGUE_DETAIL: (dialogueId: string) => `/api/dialogues/${dialogueId}`,
  LISTEN_AND_REPLY_AUDIO: (dialogueId: string) => `/api/listen-and-reply/${dialogueId}`,
  EVALUATE_LISTEN_REPLY: '/api/evaluate-listen-reply',
  DAILY_ROUTINE_PHRASES: '/api/daily-routine-phrases',
  DAILY_ROUTINE_PHRASE_DETAIL: (phraseId: string) => `/api/daily-routine-phrases/${phraseId}`,
  DAILY_ROUTINE_AUDIO: (phraseId: string) => `/api/daily-routine/${phraseId}`,
  EVALUATE_DAILY_ROUTINE: '/api/evaluate-daily-routine',
  QUICK_ANSWER_QUESTIONS: '/api/quick-answer-questions',
  QUICK_ANSWER_QUESTION_DETAIL: (questionId: string) => `/api/quick-answer-questions/${questionId}`,
  QUICK_ANSWER_AUDIO: (questionId: string) => `/api/quick-answer/${questionId}`,
  EVALUATE_QUICK_ANSWER: '/api/evaluate-quick-answer',
  ROLEPLAY_SCENARIOS: '/api/roleplay-scenarios',
  ROLEPLAY_SCENARIO_DETAIL: (scenarioId: string) => `/api/roleplay-scenarios/${scenarioId}`,
  ROLEPLAY_START: '/api/roleplay/start',
  ROLEPLAY_RESPOND: '/api/roleplay/respond',
  ROLEPLAY_EVALUATE: '/api/roleplay/evaluate',
  // Storytelling Practice endpoints (Stage 3)
  STORYTELLING_PROMPTS: '/api/storytelling-prompts',
  STORYTELLING_PROMPT_DETAIL: (promptId: string) => `/api/storytelling-prompts/${promptId}`,
  STORYTELLING_PROMPT_AUDIO: (promptId: string) => `/api/storytelling/${promptId}`,
  EVALUATE_STORYTELLING: '/api/evaluate-storytelling',
  // Group Dialogue endpoints (Stage 3)
  GROUP_DIALOGUE_SCENARIOS: '/api/group-dialogue-scenarios',
  GROUP_DIALOGUE_SCENARIO_DETAIL: (scenarioId: string) => `/api/group-dialogue-scenarios/${scenarioId}`,
  GROUP_DIALOGUE_SCENARIO_AUDIO: (scenarioId: string) => `/api/group-dialogue/${scenarioId}`,
  EVALUATE_GROUP_DIALOGUE: '/api/evaluate-group-dialogue',
  // Problem Solving Simulations endpoints (Stage 3)
  PROBLEM_SOLVING_SCENARIOS: '/api/problem-solving-scenarios',
  PROBLEM_SOLVING_SCENARIO_DETAIL: (scenarioId: string) => `/api/problem-solving-scenarios/${scenarioId}`,
  EVALUATE_PROBLEM_SOLVING: '/api/evaluate-problem-solving',
  // Progress tracking endpoints
  INITIALIZE_PROGRESS: '/api/progress/initialize-progress',
  GET_CURRENT_TOPIC: '/api/progress/get-current-topic',
  COMPREHENSIVE_PROGRESS: '/api/progress/comprehensive-progress',
  // Observation Reports endpoints
  OBSERVATION_REPORTS: '/api/observation-reports',
  OBSERVATION_REPORT_DETAIL: (reportId: string) => `/api/observation-reports/${reportId}`,
  SUBMIT_OBSERVATION_REPORT: '/api/observation-reports',
  UPDATE_OBSERVATION_REPORT: (reportId: string) => `/api/observation-reports/${reportId}`,
  DELETE_OBSERVATION_REPORT: (reportId: string) => `/api/observation-reports/${reportId}`,
  // Abstract Topics endpoints (Stage 4)
  ABSTRACT_TOPICS: '/api/abstract-topics',
  ABSTRACT_TOPIC_DETAIL: (topicId: string) => `/api/abstract-topics/${topicId}`,
  ABSTRACT_TOPIC_AUDIO: (topicId: string) => `/api/abstract-topic/${topicId}`,
  ABSTRACT_TOPIC_CURRENT: (userId: string) => `/api/abstract-topic-current-topic/${userId}`,
  EVALUATE_ABSTRACT_TOPIC: '/api/evaluate-abstract-topic',
  // Mock Interview endpoints (Stage 4)
  MOCK_INTERVIEW_QUESTIONS: '/api/mock-interview-questions',
  MOCK_INTERVIEW_QUESTION_DETAIL: (questionId: string) => `/api/mock-interview-questions/${questionId}`,
  MOCK_INTERVIEW_QUESTION_AUDIO: (questionId: string) => `/api/mock-interview/${questionId}`,
  EVALUATE_MOCK_INTERVIEW: '/api/evaluate-mock-interview',
  // News Summary endpoints (Stage 4)
  NEWS_SUMMARY_ITEMS: '/api/news-summary-items',
  NEWS_SUMMARY_ITEM_DETAIL: (newsId: string) => `/api/news-summary-items/${newsId}`,
  NEWS_SUMMARY_AUDIO: (newsId: string) => `/api/news-summary/${newsId}`,
  EVALUATE_NEWS_SUMMARY: '/api/evaluate-news-summary',
  // Critical Thinking endpoints (Stage 5)
  CRITICAL_THINKING_TOPICS: '/api/critical-thinking-topics',
  CRITICAL_THINKING_TOPIC_DETAIL: (topicId: string) => `/api/critical-thinking-topics/${topicId}`,
  CRITICAL_THINKING_TOPIC_AUDIO: (topicId: string) => `/api/critical-thinking-topics/${topicId}`,
  EVALUATE_CRITICAL_THINKING: '/api/evaluate-critical-thinking',
  // Academic Presentation endpoints (Stage 5)
  ACADEMIC_PRESENTATION_TOPICS: '/api/academic-presentation-topics',
  ACADEMIC_PRESENTATION_TOPIC_DETAIL: (topicId: string) => `/api/academic-presentation-topics/${topicId}`,
  ACADEMIC_PRESENTATION_AUDIO: (topicId: string) => `/api/academic-presentation/${topicId}`,
  EVALUATE_ACADEMIC_PRESENTATION: '/api/evaluate-academic-presentation',
  // Admin Dashboard endpoints
  ADMIN_DASHBOARD_OVERVIEW: '/admin/dashboard/overview',
  ADMIN_DASHBOARD_KEY_METRICS: '/admin/dashboard/key-metrics',
  ADMIN_DASHBOARD_LEARN_USAGE: '/admin/dashboard/learn-usage',
  ADMIN_DASHBOARD_MOST_ACCESSED_LESSONS: '/admin/dashboard/most-accessed-lessons',
  // Teacher Dashboard endpoints
  TEACHER_DASHBOARD_OVERVIEW: '/teacher/dashboard/overview',
  TEACHER_DASHBOARD_BEHAVIOR_INSIGHTS: '/teacher/dashboard/behavior-insights',
  TEACHER_DASHBOARD_PROGRESS_OVERVIEW: '/teacher/dashboard/progress-overview',
  TEACHER_DASHBOARD_EXPORT_PROGRESS: '/teacher/dashboard/export-progress',
  TEACHER_DASHBOARD_STUDENT_DETAIL: (userId: string) => `/teacher/dashboard/student/${userId}`,
  // Admin Reports endpoints
  ADMIN_REPORTS_PRACTICE_STAGE_PERFORMANCE: '/admin/reports/practice-stage-performance',
  ADMIN_REPORTS_USER_ENGAGEMENT_OVERVIEW: '/admin/reports/user-engagement-overview',
  ADMIN_REPORTS_TIME_USAGE_PATTERNS: '/admin/reports/time-usage-patterns',
  ADMIN_REPORTS_TOP_CONTENT_ACCESSED: '/admin/reports/top-content-accessed',
  ADMIN_REPORTS_ANALYTICS_OVERVIEW: '/admin/reports/analytics-overview',
  // AI Reports endpoints
  AI_REPORTS_ASSISTANT: '/api/ai/reports-assistant',
  AI_REPORTS_CONTEXT: '/api/reports/context',
  // Text-to-Speech endpoint
  TTS: '/tts',
} as const;

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${BASE_API_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

export default BASE_API_URL;