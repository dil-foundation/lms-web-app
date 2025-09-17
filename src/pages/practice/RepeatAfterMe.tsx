import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Play, Pause, Mic, AlertCircle, RefreshCw, CheckCircle, XCircle, Trophy, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ContentLoader } from '@/components/ContentLoader';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { initializeUserProgress, getCurrentTopicProgress, updateCurrentProgress } from '@/utils/progressTracker';
import { getAuthHeadersWithAccept, getAuthHeaders } from '@/utils/authUtils';
import AccessLogService from '@/services/accessLogService';

// Types
interface Phrase {
  id: string;
  text: string;
  urdu_text?: string;
  audio_url?: string;
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
const fetchPhrases = async (): Promise<Phrase[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.PHRASES}`, {
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
    
    // Try to parse JSON
    let result: any;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }

    // Handle different possible response formats
    let phrases: any[] = [];

    // Format 1: Direct array of phrases
    if (Array.isArray(result)) {
      phrases = result;
    }
    // Format 2: Object with data property
    else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      phrases = result.data;
    }
    // Format 3: Object with phrases property
    else if (result && typeof result === 'object' && result.phrases && Array.isArray(result.phrases)) {
      phrases = result.phrases;
    }
    // Format 4: Check if it has success property but still contains data
    else if (result && typeof result === 'object') {
      // Look for any array property that could be phrases
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      
      if (arrayProperties.length > 0) {
        phrases = result[arrayProperties[0]];
      } else {
        throw new Error('No phrase array found in response');
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Normalize phrases to our expected format
    const normalizedPhrases: Phrase[] = phrases.map((item: any, index: number) => {
      // Handle different phrase object formats
      let phrase: Phrase;
      
      if (typeof item === 'string') {
        // If item is just a string
        phrase = {
          id: String(index + 1),
          text: item,
        };
      } else if (item && typeof item === 'object') {
        // If item is an object
        phrase = {
          id: item.id ? String(item.id) : String(index + 1),
          text: item.text || item.phrase || item.content || item.sentence || String(item),
          urdu_text: item.urdu_text || item.urdu || item.urdu_translation || item.translation || item.urdu_sentence || item.meaning || item.urdu_meaning,
          audio_url: item.audio_url || item.audioUrl || item.audio,
          difficulty_level: item.difficulty_level || item.level || item.difficulty,
          created_at: item.created_at || item.createdAt || item.timestamp,
        };
      } else {
        // Fallback for any other format
        phrase = {
          id: String(index + 1),
          text: String(item),
        };
      }

      // Validate that we have required text
      if (!phrase.text || phrase.text.trim() === '') {
        return null;
      }

      return phrase;
    }).filter((phrase): phrase is Phrase => phrase !== null);

    if (normalizedPhrases.length === 0) {
      throw new Error('No valid phrases found in API response');
    }

    return normalizedPhrases;

  } catch (error) {
    console.error('Error fetching phrases:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const RepeatAfterMe: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phrases, setPhrases] = useState<Phrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
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
  
  const currentPhrase = phrases[currentPhraseIndex];

  // Fetch audio for a phrase
  const fetchAudio = async (phraseId: string): Promise<string> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.REPEAT_AFTER_ME_AUDIO(phraseId)}`, {
        method: 'POST',
        headers: getAuthHeadersWithAccept(),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const responseText = await response.text();
      
      // Try to parse JSON
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error('Invalid JSON response from server');
      }

      // Handle different possible response formats
      let audioUrl: string | null = null;
      
      if (typeof result === 'string') {
        // Direct audio URL string
        audioUrl = result;
      } else if (result && typeof result === 'object') {
        // Check for base64 audio data first
        if (result.audio_base64) {
          // Convert base64 to blob URL
          try {
            // Remove data URL prefix if present
            const base64Data = result.audio_base64.replace(/^data:audio\/[^;]+;base64,/, '');
            
            // Convert base64 to binary
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            // Create blob and URL
            const audioBlob = new Blob([bytes], { type: 'audio/mpeg' });
            audioUrl = URL.createObjectURL(audioBlob);
          } catch (base64Error) {
            throw new Error('Failed to process base64 audio data');
          }
        } else {
          // Check for regular audio URL properties
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
      audio.onplay = null;
      audio.onpause = null;
      
      audioRef.current = null;
    }
    setIsPlayingAudio(false);
  };

