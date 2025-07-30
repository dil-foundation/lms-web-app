import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Users, Mic, Send, Play, Utensils, Stethoscope, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { initializeUserProgress, getCurrentTopicProgress, updateCurrentProgress } from '@/utils/progressTracker';

interface Message {
  type: 'ai' | 'user';
  message: string;
  role?: string;
}

interface ConversationStep {
  ai: string;
  responses: string[];
}

interface Scenario {
  id: string;
  title: string;
  title_urdu?: string;
  description: string;
  description_urdu?: string;
  difficulty?: string;
  keywords?: string[];
  icon_type?: string;
  scenario_type?: string;
  conversation_flow?: ConversationStep[];
  initial_prompt?: string;
  initial_prompt_urdu?: string;
  created_at?: string;
}

interface EvaluationResult {
  success: boolean;
  overall_score: number;
  is_correct: boolean;
  completed: boolean;
  conversation_flow_score: number;
  keyword_usage_score: number;
  grammar_fluency_score: number;
  cultural_appropriateness_score: number;
  engagement_score: number;
  keyword_matches: string[];
  total_keywords_expected: number;
  keywords_used_count: number;
  grammar_errors: string[];
  fluency_issues: string[];
  strengths: string[];
  areas_for_improvement: string[];
  suggested_improvement: string;
  conversation_quality: string;
  learning_progress: string;
  recommendations: string[];
  progress_recorded: boolean;
  unlocked_content: any[];
  error?: string;
  message?: string;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Icon mapping for different scenario types
const getIconComponent = (iconType?: string, scenarioType?: string) => {
  if (iconType === 'utensils' || scenarioType === 'restaurant') return Utensils;
  if (iconType === 'stethoscope' || scenarioType === 'doctor') return Stethoscope;
  return Users; // Default icon
};

// Helper function to clean up difficulty levels
const cleanDifficultyLevel = (difficulty?: string): string => {
  if (!difficulty) return 'Beginner';
  
  const lower = difficulty.toLowerCase();
  if (lower.includes('beginner') || lower.includes('a1') || lower.includes('a2')) return 'Beginner';
  if (lower.includes('intermediate') || lower.includes('b1') || lower.includes('b2')) return 'Intermediate';
  if (lower.includes('advanced') || lower.includes('c1') || lower.includes('c2')) return 'Advanced';
  if (lower.includes('expert')) return 'Expert';
  
  // Capitalize first letter for any other values
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1).toLowerCase();
};

