import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { ArrowLeft, Users, Mic, Plus, GraduationCap, Heart, Play, Loader2, MicOff, Volume2, MessageSquare, Trophy, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/hooks/useAuth';
import { getAuthHeadersWithAccept, getAuthHeaders } from '@/utils/authUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Message {
  type: 'ai' | 'user' | 'system';
  message: string;
  persona?: string;
  avatar?: string;
}

interface Scenario {
  id: string;
  title: string;
  description: string;
  icon?: any;
  color?: string;
  participants: string[];
  initial_prompt?: string;
  follow_up_turns?: FollowUpTurn[];
  created_at?: string;
  updated_at?: string;
}

interface FollowUpTurn {
  speaker: string;
  message: string;
  order: number;
}

interface GroupDialogueScenarioResponse {
  scenarios: Scenario[];
  total: number;
}

interface EvaluationFeedback {
  overall_score: number;
  feedback: string;
  suggested_improvement?: string;
  areas_to_improve?: string[];
  strengths?: string[];
}

interface ExerciseCompletion {
  exercise_completed: boolean;
  progress_percentage: number;
  completed_topics: number;
  total_topics: number;
  current_topic_id: number;
  stage_id: number;
  exercise_id: number;
  exercise_name: string;
  stage_name: string;
  completion_date?: string | null;
}

interface EvaluationResponse {
  success: boolean;
  expected_phrase?: string;
  user_text?: string;
  evaluation: any;
  progress_recorded: boolean;
  unlocked_content: any[];
  exercise_completion: ExerciseCompletion;
  error?: string;
  message?: string;
}

// API Functions
const fetchGroupDialogueScenarios = async (): Promise<Scenario[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.GROUP_DIALOGUE_SCENARIOS}`, {
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
    let scenarios: any[] = [];

    if (Array.isArray(result)) {
      scenarios = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      scenarios = result.data;
    } else if (result && typeof result === 'object' && result.scenarios && Array.isArray(result.scenarios)) {
      scenarios = result.scenarios;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        scenarios = result[arrayProperties[0]];
      } else {
        throw new Error('No array of scenarios found in response');
      }
    } else {
      throw new Error('Invalid response format: expected array or object with scenarios');
    }

    // Validate and transform scenarios data
    const validScenarios: Scenario[] = scenarios.map((scenario: any, index: number) => {
      if (!scenario || typeof scenario !== 'object') {
        throw new Error(`Invalid scenario data at index ${index}`);
      }

      return {
        id: scenario.id || `scenario-${index}`,
        title: scenario.title || `Scenario ${index + 1}`,
        description: scenario.description || '',
        participants: Array.isArray(scenario.participants) ? scenario.participants : [],
        created_at: scenario.created_at || new Date().toISOString(),
        updated_at: scenario.updated_at
      };
    });

    return validScenarios;

  } catch (error: any) {
    console.error('Error fetching group dialogue scenarios:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

const fetchGroupDialogueScenarioById = async (scenarioId: string): Promise<Scenario> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.GROUP_DIALOGUE_SCENARIO_DETAIL(scenarioId)}`, {
      method: 'GET',
      headers: getAuthHeadersWithAccept(),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Group dialogue scenario not found');
      }
      const errorText = await response.text().catch(() => 'No response text');
      throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
    }

    const result = await response.json();
    
    return {
      id: result.id,
      title: result.title,
      description: result.description,
      participants: Array.isArray(result.participants) ? result.participants : [],
      initial_prompt: result.initial_prompt || '',
      follow_up_turns: Array.isArray(result.follow_up_turns) 
        ? result.follow_up_turns.map((turn: any, index: number) => ({
            speaker: turn.speaker || `Speaker ${index + 1}`,
            message: turn.message || turn.text || '',
            order: typeof turn.order === 'number' ? turn.order : index + 1
          }))
        : [],
      created_at: result.created_at || new Date().toISOString(),
      updated_at: result.updated_at
    };

  } catch (error: any) {
    console.error('Error fetching group dialogue scenario by ID:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

// Fetch audio for a group dialogue scenario
const fetchGroupDialogueScenarioAudio = async (scenarioId: string): Promise<string> => {
  try {
    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.GROUP_DIALOGUE_SCENARIO_AUDIO(scenarioId)}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
    });

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
    console.error('Error fetching group dialogue scenario audio:', error);
    throw error;
  }
};

