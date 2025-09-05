import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, User, Play, Mic, Ear, AlertCircle, RefreshCw, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContentLoader } from '@/components/ContentLoader';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { initializeUserProgress, getCurrentTopicProgress, updateCurrentProgress } from '@/utils/progressTracker';
import { getAuthHeadersWithAccept, getAuthHeaders } from '@/utils/authUtils';

// Types
interface Dialogue {
  id: string;
  question: string;
  urdu_text?: string;
  expected_keywords?: string[];
  suggested_response?: string;
  hint?: string;
  speaker?: string;
  type?: string;
  difficulty_level?: string;
  created_at?: string;
}

interface EvaluationFeedback {
  score?: number;
  feedback?: string;
  accuracy?: number;
  pronunciation?: string;
  suggestions?: string[];
  message?: string;
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
  completion_date: string | null;
}

interface EvaluationResponse {
  success: boolean;
  expected_phrase: string;
  user_text: string;
  evaluation: {
    feedback: string;
    score: number;
    is_correct: boolean;
    urdu_used: boolean;
    completed: boolean;
  };
  progress_recorded: boolean;
  unlocked_content: string[];
  exercise_completion: ExerciseCompletion;
}

// API Functions
const fetchDialogues = async (): Promise<Dialogue[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.DIALOGUES}`, {
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
    let dialogues: any[] = [];

    if (Array.isArray(result)) {
      dialogues = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      dialogues = result.data;
    } else if (result && typeof result === 'object' && result.dialogues && Array.isArray(result.dialogues)) {
      dialogues = result.dialogues;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        dialogues = result[arrayProperties[0]];
      } else {
        throw new Error('No dialogue array found in response');
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Normalize dialogues to our expected format
    const normalizedDialogues: Dialogue[] = dialogues.map((item: any, index: number) => {
      let dialogue: Dialogue;
      
      if (typeof item === 'string') {
        dialogue = {
          id: String(index + 1),
          question: item,
        };
      } else if (item && typeof item === 'object') {
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

        dialogue = {
          id: item.id ? String(item.id) : String(index + 1),
          question: getStringValue(item, 'ai_prompt', 'question', 'dialogue', 'text', 'query', 'audioText') || String(item),
          urdu_text: getStringValue(item, 'urdu_text', 'ai_prompt_urdu', 'urdu', 'urdu_translation', 'translation', 'urdu_sentence'),
          expected_keywords: getArrayValue(item, 'expected_keywords', 'expected_keywords_urdu', 'keywords', 'expected', 'key_words'),
          suggested_response: getStringValue(item, 'suggested_response', 'response', 'answer', 'suggestedResponse'),
          hint: getStringValue(item, 'hint', 'tip', 'help', 'guidance'),
          speaker: getStringValue(item, 'speaker', 'author') || 'Sarah',
          type: getStringValue(item, 'type', 'category'),
          difficulty_level: getStringValue(item, 'difficulty_level', 'difficulty', 'level'),
          created_at: getStringValue(item, 'created_at', 'createdAt', 'timestamp'),
        };
      } else {
        dialogue = {
          id: String(index + 1),
          question: String(item),
        };
      }

      if (!dialogue.question || dialogue.question.trim() === '' || dialogue.question === '[object Object]') {
        return null;
      }

      return dialogue;
    }).filter((dialogue): dialogue is Dialogue => dialogue !== null);

    if (normalizedDialogues.length === 0) {
      throw new Error('No valid dialogues found in API response');
    }

    return normalizedDialogues;

  } catch (error) {
    console.error('Error fetching dialogues:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const ListenAndReply: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [progressInitialized, setProgressInitialized] = useState(false);
  const [resumeDataLoaded, setResumeDataLoaded] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const currentDialogue = dialogues[currentDialogueIndex];

  // Fetch audio for a dialogue
  const fetchAudio = async (dialogueId: string): Promise<string> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.LISTEN_AND_REPLY_AUDIO(dialogueId)}`, {
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
      console.error('Error fetching audio:', error);
      throw error;
    }
  };

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
      audio.onloadstart = null;
      audio.onloadeddata = null;
      
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
      
      setTimeout(() => {
        if (audio.readyState < 3) {
          cleanup();
          reject(new Error('Audio loading timeout'));
        }
      }, 10000);
    });
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64Data = reader.result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Start audio recording
  const startRecording = async (): Promise<void> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 44100,
          channelCount: 1
        } 
      });
      
      audioChunksRef.current = [];
      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.start();
      setRecordingStartTime(Date.now());
      
    } catch (error) {
      throw new Error('Failed to start recording. Please check microphone permissions.');
    }
  };

  // Stop recording and get audio blob
  const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No media recorder available'));
        return;
      }
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(audioBlob);
      };
      
      mediaRecorderRef.current.stop();
    });
  };

  // Evaluate recorded audio
  const evaluateAudio = async (audioBase64: string, timeSpentSeconds: number): Promise<{feedback: EvaluationFeedback, evaluationResponse: EvaluationResponse | null}> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_LISTEN_REPLY}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          audio_base64: audioBase64,
          dialogue_id: Number(currentDialogue.id),
          filename: `listen_reply_${currentDialogue.id}_${Date.now()}.webm`,
          user_id: user?.id || 'anonymous',
          time_spent_seconds: timeSpentSeconds,
          urdu_used: !!currentDialogue.urdu_text
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json();
      
      // Handle API error responses (like no_speech_detected)
      if (result.success === false || result.error) {
        const errorMessage = result.message || result.error || 'Speech evaluation failed';
        
        // Create feedback object for error cases
        const feedback: EvaluationFeedback = {
          score: 0,
          feedback: errorMessage,
          suggestions: result.expected_keywords ? 
            [`Try using keywords: ${result.expected_keywords.join(', ')}`, 'Please speak more clearly and try again', 'Make sure you are in a quiet environment'] : 
            ['Please speak more clearly and try again', 'Make sure you are in a quiet environment', 'Speak directly into the microphone']
        };
        
        return { feedback, evaluationResponse: result };
      }
      
      // Handle successful evaluation responses
      const evaluation = result.evaluation || result;
      
      const feedback: EvaluationFeedback = {
        score: evaluation.score,
        feedback: evaluation.feedback,
        accuracy: evaluation.accuracy || evaluation.score,
        pronunciation: evaluation.pronunciation,
        suggestions: evaluation.suggestions,
        message: evaluation.message || evaluation.feedback
      };
      
      return { feedback, evaluationResponse: result as EvaluationResponse };
    } catch (error) {
      console.error('Error evaluating audio:', error);
      throw error;
    }
  };

  // Process recorded audio for evaluation
  const processRecordedAudio = async () => {
    if (!recordingStartTime) return;
    
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    
    setIsRecording(false);
    setIsEvaluating(true);
    
    try {
      const audioBlob = await stopRecording();
      const audioBase64 = await blobToBase64(audioBlob);
      const timeSpentSeconds = Math.round((Date.now() - recordingStartTime) / 1000);
      
      const { feedback, evaluationResponse } = await evaluateAudio(audioBase64, timeSpentSeconds);
      setFeedback(feedback);
      
      // Check if exercise is completed based on evaluation response
      if (evaluationResponse && evaluationResponse.exercise_completion && evaluationResponse.exercise_completion.exercise_completed) {
        console.log('Exercise completed based on evaluation response:', evaluationResponse.exercise_completion);
        setIsCompleted(true);
        setShowCompletionDialog(true);
        markExerciseCompleted();
      } else {
        // Save progress after successful evaluation
        saveProgress(currentDialogueIndex);
      }
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to process recording');
    } finally {
      setIsEvaluating(false);
      setRecordingStartTime(null);
    }
  };

  // Initialize progress and fetch dialogues on component mount with resume functionality
  useEffect(() => {
    const initializeAndLoadDialogues = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First, load practice dialogues
        const fetchedDialogues = await fetchDialogues();
        setDialogues(fetchedDialogues);

        // If user is authenticated, handle progress and resume
        if (user?.id && !resumeDataLoaded) {
          console.log('Loading user progress for Stage 1 ListenAndReply practice...');
          
          // Try to get current progress to resume from where user left off
          const currentProgress = await getCurrentTopicProgress(user.id, 1, 3); // Stage 1, Exercise 3
          
          if (currentProgress.success && currentProgress.data && currentProgress.data.success) {
            const { current_topic_id } = currentProgress.data;
            
            if (current_topic_id !== undefined && current_topic_id > 0) {
              // Convert topic ID to dialogue index (topic ID is 1-based, array index is 0-based)
              const resumeIndex = Math.min(Math.max(0, current_topic_id - 1), fetchedDialogues.length - 1);
              console.log(`Resuming Stage 1 ListenAndReply from topic ${current_topic_id} (dialogue ${resumeIndex + 1})`);
              setCurrentDialogueIndex(resumeIndex);
            } else {
              console.log('No resume data for Stage 1 ListenAndReply, starting from beginning');
              setCurrentDialogueIndex(0);
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
            setCurrentDialogueIndex(0);
          }
          
          setResumeDataLoaded(true);
        } else if (!user?.id) {
          // No user, start from beginning
          setCurrentDialogueIndex(0);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load dialogues from API');
      } finally {
        setLoading(false);
      }
    };

    if (!resumeDataLoaded || !user?.id) {
      initializeAndLoadDialogues();
    }
  }, [user?.id, resumeDataLoaded, progressInitialized]);

  // Save current progress to API
  const saveProgress = async (dialogueIndex: number) => {
    if (user?.id && dialogues.length > 0) {
      try {
        await updateCurrentProgress(
          user.id,
          1, // Stage 1
          3  // Exercise 3 (ListenAndReply)
        );
        console.log(`Progress saved: Stage 1, Exercise 3, Dialogue ${dialogueIndex + 1}/${dialogues.length}`);
      } catch (error) {
        console.warn('Failed to save progress:', error);
        // Don't show error to user, just log it
      }
    }
  };

  // Mark exercise as completed
  const markExerciseCompleted = async () => {
    if (user?.id) {
      try {
        // Update progress to mark as completed
        await updateCurrentProgress(
          user.id,
          1, // Stage 1
          3  // Exercise 3 (ListenAndReply)
        );
        console.log('Exercise marked as completed: Stage 1, Exercise 3 (ListenAndReply)');
      } catch (error) {
        console.warn('Failed to mark exercise as completed:', error);
      }
    }
  };

  // Restart the exercise (redo functionality)
  const handleRedo = () => {
    setCurrentDialogueIndex(0);
    setFeedback(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    // Save progress for restart
    if (user?.id) {
      saveProgress(0);
    }
  };

  const handlePlayAudio = async () => {
    if (!currentDialogue) return;

    setIsLoadingAudio(true);
    
    try {
      const audioUrl = await fetchAudio(currentDialogue.id);
      await playAudio(audioUrl);
    } catch (error: any) {
      console.error('Audio playback failed:', error.message);
      // Silent fail for better user experience
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleNext = () => {
    const newIndex = Math.min(dialogues.length - 1, currentDialogueIndex + 1);
    setCurrentDialogueIndex(newIndex);
    setFeedback(null); // Clear feedback when navigating
    saveProgress(newIndex); // Save progress when navigating
  };

  const handlePrevious = () => {
    let newIndex;
    if (currentDialogueIndex > 0) {
      newIndex = currentDialogueIndex - 1;
    } else {
      newIndex = dialogues.length - 1;
    }
    setCurrentDialogueIndex(newIndex);
    setFeedback(null); // Clear feedback when navigating
    saveProgress(newIndex); // Save progress when navigating
  };

  const handleStartRecording = async () => {
    if (!currentDialogue) return;
    
    setFeedback(null);
    setIsRecording(true);
    
    try {
      await startRecording();
      
      // Auto-stop recording after 10 seconds for listen and reply
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          processRecordedAudio().catch(error => {
            console.error('Auto-stop processing error:', error);
            setError('Failed to process recording');
            setIsRecording(false);
            setIsEvaluating(false);
          });
        }
      }, 10000);
      
    } catch (error: any) {
      setIsRecording(false);
      setError(error.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    
    await processRecordedAudio();
  };

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
      
      // Stop audio playback if active
      cleanupCurrentAudio();
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    const loadDialogues = async () => {
      try {
        const fetchedDialogues = await fetchDialogues();
        setDialogues(fetchedDialogues);
      } catch (err: any) {
        setError(err.message || 'Failed to load dialogues from API');
      } finally {
        setLoading(false);
      }
    };

    loadDialogues();
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative flex items-center justify-center mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8">
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute left-4 sm:left-6 lg:left-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center px-12 sm:px-0">
            <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 rounded-2xl mb-3 sm:mb-4 shadow-lg border border-primary/20">
              <Ear className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
              Listen and Reply
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice Conversation Skills</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <ContentLoader message="Loading dialogues..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative flex items-center justify-center mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8">
          <Button 
            variant="outline" 
            size="icon" 
            className="absolute left-4 sm:left-6 lg:left-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center px-12 sm:px-0">
            <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 rounded-2xl mb-3 sm:mb-4 shadow-lg border border-primary/20">
              <Ear className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
              Listen and Reply
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice Conversation Skills</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 rounded-2xl">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="mb-4 text-red-800 dark:text-red-200">
                  <strong>Failed to load dialogues:</strong><br />
                  {error}
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRetry}
                className="w-full mt-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-2xl h-12"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentDialogue) {
    return null;
  }

  // Helper function to safely display values
  const safeDisplay = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="p-4 sm:p-6 lg:p-8 pb-0">
        <PracticeBreadcrumb />
      </div>
      
      {/* Header */}
      <div className="relative flex items-center justify-center mb-6 sm:mb-8 p-4 sm:p-6 lg:p-8">
        <Button 
          variant="outline" 
          size="icon" 
          className="absolute left-4 sm:left-6 lg:left-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-center px-12 sm:px-0">
          <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 rounded-2xl mb-3 sm:mb-4 shadow-lg border border-primary/20">
            <Ear className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
            Listen and Reply
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice Conversation Skills</p>
          <p className="text-sm sm:text-base text-muted-foreground mt-2 font-medium">
            Topic: {currentDialogueIndex + 1} of {dialogues.length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4">
        <Card className="max-w-md mx-auto bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8 text-center">
            {/* Question */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-900 dark:text-gray-100 leading-tight">
              {safeDisplay(currentDialogue.question, 'No question available')}
            </h2>
            
            {/* Urdu Text */}
            {currentDialogue.urdu_text && (
              <p className="text-xl sm:text-2xl text-muted-foreground mb-6 sm:mb-8 leading-relaxed" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                {safeDisplay(currentDialogue.urdu_text)}
              </p>
            )}

            {/* Expected Keywords */}
            {currentDialogue.expected_keywords && currentDialogue.expected_keywords.length > 0 && (
              <div className="bg-gradient-to-br from-primary/10 via-primary/20 to-primary/30 border border-primary/30 dark:border-primary/20 rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-lg">
                <p className="text-sm sm:text-base font-semibold text-primary dark:text-primary/80 mb-2 sm:mb-3">
                  Expected Keywords:
                </p>
                <p className="text-primary dark:text-primary/90 font-medium text-base sm:text-lg leading-relaxed">
                  {currentDialogue.expected_keywords.map(keyword => safeDisplay(keyword)).join(', ')}
                </p>
              </div>
            )}
            
            {/* Play Button */}
            <Button
              onClick={handlePlayAudio}
              disabled={isLoadingAudio}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full text-white shadow-2xl mb-6 sm:mb-8 transition-all duration-300 ${
                isLoadingAudio 
                  ? 'bg-gray-500 cursor-not-allowed border-2 border-gray-400' 
                  : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary hover:scale-105 hover:shadow-3xl'
              }`}
              size="icon"
            >
              {isLoadingAudio ? (
                <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-8 h-8 sm:w-10 sm:h-10" />
              )}
            </Button>
            
            {/* Instruction */}
            <p className="text-muted-foreground text-sm sm:text-base font-medium leading-relaxed">
              Listen to the dialogue and respond naturally
            </p>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        {dialogues.length > 1 && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 max-w-md mx-auto">
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex-1 px-8 py-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-300 hover:-translate-y-0.5 border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg backdrop-blur-sm font-medium w-full sm:w-auto"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              disabled={currentDialogueIndex === dialogues.length - 1}
              variant="outline"
              className="flex-1 px-8 py-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-300 hover:-translate-y-0.5 border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg backdrop-blur-sm font-medium w-full sm:w-auto"
            >
              Next
            </Button>
          </div>
        )}

        {/* Feedback Display */}
        {feedback && (
          <Card className="w-full max-w-md mt-8 mx-auto bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl backdrop-blur-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="text-center">
                {feedback.score !== undefined && feedback.score > 0 ? (
                  <div className="flex items-center justify-center mb-6">
                    {feedback.score >= 80 ? (
                      <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-2xl mr-4 shadow-lg">
                        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                      </div>
                    ) : feedback.score >= 60 ? (
                      <div className="p-3 bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-2xl mr-4 shadow-lg">
                        <AlertCircle className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    ) : (
                      <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl mr-4 shadow-lg">
                        <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                      </div>
                    )}
                    <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(feedback.score)}%
                    </span>
                  </div>
                ) : feedback.score === 0 && (
                  <div className="flex items-center justify-center mb-6">
                    <div className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl mr-4 shadow-lg">
                      <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                    </div>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                      Speech Not Detected
                    </span>
                  </div>
                )}
                
                {feedback.feedback && (
                  <p className="text-muted-foreground mb-6 text-base sm:text-lg leading-relaxed">
                    {safeDisplay(feedback.feedback)}
                  </p>
                )}
                
                {feedback.suggestions && feedback.suggestions.length > 0 && (
                  <div className="text-left">
                    <h4 className="font-semibold mb-3 text-base sm:text-lg text-gray-900 dark:text-gray-100">Suggestions:</h4>
                    <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-2">
                      {feedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="leading-relaxed">{safeDisplay(suggestion)}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Speak Button */}
      <div className="p-4 bg-transparent">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handleStartRecording}
            disabled={isRecording || isEvaluating}
            className={`w-full h-16 text-xl font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 ${
              isRecording 
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                : isEvaluating
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
            } text-white hover:-translate-y-0.5 border-0`}
          >
            <Mic className="w-7 h-7 mr-3" />
            {isRecording ? 'Recording...' : isEvaluating ? 'Evaluating...' : 'Speak Now'}
          </Button>

          {/* Stop Recording Button */}
          {isRecording && (
            <Button 
              onClick={handleStopRecording}
              className="w-full mt-4 h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0"
            >
              Stop Recording
            </Button>
          )}
        </div>
      </div>

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
                🎉 You've completed all {dialogues.length} dialogues!
              </p>
              <p className="text-sm text-muted-foreground">
                Great job on your listen and reply practice. You can redo the exercise to practice more or continue to other exercises.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={handleRedo}
                  variant="outline"
                  className="flex-1 h-12 px-6 bg-[#8DC63F]/10 hover:bg-[#8DC63F]/20 dark:bg-[#8DC63F]/20 dark:hover:bg-[#8DC63F]/30 text-[#8DC63F] dark:text-[#8DC63F] border border-[#8DC63F]/30 dark:border-[#8DC63F]/40 rounded-xl transition-all duration-300 shadow-sm hover:shadow-md font-medium"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Redo Exercise
                </Button>
                
                <Button
                  onClick={() => navigate('/dashboard/practice')}
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
  );
}; 