// API Functions
const fetchRoleplayScenarios = async (userId?: string): Promise<Scenario[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const params = userId ? `?user_id=${userId}` : '';
    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ROLEPLAY_SCENARIOS}${params}`, {
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

    // Handle different possible response formats
    let scenarios: any[] = [];

    if (Array.isArray(result)) {
      scenarios = result;
    } else if (result && typeof result === 'object') {
      if (result.data && Array.isArray(result.data)) {
        scenarios = result.data;
      } else if (result.scenarios && Array.isArray(result.scenarios)) {
        scenarios = result.scenarios;
      } else {
        // Look for any array property
        const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
        if (arrayProperties.length > 0) {
          scenarios = result[arrayProperties[0]];
        } else {
          throw new Error('No scenario array found in response');
        }
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Helper function to safely extract string value
    const getStringValue = (obj: any, ...keys: string[]): string | undefined => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
          if (typeof obj[key] === 'string') {
            return obj[key];
          } else if (typeof obj[key] === 'object') {
            return JSON.stringify(obj[key]);
          } else {
            return String(obj[key]);
          }
        }
      }
      return undefined;
    };

    // Helper function to safely extract array
    const getArrayValue = (obj: any, ...keys: string[]): string[] | undefined => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
          if (Array.isArray(obj[key])) {
            return obj[key].map((item: any) => 
              typeof item === 'string' ? item : String(item)
            );
          } else if (typeof obj[key] === 'string') {
            return [obj[key]];
          }
        }
      }
      return undefined;
    };

    // Normalize scenarios to our expected format
    const normalizedScenarios: Scenario[] = scenarios.map((item: any, index: number) => {
      let scenario: Scenario;
      
      if (typeof item === 'string') {
        scenario = {
          id: String(index + 1),
          title: item,
          description: '',
        };
      } else if (item && typeof item === 'object') {
        scenario = {
          id: item.id ? String(item.id) : String(index + 1),
          title: getStringValue(item, 'title', 'name', 'scenario_name') || 'Unnamed Scenario',
          title_urdu: getStringValue(item, 'title_urdu', 'name_urdu', 'urdu_title'),
          description: getStringValue(item, 'description', 'desc', 'details') || '',
          description_urdu: getStringValue(item, 'description_urdu', 'desc_urdu', 'urdu_description'),
          difficulty: cleanDifficultyLevel(getStringValue(item, 'difficulty', 'level', 'difficulty_level')),
          keywords: getArrayValue(item, 'expected_keywords', 'keywords', 'key_words', 'practice_words'),
          icon_type: getStringValue(item, 'icon_type', 'icon'),
          scenario_type: getStringValue(item, 'scenario_type', 'type', 'category'),
          conversation_flow: item.conversation_flow || item.flow || [],
          initial_prompt: getStringValue(item, 'initial_prompt', 'prompt'),
          initial_prompt_urdu: getStringValue(item, 'initial_prompt_urdu', 'urdu_prompt'),
          created_at: getStringValue(item, 'created_at', 'createdAt', 'timestamp'),
        };
      } else {
        scenario = {
          id: String(index + 1),
          title: String(item),
          description: '',
        };
      }

      if (!scenario.title || scenario.title.trim() === '' || scenario.title === '[object Object]') {
        return null;
      }

      return scenario;
    }).filter((scenario): scenario is Scenario => scenario !== null);

    if (normalizedScenarios.length === 0) {
      throw new Error('No valid scenarios found in API response');
    }

    return normalizedScenarios;

  } catch (error) {
    console.error('Error fetching roleplay scenarios:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// API function to fetch single scenario details
const fetchSingleScenario = async (scenarioId: string, userId?: string): Promise<Scenario | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const params = userId ? `?user_id=${userId}` : '';
    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ROLEPLAY_SCENARIO_DETAIL(scenarioId)}${params}`, {
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

    // Extract scenario data
    const scenarioData = result.data || result.scenario || result;
    if (!scenarioData) {
      throw new Error('No scenario data found in response');
    }

    // Helper function to safely extract string value
    const getStringValue = (obj: any, ...keys: string[]): string | undefined => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
          if (typeof obj[key] === 'string') {
            return obj[key];
          } else if (typeof obj[key] === 'object') {
            return JSON.stringify(obj[key]);
          } else {
            return String(obj[key]);
          }
        }
      }
      return undefined;
    };

    // Helper function to safely extract array
    const getArrayValue = (obj: any, ...keys: string[]): string[] | undefined => {
      for (const key of keys) {
        if (obj[key] !== undefined && obj[key] !== null) {
          if (Array.isArray(obj[key])) {
            return obj[key].map((item: any) => 
              typeof item === 'string' ? item : String(item)
            );
          } else if (typeof obj[key] === 'string') {
            return [obj[key]];
          }
        }
      }
      return undefined;
    };

    // Normalize scenario
    const scenario: Scenario = {
      id: scenarioData.id ? String(scenarioData.id) : scenarioId,
      title: getStringValue(scenarioData, 'title', 'name', 'scenario_name') || 'Unnamed Scenario',
      title_urdu: getStringValue(scenarioData, 'title_urdu', 'name_urdu', 'urdu_title'),
      description: getStringValue(scenarioData, 'description', 'desc', 'details') || '',
      description_urdu: getStringValue(scenarioData, 'description_urdu', 'desc_urdu', 'urdu_description'),
      difficulty: cleanDifficultyLevel(getStringValue(scenarioData, 'difficulty', 'level', 'difficulty_level')),
      keywords: getArrayValue(scenarioData, 'expected_keywords', 'keywords', 'key_words', 'practice_words'),
      icon_type: getStringValue(scenarioData, 'icon_type', 'icon'),
      scenario_type: getStringValue(scenarioData, 'scenario_type', 'type', 'category'),
      conversation_flow: scenarioData.conversation_flow || scenarioData.flow || [],
      initial_prompt: getStringValue(scenarioData, 'initial_prompt', 'prompt'),
      initial_prompt_urdu: getStringValue(scenarioData, 'initial_prompt_urdu', 'urdu_prompt'),
      created_at: getStringValue(scenarioData, 'created_at', 'createdAt', 'timestamp'),
    };

    return scenario;

  } catch (error) {
    console.error('Error fetching single scenario:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// API function to start a roleplay conversation
const startRoleplayConversation = async (scenarioId: string, userId: string): Promise<{sessionId: string, aiMessage: string, audioBase64?: string} | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ROLEPLAY_START}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        scenario_id: scenarioId,
        user_id: userId
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    
    return {
      sessionId: result.session_id || result.sessionId,
      aiMessage: result.ai_response || result.message || result.response,
      audioBase64: result.audio_base64 || result.audioBase64 || result.audio
    };

  } catch (error) {
    console.error('Error starting roleplay conversation:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// API function to respond in a roleplay conversation
const respondRoleplayConversation = async (
  sessionId: string, 
  userInput: string, 
  userId: string, 
  inputType: 'text' | 'audio' = 'text',
  audioBase64?: string
): Promise<{aiMessage: string, audioBase64?: string, done?: boolean} | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const requestBody: any = {
      session_id: sessionId,
      user_input: userInput,
      user_id: userId,
      input_type: inputType
    };

    if (inputType === 'audio' && audioBase64) {
      requestBody.audio_base64 = audioBase64;
    }

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ROLEPLAY_RESPOND}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    
    return {
      aiMessage: result.ai_response || result.message || result.response,
      audioBase64: result.audio_base64 || result.audioBase64 || result.audio,
      done: result.done || false
    };

  } catch (error) {
    console.error('Error responding in roleplay conversation:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Helper function to convert blob to base64
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      // Remove the data:audio/xxx;base64, prefix
      const base64 = base64data.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// API function to evaluate roleplay performance
const evaluateRoleplaySession = async (
  sessionId: string,
  userId: string,
  timeSpentSeconds: number,
  urduUsed: boolean = false
): Promise<EvaluationResult | null> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.ROLEPLAY_EVALUATE}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: userId,
        time_spent_seconds: timeSpentSeconds,
        urdu_used: urduUsed
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Error evaluating roleplay session:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Fallback scenarios for when API is not available
const fallbackScenarios: Scenario[] = [
  {
    id: 'restaurant',
    title: 'Order Food at a Restaurant',
    title_urdu: 'ریستوران میں کھانا آرڈر کریں',
    description: 'Practice ordering food at a restaurant with natural conversation flow.',
    description_urdu: 'فطری گفتگو کے ساتھ ریستوران میں کھانا آرڈر کرنے کی مشق کریں',
    difficulty: 'Beginner',
    keywords: ['like', 'eat', 'food', 'menu', 'order', 'please'],
    icon_type: 'utensils',
    conversation_flow: [
  {
    ai: "Welcome to our restaurant! I'm your server. How can I help you today?",
    responses: [
      "I would like to see the menu please",
      "I want to order food",
      "What do you recommend?",
      "I'm ready to order"
    ]
  },
  {
    ai: "Great! Here's our menu. We have pizza, burgers, traditional Pakistani dishes, and beverages. What would you like to try?",
    responses: [
      "I'll have the chicken karahi",
      "Can I get a cheeseburger?",
      "I want to try the biryani",
      "What's your special today?"
    ]
  },
  {
    ai: "Excellent choice! Would you like anything to drink with that?",
    responses: [
      "I'll have a Coke please",
      "Can I get some tea?",
      "Just water is fine",
      "What drinks do you have?"
    ]
  },
  {
    ai: "Perfect! Is there anything else you'd like to add to your order?",
    responses: [
      "That's all, thank you",
      "Can I get some dessert?",
      "I'd like some extra sauce",
      "How long will it take?"
    ]
  },
  {
    ai: "Wonderful! Your order will be ready in about 15 minutes. Would you like to pay now or when the food arrives?",
    responses: [
      "I'll pay now",
      "I'll pay when the food comes",
      "Can I pay by card?",
      "How much is the total?"
    ]
  },
  {
    ai: "Thank you for your order! Please have a seat and we'll bring your food shortly. Enjoy your meal!",
    responses: [
      "Thank you very much",
      "I appreciate it",
      "Looking forward to it",
      "Thanks for the service"
        ]
      }
    ]
  },
  {
    id: 'doctor',
    title: 'Visit a Doctor',
    title_urdu: 'ڈاکٹر سے ملاقات',
    description: 'Simulate a doctor visit conversation with medical symptoms and advice.',
    description_urdu: 'طبی علامات اور مشورے کے ساتھ ڈاکٹر سے ملاقات کی گفتگو کی مثال',
    difficulty: 'Beginner',
    keywords: ['pain', 'feel', 'doctor', 'medicine', 'help', 'sick'],
    icon_type: 'stethoscope',
    conversation_flow: [
      {
        ai: "Good morning! I'm Dr. Smith. What brings you to the clinic today?",
        responses: [
          "I'm not feeling well",
          "I have a headache",
          "I think I have a fever",
          "I need a check-up"
        ]
      },
      {
        ai: "I understand. Can you tell me more about your symptoms? When did this start?",
        responses: [
          "It started yesterday",
          "I've been feeling sick for a few days",
          "It began this morning",
          "I'm not sure exactly when"
        ]
      },
      {
        ai: "Let me examine you. Please sit on the examination table. How would you rate your pain from 1 to 10?",
        responses: [
          "It's about a 6",
          "Maybe a 4 or 5",
          "It's quite painful, around 8",
          "Not too bad, maybe a 3"
        ]
      },
      {
        ai: "Based on your symptoms, I think you need some rest and medication. Do you have any allergies to medicines?",
        responses: [
          "No, I don't have any allergies",
          "I'm allergic to penicillin",
          "I'm not sure",
          "Yes, I'm allergic to aspirin"
        ]
      },
      {
        ai: "I'm prescribing some medicine for you. Take this twice a day with food. Get plenty of rest and drink lots of water.",
        responses: [
          "Thank you doctor",
          "How long should I take this?",
          "When should I come back?",
          "What if I don't feel better?"
        ]
      },
      {
        ai: "You should feel better in 3-4 days. If your symptoms don't improve, please come back to see me. Take care!",
        responses: [
          "Thank you for your help",
          "I appreciate it",
          "I'll follow your advice",
          "Have a good day, doctor"
        ]
      }
    ]
  }
];

const mockUserResponses = [
  "I would like to order pizza please",
  "Can I have a burger with fries?",
  "I want chicken karahi and rice",
  "What do you recommend?",
  "I'll have the special of the day",
  "Can I see the menu first?",
  "I would like some tea with my meal",
  "Is the food spicy?",
  "How much does it cost?",
  "I'm ready to order now",
  "Can I have extra sauce?",
  "I want to try something new",
  "What's the most popular dish?",
  "I need something quick",
  "Can I get that to go?"
];

export default function RoleplaySimulation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isRecording, audioBlob, error: recordingError, startRecording, stopRecording, resetRecording } = useAudioRecorder();
  const { playAudio } = useAudioPlayer();
  
  const [allScenarios, setAllScenarios] = useState<Scenario[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [loadingScenario, setLoadingScenario] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConversationActive, setIsConversationActive] = useState(false);
  const [showEvaluationDialog, setShowEvaluationDialog] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [conversationCompleted, setConversationCompleted] = useState(false);
  const [progressInitialized, setProgressInitialized] = useState(false);
  const [resumeDataLoaded, setResumeDataLoaded] = useState(false);
  const conversationContainerRef = useRef<HTMLDivElement>(null);

  const itemsPerPage = 6;

  // Helper function to safely display values
  const safeDisplay = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Fetch scenarios on component mount
  useEffect(() => {
    const loadScenarios = async () => {
      setLoading(true);
      setError(null);
      
      // Don't make API call if user is not authenticated
      if (!user?.id) {
        console.log('User not authenticated, using fallback scenarios');
        setAllScenarios(fallbackScenarios);
        setError('User not authenticated, showing sample scenarios');
        setLoading(false);
        return;
      }
      
      try {
        const fetchedScenarios = await fetchRoleplayScenarios(user.id);
        setAllScenarios(fetchedScenarios);
      } catch (err: any) {
        console.error('Failed to load scenarios from API, using fallback:', err);
        // Use fallback scenarios if API fails
        setAllScenarios(fallbackScenarios);
        setError(err.message || 'Failed to load scenarios from API, showing sample scenarios');
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  }, [user?.id]); // Add user?.id to dependency array

  // Initialize user progress for Stage 2 practice with resume functionality
  useEffect(() => {
    const initializeProgressWithResume = async () => {
      // Initialize user progress if user is authenticated and not already initialized
      if (user?.id && !resumeDataLoaded) {
        console.log('Loading user progress for Stage 2 Roleplay practice...');
        
        try {
          // Try to get current progress to resume from where user left off
          const currentProgress = await getCurrentTopicProgress(user.id, 2, 3); // Stage 2, Exercise 3
          
          if (currentProgress.success && currentProgress.data && currentProgress.data.success) {
            const { current_topic_id } = currentProgress.data;
            
            if (current_topic_id !== undefined && current_topic_id > 0) {
              // For RoleplaySimulation, topic ID represents the page number directly
              const totalPages = Math.ceil(allScenarios.length / itemsPerPage) || 1;
              const resumePage = Math.min(Math.max(1, current_topic_id), totalPages);
              console.log(`Resuming Stage 2 RoleplaySimulation from topic ${current_topic_id} (page ${resumePage})`);
              setCurrentPage(resumePage);
            } else {
              console.log('No resume data for Stage 2 RoleplaySimulation, starting from beginning');
              setCurrentPage(1);
            }
          } else {
            console.log('Could not get current progress, initializing new progress...');
            
            // Initialize user progress if we couldn't get current progress
            if (!progressInitialized) {
              const progressResult = await initializeUserProgress(user.id);
              
              if (progressResult.success) {
                console.log('Progress initialized successfully:', progressResult.message);
                setProgressInitialized(true);
              } else {
                console.warn('Progress initialization failed:', progressResult.error);
              }
            }
            
            // Start from beginning
            setCurrentPage(1);
          }
          
          setResumeDataLoaded(true);
        } catch (error) {
          console.error('Error loading progress:', error);
          // Start from beginning if error
          setCurrentPage(1);
          setResumeDataLoaded(true);
        }
      }
    };

    // Only run if we have scenarios loaded and haven't loaded resume data yet
    if (allScenarios.length > 0 && !resumeDataLoaded) {
      initializeProgressWithResume();
    }
  }, [user?.id, progressInitialized, allScenarios.length, resumeDataLoaded]);

  // Save current progress to API
  const saveProgress = async (pageNumber: number) => {
    if (user?.id && allScenarios.length > 0) {
      try {
        const totalPages = Math.ceil(allScenarios.length / itemsPerPage);
        await updateCurrentProgress(
          user.id,
          2, // Stage 2
          3  // Exercise 3 (RoleplaySimulation)
        );
        console.log(`Progress saved: Stage 2, Exercise 3, Page ${pageNumber}/${totalPages}`);
      } catch (error) {
        console.warn('Failed to save progress:', error);
        // Don't show error to user, just log it
      }
    }
  };

  // Calculate pagination values
  const totalPages = Math.ceil(allScenarios.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentScenarios = allScenarios.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
      return;
    }
    setCurrentPage(newPage);
    saveProgress(newPage); // Save progress when navigating pages
  };

  const handleRetry = () => {
    const loadScenarios = async () => {
      setLoading(true);
      setError(null);
      
      // Don't make API call if user is not authenticated
      if (!user?.id) {
        console.log('User not authenticated, using fallback scenarios');
        setAllScenarios(fallbackScenarios);
        setError('User not authenticated, showing sample scenarios');
        setLoading(false);
        return;
      }
      
      try {
        const fetchedScenarios = await fetchRoleplayScenarios(user.id);
        setAllScenarios(fetchedScenarios);
        setCurrentPage(1); // Reset to first page
      } catch (err: any) {
        console.error('Failed to load scenarios from API, using fallback:', err);
        // Use fallback scenarios if API fails
        setAllScenarios(fallbackScenarios);
        setError(err.message || 'Failed to load scenarios from API, showing sample scenarios');
      } finally {
        setLoading(false);
      }
    };

    loadScenarios();
  };

  const handleStartScenario = async (scenario: Scenario) => {
    setLoadingScenario(true);
    
    try {
      // First, fetch detailed scenario data from API
      const detailedScenario = await fetchSingleScenario(scenario.id, user?.id);
      const scenarioToUse = detailedScenario || scenario;
      
      setSelectedScenario(scenarioToUse);
      setCurrentStep(0);
      setUserInput('');
      resetRecording();
      
      // If user is authenticated, start a real conversation session
      if (user?.id) {
        try {
          const conversationStart = await startRoleplayConversation(scenario.id, user.id);
          
          if (conversationStart) {
            setSessionId(conversationStart.sessionId);
            setIsConversationActive(true);
            
            const aiMessage: Message = {
      type: 'ai',
              message: conversationStart.aiMessage,
              role: scenarioToUse.scenario_type === 'restaurant' || scenarioToUse.icon_type === 'utensils' ? 'waiter' : 
                    scenarioToUse.scenario_type === 'doctor' || scenarioToUse.icon_type === 'stethoscope' ? 'doctor' : 'assistant'
            };
            
            setConversation([aiMessage]);
            
            // Play audio response if available
            if (conversationStart.audioBase64) {
              try {
                const audioUrl = `data:audio/mp3;base64,${conversationStart.audioBase64}`;
                await playAudio(audioUrl);
              } catch (audioError) {
                console.warn('Could not play audio response:', audioError);
              }
            }
          } else {
            throw new Error('Failed to start conversation session');
          }
        } catch (apiError: any) {
          console.error('API conversation start failed, using fallback:', apiError);
          // Fallback to local conversation flow
          setSessionId(null);
          setIsConversationActive(false);
          initializeFallbackConversation(scenarioToUse);
        }
      } else {
        // User not authenticated, use local conversation flow
        setSessionId(null);
        setIsConversationActive(false);
        initializeFallbackConversation(scenarioToUse);
      }
      
    } catch (error: any) {
      console.error('Error starting scenario:', error);
      // Fallback to basic scenario setup
      setSelectedScenario(scenario);
      setCurrentStep(0);
      setUserInput('');
      resetRecording();
      setSessionId(null);
      setIsConversationActive(false);
      initializeFallbackConversation(scenario);
    } finally {
      setLoadingScenario(false);
    }
  };

  // Helper function to initialize fallback conversation
  const initializeFallbackConversation = (scenario: Scenario) => {
    const initialMessage = scenario.initial_prompt || 
                          (scenario.conversation_flow && scenario.conversation_flow[0]?.ai) ||
                          'Hello! Let\'s start our conversation.';
    
    setConversation([{
      type: 'ai',
      message: initialMessage,
      role: scenario.scenario_type === 'restaurant' || scenario.icon_type === 'utensils' ? 'waiter' : 
            scenario.scenario_type === 'doctor' || scenario.icon_type === 'stethoscope' ? 'doctor' : 'assistant'
    }]);
  };

  const handleBackToScenarios = () => {
    setSelectedScenario(null);
    setCurrentStep(0);
    setUserInput('');
    setConversation([]);
    setSessionId(null);
    setIsConversationActive(false);
    setShowEvaluationDialog(false);
    setIsEvaluating(false);
    setEvaluationResult(null);
    setConversationCompleted(false);
    resetRecording();
  };

  const handleEvaluatePerformance = async () => {
    if (!sessionId || !user?.id) return;
    
    setShowEvaluationDialog(false);
    setIsEvaluating(true);
    
    try {
      // Calculate time spent (mock for now - you'd track this properly)
      const timeSpent = Math.floor(conversation.length * 30); // Rough estimate
      
      const result = await evaluateRoleplaySession(
        sessionId,
        user.id,
        timeSpent,
        false // urdu_used - you can track this if needed
      );
      
      if (result) {
        setEvaluationResult(result);
      }
    } catch (error: any) {
      console.error('Error evaluating performance:', error);
      // Show error message or fallback
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      try {
        await startRecording();
      } catch (error: any) {
        console.error('Error starting recording:', error);
      }
    }
  };

  // Handle audio blob when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      handleVoiceMessage(audioBlob);
      resetRecording();
    }
  }, [audioBlob, isRecording, resetRecording]);

  // Auto-scroll when conversation updates  
  useEffect(() => {
    const container = conversationContainerRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [conversation]);

  // Process voice message
  const handleVoiceMessage = async (audioBlob: Blob) => {
    try {
      // Add placeholder user message while processing
      const processingMessage: Message = {
        type: 'user',
        message: '🎤 Processing voice message...'
      };
      
      setConversation(prev => [...prev, processingMessage]);

      // If we have an active session, use the API for speech processing
      if (isConversationActive && sessionId && user?.id) {
        try {
          // Convert audio blob to base64
          const audioBase64 = await blobToBase64(audioBlob);
          
          const response = await respondRoleplayConversation(
            sessionId,
            '', // Empty text input since we're sending audio
            user.id,
            'audio',
            audioBase64
          );

          if (response) {
            // Update the processing message with the actual transcribed text
            setConversation(prev => {
              const newConversation = [...prev];
              const lastMessage = newConversation[newConversation.length - 1];
              if (lastMessage && lastMessage.message.includes('Processing voice message')) {
                lastMessage.message = '[Voice message transcribed]';
              }
              return newConversation;
            });

            // Add AI response
            const aiMessage: Message = {
              type: 'ai',
              message: response.aiMessage,
              role: selectedScenario?.scenario_type === 'restaurant' || selectedScenario?.icon_type === 'utensils' ? 'waiter' : 
                    selectedScenario?.scenario_type === 'doctor' || selectedScenario?.icon_type === 'stethoscope' ? 'doctor' : 'assistant'
            };
            
            setConversation(prev => [...prev, aiMessage]);

            // Play audio response if available
            if (response.audioBase64) {
              try {
                const audioUrl = `data:audio/mp3;base64,${response.audioBase64}`;
                await playAudio(audioUrl);
              } catch (audioError) {
                console.warn('Could not play audio response:', audioError);
              }
            }

            // Check if conversation is complete
            if (response.done) {
              setIsConversationActive(false);
              setConversationCompleted(true);
              
              // Show evaluation dialog after 2 seconds
              setTimeout(() => {
                setShowEvaluationDialog(true);
              }, 2000);
            }
          }
        } catch (apiError: any) {
          console.error('Error processing voice message via API:', apiError);
          handleVoiceFallback();
        }
      } else {
        // Fallback for non-active sessions
        handleVoiceFallback();
      }
    } catch (error: any) {
      console.error('Error handling voice message:', error);
      handleVoiceFallback();
    }
  };

  // Fallback voice message handling
  const handleVoiceFallback = () => {
    // Update processing message
    setConversation(prev => {
      const newConversation = [...prev];
      const lastMessage = newConversation[newConversation.length - 1];
      if (lastMessage && lastMessage.message.includes('Processing voice message')) {
        lastMessage.message = '[Voice message recorded]';
      }
      return newConversation;
    });

    // Generate mock AI response
    setTimeout(() => {
      const aiResponse: Message = {
        type: 'ai',
        message: 'I heard your voice message. Could you please type your response or try speaking again?',
        role: selectedScenario?.scenario_type === 'restaurant' || selectedScenario?.icon_type === 'utensils' ? 'waiter' : 
              selectedScenario?.scenario_type === 'doctor' || selectedScenario?.icon_type === 'stethoscope' ? 'doctor' : 'assistant'
      };
      setConversation(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!selectedScenario || !userInput.trim()) return;

    // Add user message to conversation
    const newMessage: Message = {
      type: 'user',
      message: userInput
    };
    
    setConversation(prev => [...prev, newMessage]);
    const currentInput = userInput;
      setUserInput('');

    // If we have an active session, use the API
    if (isConversationActive && sessionId && user?.id) {
      try {
        const response = await respondRoleplayConversation(
          sessionId,
          currentInput,
          user.id,
          'text'
        );

        if (response) {
          const aiMessage: Message = {
            type: 'ai',
            message: response.aiMessage,
            role: selectedScenario.scenario_type === 'restaurant' || selectedScenario.icon_type === 'utensils' ? 'waiter' : 
                  selectedScenario.scenario_type === 'doctor' || selectedScenario.icon_type === 'stethoscope' ? 'doctor' : 'assistant'
          };
          
          setConversation(prev => [...prev, aiMessage]);

          // Play audio response if available
          if (response.audioBase64) {
            try {
              const audioUrl = `data:audio/mp3;base64,${response.audioBase64}`;
              await playAudio(audioUrl);
            } catch (audioError) {
              console.warn('Could not play audio response:', audioError);
            }
          }

          // Check if conversation is complete
          if (response.done) {
            setIsConversationActive(false);
            setConversationCompleted(true);
            
            // Show evaluation dialog after 2 seconds
            setTimeout(() => {
              setShowEvaluationDialog(true);
            }, 2000);
          }
        }
      } catch (error: any) {
        console.error('Error getting AI response:', error);
        // Fallback to mock response
        generateMockResponse(currentInput);
      }
    } else {
      // Use mock response for fallback scenarios
      generateMockResponse(currentInput);
    }
  };

  // Generate mock response for fallback scenarios
  const generateMockResponse = (userInput: string) => {
    setTimeout(() => {
      let aiResponse = '';
      const roleType = selectedScenario?.scenario_type === 'restaurant' || selectedScenario?.icon_type === 'utensils' ? 'waiter' : 
                      selectedScenario?.scenario_type === 'doctor' || selectedScenario?.icon_type === 'stethoscope' ? 'doctor' : 'assistant';
      
      // Simple response logic based on scenario type
      if (roleType === 'waiter') {
        const responses = [
          "That sounds delicious! What would you like to drink with that?",
          "Great choice! Would you like any appetizers to start?",
          "Perfect! How would you like that cooked?",
          "Excellent! Will that be all for you today?",
          "Wonderful! Your order will be ready shortly."
        ];
        aiResponse = responses[Math.floor(Math.random() * responses.length)];
      } else if (roleType === 'doctor') {
        const responses = [
          "I understand. Can you tell me more about when this started?",
          "Thank you for that information. Let me examine you.",
          "Based on what you've told me, I recommend some rest and medication.",
          "That's good to hear. How are you feeling now?",
          "I'll prescribe something to help with that. Take care!"
        ];
        aiResponse = responses[Math.floor(Math.random() * responses.length)];
      } else {
        aiResponse = "That's interesting! Tell me more about that.";
      }
      
      const aiMessage: Message = {
        type: 'ai',
        message: aiResponse,
        role: roleType
      };
      
      setConversation(prev => [...prev, aiMessage]);
    }, 1000);
  };

  const handleMockResponse = () => {
    if (!selectedScenario || !selectedScenario.conversation_flow) return;
    
    const currentFlowStep = selectedScenario.conversation_flow[currentStep];
    if (currentFlowStep && currentFlowStep.responses) {
      const randomResponse = currentFlowStep.responses[Math.floor(Math.random() * currentFlowStep.responses.length)];
      setUserInput(randomResponse);
    } else {
      const randomResponse = mockUserResponses[Math.floor(Math.random() * mockUserResponses.length)];
      setUserInput(randomResponse);
    }
  };

  const handleRestart = () => {
    if (!selectedScenario || !selectedScenario.conversation_flow) return;
    
    setCurrentStep(0);
    setUserInput('');
    setConversation([
      {
        type: 'ai',
        message: selectedScenario.conversation_flow[0].ai,
        role: selectedScenario.scenario_type === 'restaurant' || selectedScenario.icon_type === 'utensils' ? 'Server' : 
              selectedScenario.scenario_type === 'doctor' || selectedScenario.icon_type === 'stethoscope' ? 'Doctor' : 'AI'
      }
    ]);
  };

  const isCompleted = selectedScenario && selectedScenario.conversation_flow && currentStep >= selectedScenario.conversation_flow.length - 1;

  // Scenario Selection Screen
    if (!selectedScenario) {  
  return (
      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <div className="p-4 sm:p-6 lg:p-8 pb-0">
          <PracticeBreadcrumb />
        </div>
        
        {/* Header */}
        <div className="relative flex items-center justify-center mb-6 p-4 sm:p-6 lg:p-8">
          <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Roleplay Simulation</h1>
            <p className="text-muted-foreground">Practice Real Conversations</p>
          </div>
        </div>

        {/* Choose Scenario Section */}
        <div className="flex-1 px-4 pb-4">
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-center mb-2">Choose a Scenario</h2>
            <p className="text-center text-muted-foreground mb-8">
              Practice English through realistic conversations
            </p>

            {/* Scenario Cards */}
            <div className="space-y-4">
              {currentScenarios.map((scenario) => {
                const IconComponent = getIconComponent(scenario.icon_type, scenario.scenario_type);
                return (
                  <Card key={scenario.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      {/* Header with Icon and Title */}
                      <div className="flex items-start space-x-4 mb-4">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{scenario.title}</h3>
                          <p className="text-muted-foreground mb-2" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                            {scenario.title_urdu || scenario.title}
                          </p>
                          <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm rounded-full">
                            {scenario.difficulty}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-sm text-foreground mb-2">
                        {scenario.description}
                      </p>
                      <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                        {scenario.description_urdu || scenario.description}
                      </p>

                      {/* Keywords */}
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                        <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                          Keywords to Practice:
                        </p>
                        <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                          {scenario.keywords && scenario.keywords.length > 0 
                            ? scenario.keywords.join(', ')
                            : 'Practice general conversation skills'
                          }
                        </p>
                      </div>

                      {/* Start Button */}
                      <Button 
                        onClick={() => handleStartScenario(scenario)}
                        disabled={loadingScenario}
                        className="w-full bg-green-500 hover:bg-green-600 text-white"
                      >
                        {loadingScenario ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Start Conversation
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-8 space-x-2">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}

            {loading && (
              <div className="text-center mt-8">
                <ContentLoader />
              </div>
            )}
            
            {error && (
              <div className="mt-6">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
                <Button
                  onClick={handleRetry}
                  variant="outline"
                  className="mt-4 w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading Scenarios
                </Button>
              </div>
            )}

            {!loading && !error && allScenarios.length === 0 && (
              <Alert className="mt-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No scenarios found. Please try again later or check your internet connection.
                </AlertDescription>
              </Alert>
            )}

            {!loading && !error && allScenarios.length > 0 && (
              <div className="text-center mt-6 text-sm text-muted-foreground">
                Showing {currentScenarios.length} of {allScenarios.length} total scenarios
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Conversation Screen - Clean and Professional Design
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="px-6 pt-6">
          <PracticeBreadcrumb />
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between p-6">
          <Button
            variant="outline"
            size="icon"
            onClick={handleBackToScenarios}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">{selectedScenario.title}</h1>
            <p className="text-muted-foreground">
              Roleplay as {selectedScenario?.scenario_type === 'restaurant' || selectedScenario?.icon_type === 'utensils' ? 'waiter' : 
                          selectedScenario?.scenario_type === 'doctor' || selectedScenario?.icon_type === 'stethoscope' ? 'doctor' : 'assistant'}
            </p>
          </div>
          
          <div className="w-10"></div>
        </div>

        {/* Scenario Info Card */}
        <Card className="mb-6 mx-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="font-medium text-green-800 dark:text-green-200">
                  Active Scenario
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConversationActive ? 'bg-blue-500' : 'bg-orange-400'}`}></div>
                <span className="text-xs font-medium text-muted-foreground">
                  {isConversationActive ? 'Live AI' : 'Practice Mode'}
                </span>
              </div>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300">
              {selectedScenario.description}
            </p>
            {selectedScenario.keywords && selectedScenario.keywords.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  Practice Keywords: {selectedScenario.keywords.join(', ')}
            </span>
          </div>
            )}
            {sessionId && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                Session ID: {sessionId.substring(0, 8)}...
          </div>
            )}
          </CardContent>
        </Card>

        {/* Conversation Area */}
        <div className="mx-6 mb-6">
          <Card>
            <CardContent className="p-6">
              {loadingScenario ? (
                <div className="flex justify-center py-8">
                  <ContentLoader />
                </div>
              ) : (
                            <div 
                  ref={conversationContainerRef}
                  className="space-y-4 max-h-96 overflow-y-auto"
                >
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className="max-w-xs lg:max-w-md">
                    {msg.type === 'ai' && (
                          <div className="text-xs text-muted-foreground mb-1 capitalize">
                            {msg.role || 'Assistant'}
                      </div>
                    )}
                    <div
                          className={`px-4 py-3 rounded-lg ${
                        msg.type === 'user'
                              ? 'bg-green-500 text-white'
                              : 'bg-muted text-foreground'
                      }`}
                    >
                          <p className="text-sm leading-relaxed">{msg.message}</p>
                    </div>
                  </div>
                </div>
              ))}
                  
                  {conversation.length === 0 && !loadingScenario && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>
                        {isConversationActive 
                          ? "Your AI conversation is ready! Start by typing a message or using voice input." 
                          : "Practice mode active. Start the conversation by typing a message or using voice input."
                        }
                      </p>
            </div>
                  )}


                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Input Area */}
        <div className="mx-6">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                                        <input
                      type="text"
                      placeholder="Type your response here..."
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-background text-foreground placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                      disabled={isRecording}
                    />
                  </div>
                
                  <Button
                    onClick={handleVoiceInput}
                    size="icon"
                    className={`w-12 h-12 ${
                      isRecording 
                        ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                        : 'bg-green-500 hover:bg-green-600'
                    } text-white`}
                  >
                    {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </Button>
                </div>
                  
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                    disabled={!userInput.trim() || isRecording}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </div>

                {/* Status Messages */}
                {recordingError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{recordingError}</AlertDescription>
                  </Alert>
                )}
                
                {isRecording && (
                  <Alert>
                    <Mic className="h-4 w-4" />
                    <AlertDescription>
                      🎤 Recording... Click the microphone button again to stop
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Dialog */}
        {showEvaluationDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 mx-4">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Conversation Complete! 🎉</h3>
                <p className="text-muted-foreground mb-6">
                  Great job completing your roleplay session. Would you like to evaluate your performance and get feedback?
                </p>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEvaluationDialog(false)}
                    className="flex-1"
                  >
                    Skip
                  </Button>
                  <Button 
                    onClick={handleEvaluatePerformance}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Evaluate Performance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Evaluation Loading */}
        {isEvaluating && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-96 mx-4">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Evaluating Your Performance</h3>
                <p className="text-muted-foreground">
                  Analyzing your conversation skills, grammar, and keyword usage...
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Evaluation Results */}
        {evaluationResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardContent className="p-6">
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold text-green-600">
                      {evaluationResult.overall_score}%
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Performance Evaluation</h3>
                  <p className="text-muted-foreground">{evaluationResult.conversation_quality}</p>
                </div>

                {/* Score Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">{evaluationResult.conversation_flow_score}%</div>
                    <div className="text-sm text-muted-foreground">Flow</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">{evaluationResult.keyword_usage_score}%</div>
                    <div className="text-sm text-muted-foreground">Keywords</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">{evaluationResult.grammar_fluency_score}%</div>
                    <div className="text-sm text-muted-foreground">Grammar</div>
                  </div>
                  <div className="text-center p-3 bg-muted rounded-lg">
                    <div className="text-lg font-semibold">{evaluationResult.engagement_score}%</div>
                    <div className="text-sm text-muted-foreground">Engagement</div>
                  </div>
                </div>

                {/* Strengths and Improvements */}
                <div className="space-y-4 mb-6">
                  {evaluationResult.strengths.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-600 mb-2">✅ Strengths</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {evaluationResult.strengths.map((strength, index) => (
                          <li key={index}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {evaluationResult.areas_for_improvement.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-orange-600 mb-2">💡 Areas for Improvement</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {evaluationResult.areas_for_improvement.map((area, index) => (
                          <li key={index}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Recommendations */}
                {evaluationResult.recommendations.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2">🎯 Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {evaluationResult.recommendations.map((rec, index) => (
                        <li key={index}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setEvaluationResult(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                  <Button 
                    onClick={handleBackToScenarios}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                  >
                    Try Another Scenario
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
} 