// Evaluate group dialogue audio
const evaluateGroupDialogueAudio = async (audioBase64: string, scenarioId: string, timeSpentSeconds: number, userId: string): Promise<{feedback: EvaluationFeedback, evaluationResponse: EvaluationResponse | null}> => {
  try {
    const payload = {
      audio_base64: audioBase64,
      scenario_id: parseInt(scenarioId),
      filename: `group_dialogue_${scenarioId}_${Date.now()}.webm`,
      user_id: userId,
      time_spent_seconds: timeSpentSeconds,
      urdu_used: false // Always false as per previous pattern
    };
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_GROUP_DIALOGUE}`, {
      method: 'POST',
      headers: getAuthHeadersWithAccept(),
      body: JSON.stringify(payload),
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
    
    // Handle API error responses (like no_speech_detected)
    if (result.success === false || result.error) {
      const errorMessage = result.message || result.error || 'Speech evaluation failed';
      
      // Create feedback object for error cases
      const feedback: EvaluationFeedback = {
        overall_score: 0,
        feedback: errorMessage,
        suggested_improvement: 'Please speak more clearly and try again'
      };
      
      return { feedback, evaluationResponse: null };
    }
    
    // Handle nested evaluation structure
    let evaluationData = result;
    if (result.evaluation && typeof result.evaluation === 'object') {
      // If there's a nested evaluation object, merge it with the root level
      evaluationData = { ...result, ...result.evaluation };
    }
    
    const feedback = {
      overall_score: evaluationData.overall_score || evaluationData.score || 0,
      feedback: evaluationData.next_steps || evaluationData.feedback || evaluationData.message || 'No feedback available',
      suggested_improvement: evaluationData.suggested_improvement || evaluationData.suggestions || evaluationData.suggestion,
      areas_to_improve: Array.isArray(evaluationData.areas_to_improve) ? evaluationData.areas_to_improve : 
                        (evaluationData.areas_to_improve ? [evaluationData.areas_to_improve] : []),
      strengths: Array.isArray(evaluationData.strengths) ? evaluationData.strengths : 
                 (evaluationData.strengths ? [evaluationData.strengths] : [])
    };
    
    return { feedback, evaluationResponse: result };
    
  } catch (error: any) {
    console.error('Error evaluating group dialogue audio:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again with a shorter recording.');
    }
    
    if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
      throw new Error('Network error. Please check your internet connection.');
    }
    
    throw error;
  }
};

export default function GroupDialogue() {
  const navigate = useNavigate();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [currentScenarioData, setCurrentScenarioData] = useState<Scenario | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingScenario, setIsLoadingScenario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completedScenarios, setCompletedScenarios] = useState<Set<number>>(new Set());
  const [currentTopicId, setCurrentTopicId] = useState<number>(1);
  
  const hasFetchedData = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);

  // Icon mapping for fallback scenarios
  const iconMapping = {
    school: GraduationCap,
    doctor: Plus,
    pharmacy: Heart
  };

  // Color mapping for fallback scenarios  
  const colorMapping = {
    school: 'bg-green-500',
    doctor: 'bg-blue-500',
    pharmacy: 'bg-red-500'
  };

  const fallbackScenarios: Scenario[] = [
    {
      id: 'school',
      title: 'Explain why you missed school',
      description: 'Practice explaining absences and making excuses in a school setting',
      participants: ['Teacher', 'Classmate', 'You'],
      created_at: new Date().toISOString()
    },
    {
      id: 'doctor',
      title: 'Ask a doctor for help',
      description: 'Practice describing symptoms and asking for medical advice',
      participants: ['Doctor', 'Nurse', 'You'],
      created_at: new Date().toISOString()
    },
    {
      id: 'pharmacy',
      title: 'Buy something at a pharmacy',
      description: 'Practice purchasing medication and asking about products',
      participants: ['Pharmacist', 'Customer', 'You'],
      created_at: new Date().toISOString()
    }
  ];

  // Replace [your name] with user's actual name
  const replaceUserNamePlaceholder = (message: string): string => {
    if (!message.includes('[your name]')) return message;
    
    let userName = 'Student'; // Default fallback
    
    if (profile) {
      if (profile.first_name) {
        userName = profile.first_name;
      } else if (profile.last_name) {
        userName = profile.last_name;
      }
    }
    
    return message.replace(/\[your name\]/gi, userName);
  };

  // Get icon for scenario (fallback or API-based)
  const getScenarioIcon = (scenario: Scenario) => {
    if (scenario.icon) return scenario.icon;
    const key = scenario.id as keyof typeof iconMapping;
    return iconMapping[key] || Users;
  };

  // Get color for scenario (fallback or API-based)
  const getScenarioColor = (scenario: Scenario) => {
    if (scenario.color) return scenario.color;
    const key = scenario.id as keyof typeof colorMapping;
    return colorMapping[key] || 'bg-gray-500';
  };

  // Fetch scenarios on component mount
  useEffect(() => {
    const fetchScenarios = async () => {
      if (hasFetchedData.current) return; // Prevent multiple calls
      hasFetchedData.current = true;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch scenarios from API
        const fetchedScenarios = await fetchGroupDialogueScenarios();
        
        // Fetch user's current topic progress if user is logged in
        if (user?.id) {
          try {
            const { getCurrentTopicProgress } = await import('@/utils/progressTracker');
            const progressResponse = await getCurrentTopicProgress(
              user.id,
              3, // Stage 3
              2  // Exercise 2 (GroupDialogue)
            );
            
            if (progressResponse.success && progressResponse.data?.current_topic_id) {
              const topicId = progressResponse.data.current_topic_id;
              setCurrentTopicId(topicId);
              console.log('📍 Current topic ID:', topicId);
              
              // Mark all scenarios before current topic as completed
              const completed = new Set<number>();
              for (let i = 1; i < topicId; i++) {
                completed.add(i);
              }
              setCompletedScenarios(completed);
              console.log(`✅ Marked ${completed.size} scenarios as completed`);
            }
          } catch (progressError) {
            console.warn('Could not fetch current topic progress:', progressError);
          }
        }
        
        if (fetchedScenarios && fetchedScenarios.length > 0) {
          setScenarios(fetchedScenarios);
        } else {
          // Fallback to hardcoded scenarios if API returns empty
          setScenarios(fallbackScenarios);
        }
      } catch (err: any) {
        console.error('Error fetching group dialogue scenarios:', err);
        setError(err.message);
        // Use fallback scenarios on error
        setScenarios(fallbackScenarios);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScenarios();
  }, [user?.id]);

  // Cleanup audio and recording on component unmount
  useEffect(() => {
    return () => {
      cleanupCurrentAudio();
      
      // Stop recording if active
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      
      // Clear timeout
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
    };
  }, [isRecording]);

  // Update recording duration every second
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isRecording && (recordingStartTime || recordingStartTimeRef.current)) {
      interval = setInterval(() => {
        const startTime = recordingStartTime || recordingStartTimeRef.current;
        if (startTime) {
          const duration = Math.floor((Date.now() - startTime) / 1000);
          setRecordingDuration(duration);
        }
      }, 1000);
    } else {
      setRecordingDuration(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Cleanup current audio properly
  const cleanupCurrentAudio = () => {
    if (audioRef.current) {
      const audio = audioRef.current;
      audio.pause();
      audio.currentTime = 0;
      
      // Remove all event listeners to prevent memory leaks
      audio.oncanplaythrough = null;
      audio.onerror = null;
      audio.onended = null;
      
      audioRef.current = null;
    }
  };

  // Play audio from URL
  const playAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Stop and cleanup any currently playing audio
      cleanupCurrentAudio();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const cleanup = () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
      };
      
      const handleError = (error: string) => {
        cleanup();
        cleanupCurrentAudio();
        reject(new Error(error));
      };
      
      const handleSuccess = () => {
        cleanup();
        resolve();
      };
      
      audio.oncanplaythrough = () => {
        audio.play()
          .then(() => {
            // Audio started playing successfully
          })
          .catch((playError) => {
            handleError('Failed to start audio playback');
          });
      };
      
      audio.onerror = () => {
        handleError('Failed to load audio file');
      };
      
      audio.onended = () => {
        handleSuccess();
      };
      
      audio.load();
    });
  };

  // Handle audio playback for selected scenario
  const handlePlayScenarioAudio = async () => {
    if (!selectedScenario) return;

    setIsLoadingAudio(true);
    
    try {
      const audioUrl = await fetchGroupDialogueScenarioAudio(selectedScenario);
      await playAudio(audioUrl);
    } catch (error: any) {
      console.error('Audio playback failed:', error.message);
      // Silent fail for better user experience
    } finally {
      setIsLoadingAudio(false);
    }
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1]; // Remove data:audio/webm;base64, prefix
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start audio recording
  const startRecording = async () => {
    // Check if already recording
    if (isRecording) return;
    
    // Check browser support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Audio recording is not supported in your browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      return;
    }
    
    if (!window.MediaRecorder) {
      alert('Audio recording is not supported in your browser. Please use a modern browser.');
      return;
    }
    
    try {
      // Set recording state immediately to show visual feedback
      const startTime = Date.now();
      setIsRecording(true);
      setRecordingStartTime(startTime);
      recordingStartTimeRef.current = startTime; // Store in ref as backup
      setFeedback(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      // Check for supported MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''; // Let browser choose
          }
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        processRecordedAudio();
      };
      
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setIsRecording(false);
        alert('Recording error occurred. Please try again.');
      };
      
      // Start recording with timeslice to ensure data collection
      mediaRecorder.start(1000); // Collect data every second
      
      // Auto-stop recording after 2 minutes
      recordingTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 120000);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      
      // Reset states if recording failed
      setIsRecording(false);
      setRecordingStartTime(null);
      recordingStartTimeRef.current = null; // Clear ref too
      setFeedback(null);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        alert('Microphone is already being used by another application. Please close other apps using the microphone and try again.');
      } else {
        alert(`Unable to access microphone: ${error.message}. Please check your permissions and try again.`);
      }
    }
  };

  // Stop audio recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      
      setIsRecording(false);
      
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
        recordingTimeoutRef.current = null;
      }
    }
  };

  // Process recorded audio and send for evaluation
  const processRecordedAudio = async () => {
    // Get start time from ref as fallback
    const actualStartTime = recordingStartTime || recordingStartTimeRef.current;
    
    // Validation checks
    if (audioChunksRef.current.length === 0) {
      setFeedback({
        overall_score: 0,
        feedback: 'No audio was recorded. Please ensure your microphone is working and try again.',
        suggested_improvement: 'Check your microphone permissions and make sure you speak during recording.'
      });
      setIsEvaluating(false);
      return;
    }

    if (!selectedScenario) {
      setIsEvaluating(false);
      return;
    }

    if (!actualStartTime) {
      setFeedback({
        overall_score: 0,
        feedback: 'Recording timing error occurred. Please try recording again.',
        suggested_improvement: 'Click the microphone button to start a new recording.'
      });
      setIsEvaluating(false);
      return;
    }

    setIsEvaluating(true);
    
    try {
      // Create audio blob with proper MIME type
      const mimeType = audioChunksRef.current[0]?.type || 'audio/webm';
      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
      
      if (audioBlob.size === 0) {
        throw new Error('Audio blob is empty');
      }
      
      const base64Audio = await blobToBase64(audioBlob);
      
      if (!base64Audio || base64Audio.length < 100) {
        throw new Error('Base64 conversion failed or produced empty result');
      }
      
      const timeSpentSeconds = Math.floor((Date.now() - actualStartTime) / 1000);
      
      const { feedback, evaluationResponse } = await evaluateGroupDialogueAudio(
        base64Audio,
        selectedScenario,
        timeSpentSeconds,
        user?.id || 'anonymous'
      );
      
      setFeedback(feedback);
      
      // Check if the exercise is completed based on API response
      if (evaluationResponse?.exercise_completion?.exercise_completed) {
        // Exercise is completed according to the API
        setIsCompleted(true);
        setShowCompletionDialog(true);
        markExerciseCompleted();
      } else if (!isCompleted && feedback.overall_score !== undefined && feedback.overall_score > 0) {
        // Only mark as completed if we have a successful evaluation with a valid score
        setIsCompleted(true);
        setShowCompletionDialog(true);
        markExerciseCompleted();
      }
      
    } catch (error: any) {
      console.error('Error processing audio:', error);
      
      let errorMessage = 'Sorry, we encountered an error processing your audio. Please try again.';
      let suggestion = 'Make sure you have a stable internet connection and try recording again.';
      
      if (error.message.includes('empty') || error.message.includes('Base64')) {
        errorMessage = 'The audio recording appears to be empty or corrupted.';
        suggestion = 'Please check your microphone and record for at least 2-3 seconds.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error occurred while sending your audio.';
        suggestion = 'Please check your internet connection and try again.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'The request timed out while processing your audio.';
        suggestion = 'Please try again with a shorter recording or check your connection.';
      }
      
      setFeedback({
        overall_score: 0,
        feedback: errorMessage,
        suggested_improvement: suggestion
      });
    } finally {
      setIsEvaluating(false);
      setRecordingStartTime(null);
      recordingStartTimeRef.current = null; // Clear ref too
      // Clear the audio chunks for next recording
      audioChunksRef.current = [];
    }
  };

  const markExerciseCompleted = async () => {
    if (user?.id) {
      try {
        // Import the progress update function
        const { updateCurrentProgress } = await import('@/utils/progressTracker');
        
        // Update progress to mark as completed
        await updateCurrentProgress(
          user.id,
          3, // Stage 3
          2  // Exercise 2 (GroupDialogue)
        );
        console.log('Exercise marked as completed: Stage 3, Exercise 2 (GroupDialogue)');
      } catch (error) {
        console.warn('Failed to mark exercise as completed:', error);
      }
    }
  };

  const handleRedo = () => {
    setSelectedScenario(null);
    setCurrentScenarioData(null);
    setConversation([]);
    setUserInput('');
    setFeedback(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    setIsRecording(false);
    setIsEvaluating(false);
    setRecordingStartTime(null);
    recordingStartTimeRef.current = null;
    setRecordingDuration(0);
    
    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  // Handle microphone button click
  const handleMicrophoneClick = () => {
    if (isRecording) {
      // Check minimum recording duration (2 seconds)
      if (recordingDuration < 2) {
        return; // Don't stop if recording is less than 2 seconds
      }
      stopRecording();
    } else if (!isEvaluating) {
      startRecording();
    }
  };

  const initializeConversation = async (scenarioId: string) => {
    try {
      setIsLoadingScenario(true);
      
      // Fetch detailed scenario data from API
      let scenarioData: Scenario;
      try {
        scenarioData = await fetchGroupDialogueScenarioById(scenarioId);
        setCurrentScenarioData(scenarioData);
      } catch (apiError) {
        console.error('Failed to fetch scenario details, using fallback:', apiError);
        // Use fallback scenario data if API fails
        const fallbackScenario = scenarios.find(s => s.id === scenarioId);
        if (!fallbackScenario) return;
        scenarioData = fallbackScenario;
        setCurrentScenarioData(fallbackScenario);
      }

    const initialMessages: Message[] = [
      {
        type: 'system',
          message: `Starting ${scenarioData.title} scenario`
        }
      ];

      // Add initial prompt if available from API
      if (scenarioData.initial_prompt) {
        // Parse speaker name from prompt (anything before ':')
        const colonIndex = scenarioData.initial_prompt.indexOf(':');
        if (colonIndex > 0) {
          const speakerName = scenarioData.initial_prompt.substring(0, colonIndex).trim();
          const rawMessage = scenarioData.initial_prompt.substring(colonIndex + 1).trim();
          const message = replaceUserNamePlaceholder(rawMessage);
          
          // Determine avatar and message type based on speaker name
          let avatar = '👤';
          let messageType: 'ai' | 'user' | 'system' = 'ai';
          
          const speakerLower = speakerName.toLowerCase();
          if (speakerLower.includes('teacher')) avatar = '👨‍🏫';
          else if (speakerLower.includes('doctor')) avatar = '👨‍⚕️';
          else if (speakerLower.includes('pharmacist')) avatar = '👩‍⚕️';
          else if (speakerLower.includes('nurse')) avatar = '👩‍⚕️';
          else if (speakerLower.includes('customer')) avatar = '👤';
          else if (speakerLower.includes('student') || speakerLower.includes('you')) {
            avatar = '👨‍🎓';
            messageType = 'user';
          }

          initialMessages.push({
            type: messageType,
            message: message,
            persona: speakerName,
            avatar: avatar
          });
        } else {
          // Fallback if no colon found - show as system message
          const message = replaceUserNamePlaceholder(scenarioData.initial_prompt);
          initialMessages.push({
            type: 'ai',
            message: message,
            persona: 'System',
            avatar: '🤖'
          });
        }
      }

      // Add follow-up turns if available from API
      if (scenarioData.follow_up_turns && scenarioData.follow_up_turns.length > 0) {
        const sortedTurns = scenarioData.follow_up_turns.sort((a, b) => a.order - b.order);
        
        sortedTurns.forEach((turn, index) => {
          let speakerName = turn.speaker;
          let rawMessage = turn.message;
          
          // Check if the message itself contains speaker name (format: "Speaker: message")
          const colonIndex = turn.message.indexOf(':');
          if (colonIndex > 0) {
            const messagesSpeakerName = turn.message.substring(0, colonIndex).trim();
            const extractedMessage = turn.message.substring(colonIndex + 1).trim();
            
            // Use speaker name from message if it exists, otherwise use turn.speaker
            speakerName = messagesSpeakerName || turn.speaker;
            rawMessage = extractedMessage;
          }
          
          // Replace [your name] placeholder with actual user name
          const message = replaceUserNamePlaceholder(rawMessage);
          
          // Determine speaker avatar based on speaker name
          let avatar = '👤';
          let messageType: 'ai' | 'user' | 'system' = 'ai';
          
          const speakerLower = speakerName.toLowerCase();
          if (speakerLower.includes('teacher')) avatar = '👨‍🏫';
          else if (speakerLower.includes('doctor')) avatar = '👨‍⚕️';
          else if (speakerLower.includes('pharmacist')) avatar = '👩‍⚕️';
          else if (speakerLower.includes('nurse')) avatar = '👩‍⚕️';
          else if (speakerLower.includes('customer')) avatar = '👤';
          else if (speakerLower.includes('student') || speakerLower.includes('you')) {
            avatar = '👨‍🎓';
            messageType = 'user';
          }

          initialMessages.push({
            type: messageType,
            message: message,
            persona: speakerName,
            avatar: avatar
          });
        });
      } else {
        // Fallback to hardcoded responses if no follow_up_turns from API
    switch (scenarioId) {
      case 'school':
        initialMessages.push({
          type: 'ai',
          message: 'Hello, what\'s the problem?',
          persona: 'Teacher',
          avatar: '👨‍🏫'
        });
        break;
      case 'doctor':
        initialMessages.push({
          type: 'ai',
          message: 'Good morning! How can I help you today?',
          persona: 'Doctor',
          avatar: '👨‍⚕️'
        });
        break;
      case 'pharmacy':
        initialMessages.push({
          type: 'ai',
          message: 'Welcome to the pharmacy. What can I get for you?',
          persona: 'Pharmacist',
          avatar: '👩‍⚕️'
        });
        break;
        }
    }

    setConversation(initialMessages);
    } catch (error) {
      console.error('Error initializing conversation:', error);
    } finally {
      setIsLoadingScenario(false);
    }
  };

  const handleScenarioSelect = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    initializeConversation(scenarioId);
    
    // Save progress when selecting a scenario
    if (user?.id) {
      try {
        const scenarioIndex = scenarios.findIndex(s => s.id === scenarioId);
        if (scenarioIndex !== -1) {
          const topicId = scenarioIndex + 1; // 1-based
          const { updateCurrentTopic } = await import('@/utils/progressTracker');
          await updateCurrentTopic(
            user.id,
            3, // Stage 3
            2, // Exercise 2 (GroupDialogue)
            topicId
          );
          console.log(`Progress saved: Scenario ${topicId} of ${scenarios.length}`);
        }
      } catch (error) {
        console.warn('Failed to save progress:', error);
      }
    }
  };

  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const newMessages: Message[] = [
      ...conversation,
      {
        type: 'user',
        message: userInput
      }
    ];

    // Generate AI response based on scenario
    const aiResponse = generateAIResponse(selectedScenario!, userInput);
    newMessages.push(aiResponse);

    setConversation(newMessages);
    setUserInput('');
  };

  const generateAIResponse = (scenarioId: string, userMessage: string): Message => {
    // Use current scenario data if available for more contextual responses
    if (currentScenarioData && currentScenarioData.participants.length > 0) {
      const participants = currentScenarioData.participants.filter(p => p.toLowerCase() !== 'you');
      const randomParticipant = participants[Math.floor(Math.random() * participants.length)];
      
      // Generate contextual response based on participant type
      let avatar = '👤';
      let responses = ["I understand.", "Could you tell me more?", "That makes sense."];
      
      const participantLower = randomParticipant.toLowerCase();
      if (participantLower.includes('teacher')) {
        avatar = '👨‍🏫';
        responses = [
          "I see. Do you have a note from your parents?",
          "That's understandable. Please make sure to catch up on the work.",
          "Well done! Try to be more specific next time."
        ];
      } else if (participantLower.includes('doctor')) {
        avatar = '👨‍⚕️';
        responses = [
          "I understand. How long have you been feeling this way?",
          "Let me examine you. Please describe the symptoms.",
          "I can help with that. Take this advice."
        ];
      } else if (participantLower.includes('pharmacist')) {
        avatar = '👩‍⚕️';
        responses = [
          "Certainly! Do you have a prescription for that?",
          "This should help. Take as directed.",
          "That will be the total. Would you like a receipt?"
        ];
      }
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      return {
        type: 'ai',
        message: replaceUserNamePlaceholder(randomResponse),
        persona: randomParticipant,
        avatar: avatar
      };
    }

    // Fallback to original hardcoded responses
    const responses = {
      school: [
        { message: "I see. Do you have a note from your parents?", persona: "Teacher", avatar: "👨‍🏫" },
        { message: "That's understandable. Please make sure to catch up on the work.", persona: "Teacher", avatar: "👨‍🏫" },
        { message: "Well done! Try: 'Could you please fix it today?' to sound polite.", persona: "System", avatar: "ℹ️" }
      ],
      doctor: [
        { message: "I understand. How long have you been feeling this way?", persona: "Doctor", avatar: "👨‍⚕️" },
        { message: "Let me examine you. Please describe the pain.", persona: "Doctor", avatar: "👨‍⚕️" },
        { message: "I can prescribe something for that. Take this twice daily.", persona: "Doctor", avatar: "👨‍⚕️" }
      ],
      pharmacy: [
        { message: "Certainly! Do you have a prescription for that?", persona: "Pharmacist", avatar: "👩‍⚕️" },
        { message: "This medication should help. Take one tablet every 8 hours.", persona: "Pharmacist", avatar: "👩‍⚕️" },
        { message: "That will be $15. Would you like a receipt?", persona: "Pharmacist", avatar: "👩‍⚕️" }
      ]
    };

    const scenarioResponses = responses[scenarioId as keyof typeof responses];
    if (scenarioResponses) {
    const randomResponse = scenarioResponses[Math.floor(Math.random() * scenarioResponses.length)];
    return {
      type: 'ai',
        message: replaceUserNamePlaceholder(randomResponse.message),
      persona: randomResponse.persona,
      avatar: randomResponse.avatar
      };
    }

    // Final fallback
    return {
      type: 'ai',
      message: replaceUserNamePlaceholder("That's interesting. Please continue."),
      persona: "Assistant",
      avatar: "🤖"
    };
  };

  const handleBackToScenarios = () => {
    // Stop any ongoing recording
    if (isRecording) {
      stopRecording();
    }
    
    // Clear all states
    setSelectedScenario(null);
    setCurrentScenarioData(null);
    setConversation([]);
    setUserInput('');
    setFeedback(null);
    setIsRecording(false);
    setIsEvaluating(false);
    setRecordingStartTime(null);
    recordingStartTimeRef.current = null; // Clear ref too
    setRecordingDuration(0);
    
    // Clear recording timeout
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
  };

  if (selectedScenario) {
    const scenario = currentScenarioData || scenarios.find(s => s.id === selectedScenario)!;
    
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <div className="mb-6">
            <PracticeBreadcrumb />
          </div>
          
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={handleBackToScenarios}
              className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg border border-primary/30 dark:border-primary/40">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-2">Group Dialogue</h1>
              <p className="text-lg text-muted-foreground">Master Interactive Group Conversations</p>
            </div>
            
            <div className="w-10"></div>
          </div>

          {/* Scenario Info */}
          <Card className="mb-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-12 h-12 ${getScenarioColor(scenario)} rounded-2xl flex items-center justify-center shadow-md`}>
                    {React.createElement(getScenarioIcon(scenario), { className: "h-6 w-6 text-white" })}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-primary dark:text-primary/90 mb-1">{scenario.title}</h3>
                    <p className="text-sm text-primary/80 dark:text-primary/70">{scenario.description}</p>
                  </div>
                </div>
                
                {/* Participants */}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-primary/70 dark:text-primary/60 font-medium mr-2">Participants:</span>
                  {scenario.participants.map((participant, index) => (
                    <div key={index} className="w-8 h-8 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center border border-primary/30 dark:border-primary/40 shadow-sm">
                      <span className="text-xs text-primary font-medium">
                        {participant === 'You' ? 'Y' : participant[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation */}
          <Card className="mb-4 bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              {isLoadingScenario ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3"></div>
                  <span className="text-muted-foreground">Loading conversation...</span>
                </div>
              ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {conversation.map((msg, index) => (
                  <div key={index}>
                    {msg.type === 'system' ? (
                      <div className="text-center">
                        <div className="inline-block bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 dark:from-primary/20 dark:via-primary/30 dark:to-primary/20 border border-primary/30 dark:border-primary/40 px-4 py-2 rounded-2xl text-sm text-primary dark:text-primary/90 font-medium">
                          {msg.message}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-xs lg:max-w-md">
                          {msg.type === 'ai' && (
                            <div className="flex items-center space-x-2 mb-2">
                              <div className="w-6 h-6 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-full flex items-center justify-center border border-primary/30 dark:border-primary/40">
                                <span className="text-xs text-primary font-medium">{msg.avatar}</span>
                              </div>
                              <span className="text-xs text-primary/70 dark:text-primary/60 font-medium">{msg.persona}</span>
                            </div>
                          )}
                          <div
                            className={`px-4 py-3 rounded-2xl shadow-sm ${
                              msg.type === 'user'
                                ? 'bg-gradient-to-r from-primary to-primary/90 text-white shadow-lg'
                                : msg.persona === 'System'
                                ? 'bg-gradient-to-r from-primary/10 via-primary/20 to-primary/10 dark:from-primary/30 dark:via-primary/20 dark:to-primary/30 text-primary dark:text-primary border border-primary/20 dark:border-primary/30'
                                : 'bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {conversation.length === 0 && !isLoadingScenario && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/10 via-primary/20 to-primary/10 dark:from-primary/20 dark:via-primary/30 dark:to-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20 dark:border-primary/30">
                      <MessageSquare className="h-8 w-8 text-primary/60" />
                    </div>
                    <p className="text-lg font-medium text-primary/80 dark:text-primary/70">Start the conversation by typing a message below</p>
                  </div>
                )}
              </div>
              )}
            </CardContent>
          </Card>

          {/* Recording Status */}
          {(isRecording || isEvaluating) && (
            <Card className="mb-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-center space-x-3">
                  {isRecording ? (
                    <>
                      <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg"></div>
                      <span className="text-primary dark:text-primary/90 font-medium">Recording in progress...</span>
                      <span className="text-primary/70 dark:text-primary/60 text-sm">({recordingDuration}s)</span>
                    </>
                  ) : (
                    <>
                      <div className="w-4 h-4 bg-primary rounded-full animate-pulse shadow-lg"></div>
                      <span className="text-primary dark:text-primary/90 font-medium">Evaluating your response...</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Input Area */}
          <Card className="bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="text-center p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-md border border-primary/30 dark:border-primary/40">
                    <Mic className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-primary dark:text-primary/90 font-medium text-lg mb-2">
                    🎤 Click the microphone button to record your voice response
                  </p>
                  <p className="text-sm text-primary/70 dark:text-primary/60 mb-1">
                    Text input is disabled for this audio-only practice
                  </p>
                  {isRecording && recordingDuration < 2 && (
                    <p className="text-sm text-orange-600 dark:text-orange-400 animate-pulse font-medium">
                      ⏱️ Please record for at least 2 seconds before stopping
                    </p>
                  )}
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleSendMessage}
                    className="flex-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl border-0"
                    disabled={true}
                  >
                    Send Response
                  </Button>
                  
                  <Button
                    onClick={handleMicrophoneClick}
                    disabled={isEvaluating || isLoadingScenario}
                    className={`${
                      isRecording 
                        ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                        : isEvaluating
                        ? 'bg-primary hover:bg-primary cursor-not-allowed'
                        : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                    } text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl border-0`}
                    size="icon"
                    title={
                      isRecording 
                        ? `Recording ${recordingDuration}s - Click to stop (min 2s)` 
                        : isEvaluating 
                        ? 'Evaluating audio...' 
                        : 'Click to start recording'
                    }
                  >
                    {isEvaluating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : isRecording ? (
                      <MicOff className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Feedback Section */}
          {feedback && (
            <Card className="mb-4 bg-gradient-to-r from-green-50 to-primary/5 dark:from-green-900/20 dark:to-primary/10 border-green-200 dark:border-green-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Volume2 className="h-5 w-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    Your Response Feedback
                  </h3>
                </div>
                
                {/* Overall Score */}
                <div className="mb-4 p-4 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-md border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Score</span>
                    <span className={`text-lg font-bold ${feedback.overall_score === 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {feedback.overall_score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${feedback.overall_score === 0 ? 'bg-red-600' : 'bg-green-600'}`}
                      style={{ width: `${feedback.overall_score}%` }}
                    ></div>
                  </div>
                </div>

                {/* Feedback */}
                {feedback.feedback && feedback.feedback !== 'No feedback available' && (
                  <div className="mb-4 p-4 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-md border">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      📝 Detailed Feedback
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {feedback.feedback}
                    </p>
                  </div>
                )}

                {/* Suggested Improvement */}
                {feedback.suggested_improvement && (
                  <div className="w-full p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md mb-4">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200 block mb-2">
                      💡 Suggested Improvement:
                    </span>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      {feedback.suggested_improvement}
                    </p>
                  </div>
                )}

                {/* Strengths and Areas to Improve */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {feedback.strengths && feedback.strengths.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
                        ✅ Strengths
                      </h4>
                      <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                        {feedback.strengths.map((strength, index) => (
                          <li key={index}>• {strength}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {feedback.areas_to_improve && feedback.areas_to_improve.length > 0 && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                      <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">
                        🎯 Areas to Improve
                      </h4>
                      <ul className="text-sm text-orange-700 dark:text-orange-300 space-y-1">
                        {feedback.areas_to_improve.map((area, index) => (
                          <li key={index}>• {area}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completion Dialog */}
          <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
            <DialogContent className="sm:max-w-lg p-0 bg-gradient-to-br from-white/98 via-white/95 to-[#8DC63F]/5 dark:from-gray-900/98 dark:via-gray-900/95 dark:to-[#8DC63F]/10 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-xl">
              <DialogHeader className="px-6 py-5 border-b border-gray-200/40 dark:border-gray-700/40 bg-gradient-to-r from-transparent via-[#8DC63F]/5 to-transparent dark:via-[#8DC63F]/10">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#8DC63F]/20 to-[#8DC63F]/30 dark:from-[#8DC63F]/20 dark:to-[#8DC63F]/30 rounded-3xl flex items-center justify-center shadow-sm border border-[#8DC63F]/30 dark:border-[#8DC63F]/40 mb-4">
                    <Trophy className="h-8 w-8 text-[#8DC63F] dark:text-[#8DC63F]" />
                  </div>
                </div>
                <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-gray-900 to-[#8DC63F] dark:from-gray-100 dark:to-[#8DC63F] bg-clip-text text-transparent">
                  Congratulations!
                </DialogTitle>
              </DialogHeader>
              <div className="p-6">
                <div className="text-center space-y-4">
                  <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
                    🎉 You've completed the group dialogue scenario!
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Excellent work on practicing your group conversation skills. You can try another scenario or redo this one for more practice.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 mt-6">
                    <Button
                      onClick={handleRedo}
                      variant="outline"
                      className="flex-1 h-12 px-6 bg-[#8DC63F]/10 hover:bg-[#8DC63F]/20 dark:bg-[#8DC63F]/20 dark:hover:bg-[#8DC63F]/30 text-[#8DC63F] dark:text-[#8DC63F] border border-[#8DC63F]/30 dark:border-[#8DC63F]/40 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Try Another Scenario
                    </Button>
                    <Button
                      onClick={() => navigate('/dashboard/practice/stage-3')}
                      className="flex-1 h-12 px-6 bg-gradient-to-r from-[#8DC63F] to-[#8DC63F]/90 hover:from-[#8DC63F]/90 hover:to-[#8DC63F] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-xl"
                    >
                      Continue Learning
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <PracticeBreadcrumb />
        </div>
        
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard/practice/stage-3')}
            className="shrink-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center flex-1 px-12 sm:px-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg border border-primary/30 dark:border-primary/40">
              <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent mb-1 sm:mb-2">Group Dialogue</h1>
            <p className="text-base sm:text-lg text-muted-foreground">Master Interactive Group Conversations</p>
          </div>
          
          <div className="hidden sm:block w-10"></div>
        </div>

        {/* Instructions */}
        <Card className="mb-6 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:from-primary/10 dark:via-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-2xl shadow-lg">
          <CardContent className="p-4 sm:p-6">
            <div className="text-center">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/20 via-primary/30 to-primary/40 dark:from-primary/30 dark:via-primary/40 dark:to-primary/50 rounded-xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shadow-md border border-primary/30 dark:border-primary/40">
                <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              </div>
              <p className="text-primary dark:text-primary/90 font-medium text-base sm:text-lg">
                Practice group conversations with AI personas in real-world scenarios
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card className="mb-6 bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground text-lg">Loading scenarios...</p>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {error && scenarios.length === 0 && !isLoading && (
          <Card className="mb-6 bg-gradient-to-r from-red-50 via-red-100 to-red-50 dark:from-red-900/20 dark:via-red-800/20 dark:to-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-red-800 dark:text-red-200 mb-4 text-lg">
                Unable to load scenarios: {error}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 rounded-2xl"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error banner if API failed but fallbacks loaded */}
        {error && scenarios.length > 0 && (
          <Card className="mb-4 bg-gradient-to-r from-yellow-50 via-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:via-yellow-800/20 dark:to-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-2xl shadow-lg">
            <CardContent className="p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                ⚠️ Using offline content. Some features may be limited.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Scenario Selection */}
        {!isLoading && scenarios.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 text-center bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent">Choose a Scenario</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {scenarios.map((scenario, index) => {
              const scenarioNumber = index + 1;
              const isCompleted = completedScenarios.has(scenarioNumber);
              
              return (
              <Card
                key={scenario.id}
                className={`cursor-pointer bg-gradient-to-br from-card to-card/50 dark:bg-card backdrop-blur-sm border rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group relative ${
                  isCompleted 
                    ? 'border-primary/50 dark:border-primary/50' 
                    : 'border-gray-200/60 dark:border-gray-700/60'
                }`}
                onClick={() => handleScenarioSelect(scenario.id)}
              >
                {isCompleted && (
                  <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-md z-10">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                )}
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 ${getScenarioColor(scenario)} rounded-2xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}>
                      {React.createElement(getScenarioIcon(scenario), { className: "h-5 w-5 sm:h-6 sm:w-6 text-white" })}
                    </div>
                    <div className="flex items-center space-x-1">
                      {scenario.participants.map((participant, pIndex) => (
                        <div key={pIndex} className="w-5 h-5 sm:w-6 sm:h-6 bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center border border-primary/30 dark:border-primary/40">
                          <span className="text-xs text-primary font-medium">
                            {participant === 'You' ? 'Y' : participant[0]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-semibold text-base sm:text-lg mb-2 text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors duration-300">{scenario.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{scenario.description}</p>
                </CardContent>
              </Card>
              );
            })}
          </div>
        </div>
        )}


      </div>
    </div>
  );
}