  // Play audio from URL
  const playAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Stop and cleanup any currently playing audio
      cleanupCurrentAudio();
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      const cleanup = () => {
        // Clean up blob URL if it was created from base64
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
            setIsPlayingAudio(true);
          })
          .catch((playError) => {
            handleError('Failed to start audio playback');
          });
      };
      
      audio.onplay = () => {
        setIsPlayingAudio(true);
      };
      
      audio.onpause = () => {
        setIsPlayingAudio(false);
      };
      
      audio.onerror = () => {
        handleError('Failed to load audio file');
      };
      
      audio.onended = () => {
        setIsPlayingAudio(false);
        handleSuccess();
      };
      
      // Set a timeout for loading
      setTimeout(() => {
        if (audio.readyState < 3) { // HAVE_FUTURE_DATA
          cleanup();
          reject(new Error('Audio loading timeout'));
        }
      }, 10000); // 10 second timeout
    });
  };

  // Convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix to get just the base64 data
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
      console.log('Starting recording...');
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
      
      console.log('MediaRecorder created, state:', mediaRecorderRef.current.state);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        console.log('Data available, size:', event.data.size);
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstart = () => {
        console.log('MediaRecorder started');
      };
      
      mediaRecorderRef.current.start();
      setRecordingStartTime(Date.now());
      console.log('Recording started, state:', mediaRecorderRef.current.state);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
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
        console.log('MediaRecorder stopped');
        
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        console.log('Audio blob created, size:', audioBlob.size);
        
        // Stop all audio tracks
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        
        resolve(audioBlob);
      };
      
      console.log('Stopping MediaRecorder...');
      mediaRecorderRef.current.stop();
    });
  };

  // Process recorded audio for evaluation
  const processRecordedAudio = async () => {
    if (!recordingStartTime) return;
    
    // Clear the timeout
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
      
      console.log('Processing audio for evaluation...', { timeSpentSeconds, blobSize: audioBlob.size });
      const { feedback, evaluationResponse } = await evaluateAudio(audioBase64, timeSpentSeconds);
      setFeedback(feedback);
      
      // Check if exercise is completed based on evaluation response
      if (evaluationResponse.exercise_completion && evaluationResponse.exercise_completion.exercise_completed) {
        console.log('Exercise completed based on evaluation response:', evaluationResponse.exercise_completion);
        setIsCompleted(true);
        setShowCompletionDialog(true);
        markExerciseCompleted();
        
        // Log practice session completion
        if (user?.id) {
          await AccessLogService.logPracticeSession(
            user.id,
            user.email || 'unknown@email.com',
            1, // Stage 1
            1, // Exercise 1 (RepeatAfterMe)
            'Repeat After Me',
            feedback.score,
            'completed'
          );
        }
      } else {
        // Save progress after successful evaluation
        saveProgress(currentPhraseIndex);
      }
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to process recording');
      
      // Log practice session failure
      if (user?.id) {
        await AccessLogService.logPracticeSession(
          user.id,
          user.email || 'unknown@email.com',
          1, // Stage 1
          1, // Exercise 1 (RepeatAfterMe)
          'Repeat After Me',
          undefined,
          'failed'
        );
      }
    } finally {
      setIsEvaluating(false);
      setRecordingStartTime(null);
    }
  };

  // Evaluate recorded audio
  const evaluateAudio = async (audioBase64: string, timeSpentSeconds: number): Promise<{feedback: EvaluationFeedback, evaluationResponse: EvaluationResponse}> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_AUDIO}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({
          audio_base64: audioBase64,
          phrase_id: currentPhrase.id,
          filename: `recording_${currentPhrase.id}_${Date.now()}.webm`,
          user_id: user?.id || 'anonymous',
          time_spent_seconds: timeSpentSeconds,
          urdu_used: !!currentPhrase.urdu_text
        }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response text');
        throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
      }

      const result = await response.json() as any;
      
      // Handle API error responses (like no_speech_detected)
      if (result.success === false || result.error) {
        const errorMessage = result.message || result.error || 'Speech evaluation failed';
        
        // Create feedback object for error cases
        const feedback: EvaluationFeedback = {
          score: 0,
          feedback: errorMessage,
          suggestions: ['Please speak more clearly and try again', 'Make sure you are in a quiet environment', 'Speak directly into the microphone']
        };
        
        return { feedback, evaluationResponse: result };
      }
      
      // Handle the actual API response structure with nested evaluation object
      const evaluation = (result.evaluation || result) as any;
      
      const feedback: EvaluationFeedback = {
        score: evaluation.score,
        feedback: evaluation.feedback,
        accuracy: evaluation.accuracy || evaluation.score,
        pronunciation: evaluation.pronunciation,
        suggestions: evaluation.suggestions,
        message: evaluation.message || evaluation.feedback
      };
      
      return { feedback, evaluationResponse: result };
    } catch (error) {
      console.error('Error evaluating audio:', error);
      throw error;
    }
  };

  // Initialize progress and fetch phrases on component mount with resume functionality
  useEffect(() => {
    const initializeAndLoadPhrases = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First, load practice phrases
        const fetchedPhrases = await fetchPhrases();
        setPhrases(fetchedPhrases);

        // If user is authenticated, handle progress and resume
        if (user?.id && !resumeDataLoaded) {
          console.log('Loading user progress for Stage 1 practice...');
          
          // Log practice session start
          await AccessLogService.logPracticeSession(
            user.id,
            user.email || 'unknown@email.com',
            1, // Stage 1
            1, // Exercise 1 (RepeatAfterMe)
            'Repeat After Me',
            undefined,
            'started'
          );
          
          // Try to get current progress to resume from where user left off
          const currentProgress = await getCurrentTopicProgress(user.id, 1, 1); // Stage 1, Exercise 1
          
          if (currentProgress.success && currentProgress.data && currentProgress.data.success) {
            const { current_topic_id } = currentProgress.data;
            
            if (current_topic_id !== undefined && current_topic_id > 0) {
              // Convert topic ID to phrase index (topic ID is 1-based, array index is 0-based)
              const resumeIndex = Math.min(Math.max(0, current_topic_id - 1), fetchedPhrases.length - 1);
              console.log(`Resuming Stage 1 RepeatAfterMe from topic ${current_topic_id} (phrase ${resumeIndex + 1})`);
              setCurrentPhraseIndex(resumeIndex);
            } else {
              console.log('No resume data for Stage 1 RepeatAfterMe, starting from beginning');
              setCurrentPhraseIndex(0);
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
            setCurrentPhraseIndex(0);
          }
          
          setResumeDataLoaded(true);
        } else if (!user?.id) {
          // No user, start from beginning
          setCurrentPhraseIndex(0);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load phrases from API');
      } finally {
        setLoading(false);
      }
    };

    if (!resumeDataLoaded || !user?.id) {
      initializeAndLoadPhrases();
    }
  }, [user?.id, resumeDataLoaded, progressInitialized]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Clean up timeout on component unmount
      if (recordingTimeoutRef.current) {
        clearTimeout(recordingTimeoutRef.current);
      }
      
      // Stop recording if active
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

  const handlePlayAudio = async () => {
    if (!currentPhrase) return;

    // If audio is currently playing, stop it
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      cleanupCurrentAudio();
      return;
    }

    setIsLoadingAudio(true);
    
    try {
      // First try to use the audio_url from the phrase if available
      if (currentPhrase.audio_url) {
        await playAudio(currentPhrase.audio_url);
      } else {
        // Fetch audio from API
        const audioUrl = await fetchAudio(currentPhrase.id);
        await playAudio(audioUrl);
      }
    } catch (error: any) {
      // Silent fail for better user experience - could show a toast notification instead
      console.error('Audio playback failed:', error.message);
      setIsPlayingAudio(false);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleStartRecording = async () => {
    if (!currentPhrase) return;
    
    setFeedback(null); // Clear previous feedback
    setIsRecording(true);
    
    try {
      await startRecording();
      
      // Auto-stop recording after 5 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        console.log('Auto-stop timeout triggered');
        if (mediaRecorderRef.current?.state === 'recording') {
          console.log('MediaRecorder is recording, processing...');
          processRecordedAudio().catch(error => {
            console.error('Auto-stop processing error:', error);
            setError('Failed to process recording');
            setIsRecording(false);
            setIsEvaluating(false);
          });
        } else {
          console.log('MediaRecorder state:', mediaRecorderRef.current?.state);
        }
      }, 5000);
      
    } catch (error: any) {
      setIsRecording(false);
      setError(error.message || 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    
    console.log('Manual stop recording triggered');
    await processRecordedAudio();
  };

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    // Retry loading phrases
    const loadPhrases = async () => {
      try {
        const fetchedPhrases = await fetchPhrases();
        setPhrases(fetchedPhrases);
      } catch (err: any) {
        setError(err.message || 'Failed to load phrases from API');
      } finally {
        setLoading(false);
      }
    };

    loadPhrases();
  };

  // Save current progress to API
  const saveProgress = async (phraseIndex: number) => {
    if (user?.id && phrases.length > 0) {
      try {
        await updateCurrentProgress(
          user.id,
          1, // Stage 1
          1  // Exercise 1 (RepeatAfterMe)
        );
        console.log(`Progress saved: Stage 1, Exercise 1, Phrase ${phraseIndex + 1}/${phrases.length}`);
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
          1  // Exercise 1 (RepeatAfterMe)
        );
        console.log('Exercise marked as completed: Stage 1, Exercise 1 (RepeatAfterMe)');
      } catch (error) {
        console.warn('Failed to mark exercise as completed:', error);
      }
    }
  };

  // Restart the exercise (redo functionality)
  const handleRedo = () => {
    setCurrentPhraseIndex(0);
    setFeedback(null);
    setIsCompleted(false);
    setShowCompletionDialog(false);
    // Save progress for restart
    if (user?.id) {
      saveProgress(0);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
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
              <Mic className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
              Repeat After Me
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice speaking with perfect pronunciation</p>
          </div>
        </div>

        {/* Loading Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <ContentLoader message="Loading practice phrases from API..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
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
              <Mic className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
              Repeat After Me
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice speaking with perfect pronunciation</p>
          </div>
        </div>

        {/* Error Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-xl backdrop-blur-sm">
            <CardContent className="p-8">
              <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50/80 dark:bg-red-900/20 rounded-2xl">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="mb-4 text-red-800 dark:text-red-200">
                  <strong>Failed to load phrases:</strong><br />
                  {error}
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRetry}
                className="w-full mt-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-2xl h-12"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Retry Loading
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Empty state (no phrases loaded)
  if (!currentPhrase || phrases.length === 0) {
    return (
      <div className="min-h-screen bg-background">
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
              <Mic className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
              Repeat After Me
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice speaking with perfect pronunciation</p>
          </div>
        </div>

        {/* Empty Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-xl backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <Alert className="border-blue-200 dark:border-blue-800 bg-blue-50/80 dark:bg-blue-900/20 rounded-2xl">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="mb-4 text-blue-800 dark:text-blue-200">
                  No practice phrases available from the API.
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRetry}
                className="w-full mt-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0 rounded-2xl h-12"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Reload Phrases
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main content with phrases loaded
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
            <Mic className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent mb-2 sm:mb-3">
            Repeat After Me
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground font-medium">Practice speaking with perfect pronunciation</p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="px-4 sm:px-6 lg:px-8 mb-6">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            <span>Phrase {currentPhraseIndex + 1} of {phrases.length}</span>
            <span className="text-primary font-semibold">{Math.round(((currentPhraseIndex + 1) / phrases.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 rounded-full h-3 shadow-inner">
            <div 
              className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 h-3 rounded-full transition-all duration-500 ease-out shadow-lg" 
              style={{ width: `${((currentPhraseIndex + 1) / phrases.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Phrase Card */}
        <Card className="w-full max-w-md mb-8 bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl backdrop-blur-sm">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4 text-gray-900 dark:text-gray-100 leading-tight">
                {currentPhrase.text}
              </h2>
              
              {currentPhrase.urdu_text && (
                <p className="text-lg sm:text-xl text-muted-foreground mb-6 font-medium leading-relaxed" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                  {currentPhrase.urdu_text}
                </p>
              )}
              
              <Button
                onClick={handlePlayAudio}
                disabled={isLoadingAudio}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-2xl transition-all duration-300 ${
                  isLoadingAudio 
                    ? 'bg-gray-500 cursor-not-allowed text-white border-2 border-gray-400 shadow-lg' 
                    : isPlayingAudio
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-xl hover:shadow-2xl hover:scale-105'
                    : 'bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white shadow-xl hover:shadow-2xl hover:scale-105'
                }`}
                size="icon"
              >
                {isLoadingAudio ? (
                  <div className="w-8 h-8 sm:w-10 sm:h-10 border-3 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
                ) : isPlayingAudio ? (
                  <Pause className="w-8 h-8 sm:w-10 sm:h-10" />
                ) : (
                  <Play className="w-8 h-8 sm:w-10 sm:h-10" />
                )}
              </Button>
            </div>
            
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Listen to the phrase and repeat it clearly
            </p>
          </CardContent>
        </Card>

        {/* Recording Button */}
        <Button
          onClick={handleStartRecording}
          disabled={isRecording || isEvaluating}
          className={`w-full max-w-md h-16 text-xl font-semibold rounded-2xl transition-all duration-300 shadow-lg hover:shadow-xl ${
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
            className="w-full max-w-md mt-4 h-14 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 border-0"
          >
            Stop Recording
          </Button>
        )}

        {/* Feedback Display */}
        {feedback && (
          <Card className="w-full max-w-md mt-8 bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/60 dark:border-gray-700/60 rounded-3xl shadow-2xl backdrop-blur-sm">
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
                    {feedback.feedback}
                  </p>
                )}
                
                {feedback.suggestions && feedback.suggestions.length > 0 && (
                  <div className="text-left">
                    <h4 className="font-semibold mb-3 text-base sm:text-lg text-gray-900 dark:text-gray-100">Suggestions:</h4>
                    <ul className="list-disc list-inside text-sm sm:text-base text-muted-foreground space-y-2">
                      {feedback.suggestions.map((suggestion, index) => (
                        <li key={index} className="leading-relaxed">{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation buttons for manual phrase control */}
        {phrases.length > 1 && (
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-8 w-full max-w-md mx-auto justify-center">
            <Button
              onClick={() => {
                const newIndex = Math.max(0, currentPhraseIndex - 1);
                setCurrentPhraseIndex(newIndex);
                setFeedback(null); // Clear feedback when navigating
                saveProgress(newIndex); // Save progress when navigating
              }}
              disabled={currentPhraseIndex === 0}
              variant="outline"
              className="px-8 py-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg backdrop-blur-sm font-medium w-full sm:w-auto"
            >
              Previous
            </Button>
            <Button
              onClick={() => {
                const newIndex = Math.min(phrases.length - 1, currentPhraseIndex + 1);
                setCurrentPhraseIndex(newIndex);
                setFeedback(null); // Clear feedback when navigating
                saveProgress(newIndex); // Save progress when navigating
              }}
              disabled={currentPhraseIndex === phrases.length - 1}
              variant="outline"
              className="px-8 py-3 bg-white/80 dark:bg-gray-800/80 hover:bg-primary/5 hover:border-primary/30 hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:-translate-y-0.5 border-gray-200/60 dark:border-gray-700/60 rounded-2xl shadow-lg backdrop-blur-sm font-medium w-full sm:w-auto"
            >
              Next
            </Button>
          </div>
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
                  🎉 You've completed all {phrases.length} phrases!
                </p>
                <p className="text-sm text-muted-foreground">
                  Great job on practicing your pronunciation. You can redo the exercise to practice more or continue to other exercises.
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
    </div>
  );
}; 