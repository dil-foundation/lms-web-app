

// Use same staging URL for both development and production
const API_URL = 'https://api.dil.lms-staging.com';


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