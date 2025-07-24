import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Calendar, Play, Mic, AlertCircle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ContentLoader } from '@/components/ContentLoader';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { BASE_API_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/hooks/useAuth';

// Types
interface DailyRoutinePhrase {
  id: string;
  question: string;
  urdu_text?: string;
  example_response?: string;
  example_response_urdu?: string;
  expected_keywords?: string[];
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
const fetchDailyRoutinePhrases = async (): Promise<DailyRoutinePhrase[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.DAILY_ROUTINE_PHRASES}`, {
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
    let phrases: any[] = [];

    if (Array.isArray(result)) {
      phrases = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      phrases = result.data;
    } else if (result && typeof result === 'object' && result.phrases && Array.isArray(result.phrases)) {
      phrases = result.phrases;
    } else if (result && typeof result === 'object') {
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
    const normalizedPhrases: DailyRoutinePhrase[] = phrases.map((item: any, index: number) => {
      let phrase: DailyRoutinePhrase;
      
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
        phrase = {
          id: String(index + 1),
          question: item,
        };
      } else if (item && typeof item === 'object') {
        phrase = {
          id: item.id ? String(item.id) : String(index + 1),
          question: getStringValue(item, 'phrase', 'question', 'prompt', 'text', 'query') || String(item),
          urdu_text: getStringValue(item, 'phrase_urdu', 'urdu_text', 'urdu', 'urdu_translation', 'translation', 'urdu_sentence'),
          example_response: getStringValue(item, 'example', 'example_response', 'sample_response', 'sample'),
          example_response_urdu: getStringValue(item, 'example_urdu', 'example_response_urdu', 'example_urdu', 'sample_urdu'),
          expected_keywords: getArrayValue(item, 'keywords', 'expected_keywords', 'expected', 'key_words'),
          hint: getStringValue(item, 'hint', 'tip', 'help', 'guidance'),
          type: getStringValue(item, 'category', 'type'),
          difficulty_level: getStringValue(item, 'difficulty', 'difficulty_level', 'level'),
          created_at: getStringValue(item, 'created_at', 'createdAt', 'timestamp'),
        };
      } else {
        phrase = {
          id: String(index + 1),
          question: String(item),
        };
      }

      if (!phrase.question || phrase.question.trim() === '' || phrase.question === '[object Object]') {
        return null;
      }

      return phrase;
    }).filter((phrase): phrase is DailyRoutinePhrase => phrase !== null);

    if (normalizedPhrases.length === 0) {
      throw new Error('No valid phrases found in API response');
    }

    return normalizedPhrases;

  } catch (error) {
    console.error('Error fetching daily routine phrases:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export default function DailyRoutine() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phrases, setPhrases] = useState<DailyRoutinePhrase[]>([]);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState<EvaluationFeedback | null>(null);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const currentPhrase = phrases[currentPhraseIndex];

  // Fetch audio for a phrase
  const fetchAudio = async (phraseId: string): Promise<string> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.DAILY_ROUTINE_AUDIO(phraseId)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
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

  // Play audio from URL
  const playAudio = async (audioUrl: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);
      
      const cleanup = () => {
        if (audioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(audioUrl);
        }
      };
      
      audio.oncanplaythrough = () => {
        audio.play()
          .then(() => {
            // Audio started playing successfully
          })
          .catch((playError) => {
            cleanup();
            reject(new Error('Failed to start audio playback'));
          });
      };
      
      audio.onerror = () => {
        cleanup();
        reject(new Error('Failed to load audio file'));
      };
      
      audio.onended = () => {
        cleanup();
        resolve();
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
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_DAILY_ROUTINE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          audio_base64: audioBase64,
          phrase_id: Number(currentPhrase.id),
          filename: `daily_routine_${currentPhrase.id}_${Date.now()}.webm`,
          user_id: user?.id || 'anonymous',
          time_spent_seconds: timeSpentSeconds,
          urdu_used: !!currentPhrase.urdu_text
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
            [`Try using keywords: ${result.expected_keywords.join(', ')}`] : 
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
      
    } catch (error: any) {
      console.error('Processing error:', error);
      setError(error.message || 'Failed to process recording');
    } finally {
      setIsEvaluating(false);
      setRecordingStartTime(null);
    }
  };

  // Fetch phrases on component mount
  useEffect(() => {
    const loadPhrases = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedPhrases = await fetchDailyRoutinePhrases();
        setPhrases(fetchedPhrases);
      } catch (err: any) {
        setError(err.message || 'Failed to load daily routine phrases from API');
      } finally {
        setLoading(false);
      }
    };

    loadPhrases();
  }, []);

  const handlePlayAudio = async () => {
    if (!currentPhrase) return;

    setIsLoadingAudio(true);
    
    try {
      const audioUrl = await fetchAudio(currentPhrase.id);
      await playAudio(audioUrl);
    } catch (error: any) {
      console.error('Audio playback failed:', error.message);
      // Silent fail for better user experience
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleNext = () => {
    if (currentPhraseIndex < phrases.length - 1) {
      setCurrentPhraseIndex(currentPhraseIndex + 1);
    } else {
      setCurrentPhraseIndex(0);
    }
    setFeedback(null); // Clear feedback when navigating
  };

  const handlePrevious = () => {
    if (currentPhraseIndex > 0) {
      setCurrentPhraseIndex(currentPhraseIndex - 1);
    } else {
      setCurrentPhraseIndex(phrases.length - 1);
    }
    setFeedback(null); // Clear feedback when navigating
  };

  const handleStartRecording = async () => {
    if (!currentPhrase) return;
    
    setFeedback(null);
    setIsRecording(true);
    
    try {
      await startRecording();
      
      // Auto-stop recording after 15 seconds for daily routine (longer responses)
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          processRecordedAudio().catch(error => {
            console.error('Auto-stop processing error:', error);
            setError('Failed to process recording');
            setIsRecording(false);
            setIsEvaluating(false);
          });
        }
      }, 15000);
      
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
    };
  }, []);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    
    const loadPhrases = async () => {
      try {
        const fetchedPhrases = await fetchDailyRoutinePhrases();
        setPhrases(fetchedPhrases);
      } catch (err: any) {
        setError(err.message || 'Failed to load daily routine phrases from API');
      } finally {
        setLoading(false);
      }
    };

    loadPhrases();
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
          <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Daily Routine</h1>
            <p className="text-muted-foreground">Narrate Your Daily Activities</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <ContentLoader message="Loading daily routine questions..." />
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
              <Calendar className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Daily Routine</h1>
            <p className="text-muted-foreground">Narrate Your Daily Activities</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
          <Card className="w-full max-w-md">
            <CardContent className="p-8">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="mb-4">
                  <strong>Failed to load daily routine questions:</strong><br />
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

  if (!currentPhrase) {
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
        <Button variant="outline" size="icon" className="absolute left-4 sm:left-6 lg:left-8" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
            <Calendar className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Daily Routine</h1>
          <p className="text-muted-foreground">Narrate Your Daily Activities</p>
          <p className="text-sm text-muted-foreground mt-1">
            Topic: {currentPhraseIndex + 1} of {phrases.length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            {/* Question */}
            <h2 className="text-2xl font-bold mb-4">
              {safeDisplay(currentPhrase.question, 'No question available')}
            </h2>
            
            {/* Urdu Text */}
            {currentPhrase.urdu_text && (
              <p className="text-xl text-muted-foreground mb-6" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                {safeDisplay(currentPhrase.urdu_text)}
              </p>
            )}

            {/* Example Response */}
            {currentPhrase.example_response && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  Example Response:
                </p>
                <p className="text-green-600 dark:text-green-400 font-medium mb-2">
                  {safeDisplay(currentPhrase.example_response)}
                </p>
                {currentPhrase.example_response_urdu && (
                  <p className="text-green-600 dark:text-green-400 text-sm" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                    {safeDisplay(currentPhrase.example_response_urdu)}
                  </p>
                )}
              </div>
            )}

            {/* Expected Keywords */}
            {currentPhrase.expected_keywords && currentPhrase.expected_keywords.length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                  Expected Keywords:
                </p>
                <p className="text-yellow-600 dark:text-yellow-400 font-medium">
                  {currentPhrase.expected_keywords.map(keyword => safeDisplay(keyword)).join(', ')}
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
              Listen to the question and describe your daily routine
            </p>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        {phrases.length > 1 && (
          <div className="flex gap-4 mt-6 max-w-md mx-auto">
            <Button
              onClick={handlePrevious}
              variant="outline"
              className="flex-1"
            >
              Previous
            </Button>
            <Button
              onClick={handleNext}
              variant="outline"
              className="flex-1"
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