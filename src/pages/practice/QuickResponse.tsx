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

// Types
interface Prompt {
  id: string;
  question: string;
  urdu_text?: string;
  correct_answer?: string;
  suggestions?: string[];
  expected_answers?: string[];
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
const fetchPrompts = async (): Promise<Prompt[]> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.PROMPTS}`, {
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
    let prompts: any[] = [];

    if (Array.isArray(result)) {
      prompts = result;
    } else if (result && typeof result === 'object' && result.data && Array.isArray(result.data)) {
      prompts = result.data;
    } else if (result && typeof result === 'object' && result.prompts && Array.isArray(result.prompts)) {
      prompts = result.prompts;
    } else if (result && typeof result === 'object') {
      const arrayProperties = Object.keys(result).filter(key => Array.isArray(result[key]));
      if (arrayProperties.length > 0) {
        prompts = result[arrayProperties[0]];
      } else {
        throw new Error('No prompt array found in response');
      }
    } else {
      throw new Error('Unexpected response format from server');
    }

    // Normalize prompts to our expected format
    const normalizedPrompts: Prompt[] = prompts.map((item: any, index: number) => {
      let prompt: Prompt;
      
      if (typeof item === 'string') {
        prompt = {
          id: String(index + 1),
          question: item,
        };
      } else if (item && typeof item === 'object') {
        prompt = {
          id: item.id ? String(item.id) : String(index + 1),
          question: item.question || item.prompt || item.text || item.query || String(item),
          urdu_text: item.urdu_text || item.urdu || item.urdu_translation || item.translation || item.urdu_sentence,
          correct_answer: item.correct_answer || item.answer || item.response,
          suggestions: item.suggestions || item.options || item.choices || item.answers,
          expected_answers: item.expected_answers || item.expected || item.suggestions || item.options || item.choices,
          hint: item.hint || item.tip || item.help || item.guidance,
          type: item.type || item.category,
          difficulty_level: item.difficulty_level || item.level || item.difficulty,
          created_at: item.created_at || item.createdAt || item.timestamp,
        };
      } else {
        prompt = {
          id: String(index + 1),
          question: String(item),
        };
      }

      if (!prompt.question || prompt.question.trim() === '') {
        return null;
      }

      return prompt;
    }).filter((prompt): prompt is Prompt => prompt !== null);

    if (normalizedPrompts.length === 0) {
      throw new Error('No valid prompts found in API response');
    }

    return normalizedPrompts;

  } catch (error) {
    console.error('Error fetching prompts:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    
    if (error.message.includes('fetch')) {
      throw new Error('Unable to connect to the server. Please check your internet connection.');
    }
    
    throw error;
  }
};

export const QuickResponse: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
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
  
  const currentPrompt = prompts[currentPromptIndex];

  // Fetch audio for a prompt
  const fetchAudio = async (promptId: string): Promise<string> => {
    try {
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.QUICK_RESPONSE_AUDIO(promptId)}`, {
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
      const response = await fetch(`${BASE_API_URL}${API_ENDPOINTS.EVALUATE_QUICK_RESPONSE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          audio_base64: audioBase64,
          prompt_id: Number(currentPrompt.id),
          filename: `quick_response_${currentPrompt.id}_${Date.now()}.webm`,
          user_id: user?.id || 'anonymous',
          time_spent_seconds: timeSpentSeconds,
          urdu_used: !!currentPrompt.urdu_text
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
          suggestions: result.expected_answers ? 
            [`Try saying: ${result.expected_answers.join(', ')}`] : 
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

  // Fetch prompts on component mount
  useEffect(() => {
    const loadPrompts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const fetchedPrompts = await fetchPrompts();
        setPrompts(fetchedPrompts);
      } catch (err: any) {
        setError(err.message || 'Failed to load prompts from API');
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
  }, []);

  const handlePlayAudio = async () => {
    if (!currentPrompt) return;

    setIsLoadingAudio(true);
    
    try {
      const audioUrl = await fetchAudio(currentPrompt.id);
      await playAudio(audioUrl);
    } catch (error: any) {
      console.error('Audio playback failed:', error.message);
      // Silent fail for better user experience
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleNext = () => {
    if (currentPromptIndex < prompts.length - 1) {
      setCurrentPromptIndex(currentPromptIndex + 1);
    } else {
      setCurrentPromptIndex(0);
    }
    setFeedback(null); // Clear feedback when navigating
  };

  const handlePrevious = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(currentPromptIndex - 1);
    } else {
      setCurrentPromptIndex(prompts.length - 1);
    }
    setFeedback(null); // Clear feedback when navigating
  };

  const handleStartRecording = async () => {
    if (!currentPrompt) return;
    
    setFeedback(null);
    setIsRecording(true);
    
    try {
      await startRecording();
      
      // Auto-stop recording after 5 seconds
      recordingTimeoutRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          processRecordedAudio().catch(error => {
            console.error('Auto-stop processing error:', error);
            setError('Failed to process recording');
            setIsRecording(false);
            setIsEvaluating(false);
          });
        }
      }, 5000);
      
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
    
    const loadPrompts = async () => {
      try {
        const fetchedPrompts = await fetchPrompts();
        setPrompts(fetchedPrompts);
      } catch (err: any) {
        setError(err.message || 'Failed to load prompts from API');
      } finally {
        setLoading(false);
      }
    };

    loadPrompts();
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
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Quick Response</h1>
            <p className="text-muted-foreground">Answer Questions Quickly</p>
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
            <h1 className="text-3xl font-bold">Quick Response</h1>
            <p className="text-muted-foreground">Answer Questions Quickly</p>
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

  if (!currentPrompt) {
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
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Quick Response</h1>
          <p className="text-muted-foreground">Answer Questions Quickly</p>
          <p className="text-sm text-muted-foreground mt-1">
            Question: {currentPromptIndex + 1} of {prompts.length}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-4">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center">
            {/* Question */}
            <h2 className="text-4xl font-bold mb-4">
              {currentPrompt.question}
            </h2>
            
            {/* Urdu Text */}
            {currentPrompt.urdu_text && (
              <p className="text-2xl text-muted-foreground mb-6" style={{ fontFamily: 'Noto Nastaliq Urdu, Arial, sans-serif' }}>
                {currentPrompt.urdu_text}
              </p>
            )}

            {/* Expected Answers */}
            {currentPrompt.expected_answers && currentPrompt.expected_answers.length > 0 && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-2">
                  Expected Answers:
                </p>
                <p className="text-green-600 dark:text-green-400 font-medium">
                  {currentPrompt.expected_answers.join(', ')}
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
              Listen to the question and respond quickly in English
            </p>
          </CardContent>
        </Card>

        {/* Navigation buttons */}
        {prompts.length > 1 && (
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
                    {feedback.feedback}
                  </p>
                )}
                
                {feedback.suggestions && feedback.suggestions.length > 0 && (
                  <div className="text-left">
                    <h4 className="font-semibold mb-2">Suggestions:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {feedback.suggestions.map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
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
}; 