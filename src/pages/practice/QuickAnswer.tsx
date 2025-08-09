import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Zap, Play, Mic, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';
import { initializeUserProgress, getCurrentTopicProgress, updateCurrentProgress } from '@/utils/progressTracker';
import { getAuthHeadersWithAccept, getAuthHeaders } from '@/utils/authUtils';

// Types
interface QuickAnswerQuestion {
  id: string;
  question: string;
  urdu_text?: string;
  expected_answers?: string[];
  expected_answers_urdu?: string[];
  keywords?: string[];
  hint?: string;
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

// API Functions
const fetchQuickAnswerQuestions = async (): Promise<QuickAnswerQuestion[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.QUICK_ANSWER_QUESTIONS}`, {
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
    let questions: any[] = [];

    if (Array.isArray(result)) {
      questions = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      questions = result.data;
    } else if (result && typeof result === 'object' && result.questions && Array.isArray(result.questions)) {
      questions = result.questions;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        questions = result[arrayProperties[0]];
      } else {
        throw new Error('No question array found in response');
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Normalize questions to our expected format
    const normalizedQuestions: QuickAnswerQuestion[] = questions.map((item: any, index: number) => {
      let question: QuickAnswerQuestion;
      
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
      
      if (typeof item === 'string') {
        question = {
          id: String(index + 1),
          question: item,
        };
      } else if (item && typeof item === 'object') {
        question = {
          id: item.id ? String(item.id) : String(index + 1),
          question: getStringValue(item, 'question', 'prompt', 'text', 'query') || String(item),
          urdu_text: getStringValue(item, 'urdu_text', 'question_urdu', 'urdu', 'urdu_translation', 'translation'),
          expected_answers: getArrayValue(item, 'expected_answers', 'answers', 'expected', 'responses'),
          expected_answers_urdu: getArrayValue(item, 'expected_answers_urdu', 'answers_urdu', 'expected_urdu'),
          keywords: getArrayValue(item, 'keywords', 'key_words', 'important_words'),
          hint: getStringValue(item, 'hint', 'tip', 'help', 'guidance'),
          type: getStringValue(item, 'type', 'category'),
          difficulty_level: getStringValue(item, 'difficulty_level', 'difficulty', 'level'),
          created_at: getStringValue(item, 'created_at', 'createdAt', 'timestamp'),
        };
      } else {
        question = {
          id: String(index + 1),
          question: String(item),
        };
      }

      if (!question.question || question.question.trim() === '' || question.question === '[object Object]') {
        return null;
      }

      return question;
    }).filter((question): question is QuickAnswerQuestion => question !== null);

    if (normalizedQuestions.length === 0) {
      throw new Error('No valid questions found in API response');
    }

    return normalizedQuestions;

  } catch (error) {
    console.error('Error fetching quick answer questions:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export default function QuickAnswer() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<QuickAnswerQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const [showExpectedAnswers, setShowExpectedAnswers] = useState(false);
  const [progressInitialized, setProgressInitialized] = useState(false);
  const [resumeDataLoaded, setResumeDataLoaded] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Fetch audio for a question
  const fetchAudio = async (questionId: string): Promise<string> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.QUICK_ANSWER_AUDIO(questionId)}`, {
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
  const evaluateAudio = async (audioBase64: string, timeSpentSeconds: number): Promise<EvaluationFeedback> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_QUICK_ANSWER}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          audio_base64: audioBase64,
          question_id: Number(currentQuestion.id),
          filename: `quick_answer_${currentQuestion.id}_${Date.now()}.webm`,
          user_id: user?.id || 'anonymous',
          time_spent_seconds: timeSpentSeconds,
          urdu_used: !!currentQuestion.urdu_text
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
          suggestions: result.keywords ? 
            [`Try using keywords: ${result.keywords.join(', ')}`] : 
            ['Please speak more clearly and try again']
        };
        
        return feedback;
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
      
      return feedback;
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
      
      const evaluationResult = await evaluateAudio(audioBase64, timeSpentSeconds);
      setFeedback(evaluationResult);
      
      // Save progress after successful evaluation
      saveProgress(currentQuestionIndex);
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to process recording');
    } finally {
      setIsEvaluating(false);
      setRecordingStartTime(null);
    }
  };

  // Initialize progress and fetch questions on component mount with resume functionality
  useEffect(() => {
    const initializeAndLoadQuestions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // First, load quick answer questions
        const fetchedQuestions = await fetchQuickAnswerQuestions();
        setQuestions(fetchedQuestions);

        // If user is authenticated, handle progress and resume
        if (user?.id && !resumeDataLoaded) {
          console.log('Loading user progress for Stage 2 QuickAnswer practice...');
          
          // Try to get current progress to resume from where user left off
          const currentProgress = await getCurrentTopicProgress(user.id, 2, 2); // Stage 2, Exercise 2
          
          if (currentProgress.success && currentProgress.data && currentProgress.data.success) {
            const { current_topic_id } = currentProgress.data;
            
            if (current_topic_id !== undefined && current_topic_id > 0) {
              // Convert topic ID to question index (topic ID is 1-based, array index is 0-based)
              const resumeIndex = Math.min(Math.max(0, current_topic_id - 1), fetchedQuestions.length - 1);
              console.log(`Resuming Stage 2 QuickAnswer from topic ${current_topic_id} (question ${resumeIndex + 1})`);
              setCurrentQuestionIndex(resumeIndex);
            } else {
              console.log('No resume data for Stage 2 QuickAnswer, starting from beginning');
              setCurrentQuestionIndex(0);
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
            setCurrentQuestionIndex(0);
          }
          
          setResumeDataLoaded(true);
        } else if (!user?.id) {
          // No user, start from beginning
          setCurrentQuestionIndex(0);
        }

      } catch (err: any) {
        setError(err.message || 'Failed to load quick answer questions from API');
      } finally {
        setLoading(false);
      }
    };

    if (!resumeDataLoaded || !user?.id) {
      initializeAndLoadQuestions();
    }
  }, [user?.id, resumeDataLoaded, progressInitialized]);

  // Save current progress to API
  const saveProgress = async (questionIndex: number) => {
    if (user?.id && questions.length > 0) {
      try {
        await updateCurrentProgress(
          user.id,
          2, // Stage 2
          2  // Exercise 2 (QuickAnswer)
        );
        console.log(`Progress saved: Stage 2, Exercise 2, Question ${questionIndex + 1}/${questions.length}`);
      } catch (error) {
        console.warn('Failed to save progress:', error);
        // Don't show error to user, just log it
      }
    }
  };

  const handlePlayAudio = async () => {
    if (!currentQuestion) return;

    setIsLoadingAudio(true);
    
    try {
      const audioUrl = await fetchAudio(currentQuestion.id);
      await playAudio(audioUrl);
    } catch (error: any) {
      console.error('Audio playback failed:', error.message);
      // Silent fail for better user experience
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleNext = () => {
    let newIndex;
    if (currentQuestionIndex < questions.length - 1) {
      newIndex = currentQuestionIndex + 1;
    } else {
      newIndex = 0;
    }
    setCurrentQuestionIndex(newIndex);
    setFeedback(null); // Clear feedback when navigating
    setShowExpectedAnswers(false); // Reset toggle when changing questions
    saveProgress(newIndex); // Save progress when navigating
  };

  const handlePrevious = () => {
    let newIndex;
    if (currentQuestionIndex > 0) {
      newIndex = currentQuestionIndex - 1;
    } else {
      newIndex = questions.length - 1;
    }
    setCurrentQuestionIndex(newIndex);
    setFeedback(null); // Clear feedback when navigating
    setShowExpectedAnswers(false); // Reset toggle when changing questions
    saveProgress(newIndex); // Save progress when navigating
  };

  const handleStartRecording = async () => {
    if (!currentQuestion) return;
    
    setFeedback(null);
    setIsRecording(true);
    
    try {
      await startRecording();
      
      // Auto-stop recording after 10 seconds for quick answers
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
    
    const loadQuestions = async () => {
      try {
        const fetchedQuestions = await fetchQuickAnswerQuestions();
        setQuestions(fetchedQuestions);
      } catch (err: any) {
        setError(err.message || 'Failed to load quick answer questions from API');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  };

  // Helper function to safely display values
  const safeDisplay = (value: any, fallback: string = ''): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Loading state
  if (loading) {
  return (
      <div className="min-h-screen bg-background">
        <div className="relative flex items-center justify-center mb-6 p-4 sm:p-6 lg:p-8">
          <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Quick Answer</h1>
            <p className="text-muted-foreground">Answer Questions Naturally</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <ContentLoader message="Loading questions..." />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="relative flex items-center justify-center mb-6 p-4 sm:p-6 lg:p-8">
          <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            </Button>
          <div className="text-center">
            <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
              <Zap className="h-8 w-8 text-primary" />
          </div>
            <h1 className="text-3xl font-bold">Quick Answer</h1>
            <p className="text-muted-foreground">Answer Questions Naturally</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="mb-4">
                  <strong>Failed to load questions:</strong><br />
                  {error}
                </AlertDescription>
              </Alert>
              
              <Button 
                onClick={handleRetry}
                className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Breadcrumb */}
      <div className="p-4 sm:p-6 lg:p-8 pb-0">
        <PracticeBreadcrumb />
      </div>
      
      {/* Header */}
      <div className="relative flex items-center justify-center mb-6 p-4 sm:p-6 lg:p-8">
        <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
                </Button>
        <div className="text-center">
          <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Quick Answer</h1>
          <p className="text-muted-foreground">Answer Questions Naturally</p>
          <p className="text-sm text-muted-foreground mt-1">
            Question: {currentQuestionIndex + 1} of {questions.length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            {/* Question */}
            <h2 className="text-2xl font-bold mb-4">
              {safeDisplay(currentQuestion.question, 'No question available')}
            </h2>
            
            {/* Urdu Text */}
            {currentQuestion.urdu_text && (
              <p className="text-xl text-muted-foreground mb-6" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                {safeDisplay(currentQuestion.urdu_text)}
              </p>
            )}

            {/* Expected Answers */}
            {currentQuestion.expected_answers && currentQuestion.expected_answers.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Expected Answers:
                  </p>
                <Button
                  variant="outline"
                    size="sm"
                    onClick={() => setShowExpectedAnswers(!showExpectedAnswers)}
                    className="text-xs px-3 py-1 h-7"
                >
                    {showExpectedAnswers ? 'Hide' : 'Show'}
                </Button>
                </div>
                
                {showExpectedAnswers && (
                  <div className="space-y-3">
                    {currentQuestion.expected_answers.map((answer, index) => (
                      <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                        <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                          {safeDisplay(answer)}
                        </p>
                        {currentQuestion.expected_answers_urdu && currentQuestion.expected_answers_urdu[index] && (
                          <p className="text-green-600 dark:text-green-400 text-sm" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                            {safeDisplay(currentQuestion.expected_answers_urdu[index])}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Keywords */}
            {currentQuestion.keywords && currentQuestion.keywords.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                  Keywords to Include:
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                  {currentQuestion.keywords.map(keyword => safeDisplay(keyword)).join(', ')}
                </p>
            </div>
            )}

            {/* Play Button */}
            <Button
              onClick={handlePlayAudio}
              disabled={isLoadingAudio}
              className={`w-20 h-20 rounded-full text-white shadow-lg mb-6 ${
                isLoadingAudio 
                  ? 'bg-gray-400 hover:bg-gray-400 cursor-not-allowed' 
                  : 'bg-green-500 hover:bg-green-600'
              }`}
              size="icon"
            >
              {isLoadingAudio ? (
                <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-10 h-10" />
              )}
            </Button>

            {/* Instruction */}
            <p className="text-muted-foreground text-sm">
              Listen to the question and answer naturally
            </p>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        {questions.length > 1 && (
          <div className="flex gap-4 mt-6 max-w-md mx-auto">
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex-1 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              variant="outline"
              className="flex-1 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            >
              Next
            </Button>
          </div>
        )}

        {/* Feedback Display */}
        {feedback && (
          <Card className="w-full max-w-md mt-6 mx-auto">
            <CardContent className="p-6">
              <div className="text-center">
                {feedback.score !== undefined && (
                  <div className="flex items-center justify-center mb-4">
                    {feedback.score >= 80 ? (
                      <CheckCircle className="w-8 h-8 text-green-500 mr-2" />
                    ) : feedback.score >= 60 ? (
                      <AlertCircle className="w-8 h-8 text-yellow-500 mr-2" />
                    ) : (
                      <XCircle className="w-8 h-8 text-red-500 mr-2" />
                    )}
                    <span className="text-2xl font-bold">
                      {Math.round(feedback.score)}%
                    </span>
                  </div>
                )}
                
                {feedback.feedback && (
                  <p className="text-muted-foreground mb-4">
                    {safeDisplay(feedback.feedback)}
                  </p>
                )}
                
                {feedback.suggestions && feedback.suggestions.length > 0 && (
                  <div className="text-left">
                    <h4 className="font-semibold mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {feedback.suggestions.map((suggestion, index) => (
                        <li key={index}>{safeDisplay(suggestion)}</li>
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
      <div className="p-4 bg-background">
        <div className="max-w-md mx-auto">
          <Button 
            onClick={handleStartRecording}
            disabled={isRecording || isEvaluating}
            className={`w-full h-16 text-xl font-semibold rounded-xl shadow-lg transition-all duration-300 ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : isEvaluating
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-green-500 hover:bg-green-600'
            } text-white`}
          >
            <Mic className="w-6 h-6 mr-3" />
            {isRecording ? 'Recording...' : isEvaluating ? 'Evaluating...' : 'Speak Now'}
          </Button>

          {/* Stop Recording Button */}
          {isRecording && (
            <Button
              onClick={handleStopRecording}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              Stop Recording
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 